// C-288 · Lo que comparten los bloques de Configuración → IA · Claude: el payload de GET /api/admin/ia, el formato de las cifras y
// el pedido a la API. Solo tipos del servidor (se borran al compilar): nada de Prisma llega al navegador.

import type { Consumo } from '@/lib/ia/consumo';
import type { Esfuerzo } from '@/lib/ia/precios';
import type { UsoIa } from '@/lib/ia/reglas';

export interface UsoDelServidor {
  id: UsoIa;
  deFabrica: string;
  vigente: string;
  delEquipo: boolean;
  porNombre: string | null;
  at: string | null;
}

export interface DatosIa {
  updatedAt: string | null;
  motor: { modelo: string; esfuerzo: Esfuerzo; fuente: 'panel' | 'env' };
  clave: { hay: boolean; enmascarada: string | null; fuente: 'panel' | 'env' | null; claveRota: boolean; hayEnServidor: boolean; cambiadaAt: string | null };
  groq: boolean;
  usos: UsoDelServidor[];
  frases: { lista: string[]; delPanel: boolean };
  consumo: Consumo;
}

/** Un pedido a la API: lo que respondió, con su mensaje si no salió */
export interface Respuesta<T = Record<string, unknown>> {
  ok: boolean;
  estado: number;
  datos: T & { error?: string; code?: string };
}

export async function llamar<T = Record<string, unknown>>(ruta: string, metodo: 'GET' | 'PUT' | 'POST' | 'DELETE', cuerpo?: unknown): Promise<Respuesta<T>> {
  const r = await fetch(ruta, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: 'no-store',
  });
  return { ok: r.ok, estado: r.status, datos: (await r.json().catch(() => ({}))) as T & { error?: string; code?: string } };
}

// ───── Formato ─────

/** Dólares con fracciones de centavo: un pedido de Haiku cuesta $0,0004 y con dos decimales saldría $0,00 */
export function usd(n: number): string {
  const [entero, decimales] = n.toFixed(n > 0 && n < 0.01 ? 4 : 2).split('.');
  return `$${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales}`;
}

/** 1.240.000 → "1,2 M"; 182.000 → "182 mil"; 640 → "640" */
export function miles(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-VE', { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString('es-VE')} mil`;
  return String(n);
}

export const segundos = (ms: number): string => `${(ms / 1000).toLocaleString('es-VE', { maximumFractionDigits: 1 })} s`;

const ZONA = 'America/Caracas';

/** "hoy, 10:12 a. m." · "ayer, 4:30 p. m." · "15/11" */
export function cuando(iso: string, ahora = new Date()): string {
  const fecha = new Date(iso);
  const dia = (f: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(f);
  const hora = new Intl.DateTimeFormat('es-VE', { timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: true }).format(fecha);
  if (dia(fecha) === dia(ahora)) return `hoy, ${hora}`;
  if (dia(fecha) === dia(new Date(ahora.getTime() - 86_400_000))) return `ayer, ${hora}`;
  return new Intl.DateTimeFormat('es-VE', { timeZone: ZONA, day: 'numeric', month: 'numeric' }).format(fecha);
}

export const veces = (n: number): string => (n === 1 ? '1 vez' : `${n} veces`);
