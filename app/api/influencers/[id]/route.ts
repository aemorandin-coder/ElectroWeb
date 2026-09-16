import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { approveConversion } from '@/lib/influencer-commission';

type Params = { params: Promise<{ id: string }> };

const idsSchema = z.array(z.string().min(1).max(40)).min(1, 'Selecciona al menos una comisión').max(200);

const accionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve_conversions'), conversionIds: idsSchema }),
  z.object({ action: z.literal('reject_conversions'), conversionIds: idsSchema }),
]);

// Antes se guardaba cualquier % de comisión y cualquier estado
const edicionSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre es muy corto').max(80).optional(),
    commissionRate: z.coerce.number().min(0, 'La comisión no puede ser negativa').max(50, 'La comisión máxima es 50%').optional(),
    status: z.enum(['ACTIVE', 'PAUSED']).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

// GET /api/influencers/[id] — detalle con conversiones y el estado de la orden de cada compra
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;

  const influencer = await prisma.influencer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      conversions: {
        include: { referredUser: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!influencer) return NextResponse.json({ error: 'Promotor no encontrado' }, { status: 404 });

  // Para aprobar hay que ver de qué orden viene la comisión y si sigue pagada
  const orderIds = influencer.conversions.map((c) => c.orderId).filter((v): v is string => Boolean(v));
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true },
      })
    : [];
  const porId = new Map(orders.map((o) => [o.id, o]));

  return NextResponse.json({
    id: influencer.id,
    code: influencer.code,
    name: influencer.name,
    commissionRate: Number(influencer.commissionRate),
    status: influencer.status,
    notes: influencer.notes,
    user: influencer.user,
    conversions: influencer.conversions.map((c) => ({
      id: c.id,
      type: c.type,
      status: c.status,
      grossAmount: Number(c.grossAmount),
      commission: Number(c.commission),
      createdAt: c.createdAt,
      approvedAt: c.approvedAt,
      referredUser: c.referredUser,
      order: c.orderId ? porId.get(c.orderId) ?? null : null,
    })),
  });
}

// PATCH /api/influencers/[id] — editar, aprobar o rechazar comisiones
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body && typeof body === 'object' && 'action' in body) {
    const accion = accionSchema.safeParse(body);
    if (!accion.success) {
      return NextResponse.json({ error: accion.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    if (accion.data.action === 'approve_conversions') {
      // Una por una y en serie: cada una es su propia transacción y un fallo no frena a las demás
      let approved = 0;
      const errores: string[] = [];
      for (const conversionId of accion.data.conversionIds) {
        try {
          await approveConversion(conversionId, id);
          approved++;
        } catch (error) {
          errores.push(error instanceof Error ? error.message : 'Error al aprobar');
        }
      }
      return NextResponse.json({ approved, failed: errores.length, errores: [...new Set(errores)] });
    }

    // Rechazar: solo las pendientes de este promotor
    const rechazadas = await prisma.referralConversion.updateMany({
      where: { id: { in: accion.data.conversionIds }, influencerId: id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    return NextResponse.json({ rejected: rechazadas.count });
  }

  const edicion = edicionSchema.safeParse(body);
  if (!edicion.success) {
    return NextResponse.json({ error: edicion.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const existe = await prisma.influencer.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: 'Promotor no encontrado' }, { status: 404 });

  const updated = await prisma.influencer.update({
    where: { id },
    data: edicion.data,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ ...updated, commissionRate: Number(updated.commissionRate) });
}

// DELETE /api/influencers/[id] — solo si no tiene historial; si lo tiene, se pausa
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;

  const influencer = await prisma.influencer.findUnique({ where: { id }, select: { id: true, _count: { select: { conversions: true } } } });
  if (!influencer) return NextResponse.json({ error: 'Promotor no encontrado' }, { status: 404 });

  // Borrar se llevaba en cascada todo su historial de comisiones, también las ya pagadas
  if (influencer._count.conversions > 0) {
    return NextResponse.json(
      { error: 'Este promotor tiene comisiones registradas. Páusalo en lugar de eliminarlo para conservar el historial.' },
      { status: 409 }
    );
  }

  await prisma.influencer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
