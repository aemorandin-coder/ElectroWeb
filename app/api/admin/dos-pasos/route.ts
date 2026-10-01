import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { activarDosPasos, estadoDosPasos, iniciarDosPasos, regenerarRespaldo, reiniciarDosPasos } from '@/lib/dos-pasos';
import { cerrarLasDemas } from '@/lib/sesiones';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { emitAdminEvent } from '@/lib/admin-events';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

// Verificación en dos pasos del propio admin (C-141): Mi seguridad.
// Es la única API del panel que responde sin los dos pasos hechos: sirve para configurarlos (ver proxy.ts).

async function quien(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!session || !user?.id || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return { session, userId: user.id, correo: user.email ?? '', nombre: user.name ?? user.email ?? 'Admin', sid: typeof token?.sid === 'string' ? token.sid : undefined };
}

export async function GET(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return NextResponse.json(await estadoDosPasos(yo.userId), { headers: { 'Cache-Control': 'no-store' } });
}

const postSchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('iniciar') }),
  z.object({ accion: z.literal('activar'), codigo: z.string().trim().min(6).max(12) }),
  z.object({ accion: z.literal('regenerar'), codigo: z.string().trim().min(6).max(12) }),
]);

export async function POST(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const datos = postSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const sinCache = { 'Cache-Control': 'no-store' };

  if (datos.data.accion === 'iniciar') {
    const inicio = await iniciarDosPasos(yo.userId, yo.correo);
    if (!inicio) return NextResponse.json({ error: 'La verificación en dos pasos ya está activa en tu cuenta.' }, { status: 409 });
    return NextResponse.json(inicio, { headers: sinCache });
  }

  // Los códigos se prueban con límite: 5 por minuto por cuenta
  const limite = checkRateLimit(yo.userId, 'admin:dos-pasos', RATE_LIMITS.AUTH);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto y prueba de nuevo.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.AUTH) });
  }

  if (datos.data.accion === 'activar') {
    const codigos = await activarDosPasos(yo.userId, datos.data.codigo);
    if (!codigos) {
      return NextResponse.json({ error: 'El código no es correcto. Revisa que la hora de tu teléfono sea automática y escribe el código que muestra la app ahora.' }, { status: 400 });
    }
    // Si alguien había entrado solo con la contraseña antes de la activación, queda fuera. Si no se pudieron cerrar
    // las demás sesiones, la activación se deshace: una sesión sin código no puede quedar viva con los dos pasos activos
    try {
      await cerrarLasDemas(yo.userId, yo.sid);
    } catch (error) {
      console.error('Error cerrando las demás sesiones al activar los dos pasos:', error);
      await reiniciarDosPasos(yo.userId);
      return NextResponse.json({ error: 'No se pudo activar. Intenta de nuevo.' }, { status: 500 });
    }
    await registrarAccionAdmin(yo.session, 'SECURITY_ADMIN_ACTION', { type: 'USER', id: yo.userId }, { accion: 'Activó la verificación en dos pasos' }, request);
    emitAdminEvent({
      type: 'ADMIN_TEAM_CHANGED',
      title: `Dos pasos activados · ${yo.nombre}`,
      summary: 'Registró su app de códigos. Desde ahora su cuenta pide el código para entrar al panel.',
      fields: [['Cuenta', yo.correo]],
      link: '/admin/equipo',
    });
    return NextResponse.json({ codigos }, { headers: sinCache });
  }

  // Códigos de respaldo nuevos: solo con la sesión ya verificada y un código de la app
  if (yo.session.user.dosPasos !== true) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const codigos = await regenerarRespaldo(yo.userId, datos.data.codigo);
  if (!codigos) return NextResponse.json({ error: 'El código no es correcto. Usa el que muestra la app ahora (los de respaldo no sirven aquí).' }, { status: 400 });
  await registrarAccionAdmin(yo.session, 'SECURITY_ADMIN_ACTION', { type: 'USER', id: yo.userId }, { accion: 'Generó códigos de respaldo nuevos' }, request);
  return NextResponse.json({ codigos }, { headers: sinCache });
}
