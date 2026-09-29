import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { emitAdminEvent } from '@/lib/admin-events';
import { CONDITION_LABEL, WARRANTY_REASONS, warrantyDaysFor } from '@/lib/product-condition';

// Solicitudes de garantía del cliente (C-119). Antes el formulario de "Garantía" era una simulación: decía
// "enviado" y no guardaba nada. Ahora cada solicitud llega a Mensajes y Solicitudes y avisa al equipo.

const SUBJECT_PREFIX = 'Garantía · ';
const DAY_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  orderId: z.string().min(1).max(40),
  itemId: z.string().min(1).max(40),
  reason: z.enum(Object.keys(WARRANTY_REASONS) as [keyof typeof WARRANTY_REASONS, ...(keyof typeof WARRANTY_REASONS)[]]),
  description: z.string().trim().min(15, 'Cuéntanos un poco más del problema (mínimo 15 caracteres)').max(2000),
});

// GET — las solicitudes de garantía del cliente, con su estado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const requests = await prisma.contactMessage.findMany({
    where: { email: session.user.email, subject: { startsWith: SUBJECT_PREFIX } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, subject: true, status: true, createdAt: true },
  });
  return NextResponse.json({ requests: requests.map((r) => ({ ...r, subject: r.subject.slice(SUBJECT_PREFIX.length) })) });
}

// POST — nueva solicitud: solo de un producto de un pedido propio, entregado y dentro de su garantía
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rateLimit = checkRateLimit(session.user.id, 'warranty:request', RATE_LIMITS.STANDARD);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Has enviado muchas solicitudes. Espera unos minutos.' }, { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.STANDARD) });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { orderId, itemId, reason, description } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      orderNumber: true,
      status: true,
      deliveredAt: true,
      user: { select: { name: true, email: true, profile: { select: { phone: true } } } },
      items: { where: { id: itemId }, select: { productName: true, productCondition: true, warrantyDays: true } },
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

  const productName = item.productName ?? 'Producto';
  const condition = CONDITION_LABEL[item.productCondition ?? 'NEW'];
  const subject = `${SUBJECT_PREFIX}Pedido #${order.orderNumber} · ${productName}`.slice(0, 150);
  const message = [
    `Motivo: ${WARRANTY_REASONS[reason]}`,
    `Producto: ${productName} (${condition})`,
    `Garantía de la tienda: ${days} días. Entregado hace ${since} ${since === 1 ? 'día' : 'días'}.`,
    '',
    description,
  ].join('\n');

  const saved = await prisma.contactMessage.create({
    data: {
      name: order.user?.name || 'Cliente',
      email: session.user.email,
      phone: order.user?.profile?.phone || '',
      subject,
      message,
      status: 'PENDING',
    },
    select: { id: true },
  });

  emitAdminEvent({
    type: 'WARRANTY_REQUEST',
    title: `Garantía · Pedido #${order.orderNumber}`.slice(0, 150),
    summary: `${order.user?.name || 'Un cliente'} pidió garantía de ${productName}`,
    fields: [['Motivo', WARRANTY_REASONS[reason]], ['Producto', `${productName} (${condition})`], ['Garantía', `${days} días, entregado hace ${since}`], ['Detalle', description.slice(0, 600)]],
    link: '/admin/inquiries',
  });

  return NextResponse.json({ ok: true, id: saved.id }, { status: 201 });
}
