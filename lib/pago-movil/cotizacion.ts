// Cotización firmada del Pago Móvil de una compra (C-125). Solo servidor.
//
// La orden se crea DESPUÉS de pagar, así que no hay una fila donde congelar el monto en Bs. Lo congela esta firma:
// el servidor fija total, tasa y monto al cotizar, y el checkout la devuelve al verificar el pago. Si la tasa cambia
// mientras el cliente está en la app del banco, su pago se concilia con la tasa que se le mostró, no con la nueva.
// Nadie puede elegir otra tasa: la firma es HMAC con NEXTAUTH_SECRET y va atada a la cuenta.

import { createHmac, timingSafeEqual } from 'crypto';
import { montoBs, VIGENCIA_COTIZACION_MS } from './monto';

export interface CotizacionBs {
  userId: string;
  totalUSD: number;
  tasa: number;
  montoBs: number;
  emitida: number;
}

function firmar(datos: string): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return createHmac('sha256', `pago-movil:${secreto}`).update(datos).digest('base64url');
}

/** Token para el checkout. Null si no hay tasa. */
export function emitirCotizacion(userId: string, totalUSD: number, tasa: number, ahora = Date.now()): { montoBs: number; tasa: number; token: string } | null {
  const bs = montoBs(totalUSD, tasa);
  if (!(bs > 0)) return null;
  const datos = Buffer.from(JSON.stringify({ u: userId, usd: totalUSD, tasa, bs, t: ahora })).toString('base64url');
  return { montoBs: bs, tasa, token: `${datos}.${firmar(datos)}` };
}

/** La cotización si la firma es válida, es de esta cuenta y sigue vigente. Si no, null (se usa la tasa del momento). */
export function leerCotizacion(token: unknown, userId: string, ahora = Date.now()): CotizacionBs | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [datos, firma] = token.split('.');
  if (!datos || !firma) return null;
  const esperada = Buffer.from(firmar(datos));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const p = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8')) as { u?: unknown; usd?: unknown; tasa?: unknown; bs?: unknown; t?: unknown };
    if (p.u !== userId || typeof p.usd !== 'number' || typeof p.tasa !== 'number' || typeof p.bs !== 'number' || typeof p.t !== 'number') return null;
    if (ahora - p.t > VIGENCIA_COTIZACION_MS || p.t - ahora > 60_000) return null;
    return { userId: p.u, totalUSD: p.usd, tasa: p.tasa, montoBs: p.bs, emitida: p.t };
  } catch {
    return null;
  }
}
