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

/** Pagos de compra verificados por el banco, sin orden y sin acreditar */
export const pagoSinOrdenWhere = { verificado: true, contexto: 'ORDER', orderId: null, transactionId: null } as const;

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
    if (!v) return { ok: false, mensaje: 'Ese pago ya tiene orden, ya se acreditó o no está verificado.' };

    const settings = await tx.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } });
    const tasa = Number(settings?.exchangeRateVES ?? 0);
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
        description: `Pago Móvil sin orden (ref. ${v.referencia}): pasado a tu saldo`,
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
      title: 'Tu pago pasó a tu saldo',
      message: `No pudimos crear tu pedido, así que tu Pago Móvil (ref. ${resultado.referencia}) quedó como saldo: ${formatUSD(resultado.montoUSD)}. Puedes usarlo en tu próxima compra.`,
      link: '/customer/balance',
    });
    emitAdminEvent({
      type: 'ORDER_PAYMENT_ORPHAN',
      title: `Pago sin orden · ref. ${resultado.referencia}`,
      summary: `Un Pago Móvil de compra no llegó a ser orden y se pasó al saldo del cliente${porAdmin ? ' desde el panel' : ''}.`,
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
    summary: 'Un cliente pagó por Pago Móvil y la orden no se creó todavía. Si no la completa, pásalo a su saldo desde Transacciones.',
    fields: [
      ['Monto', formatVES(montoVES)],
      ['Motivo', motivo],
    ],
    link: '/admin/transactions',
    throttleKey: `orphan-${referencia}`,
    throttleMs: 60 * 60 * 1000,
  });
}
