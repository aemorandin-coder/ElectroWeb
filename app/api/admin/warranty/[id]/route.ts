import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { formatPuntos, formatUSD } from '@/lib/currency';
import { montoDecimal, roundMoney } from '@/lib/pricing';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { CLAIM_STATUSES, claimCode, isClosedStatus, RESOLUTIONS, WARRANTY_MESSAGE_MAX } from '@/lib/warranty';
import { notifyCustomer, photosFromJson } from '@/lib/warranty-server';

type Params = { params: Promise<{ id: string }> };

// GET — una solicitud con todo: historial (con notas internas), cliente y pedido
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const claim = await prisma.warrantyClaim.findUnique({
    where: { id },
    select: {
      id: true, number: true, productName: true, productCondition: true, status: true, resolution: true, reason: true,
      description: true, warrantyDays: true, deliveredAt: true, awaitingStaff: true, createdAt: true, updatedAt: true, closedAt: true,
      refundUSD: true, refundTransactionId: true,
      user: { select: { id: true, name: true, email: true, profile: { select: { phone: true, whatsapp: true } } } },
      order: { select: { id: true, orderNumber: true, deliveryMethod: true, totalUSD: true } },
      orderItem: { select: { quantity: true, priceUSD: true, totalUSD: true, productSku: true, productImage: true, conditionGrade: true, productId: true } },
      events: { orderBy: { createdAt: 'asc' }, select: { id: true, kind: true, byCustomer: true, authorName: true, status: true, message: true, photos: true, createdAt: true } },
    },
  });
  if (!claim) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  // Otras solicitudes del mismo cliente: ayuda a ver si es un caso repetido
  const others = await prisma.warrantyClaim.findMany({
    where: { userId: claim.user.id, id: { not: claim.id } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, number: true, productName: true, status: true, createdAt: true },
  });
  const { events, orderItem, ...rest } = claim;
  return NextResponse.json({
    claim: {
      ...rest,
      code: claimCode(claim.number),
      refundUSD: rest.refundUSD === null ? null : Number(rest.refundUSD),
      order: { ...rest.order, totalUSD: Number(rest.order.totalUSD) },
      orderItem: { ...orderItem, priceUSD: Number(orderItem.priceUSD), totalUSD: Number(orderItem.totalUSD) },
    },
    events: events.map((e) => ({ ...e, photos: photosFromJson(e.photos) })),
    others: others.map((o) => ({ ...o, code: claimCode(o.number) })),
  });
}

const patchSchema = z
  .object({
    status: z.enum(CLAIM_STATUSES).optional(),
    resolution: z.enum(RESOLUTIONS).nullish(),
    /** Mensaje para el cliente (lo ve y le llega aviso) */
    message: z.string().trim().max(WARRANTY_MESSAGE_MAX).optional(),
    /** Nota interna: solo la ve el equipo */
    note: z.string().trim().max(WARRANTY_MESSAGE_MAX).optional(),
    /** Devolución al saldo (resuelta con BALANCE_REFUND): el monto lo escribe el equipo, con tope en el servidor */
    refundUSD: z.number().positive('El monto a devolver tiene que ser mayor que 0').max(100000).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.status && !v.message && !v.note) ctx.addIssue({ code: 'custom', message: 'No hay nada que guardar' });
    if (v.status === 'RESOLVED' && !v.resolution) ctx.addIssue({ code: 'custom', path: ['resolution'], message: 'Elige cómo se resolvió' });
    // El cliente tiene que saber por qué: lo piden la ley (Precios Justos) y los términos
    if (v.status === 'REJECTED' && (v.message?.length ?? 0) < 10) ctx.addIssue({ code: 'custom', path: ['message'], message: 'Explícale al cliente por qué no la cubre la garantía' });
    if (v.status === 'WAITING_CUSTOMER' && (v.message?.length ?? 0) < 5) ctx.addIssue({ code: 'custom', path: ['message'], message: 'Dile al cliente qué necesitas de él' });
  });

