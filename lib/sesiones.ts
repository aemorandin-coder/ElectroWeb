// Sesiones con nombre (C-140). Cada inicio de sesión crea una fila en `user_sessions` y el JWT lleva su id (`sid`).
// El servidor la revisa en cada petición (callback `jwt` de lib/auth.ts):
// - Clientes: varias a la vez, 30 días, visibles y con "Cerrar" en Mi perfil → Seguridad.
// - Admin: una sola (la nueva cierra la anterior), 12 horas y se cierra tras 1 hora sin uso. El uso lo cuenta el
//   navegador (clics, teclas, toques) con /api/sesion/actividad: los contadores del panel piden datos cada 30 s y
//   no son uso.
// Regla de Andrés del 30/09.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { createAuditLog } from '@/lib/audit-log';
import { ipParaRegistro } from '@/lib/ip';
import { describirDispositivo } from '@/lib/dispositivo';
import { getBaseTemplate, sendEmail, sendPasswordResetEmail } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';

export const DURACION_ADMIN_MS = 12 * 60 * 60 * 1000;
export const DURACION_CLIENTE_MS = 30 * 24 * 60 * 60 * 1000;
/** El navegador del admin cierra a los 60 min sin uso; el servidor, a los 70 (por si la pestaña quedó dormida). */
export const INACTIVIDAD_ADMIN_MS = 60 * 60 * 1000;
const MARGEN_SERVIDOR_MS = 10 * 60 * 1000;
/** Cada cuánto se anota el último uso de un cliente (evita una escritura por petición). */
const ANOTAR_USO_CADA_MS = 5 * 60 * 1000;

export type MotivoCierre = 'CERRADA' | 'OTRA_SESION' | 'INACTIVIDAD';

async function datosDeLaPeticion(): Promise<{ userAgent: string | null; ip: string | null }> {
  try {
    const h = await headers();
    return { userAgent: h.get('user-agent'), ip: ipParaRegistro(h) };
  } catch {
    return { userAgent: null, ip: null }; // Fuera de una petición (pruebas)
  }
}

/** Crea la sesión al iniciar sesión y devuelve su id para el JWT. */
export async function abrirSesion(datos: { userId: string; esAdmin: boolean; metodo: 'contraseña' | 'google'; version: number }): Promise<string> {
  const { userAgent, ip } = await datosDeLaPeticion();
  const dispositivo = describirDispositivo(userAgent);
  const ahora = new Date();

  if (datos.esAdmin) {
    // Una sola sesión de admin: la nueva cierra las anteriores
    await prisma.userSession.updateMany({
      where: { userId: datos.userId, revokedAt: null },
      data: { revokedAt: ahora, motivoCierre: 'OTRA_SESION' },
    });
  }

  // Dispositivo nuevo: no se usó en las últimas 50 sesiones. La primera sesión de todas no avisa.
  const anteriores = datos.esAdmin
    ? []
    : await prisma.userSession.findMany({ where: { userId: datos.userId }, select: { dispositivo: true }, orderBy: { createdAt: 'desc' }, take: 50 });
  const esNuevo = anteriores.length > 0 && !anteriores.some((s) => s.dispositivo === dispositivo);

  const sesion = await prisma.userSession.create({
    data: {
      userId: datos.userId,
      dispositivo,
      ip,
      metodo: datos.metodo,
      esAdmin: datos.esAdmin,
      version: datos.version,
      createdAt: ahora,
      lastSeenAt: ahora,
      expiresAt: new Date(ahora.getTime() + (datos.esAdmin ? DURACION_ADMIN_MS : DURACION_CLIENTE_MS)),
    },
  });

  if (datos.esAdmin) avisarEntradaAdmin(datos.userId, sesion.id, dispositivo, ip);
  if (esNuevo) {
    void avisarDispositivoNuevo(datos.userId, dispositivo, datos.metodo, ahora).catch((error) =>
      console.error('Error avisando el inicio de sesión en un dispositivo nuevo:', error),
    );
  }
  return sesion.id;
}

/**
 * ¿Sigue valiendo el token? Con `sid`: la fila existe, es de ese usuario, no está cerrada ni vencida, tiene la
 * versión actual del usuario y, si es de admin, tuvo uso en la última hora (más el margen).
 * Sin `sid` (tokens de antes de C-140): los clientes siguen con la regla vieja (misma versión); los admin no.
 */
