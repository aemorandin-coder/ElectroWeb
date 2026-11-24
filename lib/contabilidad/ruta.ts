// C-229: lo que comparten las rutas de Contabilidad: la sesión con su permiso y la respuesta de un error.

import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';

/**
 * FACTURAR: administradores y dueño. VER_CONTABILIDAD y DECLARAR: el dueño y la contadora (C-235). CARGAR_TALONARIO: solo
 * el dueño. Con una lista basta uno de ellos (las facturas se ven con FACTURAR o con VER_CONTABILIDAD).
 */
export type PermisoContable = 'FACTURAR' | 'VER_CONTABILIDAD' | 'DECLARAR' | 'CARGAR_TALONARIO' | 'CONFIG_CONTABLE';

/** Las facturas las leen quien factura y quien lleva la contabilidad (la contadora las ve, pero no factura) */
export const LEER_FACTURAS: PermisoContable[] = ['FACTURAR', 'VER_CONTABILIDAD'];

export async function sesionCon(permiso: PermisoContable | PermisoContable[]): Promise<{ session: Session; usuarioId: string } | NextResponse> {
  const session = await getServerSession(authOptions);
  const usuarioId = (session?.user as { id?: string } | undefined)?.id;
  const permisos = Array.isArray(permiso) ? permiso : [permiso];
  if (!session || !usuarioId || !permisos.some((p) => isAuthorized(session, p))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return { session, usuarioId };
}

export function respuestaError(r: { status: number; error: string; campo?: string; extra?: Record<string, unknown> }): NextResponse {
  return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}), ...(r.extra ?? {}) }, { status: r.status });
}

/** El primer problema de un esquema de zod, en palabras, con su campo */
export function errorDeEsquema(issues: Array<{ message: string; path: PropertyKey[] }>): NextResponse {
  const primero = issues[0];
  return NextResponse.json({ error: primero?.message ?? 'Datos inválidos', campo: primero?.path?.map(String).join('.') || undefined }, { status: 400 });
}
