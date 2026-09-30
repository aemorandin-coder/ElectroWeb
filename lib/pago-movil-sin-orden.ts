// Pagos móviles de compra que quedaron sin orden (C-114). Solo servidor.
//
// Un Pago Móvil de compra se verifica con el banco ANTES de crear la orden. Si después la orden no se puede crear
// (se agotó el stock en ese momento, cambió una regla de la tienda…), el dinero ya entró. Decisión de Andrés
// (28/09): ese dinero pasa al saldo del cliente, en USD a la tasa de la tienda, y el equipo recibe un aviso.
// El pago queda "usado" (transactionId apunta al crédito): ya no sirve para otra orden ni se acredita dos veces.

import { prisma } from '@/lib/prisma';
import { roundMoney, montoDecimal } from '@/lib/pricing';
import { formatUSD, formatVES } from '@/lib/currency';
import { createNotification } from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { formatPaymentMethod } from '@/lib/format-helpers';

/** Pagos de compra verificados por el banco, sin orden, sin acreditar y sin archivar (C-123) */
export const pagoSinOrdenWhere = { verificado: true, contexto: 'ORDER', orderId: null, transactionId: null, archivadoEn: null } as const;

/** Un pago más viejo que esto casi seguro se atendió por otro camino: el panel pide revisar antes de acreditarlo (C-123) */
export const DIAS_PAGO_VIEJO = 3;

/** Un pago recién verificado puede ser de alguien que está terminando la compra: el panel no lo acredita antes de esto */
export const MINUTOS_ANTES_DE_ACREDITAR = 30;

export type ResultadoCredito =
  | { ok: true; montoUSD: number; referencia: string; userId: string }
  | { ok: false; mensaje: string };

/**
 * Pasa al saldo del cliente un Pago Móvil de compra que no tiene orden. Atómico: si dos personas (o el checkout y el
 * panel) lo intentan a la vez, solo una acredita. `motivo` queda en la transacción y en los avisos.
 */
export async function acreditarPagoSinOrden(verificacionId: string, motivo: string, porAdmin?: string): Promise<ResultadoCredito> {
  const resultado = await prisma.$transaction(async (tx): Promise<ResultadoCredito> => {
    const v = await tx.pagoMovilVerificacion.findFirst({ where: { id: verificacionId, ...pagoSinOrdenWhere } });
    if (!v) return { ok: false, mensaje: 'Ese pago ya tiene orden, ya se acreditó, se archivó o no está verificado.' };

    // C-125: la tasa congelada del pago (la que se le cotizó); los pagos de antes de C-125 no la tienen y usan la de hoy
    const settings = await tx.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } });
    const tasa = Number(v.tasaVES ?? 0) || Number(settings?.exchangeRateVES ?? 0);
    const montoVES = Number(v.importeVerificado ?? 0);
    if (!(tasa > 0) || !(montoVES > 0)) return { ok: false, mensaje: 'Falta la tasa de la tienda o el monto verificado.' };
    const montoUSD = roundMoney(montoVES / tasa);
    if (!(montoUSD > 0)) return { ok: false, mensaje: 'El monto es demasiado pequeño para acreditar.' };

    const balance = await tx.userBalance.upsert({ where: { userId: v.userId }, create: { userId: v.userId }, update: {}, select: { id: true } });
    const credito = await tx.transaction.create({
      data: {
        balanceId: balance.id,
        type: 'REFUND',
        status: 'COMPLETED',
        amount: montoDecimal(montoUSD),
        currency: 'USD',
        description: `Pago Móvil sin orden (ref. ${v.referencia}): pasado a tus Puntos ES`,
        reference: v.referencia,
        paymentMethod: 'MOBILE_PAYMENT',
        metadata: JSON.stringify({ pagoMovilVerificacionId: v.id, montoVES, tasa, motivo: motivo.slice(0, 300), porAdmin: porAdmin ?? null }),
      },
    });
    // Se "reclama" el pago con la condición de que siga libre: si otro proceso lo usó o lo acreditó, se deshace todo
    const reclamado = await tx.pagoMovilVerificacion.updateMany({
      where: { id: v.id, orderId: null, transactionId: null },
      data: { transactionId: credito.id },
    });
    if (reclamado.count !== 1) throw new Error('PAGO_YA_USADO');
    await tx.userBalance.update({ where: { id: balance.id }, data: { balance: { increment: montoDecimal(montoUSD) } } });
    return { ok: true, montoUSD, referencia: v.referencia, userId: v.userId };
  }).catch((error: unknown): ResultadoCredito => {
    if (error instanceof Error && error.message === 'PAGO_YA_USADO') return { ok: false, mensaje: 'Ese pago ya se usó o se acreditó.' };
    throw error;
  });

  if (resultado.ok) {
    void createNotification({
      userId: resultado.userId,
      type: 'BALANCE_RECHARGED',
      title: 'Tu pago pasó a tus Puntos ES',
      message: `No pudimos crear tu pedido, así que tu Pago Móvil (ref. ${resultado.referencia}) quedó en tus Puntos ES: ${formatUSD(resultado.montoUSD)}. Puedes usarlo en tu próxima compra.`,
      link: '/customer/balance',
    });
    emitAdminEvent({
      type: 'ORDER_PAYMENT_ORPHAN',
      title: `Pago sin orden · ref. ${resultado.referencia}`,
      summary: `Un Pago Móvil de compra no llegó a ser orden y se pasó a los Puntos ES del cliente${porAdmin ? ' desde el panel' : ''}.`,
      fields: [
        ['Acreditado', formatUSD(resultado.montoUSD)],
        ['Motivo', motivo],
      ],
      link: '/admin/transactions',
    });
  }
  return resultado;
}

