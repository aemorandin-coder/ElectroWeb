import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';
import { hashGiftCardCode } from '@/lib/gift-card-crypto';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';

const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Efectivo',
  MOBILE_PAYMENT: 'Pago Móvil',
  ZELLE: 'Zelle',
  CARD: 'Punto de venta',
  CRYPTO: 'Binance Pay',
  OTHER: 'Otro',
};

/**
 * POST /api/admin/gift-cards/activate (C-71)
 * Venta en caja de una tarjeta impresa: se escribe o escanea el código, se elige cómo pagó el cliente
 * y la tarjeta pasa de INACTIVE a ACTIVE. Queda registrado quién la vendió, cuándo y con qué método.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 80) : '';

  if (code.length < 8 || code.length > 20) {
    return NextResponse.json({ error: 'Escribe el código completo de la tarjeta' }, { status: 400 });
  }
  if (!PAYMENT_METHODS[paymentMethod]) {
    return NextResponse.json({ error: 'Elige cómo pagó el cliente' }, { status: 400 });
  }

  const giftCard = await prisma.giftCard.findFirst({
    where: { OR: [{ codeHash: hashGiftCardCode(code) }, { code }] },
    select: { id: true, code: true, status: true, amountUSD: true, balanceUSD: true, pin: true },
  });
  if (!giftCard) {
    return NextResponse.json({ error: 'No existe una gift card con ese código' }, { status: 404 });
  }
  if (giftCard.status !== 'INACTIVE') {
    const message = giftCard.status === 'ACTIVE'
      ? 'Esta tarjeta ya estaba activa. No se cobró de nuevo.'
      : 'Esta tarjeta no se puede activar en su estado actual.';
    return NextResponse.json({ error: message, status: giftCard.status }, { status: 409 });
  }

  const admin = session!.user;
  const soldAt = new Date();
  const methodLabel = PAYMENT_METHODS[paymentMethod];

  // Condicional: si dos cajas la activan a la vez, solo una gana
  const activated = await prisma.$transaction(async (tx) => {
    const updated = await tx.giftCard.updateMany({
      where: { id: giftCard.id, status: 'INACTIVE' },
      data: { status: 'ACTIVE', activatedAt: soldAt },
    });
    if (updated.count !== 1) return false;
    await tx.giftCardTransaction.create({
      data: {
        giftCardId: giftCard.id,
        type: 'ACTIVATION',
        amountUSD: giftCard.amountUSD,
        balanceBefore: giftCard.balanceUSD,
        balanceAfter: giftCard.balanceUSD,
        userId: admin.id,
        userEmail: admin.email,
        description: `Vendida en tienda · ${methodLabel}${reference ? ` · Ref. ${reference}` : ''}`,
      },
    });
    return true;
  });

  if (!activated) {
    return NextResponse.json({ error: 'Otra persona acaba de activar esta tarjeta' }, { status: 409 });
  }

  await createAuditLog({
    action: 'GIFT_CARD_ACTIVATED',
    userId: admin.id,
    userEmail: admin.email || undefined,
    severity: 'INFO',
    targetType: 'GIFT_CARD',
    targetId: giftCard.id,
    details: { codeLast4: giftCard.code.slice(-4), amount: Number(giftCard.amountUSD), paymentMethod, reference: reference || undefined },
    ...getRequestMetadata(request),
  });

  emitAdminEvent({
    type: 'GIFT_CARD_SOLD_IN_STORE',
    title: `Gift card vendida en tienda · ${formatUSD(Number(giftCard.amountUSD))}`,
    summary: `${admin.name || admin.email || 'Un administrador'} activó una tarjeta impresa`,
    fields: [['Tarjeta', `termina en ${giftCard.code.slice(-4)}`], ['Pago', methodLabel], ['Referencia', reference || null]],
    link: '/admin/gift-cards',
  });

  return NextResponse.json({
    success: true,
    giftCard: {
      id: giftCard.id,
      codeLast4: giftCard.code.slice(-4),
      amountUSD: Number(giftCard.amountUSD),
      status: 'ACTIVE',
      activatedAt: soldAt,
      paymentMethod: methodLabel,
      requiresPin: Boolean(giftCard.pin),
    },
  });
}
