import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { emitAdminEvent } from '@/lib/admin-events';
import { CONDITION_LABEL, WARRANTY_REASONS, warrantyDaysFor } from '@/lib/product-condition';
import { claimCode, WARRANTY_MESSAGE_MAX } from '@/lib/warranty';
import { parseCustomerPhotos, photosToJson } from '@/lib/warranty-server';

// Solicitudes de garantía del cliente. C-119 las mandaba a Mensajes y Solicitudes; C-122 les da su módulo:
// estados, historial con el equipo y fotos.

const DAY_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  orderId: z.string().min(1).max(40),
  itemId: z.string().min(1).max(40),
  reason: z.enum(Object.keys(WARRANTY_REASONS) as [keyof typeof WARRANTY_REASONS, ...(keyof typeof WARRANTY_REASONS)[]]),
  description: z.string().trim().min(15, 'Cuéntanos un poco más del problema (mínimo 15 caracteres)').max(WARRANTY_MESSAGE_MAX),
  photos: z.unknown().optional(),
});

// GET — las solicitudes de garantía del cliente, con su estado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const claims = await prisma.warrantyClaim.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true, number: true, productName: true, productCondition: true, status: true, resolution: true, reason: true,
      warrantyDays: true, createdAt: true, updatedAt: true, order: { select: { orderNumber: true } },
    },
  });
  return NextResponse.json({
    claims: claims.map(({ order, ...c }) => ({ ...c, code: claimCode(c.number), orderNumber: order.orderNumber })),
  });
}

// POST — nueva solicitud: solo de un producto de un pedido propio, entregado y dentro de su garantía
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;

  const rateLimit = checkRateLimit(userId, 'warranty:request', RATE_LIMITS.STANDARD);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Has enviado muchas solicitudes. Espera unos minutos.' }, { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.STANDARD) });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { orderId, itemId, reason, description } = parsed.data;
  const photos = parseCustomerPhotos(parsed.data.photos, userId);
  if (!photos) return NextResponse.json({ error: 'Fotos inválidas: súbelas de nuevo' }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveredAt: true,
      user: { select: { name: true } },
      items: { where: { id: itemId }, select: { id: true, productName: true, productCondition: true, warrantyDays: true } },
    },
  });
  const item = order?.items[0];
  if (!order || !item) return NextResponse.json({ error: 'No encontramos ese producto en tus pedidos' }, { status: 404 });
  if (order.status !== 'DELIVERED' || !order.deliveredAt) {
    return NextResponse.json({ error: 'La garantía empieza cuando el pedido se entrega' }, { status: 400 });
  }
  const days = warrantyDaysFor(item.productCondition, item.warrantyDays);
  const since = Math.floor((Date.now() - order.deliveredAt.getTime()) / DAY_MS);
  if (since > days) {
    return NextResponse.json({ error: `Este producto tenía ${days} días de garantía y se entregó hace ${since}` }, { status: 400 });
  }

  // Una solicitud abierta por producto: si ya hay una, se sigue ahí
  const open = await prisma.warrantyClaim.findFirst({
    where: { orderItemId: item.id, status: { notIn: ['RESOLVED', 'REJECTED'] } },
    select: { number: true },
  });
  if (open) {
    return NextResponse.json({ error: `Ya tienes la solicitud ${claimCode(open.number)} abierta para este producto: escríbenos ahí.` }, { status: 409 });
  }

  const productName = item.productName ?? 'Producto';
  const claim = await prisma.warrantyClaim.create({
    data: {
      userId,
      orderId: order.id,
      orderItemId: item.id,
      reason,
      description,
      productName,
      productCondition: item.productCondition,
      warrantyDays: days,
      deliveredAt: order.deliveredAt,
      events: {
        create: { kind: 'CREATED', byCustomer: true, authorId: userId, authorName: order.user?.name ?? null, status: 'RECEIVED', message: description, photos: photosToJson(photos) },
      },
    },
    select: { id: true, number: true },
  });

  const condition = CONDITION_LABEL[item.productCondition ?? 'NEW'];
  emitAdminEvent({
    type: 'WARRANTY_REQUEST',
    title: `Garantía ${claimCode(claim.number)} · Pedido #${order.orderNumber}`.slice(0, 150),
    summary: `${order.user?.name || 'Un cliente'} pidió garantía de ${productName}`,
    fields: [
      ['Motivo', WARRANTY_REASONS[reason]],
      ['Producto', `${productName} (${condition})`],
      ['Garantía', `${days} días, entregado hace ${since}`],
      ['Fotos', photos.length ? String(photos.length) : 'Sin fotos'],
      ['Detalle', description.slice(0, 600)],
    ],
    link: `/admin/garantias/${claim.id}`,
  });

  return NextResponse.json({ ok: true, id: claim.id, code: claimCode(claim.number) }, { status: 201 });
}
