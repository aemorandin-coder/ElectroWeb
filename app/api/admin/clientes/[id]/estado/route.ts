import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';

// C-276: suspender o reactivar la cuenta de un cliente desde su ficha, en vez de borrar a quien tiene historial
// (PLAN.md §7: se borran solo si no tienen órdenes, Puntos ES ni movimientos; si no, se desactivan).
// Suspendida (C-92): no entra (lib/auth.ts) y pierde la sesión que tenía abierta (lib/sesiones.ts). Pedidos, Puntos ES e
// historial quedan como están. Queda en la bitácora con el motivo (su ficha lo muestra).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const cliente = await prisma.user.findFirst({ where: { id, role: 'USER' }, select: { id: true, email: true, profile: { select: { accountStatus: true } } } });
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { accion?: unknown; motivo?: unknown } | null;

  if (body?.accion === 'suspender') {
    const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';
    if (motivo.length < 3) return NextResponse.json({ error: 'Escribe por qué' }, { status: 400 });
    if (motivo.length > 200) return NextResponse.json({ error: 'El motivo va hasta 200 letras' }, { status: 400 });
    if (cliente.profile?.accountStatus === 'SUSPENDED') return NextResponse.json({ ok: true });
    await prisma.$transaction([
      prisma.profile.upsert({ where: { userId: cliente.id }, create: { userId: cliente.id, accountStatus: 'SUSPENDED' }, update: { accountStatus: 'SUSPENDED' } }),
      prisma.userSession.updateMany({ where: { userId: cliente.id, revokedAt: null }, data: { revokedAt: new Date(), motivoCierre: 'CERRADA' } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: cliente.id } }),
    ]);
    await registrarAccionAdmin(session, 'CUSTOMER_SUSPENDED', { type: 'USER', id: cliente.id }, { cliente: cliente.email, motivo }, request);
    return NextResponse.json({ ok: true, cuenta: 'SUSPENDED' });
  }
  if (body?.accion === 'reactivar') {
    if (cliente.profile?.accountStatus !== 'SUSPENDED') return NextResponse.json({ ok: true });
    await prisma.profile.update({ where: { userId: cliente.id }, data: { accountStatus: 'ACTIVE' } });
    await registrarAccionAdmin(session, 'CUSTOMER_REACTIVATED', { type: 'USER', id: cliente.id }, { cliente: cliente.email }, request);
    return NextResponse.json({ ok: true, cuenta: 'ACTIVE' });
  }
  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
