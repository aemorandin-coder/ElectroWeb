import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, hasPermission } from '@/lib/auth-helpers';
import { normalizarDiseno } from '@/lib/dashboard/widgets';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// C-171: el Dashboard de cada administrador. Uno por persona (su id sale de la sesión, nunca del cuerpo).
//   PUT    { widgets?: [{ id, tamano }], accesos?: [ids], metaMesUSD?: número | null }   guarda lo que venga
//   DELETE vuelve al diseño de fábrica (la meta del mes se conserva)
// Lo que manda el navegador pasa por `normalizarDiseno`: sin widgets desconocidos ni sin permiso, y con los obligatorios siempre.

const META_MAXIMA = 100_000_000;

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { widgets?: unknown; accesos?: unknown; metaMesUSD?: unknown } | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  if (Array.isArray(body.widgets) && body.widgets.length > 100) return NextResponse.json({ error: 'Demasiados widgets' }, { status: 400 });

  const puede = (permiso: string) => hasPermission(session, permiso);
  const userId = session.user.id;
  const actual = await prisma.adminDashboardLayout.findUnique({ where: { userId } });
  const diseno = normalizarDiseno(body.widgets ?? actual?.widgets, body.accesos ?? actual?.accesos, puede);

  const config: Record<string, unknown> = actual?.config && typeof actual.config === 'object' && !Array.isArray(actual.config) ? { ...(actual.config as Record<string, unknown>) } : {};
  if (body.metaMesUSD !== undefined) {
    // La meta es un número del negocio: solo el dueño la escribe
    if (!puede('MANAGE_SETTINGS')) return NextResponse.json({ error: 'Solo el dueño puede poner la meta' }, { status: 403 });
    if (body.metaMesUSD === null || body.metaMesUSD === '') delete config.metaMesUSD;
    else {
      const meta = Number(body.metaMesUSD);
      if (!Number.isFinite(meta) || meta <= 0 || meta > META_MAXIMA) return NextResponse.json({ error: 'Escribe una meta mayor que cero' }, { status: 400 });
      config.metaMesUSD = Math.round(meta * 100) / 100;
    }
  }

  const datos = { widgets: diseno.widgets as unknown as Prisma.InputJsonValue, accesos: diseno.accesos as unknown as Prisma.InputJsonValue, config: config as Prisma.InputJsonValue };
  await prisma.adminDashboardLayout.upsert({ where: { userId }, create: { userId, ...datos }, update: datos });
  return NextResponse.json({ ...diseno, metaMesUSD: typeof config.metaMesUSD === 'number' ? config.metaMesUSD : null });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const puede = (permiso: string) => hasPermission(session, permiso);
  const fabrica = normalizarDiseno(undefined, undefined, puede);
  await prisma.adminDashboardLayout.updateMany({
    where: { userId: session.user.id },
    data: { widgets: fabrica.widgets as unknown as Prisma.InputJsonValue, accesos: fabrica.accesos as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(fabrica);
}
