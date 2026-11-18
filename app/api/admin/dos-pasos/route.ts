import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activarDosPasos, estadoDosPasos, iniciarDosPasos, regenerarRespaldo, reiniciarDosPasos, verificarCodigo } from '@/lib/dos-pasos';
import { anotarConfirmacion, DIAS_CONFIANZA, listarDispositivos, marcarDispositivo, ponerGalleta, quitarDispositivo, quitarTodos } from '@/lib/dispositivos-confianza';
import { rutaNoFuiYo } from '@/lib/sesiones';
import { sendEmail } from '@/lib/email-service';
import { correoDispositivoConfianza } from '@/lib/email-templates/cuenta';
import { cerrarLasDemas } from '@/lib/sesiones';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { emitAdminEvent } from '@/lib/admin-events';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { superAdminsConAcceso } from '@/lib/equipo';
import { esRolDelPanel } from '@/lib/auth-helpers';

// Verificación en dos pasos del propio admin (C-141): Mi seguridad.
// Es la única API del panel que responde sin los dos pasos hechos: sirve para configurarlos (ver proxy.ts).

async function quien(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!session || !user?.id || !esRolDelPanel(user.role)) return null;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return { session, userId: user.id, correo: user.email ?? '', nombre: user.name ?? user.email ?? 'Admin', sid: typeof token?.sid === 'string' ? token.sid : undefined };
}

export async function GET(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  // C-143: una tienda sin super admin no tiene quién abra Configuración ni Equipo. El panel lo avisa con la salida.
  const [estado, superAdmins] = await Promise.all([estadoDosPasos(yo.userId), superAdminsConAcceso()]);
  // C-291: los dispositivos de confianza, con cuál es este navegador
  const dispositivos = estado.activo ? await listarDispositivos(yo.userId) : [];
  return NextResponse.json({ ...estado, sinSuperAdmin: superAdmins === 0, dispositivos }, { headers: { 'Cache-Control': 'no-store' } });
}

const postSchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('iniciar') }),
  z.object({ accion: z.literal('activar'), codigo: z.string().trim().min(6).max(12) }),
  z.object({ accion: z.literal('regenerar'), codigo: z.string().trim().min(6).max(12) }),
  // C-291: el dispositivo de confianza (marcarlo al entrar, quitarlo) y la confirmación de lo delicado
  z.object({ accion: z.literal('confiar') }),
  z.object({ accion: z.literal('quitar_dispositivo'), id: z.string().trim().min(1).max(40) }),
  z.object({ accion: z.literal('quitar_dispositivos') }),
  z.object({ accion: z.literal('confirmar'), codigo: z.string().trim().min(6).max(12) }),
]);

export async function POST(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const datos = postSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const sinCache = { 'Cache-Control': 'no-store' };

  if (datos.data.accion === 'iniciar') {
    const inicio = await iniciarDosPasos(yo.userId, yo.correo);
    if (!inicio) return NextResponse.json({ error: 'Tu verificación ya está activa. Recarga la página.' }, { status: 409 });
    return NextResponse.json(inicio, { headers: sinCache });
  }

  // C-291: lo que sigue (salvo activar) es con la sesión ya verificada
  const verificada = yo.session.user.dosPasos === true;

  if (datos.data.accion === 'confiar') {
    if (!verificada) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const r = await marcarDispositivo(yo.userId, yo.sid);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
    await registrarAccionAdmin(yo.session, 'SECURITY_ADMIN_ACTION', { type: 'USER', id: yo.userId }, { accion: 'Marcó un dispositivo de confianza', dispositivo: r.dispositivo }, request);
    // El aviso, con "No fui yo" (si falla el correo, el dispositivo queda igual: se ve en Mi seguridad).
    // C-299: solo a un correo comprobado, como el aviso de inicio de sesión (lib/sesiones). Una dirección sin comprobar puede no
    // existir, y el aviso volvía como rebote al buzón de la tienda.
    if (yo.sid) {
      const sid = yo.sid;
      const ahora = new Date();
      const formato = (f: Date) => f.toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
      void prisma.user
        .findUnique({ where: { id: yo.userId }, select: { email: true, name: true, emailVerified: true } })
        .then(async (cuenta) => {
          if (!cuenta?.email || !cuenta.emailVerified) return;
          const { asunto, html } = await correoDispositivoConfianza({
            nombre: cuenta.name,
            dispositivo: r.dispositivo,
            cuando: formato(ahora),
            vence: formato(new Date(ahora.getTime() + DIAS_CONFIANZA * 86_400_000)),
            rutaNoFuiYo: rutaNoFuiYo(sid),
          });
          await sendEmail({ to: cuenta.email, subject: asunto, html });
        })
        .catch((error) => console.error('Error avisando el dispositivo de confianza:', error));
    }
    return ponerGalleta(NextResponse.json({ ok: true, dispositivo: r.dispositivo }, { headers: sinCache }), r.valor);
  }

  if (datos.data.accion === 'quitar_dispositivo' || datos.data.accion === 'quitar_dispositivos') {
    if (!verificada) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const cuantos = datos.data.accion === 'quitar_dispositivo'
      ? Number(await quitarDispositivo(yo.userId, datos.data.id))
      : await quitarTodos(yo.userId, 'QUITADOS_TODOS');
    if (datos.data.accion === 'quitar_dispositivo' && cuantos === 0) return NextResponse.json({ error: 'Ese dispositivo ya no estaba.' }, { status: 404 });
    await registrarAccionAdmin(yo.session, 'SECURITY_ADMIN_ACTION', { type: 'USER', id: yo.userId }, { accion: cuantos === 1 ? 'Quitó un dispositivo de confianza' : `Quitó sus ${cuantos} dispositivos de confianza` }, request);
    return NextResponse.json({ ok: true, quitados: cuantos, dispositivos: await listarDispositivos(yo.userId) }, { headers: sinCache });
  }

  // Los códigos se prueban con límite: 5 por minuto por cuenta
  const limite = checkRateLimit(yo.userId, 'admin:dos-pasos', RATE_LIMITS.AUTH);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto y escribe el número que veas entonces.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.AUTH) });
  }

  if (datos.data.accion === 'activar') {
    const codigos = await activarDosPasos(yo.userId, datos.data.codigo);
    if (!codigos) {
      return NextResponse.json({ error: 'Ese número no sirvió. Escribe el que ves ahora en la app: cambia cada 30 segundos.' }, { status: 400 });
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

  // C-291: confirmar con el código (o una llave de repuesto) lo delicado, en una sesión que entró por confianza
  if (datos.data.accion === 'confirmar') {
    if (!verificada) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    if (!(await verificarCodigo(yo.userId, datos.data.codigo))) {
      return NextResponse.json({ error: 'Ese número no sirvió. Escribe el que ves ahora en la app.' }, { status: 400 });
    }
    await anotarConfirmacion(yo.userId, yo.sid);
    return NextResponse.json({ ok: true }, { headers: sinCache });
  }

  // Códigos de respaldo nuevos: solo con la sesión ya verificada y un código de la app
  if (!verificada) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const codigos = await regenerarRespaldo(yo.userId, datos.data.codigo);
  if (!codigos) return NextResponse.json({ error: 'Ese número no sirvió. Escribe el que ves ahora en la app (aquí no sirven las llaves de repuesto).' }, { status: 400 });
  await registrarAccionAdmin(yo.session, 'SECURITY_ADMIN_ACTION', { type: 'USER', id: yo.userId }, { accion: 'Generó códigos de respaldo nuevos' }, request);
  return NextResponse.json({ codigos }, { headers: sinCache });
}
