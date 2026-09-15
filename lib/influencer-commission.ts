import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';

export const REF_COOKIE = 'electroshop_ref';

/**
 * Record a referral conversion and create a PENDING commission.
 * Call this after a successful order or recharge.
 */
export async function recordConversion({
  referredUserId,
  type,
  grossAmount,
  orderId,
  transactionId,
}: {
  referredUserId: string;
  type: 'PURCHASE' | 'RECHARGE' | 'REGISTRATION';
  grossAmount: number;
  orderId?: string;
  transactionId?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { referredByCode: true },
  });

  if (!user?.referredByCode) return null;

  const influencer = await prisma.influencer.findUnique({
    where: { code: user.referredByCode, status: 'ACTIVE' },
    select: { id: true, userId: true, commissionRate: true, name: true, code: true },
  });

  if (!influencer) return null;

  // No self-commission
  if (influencer.userId === referredUserId) return null;

  const commission = (grossAmount * Number(influencer.commissionRate)) / 100;

  const conversion = await prisma.referralConversion.create({
    data: {
      influencerId: influencer.id,
      referredUserId,
      type,
      grossAmount,
      commission,
      orderId: orderId ?? null,
      transactionId: transactionId ?? null,
      status: 'PENDING',
    },
  });

  const what = { PURCHASE: 'una compra', RECHARGE: 'una recarga', REGISTRATION: 'un registro' }[type];
  emitAdminEvent({
    type: 'REFERRAL_CONVERSION',
    title: `Promotor ${influencer.name} · ${what}`.slice(0, 150),
    summary: `Un cliente referido con el código ${influencer.code} generó ${what}`,
    fields: [
      ['Monto', grossAmount > 0 ? formatUSD(grossAmount) : null],
      ['Comisión por aprobar', commission > 0 ? formatUSD(commission) : null],
    ],
    link: '/admin/marketing',
  });

  return conversion;
}

/**
 * Approve a conversion: set status=APPROVED and credit influencer's balance.
 * Returns the updated conversion or throws on error.
 */
export async function approveConversion(conversionId: string) {
  const conversion = await prisma.referralConversion.findUniqueOrThrow({
    where: { id: conversionId },
    include: { influencer: { select: { userId: true, commissionRate: true } } },
  });

  if (conversion.status !== 'PENDING') {
    throw new Error(`Conversion is already ${conversion.status}`);
  }

  const influencerUserId = conversion.influencer.userId;

  return prisma.$transaction(async (tx) => {
    // Ensure balance record exists
    let balance = await tx.userBalance.findUnique({ where: { userId: influencerUserId } });
    if (!balance) {
      balance = await tx.userBalance.create({
        data: { userId: influencerUserId, balance: 0, currency: 'USD' },
      });
    }

    // Credit the commission
    await tx.userBalance.update({
      where: { id: balance.id },
      data: { balance: { increment: conversion.commission } },
    });

    // Record transaction for traceability
    await tx.transaction.create({
      data: {
        balanceId: balance.id,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount: conversion.commission,
        currency: 'USD',
        description: `Comisión de referido — ${conversion.type}`,
        reference: `REF-${conversion.id}`,
        paymentMethod: 'REFERRAL',
      },
    });

    // Mark conversion as approved
    return tx.referralConversion.update({
      where: { id: conversionId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  });
}
