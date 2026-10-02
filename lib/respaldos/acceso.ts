// Acceso a las rutas de respaldos (C-165): solo el dueño (MANAGE_SETTINGS es solo del super admin) con los dos pasos
// hechos, con límite de intentos. Devuelve la persona o la respuesta de error lista para devolver.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { createAuditLog, getRequestMetadata, type AuditAction } from '@/lib/audit-log';

export interface Dueno {
  id: string;
  email?: string;
}

export async function exigirDueno(accion: string): Promise<Dueno | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const usuario = session?.user as { id?: string; email?: string | null } | undefined;
  const id = usuario?.id ?? '';
  const limite = checkRateLimit(id, `respaldos:${accion}`, RATE_LIMITS.SENSITIVE);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiadas operaciones. Espera un minuto.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.SENSITIVE) });
  }
  return { id, email: usuario?.email ?? undefined };
}

export function esRespuesta(valor: Dueno | NextResponse): valor is NextResponse {
  return valor instanceof NextResponse;
}

export async function anotar(request: NextRequest, dueno: Dueno, action: AuditAction, details?: Record<string, unknown>): Promise<void> {
  await createAuditLog({
    action,
    userId: dueno.id,
    userEmail: dueno.email,
    targetType: 'SETTINGS',
    targetId: 'backups',
    severity: 'WARNING',
    details,
    ...getRequestMetadata(request),
  });
}
