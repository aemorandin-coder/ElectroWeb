import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getRequestMetadata } from '@/lib/audit-log';
import { extraerAvisos, guardarAvisos, MAX_BYTES_AVISO } from '@/lib/csp-reportes';

// C-166: aquí llegan los avisos de la Content-Security-Policy (los manda el navegador del visitante, sin sesión).
// Responde siempre 204 y no dice nada de lo que hizo: es una ruta pública y todo lo que recibe es dato no confiable.
// Con límite por IP y de tamaño; lo que se guarda es un conteo agrupado (lib/csp-reportes.ts).
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestMetadata(request).ipAddress || 'desconocida';
    if (!checkRateLimit(ip, 'csp-report', { maxRequests: 30, windowSeconds: 60 }).success) {
      return new NextResponse(null, { status: 429 });
    }
    const declarado = Number(request.headers.get('content-length') ?? 0);
    if (declarado > MAX_BYTES_AVISO) return new NextResponse(null, { status: 413 });
    const cuerpo = await request.text();
    if (cuerpo.length > MAX_BYTES_AVISO) return new NextResponse(null, { status: 413 });
    await guardarAvisos(extraerAvisos(cuerpo));
  } catch (error) {
    console.error('Error guardando un aviso de CSP:', error);
  }
  return new NextResponse(null, { status: 204 });
}
