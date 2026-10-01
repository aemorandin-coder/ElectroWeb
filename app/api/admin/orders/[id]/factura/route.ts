import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { NUMERO_FACTURA } from '@/lib/facturacion';
import { prisma } from '@/lib/prisma';
import { publicarOrdenes } from '@/lib/realtime/bus';

const schema = z
  .object({
    invoiceNumber: z.string().trim().refine((v) => v === '' || NUMERO_FACTURA.test(v), 'El número de factura lleva letras, números, guiones, puntos o barras (hasta 30)'),
  })
  .strict();

/**
 * PATCH /api/admin/orders/[id]/factura (C-147): el equipo anota el número de la factura que emitió fuera de la web
 * (SADES o el talonario). Vacío lo borra. No cambia nada más de la orden: ni montos, ni estado, ni a nombre de quién va.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_ORDERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const leido = schema.safeParse(await request.json().catch(() => null));
    if (!leido.success) {
      return NextResponse.json({ error: leido.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    const numero = leido.data.invoiceNumber || null;

    const orden = await prisma.order.findUnique({ where: { id }, select: { id: true, orderNumber: true, invoiceNumber: true, invoicedAt: true } });
    if (!orden) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    if (orden.invoiceNumber === numero) {
      return NextResponse.json({ invoiceNumber: orden.invoiceNumber, invoicedAt: orden.invoicedAt });
    }

    const actualizada = await prisma.order.update({
      where: { id },
      data: { invoiceNumber: numero, invoicedAt: numero ? new Date() : null },
      select: { invoiceNumber: true, invoicedAt: true },
    });

    await registrarAccionAdmin(session, 'ORDER_INVOICE_NOTED', { type: 'ORDER', id }, {
      orderNumber: orden.orderNumber,
      antes: orden.invoiceNumber,
      ahora: numero,
    }, request);
    // C-127: el cliente ve el número en su pedido sin recargar
    void publicarOrdenes([id]);

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error('Error anotando la factura:', error);
    return NextResponse.json({ error: 'No se pudo guardar el número de factura' }, { status: 500 });
  }
}
