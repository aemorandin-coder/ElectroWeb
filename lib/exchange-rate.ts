// Tasa BCV (C-50b). Con "Actualizar la tasa sola" activo en Configuración, la tasa se trae de DolarAPI
// (promedio oficial) como mucho una vez por hora. Solo servidor.

import { prisma } from '@/lib/prisma';

const SOURCE_URL = 'https://ve.dolarapi.com/v1/dolares';
/** Antigüedad a partir de la cual se vuelve a consultar la fuente. */
export const RATE_MAX_AGE_MS = 60 * 60 * 1000;
/** Cada proceso revisa la base de datos como mucho cada 5 minutos. */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
/** Un salto mayor al 50 % frente a la tasa guardada se descarta: más probable un dato roto que una devaluación. */
const MAX_JUMP = 0.5;

export interface OfficialRate {
  rate: number;
  publishedAt: Date | null;
}

export async function fetchOfficialRate(): Promise<OfficialRate | null> {
  const response = await fetch(SOURCE_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!response.ok) return null;
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return null;
  const official = data.find((row) => row && typeof row === 'object' && (row.fuente === 'oficial' || row.nombre === 'Oficial'));
  const rate = Number(official?.promedio);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const publishedAt = official?.fechaActualizacion ? new Date(official.fechaActualizacion) : null;
  return { rate, publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null };
}

export function isPlausibleRate(next: number, current: number | null): boolean {
  if (!current || current <= 0) return true;
  return Math.abs(next - current) / current <= MAX_JUMP;
}

export type RefreshStatus = 'updated' | 'fresh' | 'disabled' | 'unavailable' | 'rejected';

export interface RefreshResult {
  status: RefreshStatus;
  rate: number | null;
  lastRateUpdate: Date | null;
}

/**
 * Actualiza la tasa guardada si el modo automático está activo y la tasa tiene más de una hora.
 * `force` la consulta ya (botón "Actualizar ahora" del admin), aunque sea reciente.
 */
export async function refreshExchangeRate({ force = false }: { force?: boolean } = {}): Promise<RefreshResult> {
  const row = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { autoExchangeRates: true, exchangeRateVES: true, lastRateUpdate: true },
  });
  const current = row?.exchangeRateVES ? Number(row.exchangeRateVES) : null;
  const base = { rate: current, lastRateUpdate: row?.lastRateUpdate ?? null };
  if (!row?.autoExchangeRates) return { status: 'disabled', ...base };
  if (!force && row.lastRateUpdate && Date.now() - row.lastRateUpdate.getTime() < RATE_MAX_AGE_MS) {
    return { status: 'fresh', ...base };
  }

  let official: OfficialRate | null = null;
  try {
    official = await fetchOfficialRate();
  } catch (error) {
    console.error('[EXCHANGE-RATE] La fuente no respondió:', error instanceof Error ? error.message : error);
  }
  if (!official) return { status: 'unavailable', ...base };
  if (!isPlausibleRate(official.rate, current)) {
    console.error(`[EXCHANGE-RATE] Tasa descartada: ${official.rate} frente a ${current} guardada`);
    return { status: 'rejected', ...base };
  }

  const now = new Date();
  // Condicional: si el admin apagó el modo automático mientras tanto, no se pisa su tasa manual
  const updated = await prisma.companySettings.updateMany({
    where: { id: 'default', autoExchangeRates: true },
    data: { exchangeRateVES: official.rate, lastRateUpdate: now },
  });
  if (updated.count === 0) return { status: 'disabled', ...base };
  return { status: 'updated', rate: official.rate, lastRateUpdate: now };
}

let lastCheck = 0;
let running = false;

/** Sin await: proxy.ts la llama en las visitas. La tienda muestra la tasa nueva al regenerar sus páginas (60 s). */
export function scheduleExchangeRateRefresh(): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const now = Date.now();
  if (running || now - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = now;
  running = true;
  refreshExchangeRate()
    .catch((error) => console.error('[EXCHANGE-RATE] Error al actualizar:', error))
    .finally(() => {
      running = false;
    });
}
