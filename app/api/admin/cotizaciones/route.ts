import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { aCotizacionAdmin, crearCotizacion } from '@/lib/cotizaciones';
import { ESTADOS_COTIZACION, cotizacionSchema, estaVencida } from '@/lib/cotizaciones/core';

// Cotizaciones del panel (C-148): lista y alta. Quien atiende órdenes atiende cotizaciones.

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const estado = params.get('estado') ?? '';
  const buscar = (params.get('buscar') ?? '').trim().slice(0, 80);
  const where: Prisma.QuoteWhereInput = {
    ...((ESTADOS_COTIZACION as readonly string[]).includes(estado) ? { status: estado } : {}),
    ...(buscar ? { OR: [
      { number: { contains: buscar, mode: 'insensitive' } },
      { clientName: { contains: buscar, mode: 'insensitive' } },
      { clientDoc: { contains: buscar, mode: 'insensitive' } },
      { contactName: { contains: buscar, mode: 'insensitive' } },
    ] } : {}),
  };
  const [filas, porEstado] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, number: true, status: true, clientName: true, contactName: true, subject: true, totalUSD: true, createdAt: true, sentAt: true, validityDays: true, approvedAt: true, _count: { select: { items: true } } },
    }),
    prisma.quote.groupBy({ by: ['status'], _count: true }),
  ]);
  return NextResponse.json({
    cotizaciones: filas.map((q) => ({
      id: q.id,
      number: q.number,
      status: estaVencida(q.status, q.sentAt, q.validityDays) ? 'EXPIRED' : q.status,
      clientName: q.clientName,
      contactName: q.contactName,
      subject: q.subject,
      totalUSD: Number(q.totalUSD),
      lineas: q._count.items,
      createdAt: q.createdAt.toISOString(),
      sentAt: q.sentAt?.toISOString() ?? null,
      approvedAt: q.approvedAt?.toISOString() ?? null,
    })),
    porEstado: Object.fromEntries(porEstado.map((e) => [e.status, e._count])),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const datos = cotizacionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    const problema = datos.error.issues[0];
    return NextResponse.json({ error: problema?.message ?? 'Revisa los datos', field: problema?.path.join('.') }, { status: 400 });
  }
  const cotizacion = await crearCotizacion(datos.data, { status: 'DRAFT', createdById: session.user.id });
  await registrarAccionAdmin(session, 'ORDER_CREATED', { type: 'QUOTE', id: cotizacion.id }, { accion: 'Creó una cotización', numero: cotizacion.number, cliente: cotizacion.clientName }, request);
  return NextResponse.json({ cotizacion: aCotizacionAdmin(cotizacion) }, { status: 201 });
}
