import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { actualizarRastreoZoom } from '@/lib/envios/seguimiento';

// POST /api/orders/[id]/rastreo (C-126): "Consultar ZOOM ahora" del detalle de la orden.
// La página pública de ZOOM no toma la guía del enlace (abre el buscador vacío); el rastreo real sale de su API,
// la misma que corre el cron cada 2 horas. Si ZOOM marca la entrega, la orden se cierra y el cliente recibe el aviso.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAuthorized(session, 'MANAGE_ORDERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!checkRateLimit(session.user.id, 'orders:rastreo', RATE_LIMITS.STANDARD).success) {
    return NextResponse.json({ error: 'Espera un momento antes de volver a consultar.' }, { status: 429 });
  }

  const { id } = await params;
  const orden = await prisma.order.findUnique({ where: { id }, select: { status: true, shippingCarrier: true, trackingNumber: true } });
  if (!orden) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  if (orden.shippingCarrier !== 'ZOOM' || !orden.trackingNumber || orden.status !== 'SHIPPED') {
    return NextResponse.json({ error: 'Solo se consultan guías de ZOOM de órdenes enviadas.' }, { status: 400 });
  }

  try {
    // intervaloMs 0: se consulta aunque el cron la haya revisado hace poco
    const resultado = await actualizarRastreoZoom({ orderIds: [id], intervaloMs: 0 });
    const actualizada = await prisma.order.findUnique({
      where: { id },
      select: { status: true, deliveredAt: true, trackingCheckedAt: true, shipmentEvents: { orderBy: { occurredAt: 'asc' } } },
    });
    return NextResponse.json({ ...actualizada, respondio: resultado.sinRespuesta === 0, eventosNuevos: resultado.eventosNuevos });
  } catch (error) {
    console.error('[rastreo] consulta ZOOM', { id, error });
    return NextResponse.json({ error: 'No pudimos consultar a ZOOM. Intenta en unos minutos.' }, { status: 502 });
  }
}
