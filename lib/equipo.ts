// Equipo del panel (C-141): quién entra, con qué rol y en qué estado. Solo servidor.
// Decisión de Andrés del 30/09: los admin nuevos entran por invitación al correo; cada uno crea su contraseña y
// sus dos pasos, y el dueño nunca la conoce. Roles: Super admin (todo) y Administrador (ver lib/auth-helpers.ts).

import { randomBytes } from 'crypto';
import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';

export const ROLES_EQUIPO = ['ADMIN', 'SUPER_ADMIN'] as const;
export type RolEquipo = (typeof ROLES_EQUIPO)[number];
export const VIGENCIA_INVITACION_MS = 24 * 60 * 60 * 1000;

export const esRolEquipo = (rol: Role | string | null | undefined): rol is RolEquipo => rol === 'ADMIN' || rol === 'SUPER_ADMIN';
export const nombreRol = (rol: RolEquipo) => (rol === 'SUPER_ADMIN' ? 'Super admin' : 'Administrador');

/** Super admins con acceso: con contraseña y sin suspender. Sin ninguno, nadie abre Configuración ni Equipo. */
export function superAdminsConAcceso(db: Prisma.TransactionClient = prisma): Promise<number> {
  return db.user.count({
    where: {
      role: 'SUPER_ADMIN',
      password: { not: null },
      OR: [{ profile: null }, { profile: { accountStatus: { not: 'SUSPENDED' } } }],
    },
  });
}

export type EstadoMiembro = 'activo' | 'invitado' | 'sin_acceso';

export interface MiembroEquipo {
  id: string;
  nombre: string;
  correo: string;
  rol: RolEquipo;
  estado: EstadoMiembro;
  dosPasos: boolean;
  ultimaEntrada: string | null;
  sesionAbierta: boolean;
  /** Solo en invitaciones: hasta cuándo sirve el enlace (null = vencido) */
  invitacionVence: string | null;
  soyYo: boolean;
}

/** El equipo como lo ve la pantalla: sin contraseñas, secretos ni IP. */
export async function listarEquipo(yoId: string): Promise<MiembroEquipo[]> {
  const ahora = new Date();
  const usuarios = await prisma.user.findMany({
    where: { role: { in: [...ROLES_EQUIPO] } },
    orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
      sessionVersion: true,
      profile: { select: { accountStatus: true } },
      segundoFactor: { select: { activadoAt: true } },
      sesiones: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, revokedAt: true, expiresAt: true, version: true } },
      passwordResetTokens: { where: { expiresAt: { gt: ahora } }, orderBy: { expiresAt: 'desc' }, take: 1, select: { expiresAt: true } },
    },
  });
  return usuarios.map((u) => {
    const ultima = u.sesiones[0];
    const invitado = !u.password;
    return {
      id: u.id,
      nombre: u.name || u.email?.split('@')[0] || 'Sin nombre',
      correo: u.email ?? '',
      rol: u.role as RolEquipo,
      estado: u.profile?.accountStatus === 'SUSPENDED' ? 'sin_acceso' : invitado ? 'invitado' : 'activo',
      dosPasos: Boolean(u.segundoFactor?.activadoAt),
      ultimaEntrada: ultima?.createdAt.toISOString() ?? null,
      sesionAbierta: Boolean(ultima && !ultima.revokedAt && ultima.expiresAt > ahora && ultima.version === u.sessionVersion),
      invitacionVence: invitado ? u.passwordResetTokens[0]?.expiresAt.toISOString() ?? null : null,
      soyYo: u.id === yoId,
    };
  });
}

/** Enlace nuevo de 24 horas para crear la contraseña (los anteriores dejan de servir). */
export async function crearEnlaceInvitacion(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({ data: { userId, token, expiresAt: new Date(Date.now() + VIGENCIA_INVITACION_MS) } }),
  ]);
  return token;
}

/** El correo de invitación. Devuelve false si no salió (la invitación queda creada y se puede reenviar). */
export async function enviarInvitacion(datos: { correo: string; nombre: string; rol: RolEquipo; token: string; invitadoPor: string }): Promise<boolean> {
  const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const enlace = `${appUrl}/recuperar-contrasena/${datos.token}?invitacion=1`;
  const nombre = datos.nombre.trim().split(/\s+/)[0] || 'hola';
  const contenido = `
    <h2 style="margin:0 0 10px;color:#212529;font-size:22px;font-weight:600;">Te invitaron al panel de Electro Shop</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px;">Hola ${escapeHtml(nombre)}, ${escapeHtml(datos.invitadoPor)} te dio acceso al panel de administración como <strong>${nombreRol(datos.rol)}</strong>.</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px;">Para entrar, crea tu contraseña. Después el panel te pedirá configurar la verificación en dos pasos con una app de códigos en tu teléfono (Google Authenticator o Authy).</p>
    <div style="text-align:center;margin:28px 0;"><a href="${enlace}" style="display:inline-block;background:#2a63cd;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">Crear mi contraseña</a></div>
    <p style="color:#6c757d;font-size:13px;line-height:1.6;margin:0;">El enlace sirve 24 horas y una sola vez. Si no esperabas esta invitación, ignora este correo: sin la contraseña nadie puede entrar.</p>`;
  try {
    const resultado = await sendEmail({
      to: datos.correo,
      subject: 'Invitación al panel de Electro Shop',
      html: await getBaseTemplate(contenido, 'Crea tu contraseña para entrar al panel'),
    });
    return resultado.success;
  } catch (error) {
    console.error('Error enviando la invitación al equipo:', error);
    return false;
  }
}