// PATCH — el equipo cambia el estado, responde al cliente o deja una nota interna. Todo queda en el historial
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { status, resolution, message, note, refundUSD } = parsed.data;

  const claim = await prisma.warrantyClaim.findUnique({
    where: { id },
    select: {
      id: true, number: true, userId: true, productName: true, status: true, resolution: true, refundTransactionId: true,
      user: { select: { name: true, email: true } },
      order: { select: { orderNumber: true, totalUSD: true, paymentStatus: true } },
      orderItem: { select: { totalUSD: true } },
    },
  });
  if (!claim) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });

  const statusChanged = !!status && status !== claim.status;
  // Con el dinero ya devuelto, la solicitud queda resuelta así: el historial y el saldo tienen que coincidir
  if (claim.refundTransactionId && (statusChanged || (resolution && resolution !== claim.resolution))) {
    return NextResponse.json({ error: 'Ya se devolvió el dinero en Puntos ES: el estado no se puede cambiar. Puedes escribirle al cliente o dejar una nota.' }, { status: 409 });
  }
  const finalStatus = status ?? claim.status;
  const finalResolution = finalStatus === 'RESOLVED' ? (resolution ?? claim.resolution) : null;
  const refunding = finalStatus === 'RESOLVED' && finalResolution === 'BALANCE_REFUND' && !claim.refundTransactionId;
  let refundAmount = 0;
  if (refunding) {
    // Tope: lo que costó esa línea del pedido, y nunca más que el total pagado
    const cap = roundMoney(Math.min(Number(claim.orderItem.totalUSD), Number(claim.order.totalUSD)));
    if (claim.order.paymentStatus !== 'PAID') return NextResponse.json({ error: 'El pedido no figura como pagado: no se puede devolver en Puntos ES.' }, { status: 400 });
    if (!refundUSD) return NextResponse.json({ error: 'Escribe cuánto se devuelve en Puntos ES' }, { status: 400 });
    refundAmount = roundMoney(refundUSD);
    if (refundAmount > cap) return NextResponse.json({ error: `No se puede devolver más de ${formatUSD(cap)} (lo que costó ese producto en el pedido)` }, { status: 400 });
  }

  const authorId = session?.user?.id ?? null;
  const authorName = session?.user?.name || session?.user?.email || 'Equipo';
  const events = [
    ...(statusChanged ? [{ kind: 'STATUS' as const, byCustomer: false, authorId, authorName, status }] : []),
    ...(message ? [{ kind: 'MESSAGE' as const, byCustomer: false, authorId, authorName, message }] : []),
    ...(note ? [{ kind: 'NOTE' as const, byCustomer: false, authorId, authorName, message: note }] : []),
  ];

  const refundText = refunding ? `Te devolvimos ${formatPuntos(refundAmount)}.` : null;
  if (refundText) events.push({ kind: 'MESSAGE' as const, byCustomer: false, authorId, authorName, message: refundText });
  const resolutionChanged = finalResolution !== claim.resolution;
  if (events.length === 0 && !resolutionChanged) return NextResponse.json({ error: 'No hay cambios' }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const data = {
      status: finalStatus,
      ...(statusChanged ? { closedAt: isClosedStatus(finalStatus) ? new Date() : null } : {}),
      // La resolución solo tiene sentido resuelta
      resolution: finalResolution,
      // Una nota interna sola no cuenta como atender al cliente
      ...(statusChanged || message ? { awaitingStaff: false } : {}),
      events: { create: events },
    };
    if (!refunding) return tx.warrantyClaim.update({ where: { id: claim.id }, data, select: { status: true, resolution: true } });

    // Devolución al saldo, una sola vez: si otro pedido del panel ya la hizo, se deshace todo
    const balance = await tx.userBalance.upsert({ where: { userId: claim.userId }, create: { userId: claim.userId }, update: {}, select: { id: true } });
    const credit = await tx.transaction.create({
      data: {
        balanceId: balance.id,
        type: 'REFUND',
        status: 'COMPLETED',
        amount: montoDecimal(refundAmount),
        currency: 'USD',
        description: `Garantía ${claimCode(claim.number)}: devolución de ${claim.productName}`.slice(0, 190),
        reference: claimCode(claim.number),
        metadata: JSON.stringify({ warrantyClaimId: claim.id, orderNumber: claim.order.orderNumber, porAdmin: authorName }),
      },
      select: { id: true },
    });
    const claimed = await tx.warrantyClaim.updateMany({
      where: { id: claim.id, refundTransactionId: null },
      data: { refundTransactionId: credit.id, refundUSD: montoDecimal(refundAmount) },
    });
    if (claimed.count !== 1) throw new Error('YA_DEVUELTO');
    await tx.userBalance.update({ where: { id: balance.id }, data: { balance: { increment: montoDecimal(refundAmount) } } });
    return tx.warrantyClaim.update({ where: { id: claim.id }, data, select: { status: true, resolution: true } });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'YA_DEVUELTO') return null;
    throw error;
  });
  if (!updated) return NextResponse.json({ error: 'Ya se devolvió el dinero de esta solicitud.' }, { status: 409 });

  if (refunding) {
    await registrarAccionAdmin(session, 'USER_BALANCE_MODIFIED', { type: 'USER', id: claim.userId }, {
      motivo: `Garantía ${claimCode(claim.number)}: devolución en Puntos ES`, montoUSD: refundAmount, pedido: claim.order.orderNumber,
    }, request);
  }
  if (statusChanged || message || refundText) {
    const aviso = [message, refundText].filter(Boolean).join('\n\n') || null;
    void notifyCustomer({ ...claim, status: updated.status }, aviso).catch((error) => console.error('[WARRANTY] Aviso al cliente:', error));
  }
  return NextResponse.json({ ok: true, status: updated.status, resolution: updated.resolution, code: claimCode(claim.number) });
}
