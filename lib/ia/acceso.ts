// C-288 · La guardia de las rutas de Configuración → IA · Claude (/api/admin/ia/*). Solo el dueño (MANAGE_SETTINGS es solo del
// super admin) con los dos pasos hechos, la misma guardia que usa /api/admin/studio/telegram, y un límite de intentos en lo que
// escribe o gasta. Devuelve a la persona o la respuesta de error lista para devolver. Solo servidor.

import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, hasPermission } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

export interface Persona {
  id: string;
  nombre: string | null;
  session: Session;
}

type Limite = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

/** `accion` separa los límites (guardar, probar…); sin `limite`, la ruta es de lectura y solo pide la sesión */
export async function exigirPersonaDeIa(accion: string, limite: Limite | null = RATE_LIMITS.SENSITIVE): Promise<Persona | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session) || !hasPermission(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const usuario = session.user as { id?: string; name?: string | null };
  const id = usuario.id ?? '';
  if (limite) {
    const r = checkRateLimit(id, `ia:${accion}`, limite);
    if (!r.success) {
      return NextResponse.json({ error: `Demasiados intentos seguidos. Espera ${r.resetIn} s.` }, { status: 429, headers: getRateLimitHeaders(r, limite) });
    }
  }
  return { id, nombre: usuario.name ?? null, session };
}

export const esRespuesta = (valor: Persona | NextResponse): valor is NextResponse => valor instanceof NextResponse;

/** Lo que cambió una persona en Configuración → IA · Claude, para la bitácora. Nunca lleva la clave: ni entera ni un pedazo */
export async function anotarIa(persona: Persona, request: Request, accion: string, detalles: Record<string, unknown> = {}): Promise<void> {
  await registrarAccionAdmin(persona.session, 'SETTINGS_UPDATED', { type: 'SETTINGS', id: 'ia' }, { accion, ...detalles }, request);
}

export const CONFLICTO = {
  error: 'Otra persona cambió esto mientras lo mirabas. Se cargó lo último: revisa y vuelve a intentar.',
  code: 'CONFLICTO',
} as const;
