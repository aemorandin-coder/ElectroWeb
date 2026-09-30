import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { acreditarPagoSinOrden, archivarPagoSinOrden, MINUTOS_ANTES_DE_ACREDITAR, vincularPagoAOrden } from '@/lib/pago-movil-sin-orden';
import { registrarAccionAdmin } from '@/lib/audit-log';

type Params = { params: Promise<{ id: string }> };

// C-123: además de pasarlo al saldo, un pago que ya se atendió fuera del sistema se vincula a su orden o se archiva
const bodySchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('saldo') }),
  z.object({ accion: z.literal('vincular'), orderId: z.string().min(1).max(40) }),
  z.object({ accion: z.literal('archivar'), nota: z.string().trim().min(10, 'Escribe qué pasó con este pago (mínimo 10 caracteres)').max(500) }),
]);

// POST — Resuelve un Pago Móvil de compra que quedó sin orden (C-114, C-123). Sin cuerpo: pasa al saldo (como antes)
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const raw = await request.text();
  let input: unknown = { accion: 'saldo' };
  if (raw.trim()) {
    try { input = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }); }
  }
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.path[0] === 'accion' ? 'Acción inválida' : issue?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const body = parsed.data;
  const who = session?.user?.email || session?.user?.id || 'admin';

  if (body.accion === 'vincular') {
    const r = await vincularPagoAOrden(id, body.orderId);
    if (!r.ok) return NextResponse.json({ error: r.mensaje }, { status: 409 });
    await registrarAccionAdmin(session, 'ORPHAN_PAYMENT_LINKED', { type: 'ORDER', id: body.orderId }, {
      referencia: r.referencia, orden: r.orderNumber, pagoMovilVerificacionId: id,
    }, request);
    return NextResponse.json({ ok: true, orderNumber: r.orderNumber });
  }

  if (body.accion === 'archivar') {
    const r = await archivarPagoSinOrden(id, body.nota, who);
    if (!r.ok) return NextResponse.json({ error: r.mensaje }, { status: 409 });
    await registrarAccionAdmin(session, 'ORPHAN_PAYMENT_ARCHIVED', { type: 'USER', id: r.userId }, {
      referencia: r.referencia, nota: body.nota, pagoMovilVerificacionId: id,
    }, request);
    return NextResponse.json({ ok: true });
  }

  const v = await prisma.pagoMovilVerificacion.findUnique({ where: { id }, select: { createdAt: true } });
  if (!v) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  if (v.createdAt.getTime() > Date.now() - MINUTOS_ANTES_DE_ACREDITAR * 60_000) {
    return NextResponse.json({ error: `Espera ${MINUTOS_ANTES_DE_ACREDITAR} minutos desde el pago: el cliente puede estar terminando su compra.` }, { status: 409 });
  }
  const resultado = await acreditarPagoSinOrden(id, 'Pasado a Puntos ES desde el panel', who);
  if (!resultado.ok) return NextResponse.json({ error: resultado.mensaje }, { status: 409 });
  await registrarAccionAdmin(session, 'USER_BALANCE_MODIFIED', { type: 'USER', id: resultado.userId }, {
    motivo: 'Pago Móvil sin orden pasado a Puntos ES',
    referencia: resultado.referencia,
    montoUSD: resultado.montoUSD,
  }, request);
  return NextResponse.json({ ok: true, montoUSD: resultado.montoUSD });
}
