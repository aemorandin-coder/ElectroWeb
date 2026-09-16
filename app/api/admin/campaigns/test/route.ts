import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/email-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { campanaSchema, renderCampana } from '@/lib/email-campaigns';

const pruebaSchema = campanaSchema.extend({ email: z.string().trim().email('Correo inválido').max(200) });

// Un correo de prueba a una dirección: nunca a los clientes
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const limite = checkRateLimit(session?.user?.id ?? 'admin', 'campaign:test', { maxRequests: 10, windowSeconds: 600 });
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiadas pruebas seguidas. Espera unos minutos.' }, { status: 429 });
  }

  const parsed = pruebaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const { email, ...contenido } = parsed.data;
  const html = await renderCampana(contenido, { nombre: session?.user?.name, enlaceBaja: '#', prueba: true });
  const resultado = await sendEmail({ to: email, subject: `[Prueba] ${contenido.subject}`, html });
  if (!resultado.success) {
    return NextResponse.json({ error: resultado.error || 'No se pudo enviar la prueba' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