export async function sesionValida(token: { id?: string; sid?: string; sessionVersion?: number; userType?: string }): Promise<boolean> {
  if (!token.id) return false;
  const [usuario, sesion] = await Promise.all([
    prisma.user.findUnique({ where: { id: token.id }, select: { sessionVersion: true, profile: { select: { accountStatus: true } } } }),
    token.sid ? prisma.userSession.findUnique({ where: { id: token.sid } }) : Promise.resolve(null),
  ]);
  // Una cuenta suspendida por la tienda (C-80/C-92) pierde también la sesión que ya tenía abierta
  if (!usuario || usuario.profile?.accountStatus === 'SUSPENDED') return false;

  if (!token.sid) {
    return token.userType !== 'admin' && (token.sessionVersion ?? 0) === usuario.sessionVersion;
  }
  if (!sesion || sesion.userId !== token.id || sesion.revokedAt || sesion.version !== usuario.sessionVersion) return false;

  const ahora = Date.now();
  if (sesion.expiresAt.getTime() <= ahora) return false;
  if (sesion.esAdmin) {
    if (ahora - sesion.lastSeenAt.getTime() > INACTIVIDAD_ADMIN_MS + MARGEN_SERVIDOR_MS) {
      await prisma.userSession.updateMany({ where: { id: sesion.id, revokedAt: null }, data: { revokedAt: new Date(), motivoCierre: 'INACTIVIDAD' } });
      return false;
    }
  } else if (ahora - sesion.lastSeenAt.getTime() > ANOTAR_USO_CADA_MS) {
    await prisma.userSession.update({ where: { id: sesion.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return true;
}

/** Uso real del admin (clics, teclas, toques): lo manda el navegador cada pocos minutos mientras hay uso. */
export async function anotarActividad(sid: string, userId: string): Promise<void> {
  await prisma.userSession.updateMany({ where: { id: sid, userId, revokedAt: null }, data: { lastSeenAt: new Date() } });
}

/** Sesiones abiertas de un usuario, la más reciente primero. */
export async function sesionesAbiertas(userId: string) {
  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
  if (!usuario) return [];
  return prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() }, version: usuario.sessionVersion },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, dispositivo: true, metodo: true, createdAt: true, lastSeenAt: true },
  });
}

/** Cierra una sesión del usuario. Devuelve false si no es suya o ya estaba cerrada. */
export async function cerrarSesion(userId: string, sid: string): Promise<boolean> {
  const r = await prisma.userSession.updateMany({ where: { id: sid, userId, revokedAt: null }, data: { revokedAt: new Date(), motivoCierre: 'CERRADA' } });
  return r.count === 1;
}

/**
 * Cierra todas menos la actual. Sube la versión del usuario (así caen también los tokens sin `sid` de antes de
 * C-140) y copia la nueva solo en la sesión actual. Sin sesión actual válida, las cierra todas.
 */
export async function cerrarLasDemas(userId: string, sidActual: string | undefined): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } }, select: { sessionVersion: true } });
    await tx.userSession.updateMany({
      where: { userId, revokedAt: null, ...(sidActual ? { id: { not: sidActual } } : {}) },
      data: { revokedAt: new Date(), motivoCierre: 'CERRADA' },
    });
    if (sidActual) await tx.userSession.updateMany({ where: { id: sidActual, userId, revokedAt: null }, data: { version: u.sessionVersion } });
  });
}

async function avisarDispositivoNuevo(userId: string, dispositivo: string, metodo: string, cuando: Date) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, emailVerified: true } });
  if (!u?.email || !u.emailVerified) return;
  const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const fecha = cuando.toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const nombre = (u.name || '').trim().split(/\s+/)[0] || 'cliente';
  const contenido = `
    <h2 style="margin:0 0 10px;color:#212529;font-size:22px;font-weight:600;">Nuevo inicio de sesión en tu cuenta</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px;">Hola ${escapeHtml(nombre)}, alguien entró a tu cuenta desde un dispositivo que no habías usado.</p>
    <div style="background:#f8f9fa;border-radius:12px;padding:16px 20px;margin:16px 0;border:1px solid #e9ecef;">
      <p style="margin:0 0 6px;color:#212529;font-size:15px;font-weight:600;">${escapeHtml(dispositivo)}</p>
      <p style="margin:0;color:#6c757d;font-size:13px;line-height:1.6;">${escapeHtml(fecha)} · ${metodo === 'google' ? 'con Google' : 'con tu contraseña'}</p>
    </div>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px;">Si fuiste tú, no tienes que hacer nada. Si no, cambia tu contraseña y cierra esa sesión desde Mi perfil.</p>
    <div style="text-align:center;margin:28px 0;"><a href="${appUrl}/customer/profile?tab=seguridad" style="display:inline-block;background:#2a63cd;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">Revisar mis sesiones</a></div>`;
  await sendEmail({
    to: u.email,
    subject: `Nuevo inicio de sesión: ${dispositivo}`,
    html: await getBaseTemplate(contenido, `Entraron a tu cuenta desde ${dispositivo}`),
  });
}

