// Agencias de MRW (C-100). Solo servidor.
// MRW no publica una API: su web usa GET https://mrwve.com/api/agencias, sin documentar. Se lee con caché de 24 h
// y, si falla o cambia de forma, se usa la copia guardada en mrw-agencias.json (250 agencias, 21/09).
// El rastreo de MRW se hace en su web (mrwve.com/mi-envio): no hay forma confiable de automatizarlo.

import agenciasGuardadas from '@/lib/envios/mrw-agencias.json';
import { capitalizarNombre, nombreEstado } from '@/lib/envios/empresas';
import type { OficinaEnvio } from '@/lib/envios/zoom';

const URL_AGENCIAS = 'https://mrwve.com/api/agencias';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface AgenciaMrw extends OficinaEnvio {
  estado: string;
}

let cache: { expira: number; agencias: AgenciaMrw[] } | null = null;

function normalizar(filas: unknown): AgenciaMrw[] {
  if (!Array.isArray(filas)) return [];
  const agencias: AgenciaMrw[] = [];
  for (const fila of filas) {
    if (!fila || typeof fila !== 'object') continue;
    const f = fila as Record<string, unknown>;
    const codigo = String(f.codigo ?? '').trim();
    const nombre = String(f.nombre ?? '').trim();
    const estado = String(f.estado ?? '').trim();
    if (!/^[0-9A-Za-z-]{1,20}$/.test(codigo) || !nombre || !estado) continue;
    agencias.push({
      codigo,
      nombre: capitalizarNombre(nombre),
      direccion: String(f.direccion ?? '').replace(/\s+/g, ' ').trim(),
      estado: nombreEstado(estado),
    });
  }
  return agencias.sort((a, b) => a.estado.localeCompare(b.estado, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
}

const respaldo = normalizar(agenciasGuardadas);

export async function agenciasMrw(): Promise<AgenciaMrw[]> {
  if (cache && cache.expira > Date.now()) return cache.agencias;
  try {
    const response = await fetch(URL_AGENCIAS, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const agencias = normalizar(JSON.parse(await response.text()));
      // Una lista mucho más corta que la guardada es más probable un cambio de su web que 200 agencias cerradas
      if (agencias.length >= respaldo.length / 2) {
        cache = { expira: Date.now() + TTL_MS, agencias };
        return agencias;
      }
    }
  } catch (error) {
    console.error('MRW agencias no respondió:', error instanceof Error ? error.message : error);
  }
  cache = { expira: Date.now() + 60 * 60 * 1000, agencias: cache?.agencias ?? respaldo };
  return cache.agencias;
}
