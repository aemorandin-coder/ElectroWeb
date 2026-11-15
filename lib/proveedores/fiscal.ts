// C-246: los datos fiscales del proveedor (el equipo, 15/11, con el RIF de Ferrecla). Puro: lo usan la API y el panel.

/** "J308382353", "j-30838235-3" o "J 30838235 3" → "J-30838235-3". null si no es un RIF (letra y 9 dígitos) */
export function normalizarRif(texto: unknown): string | null {
  if (typeof texto !== 'string') return null;
  const limpio = texto.replace(/[\s.-]/g, '').toUpperCase();
  const m = limpio.match(/^([JVEGPC])(\d{9})$/);
  return m ? `${m[1]}-${m[2].slice(0, 8)}-${m[2].slice(8)}` : null;
}

/** "FERRECONSTRULACER, FERRECLA, C. A." → igual, sin espacios de más (la razón social se respeta como está en el RIF) */
export const limpiarTexto = (texto: unknown, max: number): string | null => {
  if (typeof texto !== 'string') return null;
  const limpio = texto.trim().replace(/\s+/g, ' ');
  return limpio.length > max ? null : limpio;
};

export const RAZON_SOCIAL_MAX = 150;
export const DOMICILIO_MAX = 300;
