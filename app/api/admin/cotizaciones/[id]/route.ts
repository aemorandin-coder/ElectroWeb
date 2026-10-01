import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { aCotizacionAdmin, aprobarCotizacion, buscarCotizacion, cerrarCotizacion, guardarCotizacion, resumenInventario } from '@/lib/cotizaciones';
import { cotizacionSchema } from '@/lib/cotizaciones/core';

// Una cotización del panel (C-148): leer, guardar, enviar, cerrar y borrar.

const ID = /^[a-z0-9]{10,40}$/;
type Contexto = { params: Promise<{ id: string }> };

async function autorizado() {
  const session = await getServerSession(authOptions);
  return session && isAuthorized(session, 'MANAGE_ORDERS') ? session : null;
}
const noAutorizado = () => NextResponse.json({ error: 'No autorizado' }, { status: 403 });
const noExiste = () => NextResponse.json({ error: 'Esa cotización no existe.' }, { status: 404 });

export async function GET(_request: NextRequest, { params }: Contexto) {
  if (!(await autorizado())) return noAutorizado();
  const { id } = await params;
  const cotizacion = ID.test(id) ? await buscarCotizacion(id) : null;
  if (!cotizacion) return noExiste();
  return NextResponse.json({ cotizacion: aCotizacionAdmin(cotizacion) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  if (!(await autorizado())) return noAutorizado();
  const { id } = await params;
  if (!ID.test(id)) return noExiste();
  const datos = cotizacionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    const problema = datos.error.issues[0];
    return NextResponse.json({ error: problema?.message ?? 'Revisa los datos', field: problema?.path.join('.') }, { status: 400 });
  }
  const cotizacion = await guardarCotizacion(id, datos.data);
  if (!cotizacion) {
    const existe = await prisma.quote.count({ where: { id } });
    return existe ? NextResponse.json({ error: 'Esta cotización ya fue aprobada por el cliente y no se puede cambiar. Haz una nueva.' }, { status: 409 }) : noExiste();
  }
  return NextResponse.json({ cotizacion: aCotizacionAdmin(cotizacion) });
}

const accionSchema = z.object({ accion: z.enum(['enviar', 'rechazar', 'reabrir', 'aprobar']) });

export async function PATCH(request: NextRequest, { params }: Contexto) {
  const session = await autorizado();
  if (!session) return noAutorizado();
  const { id } = await params;
  const actual = ID.test(id) ? await buscarCotizacion(id) : null;
  if (!actual) return noExiste();
  const datos = accionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  const { accion } = datos.data;
  const yaAprobada = () => NextResponse.json({ error: 'Esta cotización ya fue aprobada. Si no se concretó, márcala así para devolver el inventario.' }, { status: 409 });
  const responder = async (extra: Record<string, unknown> = {}) => {
    const cotizacion = await buscarCotizacion(id);
    return NextResponse.json({ cotizacion: cotizacion ? aCotizacionAdmin(cotizacion) : null, ...extra });
  };

  if (accion === 'enviar' || accion === 'aprobar') {
    if (actual.status === 'APPROVED') return yaAprobada();
    if (actual.items.length === 0) return NextResponse.json({ error: 'Agrega al menos una línea antes.' }, { status: 400 });
    if (!(Number(actual.totalUSD) > 0)) return NextResponse.json({ error: 'El total no puede ser $0: revisa los precios.' }, { status: 400 });
  }

  if (accion === 'aprobar') {
    // El cliente aprobó por WhatsApp o en persona: lo registra el equipo. Descuenta el inventario igual que el enlace (C-148b)
    const persona = actual.contactName || actual.clientName;
    const aprobada = await aprobarCotizacion(
      id,
      { nombre: `${persona} (registrada por ${session.user.name || session.user.email || 'el equipo'})`, documento: actual.clientDoc, ip: null },
      { estados: ['REQUESTED', 'DRAFT', 'SENT'] },
    );
    if (!aprobada) return yaAprobada();
    const inventario = resumenInventario(aprobada.movimientos);
    await registrarAccionAdmin(session, 'ORDER_STATUS_CHANGED', { type: 'QUOTE', id }, { numero: actual.number, de: actual.status, a: 'APPROVED', ...inventario }, request);
    return responder({ inventario });
  }

  if (accion === 'rechazar') {
    // También desde aprobada: devuelve al inventario lo que se había descontado
    const cerrada = await cerrarCotizacion(id);
    if (!cerrada) return NextResponse.json({ error: 'Esta cotización ya estaba cerrada.' }, { status: 409 });
    const devuelto = cerrada.devuelto.map((m) => `${m.descontado} × ${m.title}`).join(', ');
    await registrarAccionAdmin(session, 'ORDER_STATUS_CHANGED', { type: 'QUOTE', id }, { numero: actual.number, de: actual.status, a: 'REJECTED', ...(devuelto ? { devuelto } : {}) }, request);
    return responder({ devuelto });
  }

  // enviar o reabrir: nunca sobre una aprobada (tiene inventario descontado)
  if (actual.status === 'APPROVED') return yaAprobada();
  // Enviar de nuevo reinicia la validez. Volver a borrador apaga el enlace, pero conserva que el cliente ya la vio
  const cambio = accion === 'enviar' ? { status: 'SENT', sentAt: new Date() } : { status: 'DRAFT' };
  const r = await prisma.quote.updateMany({ where: { id, status: { not: 'APPROVED' } }, data: cambio });
  if (r.count !== 1) return yaAprobada();
  await registrarAccionAdmin(session, 'ORDER_STATUS_CHANGED', { type: 'QUOTE', id }, { numero: actual.number, de: actual.status, a: cambio.status }, request);
  return responder();
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const session = await autorizado();
  if (!session) return noAutorizado();
  const { id } = await params;
  if (!ID.test(id)) return noExiste();
  // Solo lo que el cliente nunca vio: una cotización enviada o aprobada se conserva (se marca "no se concretó")
  const r = await prisma.quote.deleteMany({ where: { id, sentAt: null, status: { in: ['DRAFT', 'REQUESTED'] } } });
  if (r.count !== 1) {
    const existe = await prisma.quote.count({ where: { id } });
    return existe ? NextResponse.json({ error: 'Esta cotización ya se envió: no se borra. Márcala como "No se concretó".' }, { status: 409 }) : noExiste();
  }
  await registrarAccionAdmin(session, 'ORDER_CANCELLED', { type: 'QUOTE', id }, { accion: 'Borró una cotización sin enviar' }, request);
  return NextResponse.json({ ok: true });
}
