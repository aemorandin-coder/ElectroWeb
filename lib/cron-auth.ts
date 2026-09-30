import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

// Rutas del cron del servidor (C-100, C-138): `Authorization: Bearer $CRON_SECRET`.
// Sin CRON_SECRET (o con uno corto) nadie las puede disparar.

export function cronConfigurado(): boolean {
  return Boolean(process.env.CRON_SECRET);
}

export function cronAutorizado(request: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < 16) return false;
  const recibido = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(recibido);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}
