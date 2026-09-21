import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';
import { montoDecimal, roundMoney } from '@/lib/pricing';

export const REF_COOKIE = 'electroshop_ref';

/**
 * Reglas de comisiones de promotores (C-75, decisión de Andrés del 16/09):
 * - Solo generan comisión las **compras pagadas**. La comisión nace cuando la orden queda pagada
 *   (al crearse ya pagada o cuando el admin confirma el pago), nunca al crear una orden sin pagar.
 * - Las recargas no generan comisión: ese dinero se comisiona cuando se gasta. Antes una recarga y la
 *   compra hecha con ese saldo pagaban dos veces sobre el mismo dinero.
 * - Si la orden se cancela, su comisión pendiente se rechaza sola.
 * - Un registro queda como dato (sin comisión) y no espera aprobación.
 * - La comisión se acredita como saldo de la tienda, nunca como dinero.
 */

type Cliente = Prisma.TransactionClient | typeof prisma;

async function promotorDe(db: Cliente, referredUserId: string) {
  const user = await db.user.findUnique({ where: { id: referredUserId }, select: { referredByCode: true } });
  if (!user?.referredByCode) return null;
  const influencer = await db.influencer.findUnique({
    where: { code: user.referredByCode, status: 'ACTIVE' },
    select: { id: true, userId: true, commissionRate: true, name: true, code: true },
  });
  // Sin autocomisión
  if (!influencer || influencer.userId === referredUserId) return null;
  return influencer;
}

/** Registro de un cliente referido: queda como dato, sin comisión ni aprobación pendiente. */
export async function recordRegistration(referredUserId: string) {
  const influencer = await promotorDe(prisma, referredUserId);
  if (!influencer) return null;
  return prisma.referralConversion.create({
    data: {
      influencerId: influencer.id,
      referredUserId,
      type: 'REGISTRATION',
      grossAmount: 0,
      commission: 0,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });
}

/**
 * Comisión de una orden pagada. Idempotente: si la orden ya tiene comisión, no crea otra
 * (el admin puede confirmar el pago dos veces o la orden puede nacer pagada).
 */
export async function recordPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, orderNumber: true, totalUSD: true, paymentStatus: true, status: true },
  });
  if (!order?.userId || order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') return null;

  const influencer = await promotorDe(prisma, order.userId);
  if (!influencer) return null;

  const existente = await prisma.referralConversion.findFirst({ where: { orderId: order.id }, select: { id: true } });
  if (existente) return null;

  const grossAmount = Number(order.totalUSD);
  const commission = roundMoney((grossAmount * Number(influencer.commissionRate)) / 100);

  const conversion = await prisma.referralConversion.create({
    data: {
      influencerId: influencer.id,
      referredUserId: order.userId,
      type: 'PURCHASE',
      grossAmount: montoDecimal(grossAmount),
      commission: montoDecimal(commission),
      orderId: order.id,
      status: 'PENDING',
    },
  });

  emitAdminEvent({
    type: 'REFERRAL_CONVERSION',
    title: `Promotor ${influencer.name} · una compra`.slice(0, 150),
    summary: `Un cliente referido con el código ${influencer.code} pagó la orden ${order.orderNumber}`,
    fields: [
      ['Monto', formatUSD(grossAmount)],
      ['Comisión por aprobar', commission > 0 ? formatUSD(commission) : null],
    ],
    link: '/admin/marketing#promotores',
  });

  return conversion;
}

/** La orden se canceló: su comisión pendiente se rechaza. Una ya aprobada no se toca (el saldo ya se acreditó). */
export async function rejectOrderConversions(orderId: string, db: Cliente = prisma) {
  return db.referralConversion.updateMany({
    where: { orderId, status: 'PENDING' },
    data: { status: 'REJECTED' },
  });
}

/**
 * Aprueba una comisión y acredita el saldo del promotor, todo en una transacción.
 * El cambio de PENDING a APPROVED se hace primero y con condición: dos clics seguidos ya no acreditan dos veces
 * (antes el estado se leía fuera de la transacción).
 */
export async function approveConversion(conversionId: string, influencerId: string) {
  const resultado = await prisma.$transaction(async (tx) => {
    const conversion = await tx.referralConversion.findFirst({
      where: { id: conversionId, influencerId },
      include: { influencer: { select: { userId: true } } },
    });
    if (!conversion) throw new Error('La comisión no es de este promotor');

    // Una compra cuya orden se canceló o dejó de estar pagada no se paga
    if (conversion.type === 'PURCHASE' && conversion.orderId) {
      const order = await tx.order.findUnique({ where: { id: conversion.orderId }, select: { paymentStatus: true, status: true } });
      if (!order || order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') {
        // Se devuelve en vez de lanzar: un throw aquí deshacía el rechazo junto con la transacción
        await tx.referralConversion.updateMany({ where: { id: conversionId, status: 'PENDING' }, data: { status: 'REJECTED' } });
        return { ok: false as const };
      }
    }

    const marcada = await tx.referralConversion.updateMany({
      where: { id: conversionId, influencerId, status: 'PENDING' },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    if (marcada.count === 0) throw new Error('La comisión ya no está pendiente');

    const monto = Number(conversion.commission);
    if (monto > 0) {
      const balance = await tx.userBalance.upsert({
        where: { userId: conversion.influencer.userId },
        create: { userId: conversion.influencer.userId, balance: 0, currency: 'USD' },
        update: {},
      });
      await tx.userBalance.update({ where: { id: balance.id }, data: { balance: { increment: montoDecimal(monto) } } });
      await tx.transaction.create({
        data: {
          balanceId: balance.id,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: montoDecimal(monto),
          currency: 'USD',
          description: 'Comisión de promotor por una compra referida',
          reference: `REF-${conversion.id}`,
          paymentMethod: 'REFERRAL',
        },
      });
    }

    return { ok: true as const, id: conversion.id };
  });

  if (!resultado.ok) throw new Error('La orden de esta comisión ya no está pagada: se rechazó');
  return resultado.id;
}
