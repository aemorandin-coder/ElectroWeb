import { prisma } from '@/lib/prisma';

/**
 * Correos siempre en minúsculas y sin espacios (C-83).
 * El registro guardaba el correo en minúsculas, pero el login lo buscaba tal como se escribía: si el teclado del
 * teléfono ponía la primera letra en mayúscula, la cuenta existía y el login respondía "Credenciales invalidas".
 */
export function normalizarCorreo(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

/** Busca por correo sin importar mayúsculas: primero exacto (usa el índice) y luego para cuentas viejas guardadas con mayúsculas. */
export async function buscarUsuarioPorCorreo(valor: unknown) {
  const email = normalizarCorreo(valor);
  if (!email) return null;
  const exacto = await prisma.user.findUnique({ where: { email } });
  if (exacto) return exacto;
  return prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
}