/** Aviso al equipo de un pago que quedó sin orden y no se acreditó solo (el cliente puede reintentar) */
export function avisarPagoSinOrden(referencia: string, montoVES: number, motivo: string) {
  emitAdminEvent({
    type: 'ORDER_PAYMENT_ORPHAN',
    title: `Pago sin orden · ref. ${referencia}`,
    summary: 'Un cliente pagó por Pago Móvil y la orden no se creó todavía. Si no la completa, pásalo a sus Puntos ES desde Transacciones.',
    fields: [
      ['Monto', formatVES(montoVES)],
      ['Motivo', motivo],
    ],
    link: '/admin/transactions',
    throttleKey: `orphan-${referencia}`,
    throttleMs: 60 * 60 * 1000,
  });
}

// C-123: pagos de compra que quedaron sueltos porque la orden se hizo o se confirmó a mano (casos de diciembre de 2025).
// Pasarlos al saldo le daría al cliente otra vez lo que ya recibió: se vinculan a su orden o se archivan con una nota.

/** Días alrededor del pago en los que se buscan órdenes del mismo cliente */
const VENTANA_CANDIDATAS_DIAS = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

export interface OrdenCandidata {
  id: string;
  orderNumber: string;
  totalUSD: number;
  totalVES: number;
  /** "Entregada", "Pendiente"… */
  estado: string;
  /** "pagada", "pago pendiente"… */
  pago: string;
  metodoPago: string;
  /** El total en Bs. de la orden (a la tasa de ese día) coincide con lo que confirmó el banco */
  montoCoincide: boolean;
  createdAt: string;
}

const ETIQUETA_PAGO: Record<string, string> = { PAID: 'pagada', PENDING: 'pago pendiente', FAILED: 'pago fallido', REFUNDED: 'reembolsada' };

/**
 * Órdenes del mismo cliente cerca de la fecha del pago, sin otro Pago Móvil enlazado y no canceladas (vincular un pago a
 * una orden cancelada escondería ese dinero). Primero las que tienen el mismo monto en Bs.; luego, la más cercana.
 */
