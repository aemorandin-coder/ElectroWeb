// C-169: lo que comparten las rutas que guardan, borran y restauran cosas del panel entre varios administradores. Solo servidor.

import type { Session } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Cómo se llama a quien hizo el cambio en los avisos: su nombre, o lo que va antes de la @ de su correo */
export function nombreDeSesion(session: Session | null): string {
  const user = session?.user as { name?: string | null; email?: string | null } | undefined;
  return user?.name?.trim() || user?.email?.split('@')[0] || 'Alguien del equipo';
}

/**
 * La versión con la que el editor abrió el recurso (`updatedAt`, en ISO). Devuelve null si no vino, y 'invalida' si vino y no es
 * una fecha: el servidor no adivina, pide recargar.
 */
export function leerVersionBase(valor: unknown): Date | null | 'invalida' {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') return 'invalida';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'invalida' : fecha;
}

/** Quién hizo el último cambio registrado de un recurso, y cuándo (de la bitácora). Null si nadie lo cambió desde el panel. */
export async function ultimoCambio(targetType: string, targetId: string, acciones: string[]): Promise<{ nombre: string; en: string } | null> {
  const fila = await prisma.auditLog.findFirst({
    where: { targetType, targetId, action: { in: acciones } },
    orderBy: { createdAt: 'desc' },
    select: { userId: true, userEmail: true, createdAt: true },
  });
  if (!fila) return null;
  const usuario = fila.userId ? await prisma.user.findUnique({ where: { id: fila.userId }, select: { name: true, email: true } }) : null;
  const nombre = usuario?.name?.trim() || (usuario?.email ?? fila.userEmail)?.split('@')[0] || 'Alguien del equipo';
  return { nombre, en: fila.createdAt.toISOString() };
}

/** Nombre de una persona del equipo por su id (para "Luis lo movió a la papelera") */
export async function nombrePorId(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  return usuario ? usuario.name?.trim() || usuario.email?.split('@')[0] || null : null;
}

const normalizar = (valor: unknown): unknown => {
  if (Prisma.Decimal.isDecimal(valor)) return Number(valor);
  if (valor instanceof Date) return valor.toISOString();
  return valor ?? null;
};

/** Las claves de `cambios` cuyo valor es distinto del que ya tenía `antes` (decimales y fechas se comparan por su valor) */
export function clavesCambiadas(antes: Record<string, unknown>, cambios: Record<string, unknown>): string[] {
  return Object.keys(cambios).filter((clave) => JSON.stringify(normalizar(antes[clave])) !== JSON.stringify(normalizar(cambios[clave])));
}