/* ── "No fui yo" (C-140) ─────────────────────────────────────────────────────
 * Cada inicio de sesión en el panel avisa al equipo (Telegram, panel, correo) con un botón "No fui yo". El enlace
 * va firmado con el id de la sesión: abre una página que pide confirmar y entonces cierra todas las sesiones de esa
 * cuenta, cambia la contraseña por una que nadie conoce y manda al correo del admin el enlace para crear una nueva.
 * Sirve 24 horas. Quien no tenga el enlace no puede usarlo; quien lo tenga solo puede bloquear, no entrar. */

const VIGENCIA_NO_FUI_YO_MS = 24 * 60 * 60 * 1000;

function firmaNoFuiYo(sid: string): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return createHmac('sha256', secreto).update(`no-fui-yo:${sid}`).digest('base64url');
}

export function rutaNoFuiYo(sid: string): string {
  return `/sesion/no-fui-yo?s=${encodeURIComponent(sid)}&t=${firmaNoFuiYo(sid)}`;
}

/** La sesión que se reporta, si el enlace es válido y tiene menos de 24 horas. */
export async function sesionReportable(sid: string, firma: string) {
  if (!/^[a-z0-9]{10,40}$/.test(sid) || !firma) return null;
  const esperada = Buffer.from(firmaNoFuiYo(sid));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  const sesion = await prisma.userSession.findUnique({
    where: { id: sid },
    select: { id: true, userId: true, dispositivo: true, ip: true, createdAt: true, esAdmin: true, user: { select: { name: true, email: true } } },
  });
  if (!sesion?.esAdmin || Date.now() - sesion.createdAt.getTime() > VIGENCIA_NO_FUI_YO_MS) return null;
  return sesion;
}

/** Bloquea la cuenta de la sesión reportada. Devuelve el correo (enmascarado) al que se mandó el enlace. */
export async function bloquearPorNoFuiYo(sid: string, firma: string, ipReporte: string | null): Promise<{ correo: string } | null> {
  const sesion = await sesionReportable(sid, firma);
  if (!sesion) return null;
  const token = randomBytes(32).toString('hex');
  // Una contraseña al azar que nadie conoce: el que entró ya no puede volver con la que usó
  const bloqueo = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: sesion.userId }, data: { password: bloqueo, sessionVersion: { increment: 1 } } }),
    prisma.userSession.updateMany({ where: { userId: sesion.userId, revokedAt: null }, data: { revokedAt: new Date(), motivoCierre: 'CERRADA' } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: sesion.userId } }),
    prisma.passwordResetToken.create({ data: { userId: sesion.userId, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
  ]);
  await createAuditLog({
    action: 'SECURITY_SUSPICIOUS_ACTIVITY',
    userId: sesion.userId,
    userEmail: sesion.user.email ?? undefined,
    targetType: 'USER',
    targetId: sesion.userId,
    details: { motivo: 'No fui yo: inicio de sesión en el panel reportado', dispositivo: sesion.dispositivo, ipSesion: sesion.ip, ipReporte },
    ipAddress: ipReporte ?? undefined,
    severity: 'CRITICAL',
  });
  emitAdminEvent({
    type: 'ADMIN_SESSION_REPORTED',
    title: `"No fui yo" · ${sesion.user.name || sesion.user.email || 'Admin'}`,
    summary: 'Se cerraron todas sus sesiones y se bloqueó la contraseña. Le llegó un correo para crear una nueva.',
    fields: [['Dispositivo', sesion.dispositivo], ['IP de esa sesión', sesion.ip], ['Entró', sesion.createdAt.toLocaleString('es-VE', { timeZone: 'America/Caracas' })]],
    link: '/admin/reports',
  });
  if (sesion.user.email) {
    await sendPasswordResetEmail(sesion.user.email, token, sesion.user.name ?? undefined).catch((error) =>
      console.error('Error enviando el correo para crear la contraseña nueva:', error),
    );
  }
  return { correo: enmascararCorreo(sesion.user.email) };
}

function enmascararCorreo(correo: string | null): string {
  if (!correo) return 'tu correo';
  const [usuario, dominio] = correo.split('@');
  return `${usuario.slice(0, 2)}${'•'.repeat(Math.max(1, usuario.length - 2))}@${dominio}`;
}

/** Aviso al equipo de cada entrada al panel (antes lo mandaba lib/auth.ts, sin poder cerrar esa sesión). */
function avisarEntradaAdmin(userId: string, sid: string, dispositivo: string, ip: string | null) {
  void prisma.user
    .findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } })
    .then((u) => {
      if (!u) return;
      emitAdminEvent({
        type: 'ADMIN_LOGIN',
        title: `Inicio de sesión · ${u.name || u.email || 'Admin'}`,
        summary: 'Entró al panel de administración. Si no fue esa persona, toca "No fui yo".',
        fields: [['Dispositivo', dispositivo], ['IP', ip], ['Rol', u.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin']],
        link: rutaNoFuiYo(sid),
        boton: 'No fui yo: cerrar y bloquear',
      });
    })
    .catch((error) => console.error('Error avisando la entrada al panel:', error));
}
