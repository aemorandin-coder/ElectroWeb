import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { aCotizacionAdmin, buscarCotizacion, guardarCotizacion } from '@/lib/cotizaciones';
import { ACCIONES_COTIZACION, aplicarAccion } from '@/lib/cotizaciones/acciones';
import { cotizacionSchema } from '@/lib/cotizaciones/core';
import { exigirVersion, registrarCambio, respuestaCambiado } from '@/lib/edicion/registro';
import { nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';

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
  const session = await autorizado();
  if (!session) return noAutorizado();
  const { id } = await params;
  if (!ID.test(id)) return noExiste();
  // C-170: la versión con que se abrió el editor; si otra persona guardó antes, se avisa en vez de pisarla
  const crudo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const v = exigirVersion(crudo?.baseUpdatedAt);
  if ('respuesta' in v) return v.respuesta;
  const { baseUpdatedAt: _version, ...resto } = crudo ?? {};
  void _version;
  const datos = cotizacionSchema.safeParse(resto);
  if (!datos.success) {
    const problema = datos.error.issues[0];
    return NextResponse.json({ error: problema?.message ?? 'Revisa los datos', field: problema?.path.join('.') }, { status: 400 });
  }
  const cotizacion = await guardarCotizacion(id, datos.data, v.base);
  if (!cotizacion) {
    const ahora = await buscarCotizacion(id);
    if (!ahora) return noExiste();
    if (ahora.status === 'APPROVED') return NextResponse.json({ error: 'Esta cotización ya fue aprobada por el cliente y no se puede cambiar. Haz una nueva.' }, { status: 409 });
    return respuestaCambiado({ tipo: 'QUOTE', id, etiqueta: 'cotización', femenino: true, actual: aCotizacionAdmin(ahora) });
  }
  await registrarCambio({ session, request, recurso: `quote:${id}`, tipo: 'QUOTE', id, nombre: cotizacion.number, campos: ['datos o líneas'] });
  return NextResponse.json({ cotizacion: aCotizacionAdmin(cotizacion) });
}

const accionSchema = z.object({ accion: z.enum(ACCIONES_COTIZACION) });

export async function PATCH(request: NextRequest, { params }: Contexto) {
  const session = await autorizado();
  if (!session) return noAutorizado();
  const { id } = await params;
  const actual = ID.test(id) ? await buscarCotizacion(id) : null;
  if (!actual) return noExiste();
  const datos = accionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  const { accion } = datos.data;
  // Las reglas de cada acción son las mismas para el panel y para Numen (C-181, lib/cotizaciones/acciones.ts)
  const r = await aplicarAccion(actual, accion, session.user.name || session.user.email || 'el equipo');
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  await registrarAccionAdmin(session, 'ORDER_STATUS_CHANGED', { type: 'QUOTE', id }, { numero: actual.number, de: r.de, a: r.a, ...r.extra.inventario, ...(r.extra.devuelto ? { devuelto: r.extra.devuelto } : {}) }, request);
  const cotizacion = await buscarCotizacion(id);
  const extra = accion === 'aprobar' ? { inventario: r.extra.inventario } : accion === 'rechazar' ? { devuelto: r.extra.devuelto ?? '' } : {};
  return NextResponse.json({ cotizacion: cotizacion ? aCotizacionAdmin(cotizacion) : null, ...extra });
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const session = await autorizado();
  if (!session) return noAutorizado();
  const { id } = await params;
  if (!ID.test(id)) return noExiste();
  // C-170: otra persona la tiene abierta ahora: se avisa antes de borrarla (con ?forzar=1 se sigue)
  const editores = editoresDe(`quote:${id}`, session.user.id);
  if (editores.length > 0 && new URL(request.url).searchParams.get('forzar') !== '1') {
    return NextResponse.json({ error: `${editores.map((e) => e.nombre).join(' y ')} la está editando ahora mismo`, conflicto: 'en_edicion', editores }, { status: 409 });
  }
  // Solo lo que el cliente nunca vio: una cotización enviada o aprobada se conserva (se marca "no se concretó")
  const r = await prisma.quote.deleteMany({ where: { id, sentAt: null, status: { in: ['DRAFT', 'REQUESTED'] } } });
  if (r.count !== 1) {
    const existe = await prisma.quote.count({ where: { id } });
    return existe ? NextResponse.json({ error: 'Esta cotización ya se envió: no se borra. Márcala como "No se concretó".' }, { status: 409 }) : noExiste();
  }
  await registrarAccionAdmin(session, 'ORDER_CANCELLED', { type: 'QUOTE', id }, { accion: 'Borró una cotización sin enviar' }, request);
  publicarRecursoCambiado(`quote:${id}`, 'eliminado', { id: session.user.id, nombre: nombreDeSesion(session) });
  return NextResponse.json({ ok: true });
}
