// Entrada de Numen a las cotizaciones (C-181): la clave, los límites, el correo y el historial. Solo servidor.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createAuditLog, type AuditAction } from '@/lib/audit-log';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { numenAutorizado, numenConfigurado } from '@/lib/numen-auth';
import { aCotizacionAdmin, type CotizacionNumen } from './index';
import { enviarCotizacionPorCorreo } from './correo';

/** El nombre de quien usa Numen: queda en el historial ("Luis desde Numen"). */
export const autorSchema = z.string().trim().min(2, 'Falta quién lo hace').max(60);

const sinCache = { 'Cache-Control': 'no-store' };
export const responder = (cuerpo: unknown, status = 200) => NextResponse.json(cuerpo, { status, headers: sinCache });

/**
 * null si puede pasar; si no, la respuesta. Una clave equivocada cuenta como fallo: 10 en 5 minutos por IP frenan
 * esa IP un rato. Con la clave buena, hasta 120 pedidos por minuto (Numen pregunta por varias de una vez).
 */
export function exigirNumen(request: NextRequest): NextResponse | null {
  if (!numenConfigurado()) return responder({ error: 'NUMEN_API_KEY no está configurada' }, 503);
  const ip = getClientIP(request);
  if (!numenAutorizado(request)) {
    const fallos = checkRateLimit(ip, 'numen:fallos', { maxRequests: 10, windowSeconds: 300 });
    return responder({ error: fallos.success ? 'No autorizado' : 'Demasiados intentos. Espera unos minutos.' }, fallos.success ? 401 : 429);
  }
  if (!checkRateLimit(ip, 'numen', { maxRequests: 120, windowSeconds: 60 }).success) return responder({ error: 'Demasiados pedidos seguidos' }, 429);
  return null;
}

/** El primer problema de una validación, como lo responden las demás rutas. */
export function errorDeValidacion(error: z.ZodError) {
  const problema = error.issues[0];
  return responder({ error: problema?.message ?? 'Revisa los datos', field: problema?.path.join('.') }, 400);
}

export async function registrarDeNumen(request: NextRequest, action: AuditAction, id: string, autor: string, details: Record<string, unknown>) {
  await createAuditLog({
    action,
    targetType: 'QUOTE',
    targetId: id,
    userEmail: `${autor} (Numen)`,
    details: { origen: 'Numen', autor, ...details },
    ipAddress: getClientIP(request),
    severity: 'INFO',
  });
}

/**
 * Manda la cotización al correo del cliente, como "Enviar por correo" del panel (C-159). Un correo por cotización
 * cada 30 segundos. No falla el pedido de Numen: devuelve si salió.
 */
export async function correoDesdeNumen(q: Parameters<typeof aCotizacionAdmin>[0]): Promise<{ enviado: boolean; a?: string; error?: string }> {
  const para = q.contactEmail;
  if (!para) return { enviado: false, error: 'La cotización no tiene el correo del cliente' };
  if (q.status !== 'SENT' && q.status !== 'APPROVED') return { enviado: false, error: 'Un borrador todavía no tiene enlace' };
  if (!checkRateLimit(q.id, 'cotizacion:correo-una', { maxRequests: 1, windowSeconds: 30 }).success) return { enviado: false, error: 'Ya se envió hace un momento' };
  const envio = await enviarCotizacionPorCorreo(aCotizacionAdmin(q), para, null);
  if (!envio.success) {
    console.error('Error enviando la cotización por correo (Numen):', envio.error);
    return { enviado: false, error: 'El correo no salió' };
  }
  await prisma.quote.update({ where: { id: q.id }, data: { emailedAt: new Date(), emailedTo: para } });
  return { enviado: true, a: para };
}

export type RespuestaNumen = { cotizacion: CotizacionNumen };
