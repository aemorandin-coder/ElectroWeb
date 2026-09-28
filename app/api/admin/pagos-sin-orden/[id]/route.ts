import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { acreditarPagoSinOrden, MINUTOS_ANTES_DE_ACREDITAR } from '@/lib/pago-movil-sin-orden';
import { registrarAccionAdmin } from '@/lib/audit-log';

type Params = { params: Promise<{ id: string }> };

// POST — Pasa al saldo del cliente un Pago Móvil de compra que quedó sin orden (C-114)
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const v = await prisma.pagoMovilVerificacion.findUnique({ where: { id }, select: { createdAt: true } });
  if (!v) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  if (v.createdAt.getTime() > Date.now() - MINUTOS_ANTES_DE_ACREDITAR * 60_000) {
    return NextResponse.json({ error: `Espera ${MINUTOS_ANTES_DE_ACREDITAR} minutos desde el pago: el cliente puede estar terminando su compra.` }, { status: 409 });
  }
  const who = session?.user?.email || session?.user?.id || 'admin';
  const resultado = await acreditarPagoSinOrden(id, 'Pasado al saldo desde el panel', who);
  if (!resultado.ok) return NextResponse.json({ error: resultado.mensaje }, { status: 409 });
  await registrarAccionAdmin(session, 'USER_BALANCE_MODIFIED', { type: 'USER', id: resultado.userId }, {
    motivo: 'Pago Móvil sin orden pasado al saldo',
    referencia: resultado.referencia,
    montoUSD: resultado.montoUSD,
  }, request);
  return NextResponse.json({ ok: true, montoUSD: resultado.montoUSD });
}
