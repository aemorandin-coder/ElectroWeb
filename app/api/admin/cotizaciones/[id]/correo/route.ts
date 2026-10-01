import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { checkRateLimit } from '@/lib/rate-limit';
import { aCotizacionAdmin, buscarCotizacion } from '@/lib/cotizaciones';
import { enviarCotizacionPorCorreo } from '@/lib/cotizaciones/correo';

// POST /api/admin/cotizaciones/[id]/correo (C-159): manda la cotización al correo del cliente.
// Solo una cotización que el cliente ya puede abrir (enviada o aprobada): un borrador no tiene enlace.

const ID = /^[a-z0-9]{10,40}$/;
const cuerpoSchema = z.object({
  to: z.string().trim().max(150).email('El correo no es válido'),
  mensaje: z.string().trim().max(600, 'El mensaje es muy largo (600 letras como máximo)').optional().transform((v) => v || null),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const cotizacion = ID.test(id) ? await buscarCotizacion(id) : null;
  if (!cotizacion) return NextResponse.json({ error: 'Esa cotización no existe.' }, { status: 404 });
  if (cotizacion.status !== 'SENT' && cotizacion.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Primero envíala al cliente ("Guardar y enviar al cliente"): un borrador todavía no tiene enlace.' }, { status: 409 });
  }

  const datos = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Revisa los datos' }, { status: 400 });

  // Un correo por cotización cada 30 s (un doble clic) y 30 por hora por persona del equipo
  const quien = (session.user as { id?: string }).id ?? 'equipo';
  if (!checkRateLimit(`${quien}:${id}`, 'cotizacion:correo-una', { maxRequests: 1, windowSeconds: 30 }).success) {
    return NextResponse.json({ error: 'Ya se envió hace un momento. Espera unos segundos.' }, { status: 429 });
  }
  if (!checkRateLimit(quien, 'cotizacion:correo', { maxRequests: 30, windowSeconds: 3600 }).success) {
    return NextResponse.json({ error: 'Enviaste muchos correos seguidos. Intenta en un rato.' }, { status: 429 });
  }

  const { to, mensaje } = datos.data;
  const envio = await enviarCotizacionPorCorreo(aCotizacionAdmin(cotizacion), to, mensaje);
  if (!envio.success) {
    console.error('Error enviando la cotización por correo:', envio.error);
    return NextResponse.json({ error: 'El correo no salió. Revisa la dirección o intenta de nuevo.' }, { status: 502 });
  }

  const emailedAt = new Date();
  await prisma.quote.update({ where: { id }, data: { emailedAt, emailedTo: to } });
  await registrarAccionAdmin(session, 'ORDER_STATUS_CHANGED', { type: 'QUOTE', id }, { numero: cotizacion.number, accion: 'Mandó la cotización por correo', a: to }, request);
  return NextResponse.json({ ok: true, to, emailedAt: emailedAt.toISOString() });
}