export async function ordenesCandidatas(v: { userId: string; createdAt: Date; importeVerificado: unknown }): Promise<OrdenCandidata[]> {
  const desde = new Date(v.createdAt.getTime() - VENTANA_CANDIDATAS_DIAS * DIA_MS);
  const hasta = new Date(v.createdAt.getTime() + VENTANA_CANDIDATAS_DIAS * DIA_MS);
  const ordenes = await prisma.order.findMany({
    where: { userId: v.userId, createdAt: { gte: desde, lte: hasta }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    select: { id: true, orderNumber: true, totalUSD: true, totalVES: true, status: true, paymentStatus: true, paymentMethod: true, createdAt: true },
    take: 20,
  });
  if (ordenes.length === 0) return [];
  const conPago = await prisma.pagoMovilVerificacion.findMany({ where: { orderId: { in: ordenes.map((o) => o.id) } }, select: { orderId: true } });
  const ocupadas = new Set(conPago.map((p) => p.orderId));
  const montoVES = Number(v.importeVerificado ?? 0);
  const coincide = (totalVES: unknown) => montoVES > 0 && Math.abs(Number(totalVES) - montoVES) <= montoVES * 0.01;
  const distancia = (d: Date) => Math.abs(d.getTime() - v.createdAt.getTime());
  return ordenes
    .filter((o) => !ocupadas.has(o.id))
    .sort((a, b) => Number(coincide(b.totalVES)) - Number(coincide(a.totalVES)) || distancia(a.createdAt) - distancia(b.createdAt))
    .slice(0, 3)
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalUSD: Number(o.totalUSD),
      totalVES: Number(o.totalVES),
      estado: ETIQUETA_ESTADO[o.status] ?? o.status,
      pago: ETIQUETA_PAGO[o.paymentStatus] ?? o.paymentStatus,
      montoCoincide: coincide(o.totalVES),
      metodoPago: formatPaymentMethod(o.paymentMethod),
      createdAt: o.createdAt.toISOString(),
    }));
}

export type ResultadoCierre = { ok: true; referencia: string; userId: string; orderNumber?: string } | { ok: false; mensaje: string };

/** Enlaza el pago con una orden del mismo cliente que no tenga otro Pago Móvil. No cambia la orden ni mueve dinero. */
export async function vincularPagoAOrden(verificacionId: string, orderId: string): Promise<ResultadoCierre> {
  return prisma.$transaction(async (tx): Promise<ResultadoCierre> => {
    const v = await tx.pagoMovilVerificacion.findFirst({ where: { id: verificacionId, ...pagoSinOrdenWhere }, select: { id: true, userId: true, referencia: true } });
    if (!v) return { ok: false, mensaje: 'Ese pago ya tiene orden, ya se acreditó o se archivó.' };
    const orden = await tx.order.findFirst({ where: { id: orderId, userId: v.userId }, select: { id: true, orderNumber: true, status: true } });
    if (!orden) return { ok: false, mensaje: 'Esa orden no es de este cliente.' };
    if (orden.status === 'CANCELLED' || orden.status === 'REFUNDED') return { ok: false, mensaje: `La orden #${orden.orderNumber} está cancelada: archiva el pago con una nota.` };
    if (await tx.pagoMovilVerificacion.findFirst({ where: { orderId: orden.id }, select: { id: true } })) {
      return { ok: false, mensaje: `La orden #${orden.orderNumber} ya tiene su Pago Móvil.` };
    }
    const hecho = await tx.pagoMovilVerificacion.updateMany({ where: { id: v.id, ...pagoSinOrdenWhere }, data: { orderId: orden.id } });
    if (hecho.count !== 1) return { ok: false, mensaje: 'Ese pago cambió mientras tanto. Recarga la página.' };
    return { ok: true, referencia: v.referencia, userId: v.userId, orderNumber: orden.orderNumber };
  });
}

/** Cierra el pago sin orden ni crédito, con el motivo: ya se atendió fuera del sistema */
export async function archivarPagoSinOrden(verificacionId: string, nota: string, porAdmin: string): Promise<ResultadoCierre> {
  const v = await prisma.pagoMovilVerificacion.findFirst({ where: { id: verificacionId, ...pagoSinOrdenWhere }, select: { id: true, userId: true, referencia: true } });
  if (!v) return { ok: false, mensaje: 'Ese pago ya tiene orden, ya se acreditó o se archivó.' };
  const hecho = await prisma.pagoMovilVerificacion.updateMany({
    where: { id: v.id, ...pagoSinOrdenWhere },
    data: { archivadoEn: new Date(), archivadoPor: porAdmin.slice(0, 120), archivadoNota: nota.slice(0, 500) },
  });
  if (hecho.count !== 1) return { ok: false, mensaje: 'Ese pago cambió mientras tanto. Recarga la página.' };
  return { ok: true, referencia: v.referencia, userId: v.userId };
}
