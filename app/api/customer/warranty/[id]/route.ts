import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { emitAdminEvent } from '@/lib/admin-events';
import { claimCode, isClosedStatus, WARRANTY_MESSAGE_MAX } from '@/lib/warranty';
import { parseCustomerPhotos, photosFromJson, photosToJson } from '@/lib/warranty-server';

type Params = { params: Promise<{ id: string }> };

// GET — una solicitud del cliente con su historial (sin las notas internas del equipo)
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const claim = await prisma.warrantyClaim.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true, number: true, productName: true, productCondition: true, status: true, resolution: true, reason: true,
      warrantyDays: true, deliveredAt: true, createdAt: true, updatedAt: true,
      order: { select: { orderNumber: true } },
      events: {
        where: { kind: { not: 'NOTE' } },
        orderBy: { createdAt: 'asc' },
        // Del equipo no sale quién escribió: el cliente habla con la tienda
        select: { id: true, kind: true, byCustomer: true, status: true, message: true, photos: true, createdAt: true },
      },
    },
  });
  if (!claim) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  const { order, events, ...rest } = claim;
  return NextResponse.json({
    claim: { ...rest, code: claimCode(claim.number), orderNumber: order.orderNumber },
    events: events.map((e) => ({ ...e, photos: photosFromJson(e.photos) })),
  });
}

const replySchema = z.object({
  message: z.string().trim().min(2, 'Escribe tu mensaje').max(WARRANTY_MESSAGE_MAX),
  photos: z.unknown().optional(),
});

// POST — el cliente responde en su solicitud (con fotos si hacen falta). Cerrada, ya no se puede
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;

  const rateLimit = checkRateLimit(userId, 'warranty:reply', RATE_LIMITS.STANDARD);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Enviaste muchos mensajes seguidos. Espera unos minutos.' }, { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.STANDARD) });
  }

  const { id } = await params;
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const photos = parseCustomerPhotos(parsed.data.photos, userId);
  if (!photos) return NextResponse.json({ error: 'Fotos inválidas: súbelas de nuevo' }, { status: 400 });

  const claim = await prisma.warrantyClaim.findFirst({
    where: { id, userId },
    select: { id: true, number: true, status: true, productName: true, user: { select: { name: true } }, order: { select: { orderNumber: true } } },
  });
  if (!claim) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  if (isClosedStatus(claim.status)) {
    return NextResponse.json({ error: 'Esta solicitud está cerrada. Si el problema sigue, abre una nueva desde Garantía.' }, { status: 400 });
  }

  // Si el equipo esperaba al cliente, vuelve a revisión
  const nextStatus = claim.status === 'WAITING_CUSTOMER' ? 'IN_REVIEW' : claim.status;
  await prisma.warrantyClaim.update({
    where: { id: claim.id },
    data: {
      status: nextStatus,
      awaitingStaff: true,
      events: {
        create: [
          { kind: 'MESSAGE', byCustomer: true, authorId: userId, authorName: claim.user.name, message: parsed.data.message, photos: photosToJson(photos) },
          ...(nextStatus !== claim.status ? [{ kind: 'STATUS' as const, byCustomer: true, authorId: userId, status: nextStatus }] : []),
        ],
      },
    },
  });

  emitAdminEvent({
    type: 'WARRANTY_REPLY',
    title: `Garantía ${claimCode(claim.number)} · respuesta del cliente`,
    summary: `${claim.user.name || 'El cliente'} respondió sobre ${claim.productName} (pedido #${claim.order.orderNumber})`,
    fields: [['Mensaje', parsed.data.message.slice(0, 600)], ['Fotos', photos.length ? String(photos.length) : 'Sin fotos']],
    link: `/admin/garantias/${claim.id}`,
    throttleKey: `warranty-reply-${claim.id}`,
    throttleMs: 10 * 60 * 1000,
  });

  return NextResponse.json({ ok: true, status: nextStatus }, { status: 201 });
}
