// La estrella del día de la vitrina del inicio (C-172).

/** Día del año (1 a 366) en hora de Caracas: la estrella cambia a medianoche de la tienda, no del servidor. */
export function diaDelAnoEnCaracas(fecha: Date = new Date()): number {
  const [ano, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(fecha)
    .split('-')
    .map(Number);
  return Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(ano, 0, 1)) / 86_400_000) + 1;
}

/**
 * Gira la lista para que cada día empiece en un destacado distinto, siguiendo su orden: hoy el primero, mañana el
 * segundo… El orden entre ellos no cambia (el que era estrella ayer queda al final). Toda visita del día ve la misma.
 */
export function estrellaDelDia<T>(productos: T[], fecha: Date = new Date()): T[] {
  if (productos.length < 2) return productos;
  const inicio = diaDelAnoEnCaracas(fecha) % productos.length;
  return [...productos.slice(inicio), ...productos.slice(0, inicio)];
}
