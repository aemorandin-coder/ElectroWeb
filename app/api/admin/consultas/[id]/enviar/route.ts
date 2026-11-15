import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { correoRespuestaContacto } from '@/lib/email-templates/servicio';
import { checkRateLimit } from '@/lib/rate-limit';

// C-219: responder un mensaje de contacto con el diseño de la tienda (antes "Responder por correo" abría el correo personal
// de quien estaba en el panel). Lo que escribe el equipo se escapa en la plantilla. El mensaje queda "Respondido".

const esquema = z.object({ texto: z.string().trim().min(2, 'Escribe la respuesta').max(6000, 'La respuesta es muy larga') });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const limite = checkRateLimit(session.user.id, 'admin:consultas:enviar', { maxRequests: 20, windowSeconds: 60 });
  if (!limite.success) {
    return NextResponse.json({ error: `Demasiados envíos seguidos. Espera ${limite.resetIn} s.` }, { status: 429 });
  }
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });

  const { id } = await params;
  const mensaje = await prisma.contactMessage.findUnique({ where: { id }, select: { name: true, email: true, subject: true } });
  if (!mensaje) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
  if (!mensaje.email) return NextResponse.json({ error: 'El mensaje no tiene correo para responder' }, { status: 400 });

  const firma = (session.user.name || '').trim().split(/\s+/)[0] || 'El equipo';
  const { asunto, html } = await correoRespuestaContacto({ nombre: mensaje.name, asunto: mensaje.subject, respuesta: datos.data.texto, firma });
  const enviado = await sendEmail({ to: mensaje.email, subject: asunto, html });
  if (!enviado.success) {
    return NextResponse.json({ error: 'El servicio de correo no lo aceptó. Prueba otra vez o responde por WhatsApp.' }, { status: 502 });
  }
  await prisma.contactMessage.update({ where: { id }, data: { status: 'RESPONDED' } });
  return NextResponse.json({ ok: true });
}
