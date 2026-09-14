// Reglas del popup promocional del home (C-23). Sin dependencias del navegador para poder probarlas.

export const HOT_AD_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Lo que se guarda en localStorage por visitante */
export interface HotAdRecord {
  /** Imagen de la promoción: una promoción nueva (otra imagen) cuenta aparte */
  image: string;
  shownAt: number;
  /** "No volver a mostrar esta promoción" */
  dismissed?: boolean;
}

/** ¿Toca mostrar el popup? Como mucho una vez cada 24 h por promoción, y nunca si se descartó. */
export function shouldShowHotAd(record: unknown, image: string, now: number): boolean {
  if (!record || typeof record !== 'object') return true;
  const { image: seenImage, shownAt, dismissed } = record as Partial<HotAdRecord>;
  if (seenImage !== image) return true;
  if (dismissed === true) return false;
  if (typeof shownAt !== 'number' || !Number.isFinite(shownAt)) return true;
  // Reloj movido hacia atrás: se trata como recién mostrado
  if (shownAt > now) return false;
  return now - shownAt >= HOT_AD_INTERVAL_MS;
}

/**
 * El enlace lo escribe el admin: solo rutas internas ("/productos") o http(s).
 * Cualquier otra cosa (javascript:, data:, "//otro-sitio") se ignora y la imagen queda sin enlace.
 */
export function safeHotAdLink(raw: string | null | undefined): { href: string; external: boolean } | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return { href: value, external: false };
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return { href: url.toString(), external: true };
  } catch {
    return null;
  }
  return null;
}
