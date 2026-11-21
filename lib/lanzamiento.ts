// G-72: Tema temporal de lanzamiento en el inicio (Marketing → Lanzamiento).
// Módulo puro, sin Prisma ni navegador: lo usan el servidor (settings públicos, home), la validación y el panel.

import { comoDia, diaEnCaracas } from '@/lib/navidad';

export const PALETAS_LANZAMIENTO = ['vice', 'brand'] as const;
export type PaletaLanzamiento = (typeof PALETAS_LANZAMIENTO)[number];

export type EstadoLanzamiento = 'apagado' | 'programado' | 'activo' | 'terminado';

export interface ConfigLanzamiento {
  launchThemeEnabled: boolean;
  launchThemeFrom: Date | string | null;
  launchThemeUntil: Date | string | null;
}

export function paletaLanzamiento(valor: unknown): PaletaLanzamiento {
  return PALETAS_LANZAMIENTO.includes(valor as PaletaLanzamiento) ? (valor as PaletaLanzamiento) : 'vice';
}

/** Los dos días son incluidos, medidos en hora de Venezuela (America/Caracas). */
export function estadoLanzamiento(config: ConfigLanzamiento, ahora: Date = new Date()): EstadoLanzamiento {
  if (!config.launchThemeEnabled) return 'apagado';
  const hoy = diaEnCaracas(ahora);
  const desde = comoDia(config.launchThemeFrom);
  const hasta = comoDia(config.launchThemeUntil);
  if (desde && hoy < desde) return 'programado';
  if (hasta && hoy > hasta) return 'terminado';
  return 'activo';
}

export function lanzamientoActivo(config: ConfigLanzamiento, ahora: Date = new Date()): boolean {
  return estadoLanzamiento(config, ahora) === 'activo';
}

/** Extrae el ID de 11 caracteres de un enlace estándar de YouTube (watch, youtu.be, embed o shorts). */
export function extraerYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const limpio = url.trim();
  const match = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/.exec(limpio);
  return match ? match[1] : null;
}

/** Detecta la consola o plataforma del título de un producto para agrupar ediciones (PS5 / Xbox / PC). */
export function etiquetaPlataforma(nombre: string): string | null {
  const n = nombre.toLowerCase();
  if (/\bps5\b|playstation\s*5/.test(n)) return 'PS5';
  if (/\bps4\b|playstation\s*4/.test(n)) return 'PS4';
  if (/\bxbox\s*series\b/.test(n)) return 'Xbox Series X|S';
  if (/\bxbox\b/.test(n)) return 'Xbox';
  if (/\bnintendo\b|\bswitch\b/.test(n)) return 'Nintendo Switch';
  if (/\bpc\b|\bsteam\b/.test(n)) return 'PC';
  return null;
}

/** Nombre base sin la plataforma/formato final para detectar ediciones hermanas del mismo lanzamiento. */
export function nombreBaseJuego(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(ps5|ps4|playstation\s*5|playstation\s*4|xbox\s*series\s*x\|?s|xbox\s*one|xbox|nintendo\s*switch|pc|steam|psn|c[oó]digo|digital|f[ií]sico|edici[oó]n|edition)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const LOGO_GTA_VI_POR_DEFECTO = '/images/lanzamiento/gta-vi-logo.webp';

export const PLANTILLA_GTA_VI = {
  launchThemePalette: 'vice' as PaletaLanzamiento,
  launchThemePillText: 'GTA VI',
  launchThemeEyebrow: 'YA DISPONIBLE · PS5 Y XBOX SERIES X|S',
  launchThemeTitle: 'Ya llegó a Electro Shop',
  launchThemeSubtitle: 'Sin esperas ni envíos físicos. Recibe tu código digital original y empieza a jugar con soporte real en Venezuela.',
  launchThemeLogo: LOGO_GTA_VI_POR_DEFECTO,
  launchThemeTrailerUrl: 'https://www.youtube.com/watch?v=rz1B4B2yBZY',
  launchThemeShelfTitle: 'Todo para jugar GTA VI',
};
