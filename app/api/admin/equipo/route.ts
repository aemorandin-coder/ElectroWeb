import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { buscarUsuarioPorCorreo, normalizarCorreo } from '@/lib/correo';
import { crearEnlaceInvitacion, enviarInvitacion, esRolEquipo, listarEquipo, nombreRol, ROLES_EQUIPO, type RolEquipo } from '@/lib/equipo';
import { reiniciarDosPasos } from '@/lib/dos-pasos';
import { cerrarLasDemas } from '@/lib/sesiones';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { emitAdminEvent } from '@/lib/admin-events';

// Equipo del panel (C-141). Solo el super admin (MANAGE_TEAM).
// Reglas: nadie actúa sobre su propia cuenta desde aquí y siempre queda al menos un super admin con acceso.

const id = z.string().regex(/^[a-z0-9]{10,40}$/);
const rol = z.enum(ROLES_EQUIPO);

const postSchema = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('invitar'),
    correo: z.string().trim().max(120).email(),
    nombre: z.string().trim().min(2).max(80),
    rol,
  }),
  z.object({ accion: z.literal('cambiar_rol'), id, rol }),
  z.object({ accion: z.literal('quitar_acceso'), id }),
  z.object({ accion: z.literal('devolver_acceso'), id }),
  z.object({ accion: z.literal('reiniciar_dos_pasos'), id }),
  z.object({ accion: z.literal('reenviar_invitacion'), id }),
  z.object({ accion: z.literal('cancelar_invitacion'), id }),
  z.object({ accion: z.literal('cerrar_sesiones'), id }),
]);

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'MANAGE_TEAM')) return error('No autorizado', 403);
  return NextResponse.json({ equipo: await listarEquipo(session.user.id) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Super admins con acceso: con contraseña y sin suspender. */
function superAdminsConAcceso(tx: Prisma.TransactionClient) {
  return tx.user.count({
    where: {
      role: 'SUPER_ADMIN',
      password: { not: null },
      OR: [{ profile: null }, { profile: { accountStatus: { not: 'SUSPENDED' } } }],
    },
  });
}

class SinSuperAdmin extends Error {}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'MANAGE_TEAM')) return error('No autorizado', 403);
  const datos = postSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    const campo = datos.error.issues[0]?.path[0];
    return error(campo === 'correo' ? 'Escribe un correo válido.' : campo === 'nombre' ? 'Escribe el nombre (2 a 80 letras).' : 'Datos inválidos', 400);
  }
  const d = datos.data;
  const yo = session.user;
  const quien = yo.name || yo.email || 'Un super admin';
  const avisar = (title: string, summary: string, fields: [string, string][]) =>
    emitAdminEvent({ type: 'ADMIN_TEAM_CHANGED', title, summary, fields: [...fields, ['Lo hizo', quien]], link: '/admin/equipo' });

  if (d.accion === 'invitar') {
    const correo = normalizarCorreo(d.correo);
    // Sin convertir cuentas: un cliente no pasa a admin por aquí (conservaría su contraseña y su historial de cliente)
    if (await buscarUsuarioPorCorreo(correo)) {
      return error('Ya existe una cuenta con ese correo. Usa otro correo para el panel: las cuentas existentes no se convierten.', 409);
    }
    let nuevo: { id: string };
    try {
      nuevo = await prisma.user.create({ data: { email: correo, name: d.nombre, role: d.rol }, select: { id: true } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return error('Ya existe una cuenta con ese correo.', 409);
      throw e;
    }
    const token = await crearEnlaceInvitacion(nuevo.id);
    const correoEnviado = await enviarInvitacion({ correo, nombre: d.nombre, rol: d.rol, token, invitadoPor: quien });
    await registrarAccionAdmin(session, 'USER_CREATED', { type: 'USER', id: nuevo.id }, { accion: 'Invitación al equipo', correo, rol: d.rol, correoEnviado }, request);
    avisar(`Invitación al panel · ${d.nombre}`, `Se invitó a ${correo} como ${nombreRol(d.rol)}.`, [['Correo', correo], ['Rol', nombreRol(d.rol)]]);
    return NextResponse.json({ ok: true, correoEnviado });
  }

  if (d.id === yo.id) return error('Esta acción no se puede hacer sobre tu propia cuenta.', 400);
  const miembro = await prisma.user.findUnique({
    where: { id: d.id },
    select: { id: true, name: true, email: true, role: true, password: true, profile: { select: { accountStatus: true } } },
  });
  if (!miembro || !esRolEquipo(miembro.role)) return error('Esa cuenta no es del equipo.', 404);
  const rolActual: RolEquipo = miembro.role;
  const nombre = miembro.name || miembro.email || 'Admin';
  const correo = miembro.email ?? '';
  const objetivo = { type: 'USER', id: miembro.id };
  const cerrarSesiones = () => cerrarLasDemas(miembro.id, undefined);

  try {
    switch (d.accion) {
      case 'cambiar_rol': {
        if (rolActual === d.rol) return NextResponse.json({ ok: true });
        // Serializable: dos super admins que se bajan el rol a la vez no pueden dejar la tienda sin dueño
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: miembro.id }, data: { role: d.rol } });
          if ((await superAdminsConAcceso(tx)) === 0) throw new SinSuperAdmin();
        }, { isolationLevel: 'Serializable' });
        // El rol viaja en la sesión: tiene que volver a entrar para que valga el nuevo
        await cerrarSesiones();
        await registrarAccionAdmin(session, 'USER_ROLE_CHANGED', objetivo, { correo, de: rolActual, a: d.rol }, request);
        avisar(`Cambio de rol · ${nombre}`, `Pasó de ${nombreRol(rolActual)} a ${nombreRol(d.rol)}.`, [['Cuenta', correo]]);
        break;
      }
      case 'quitar_acceso': {
        await prisma.$transaction(async (tx) => {
          await tx.profile.upsert({ where: { userId: miembro.id }, create: { userId: miembro.id, accountStatus: 'SUSPENDED' }, update: { accountStatus: 'SUSPENDED' } });
          await tx.passwordResetToken.deleteMany({ where: { userId: miembro.id } });
          if ((await superAdminsConAcceso(tx)) === 0) throw new SinSuperAdmin();
        }, { isolationLevel: 'Serializable' });
        await cerrarSesiones();
        await registrarAccionAdmin(session, 'SECURITY_ADMIN_ACTION', objetivo, { accion: 'Quitó el acceso al panel', correo }, request);
        avisar(`Acceso quitado · ${nombre}`, 'Ya no puede entrar al panel. Sus sesiones se cerraron.', [['Cuenta', correo], ['Rol', nombreRol(rolActual)]]);
        break;
      }
      case 'devolver_acceso': {
        if (miembro.profile?.accountStatus !== 'SUSPENDED') return NextResponse.json({ ok: true });
        await prisma.profile.update({ where: { userId: miembro.id }, data: { accountStatus: 'ACTIVE' } });
        await registrarAccionAdmin(session, 'SECURITY_ADMIN_ACTION', objetivo, { accion: 'Devolvió el acceso al panel', correo }, request);
        avisar(`Acceso devuelto · ${nombre}`, 'Puede volver a entrar al panel.', [['Cuenta', correo], ['Rol', nombreRol(rolActual)]]);
        break;
      }
      case 'reiniciar_dos_pasos': {
        await reiniciarDosPasos(miembro.id);
        await cerrarSesiones();
        await registrarAccionAdmin(session, 'SECURITY_ADMIN_ACTION', objetivo, { accion: 'Reinició la verificación en dos pasos', correo }, request);
        avisar(`Dos pasos reiniciados · ${nombre}`, 'La próxima vez que entre tendrá que configurar su app de códigos otra vez.', [['Cuenta', correo]]);
        break;
      }
      case 'cerrar_sesiones': {
        await cerrarSesiones();
        await registrarAccionAdmin(session, 'SECURITY_ADMIN_ACTION', objetivo, { accion: 'Cerró sus sesiones', correo }, request);
        break;
      }
      case 'reenviar_invitacion': {
        if (miembro.password) return error('Esa persona ya creó su contraseña. Si la olvidó, la recupera desde "¿La olvidaste?" en el inicio de sesión.', 409);
        if (miembro.profile?.accountStatus === 'SUSPENDED') return error('Esa cuenta no tiene acceso. Devuélvele el acceso antes de invitarla.', 409);
        const token = await crearEnlaceInvitacion(miembro.id);
        const correoEnviado = await enviarInvitacion({ correo, nombre, rol: rolActual, token, invitadoPor: quien });
        await registrarAccionAdmin(session, 'SECURITY_ADMIN_ACTION', objetivo, { accion: 'Reenvió la invitación', correo, correoEnviado }, request);
        return NextResponse.json({ ok: true, correoEnviado });
      }
      case 'cancelar_invitacion': {
        // Solo una invitación que nadie aceptó: sin contraseña no hubo sesiones ni nada hecho con esa cuenta
        const borradas = await prisma.user.deleteMany({ where: { id: miembro.id, password: null, role: { in: [...ROLES_EQUIPO] } } });
        if (borradas.count === 0) return error('Esa persona ya creó su contraseña. Para que no entre, quítale el acceso.', 409);
        await registrarAccionAdmin(session, 'USER_DELETED', objetivo, { accion: 'Canceló una invitación sin aceptar', correo, rol: rolActual }, request);
        avisar(`Invitación cancelada · ${nombre}`, 'La invitación no se había aceptado y se borró.', [['Correo', correo]]);
        break;
      }
    }
  } catch (e) {
    if (e instanceof SinSuperAdmin) return error('Tiene que quedar al menos un super admin con acceso.', 409);
    // Dos cambios del equipo a la vez (transacción serializable): se repite
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') return error('Hubo otro cambio al mismo tiempo. Intenta de nuevo.', 409);
    console.error('Error en una acción del equipo:', e);
    return error('No se pudo completar la acción.', 500);
  }
  return NextResponse.json({ ok: true });
}
