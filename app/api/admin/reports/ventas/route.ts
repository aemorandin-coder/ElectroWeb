import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { baseEIva } from '@/lib/facturacion';
import { formatOrderPaymentMethod } from '@/lib/format-helpers';
import { prisma } from '@/lib/prisma';
import { rangoMes, totalesVentas, type FilaVenta } from '@/lib/relacion-ventas';

/** Muy por encima de las órdenes de un mes; acota la consulta */
const MAX_ORDENES = 5000;

/**
 * GET /api/admin/reports/ventas?mes=2026-09 (C-147): las órdenes pagadas en ese mes (hora de Venezuela), con a nombre
 * de quién se facturaron, su base, su IVA y el número de factura anotado. Solo lectura.
 * Una orden cancelada o reembolsada después de pagarse se lista como anulada y no suma.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'VIEW_REPORTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
    }

    const mes = new URL(request.url).searchParams.get('mes');
    const rango = rangoMes(mes);
    if (!rango) return NextResponse.json({ error: 'Elige un mes válido' }, { status: 400 });
    const enMes = { gte: rango.desde, lt: rango.hasta };

    const ordenes = await prisma.order.findMany({
      where: {
        paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
        // Las órdenes viejas pagadas sin fecha de pago cuentan por su fecha de creación
        OR: [{ paidAt: enMes }, { paidAt: null, createdAt: enMes }],
      },
      select: {
        orderNumber: true, status: true, paymentStatus: true, paymentMethod: true, pointsUSD: true,
        totalUSD: true, taxUSD: true, totalVES: true, exchangeRateVES: true, paidAt: true, createdAt: true,
        billingType: true, billingName: true, billingTaxId: true, billingAddress: true, invoiceNumber: true,
        guestName: true,
        user: { select: { name: true, profile: { select: { idNumber: true } } } },
      },
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      take: MAX_ORDENES,
    });

    const filas: FilaVenta[] = ordenes.map((o) => {
      const totalUSD = Number(o.totalUSD);
      const { baseUSD, ivaUSD } = baseEIva(totalUSD, Number(o.taxUSD));
      const anulada = o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REFUNDED || o.paymentStatus === PaymentStatus.REFUNDED;
      return {
        fecha: (o.paidAt ?? o.createdAt).toISOString(),
        orden: o.orderNumber,
        factura: o.invoiceNumber,
        // Las órdenes de antes de C-147 no guardaron a nombre de quién: salen con los datos de la cuenta
        cliente: o.billingName || o.user?.name || o.guestName || 'Cliente eliminado',
        documento: o.billingTaxId || o.user?.profile?.idNumber || '',
        tipo: o.billingType === 'COMPANY' ? 'Empresa' : 'Persona',
        domicilioFiscal: o.billingAddress,
        baseUSD,
        ivaUSD,
        totalUSD,
        tasa: Number(o.exchangeRateVES ?? 0),
        totalBs: Number(o.totalVES ?? 0),
        pago: formatOrderPaymentMethod(o),
        puntosUSD: o.paymentMethod === 'WALLET' || o.paymentMethod === 'BALANCE' ? totalUSD : Number(o.pointsUSD ?? 0),
        anulada,
      };
    });

    return NextResponse.json({ mes, filas, totales: totalesVentas(filas), cortado: ordenes.length === MAX_ORDENES });
  } catch (error) {
    console.error('Error en la relación de ventas:', error);
    return NextResponse.json({ error: 'No se pudo armar la relación de ventas' }, { status: 500 });
  }
}
