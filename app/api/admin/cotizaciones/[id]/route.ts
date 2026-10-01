import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { aCotizacionAdmin, buscarCotizacion, guardarCotizacion } from '@/lib/cotizaciones';
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

const accionSchema = z.object({ accion: z.enum(['enviar', 'rechazar', 'reabrir']) });

export async function PATCH(request: NextRequest, { params }: Contexto) {
  const session = await autorizado();
  if (!session) return noAutorizado();
  const { id } = await params;
  const actual = ID.test(id) ? await buscarCotizacion(id) : null;
  if (!actual) return noExiste();
  const datos = accionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  if (actual.status === 'APPROVED') return NextResponse.json({ error: 'Esta cotización ya fue aprobada por el cliente.' }, { status: 409 });

  const { accion } = datos.data;
  if (accion === 'enviar') {
    if (actual.items.length === 0) return NextResponse.json({ error: 'Agrega al menos una línea antes de enviarla.' }, { status: 400 });
    if (!(Number(actual.totalUSD) > 0)) return NextResponse.json({ error: 'El total no puede ser $0: revisa los precios.' }, { status: 400 });
  }
  // Enviar de nuevo reinicia la validez: el cliente vuelve a tener los días completos desde hoy
  const cambio = accion === 'enviar' ? { status: 'SENT', sentAt: new Date() }
    : accion === 'rechazar' ? { status: 'REJECTED' }
    // Volver a borrador apaga el enlace, pero conserva que el cliente ya la vio (no se podrá borrar)
    : { status: 'DRAFT' };
  const r = await prisma.quote.updateMany({ where: { id, status: { not: 'APPROVED' } }, data: cambio });
  if (r.count !== 1) return NextResponse.json({ error: 'Esta cotización ya fue aprobada por el cliente.' }, { status: 409 });

  await registrarAccionAdmin(session, 'ORDER_STATUS_CHANGED', { type: 'QUOTE', id }, { numero: actual.number, de: actual.status, a: cambio.status }, request);
  const cotizacion = await buscarCotizacion(id);
  return NextResponse.json({ cotizacion: cotizacion ? aCotizacionAdmin(cotizacion) : null });
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
