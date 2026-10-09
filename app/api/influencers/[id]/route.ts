import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { approveConversion, fechaDeAcreditacion, motivoEfectivo } from '@/lib/influencer-commission';
import { edicionPromotorSchema } from '@/lib/influencer-admin';
import { sincronizarCupon } from '@/lib/influencer-cupon';
import { exigirVersion, registrarCambio, respuestaCambiado, respuestaNoExiste } from '@/lib/edicion/registro';
import { clavesCambiadas, nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';

const CAMPOS_PROMOTOR: Record<string, string> = { name: 'nombre', commissionRate: 'comisión', customerDiscountPercent: 'descuento al cliente', status: 'estado', notes: 'notas' };
const RESUMEN_PROMOTOR = { user: { select: { id: true, name: true, email: true } } } as const;

type Params = { params: Promise<{ id: string }> };

const idsSchema = z.array(z.string().min(1).max(40)).min(1, 'Selecciona al menos una comisión').max(200);

const accionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve_conversions'), conversionIds: idsSchema }),
  z.object({ action: z.literal('reject_conversions'), conversionIds: idsSchema }),
]);

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
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, deliveredAt: true },
      })
    : [];
  const porId = new Map(orders.map((o) => [o.id, o]));

  return NextResponse.json({
    id: influencer.id,
    code: influencer.code,
    name: influencer.name,
    commissionRate: Number(influencer.commissionRate),
    customerDiscountPercent: influencer.customerDiscountPercent,
    status: influencer.status,
    notes: influencer.notes,
    user: influencer.user,
    conversions: influencer.conversions.map((c) => {
      const order = c.orderId ? porId.get(c.orderId) ?? null : null;
      return {
        id: c.id,
        type: c.type,
        status: c.status,
        source: c.source,
        grossAmount: Number(c.grossAmount),
        baseAmount: c.baseAmount === null ? null : Number(c.baseAmount),
        commission: Number(c.commission),
        createdAt: c.createdAt,
        approvedAt: c.approvedAt,
        // C-167: por qué espera revisión, o cuándo se acredita sola
        heldReason: motivoEfectivo(c),
        creditsAt: fechaDeAcreditacion(c, order)?.toISOString() ?? null,
        referredUser: c.referredUser,
        order: order ? { id: order.id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus } : null,
      };
    }),
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

  // C-170: pausar o activar es un cambio de una sola cosa y no pide versión; editar nombre, comisión o descuento sí
  const { baseUpdatedAt, ...resto } = (body ?? {}) as Record<string, unknown>;
  const edicion = edicionPromotorSchema.safeParse(resto);
  if (!edicion.success) {
    return NextResponse.json({ error: edicion.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const soloEstado = Object.keys(resto).every((clave) => clave === 'status');
  let base: Date | null = null;
  if (!soloEstado) {
    const v = exigirVersion(baseUpdatedAt);
    if ('respuesta' in v) return v.respuesta;
    base = v.base;
  }

  const antes = await prisma.influencer.findUnique({ where: { id } });
  if (!antes) return respuestaNoExiste('promotor');

  // Se toma el promotor solo si sigue en la versión con que se abrió el editor: dos guardados a la vez no se pisan
  const updated = await prisma.$transaction(async (tx) => {
    const tomado = await tx.influencer.updateMany({ where: { id, ...(base ? { updatedAt: base } : {}) }, data: { updatedAt: new Date() } });
    if (tomado.count === 0) return null;
    return tx.influencer.update({ where: { id }, data: edicion.data, include: RESUMEN_PROMOTOR });
  });
  if (!updated) {
    const actual = await prisma.influencer.findUnique({ where: { id }, include: RESUMEN_PROMOTOR });
    if (!actual) return respuestaNoExiste('promotor');
    return respuestaCambiado({ tipo: 'INFLUENCER', id, etiqueta: 'promotor', actual: { ...actual, commissionRate: Number(actual.commissionRate) } });
  }
  // C-167: el cupón sigue al promotor (nombre, % al cliente y pausa)
  await sincronizarCupon(updated).catch((error) => console.error('[PROMOTORES] Cupón:', error));
  const cambios = clavesCambiadas(antes as unknown as Record<string, unknown>, edicion.data);
  if (cambios.length > 0) {
    await registrarCambio({ session, request: req, recurso: `influencer:${id}`, tipo: 'INFLUENCER', id, nombre: updated.name, campos: cambios.map((c) => CAMPOS_PROMOTOR[c] ?? c) });
  }
  return NextResponse.json({ ...updated, commissionRate: Number(updated.commissionRate) });
}

// DELETE /api/influencers/[id] — solo si no tiene historial; si lo tiene, se pausa
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  // C-170: otra persona tiene abierto su editor ahora: se avisa antes de borrarlo (con ?forzar=1 se sigue)
  const editores = editoresDe(`influencer:${id}`, session?.user?.id);
  if (editores.length > 0 && new URL(req.url).searchParams.get('forzar') !== '1') {
    return NextResponse.json({ error: `${editores.map((e) => e.nombre).join(' y ')} lo está editando ahora mismo`, conflicto: 'en_edicion', editores }, { status: 409 });
  }

  const influencer = await prisma.influencer.findUnique({ where: { id }, select: { id: true, _count: { select: { conversions: true } } } });
  if (!influencer) return NextResponse.json({ error: 'Promotor no encontrado' }, { status: 404 });

  // Borrar se llevaba en cascada todo su historial de comisiones, también las ya pagadas
  if (influencer._count.conversions > 0) {
    return NextResponse.json(
      { error: 'Este promotor tiene comisiones registradas. Páusalo en lugar de eliminarlo para conservar el historial.' },
      { status: 409 }
    );
  }

  // Su cupón se va con él (nunca se usó: sin comisiones no hay compras con su código que contar)
  await prisma.promotion.deleteMany({ where: { influencerId: id, usesCount: 0 } });
  await prisma.promotion.updateMany({ where: { influencerId: id }, data: { isActive: false } });
  await prisma.influencer.delete({ where: { id } });
  publicarRecursoCambiado(`influencer:${id}`, 'eliminado', { id: session?.user?.id ?? '', nombre: nombreDeSesion(session) });
  return NextResponse.json({ ok: true });
}
