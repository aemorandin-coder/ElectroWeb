import { createHash, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

// Numen, la app de precios y proveedores del equipo, crea y sigue cotizaciones de servidor a servidor (C-181):
// `Authorization: Bearer $NUMEN_API_KEY`. Sin NUMEN_API_KEY (o con una de menos de 32 caracteres) nadie entra.

export function numenConfigurado(): boolean {
  return (process.env.NUMEN_API_KEY ?? '').length >= 32;
}

export function numenAutorizado(request: NextRequest): boolean {
  const clave = process.env.NUMEN_API_KEY ?? '';
  if (clave.length < 32) return false;
  const recibida = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  // Se comparan las huellas: mismo largo siempre, así la comparación no dice cuántos caracteres acertó
  const a = createHash('sha256').update(recibida).digest();
  const b = createHash('sha256').update(clave).digest();
  return timingSafeEqual(a, b);
}
