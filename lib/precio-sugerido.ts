// Precio sugerido desde el costo y margen real (C-146b). Módulo puro: lo usan el asistente de productos y el Dashboard.
// Regla de Andrés (30/09): precio = costo + 30 % + IVA. El precio publicado ya lleva el IVA (C-146), así que la
// ganancia de un producto es su precio sin el IVA menos su costo, y el margen se mide sobre el costo.

import { ivaIncluido } from '@/lib/pricing';

/** Margen de la regla de Andrés. Es también el tope del artículo 31 de la Ley Orgánica de Precios Justos (sobre la estructura de costos). */
export const MARGEN_SUGERIDO = 30;

/**
 * Precio de venta para un costo: costo × (1 + margen) × (1 + IVA), hacia abajo al centavo.
 * Hacia abajo: redondeando hacia arriba, el margen quedaría una décima por encima del que se pidió.
 * Con céntimos enteros: 10 × 1,30 × 1,16 da 15,079999… en coma flotante.
 */
export function precioSugerido(costoUSD: number, ivaPercent: number, margenPercent: number = MARGEN_SUGERIDO): number | null {
  if (!(costoUSD > 0) || !(margenPercent >= 0)) return null;
  const iva = ivaPercent > 0 ? ivaPercent : 0;
  // Todo en enteros: céntimos del costo × (100 + margen en décimas) × (100 + IVA en centésimas)
  const centimos = Math.round(costoUSD * 100) * Math.round((100 + margenPercent) * 10) * Math.round((100 + iva) * 100);
  return Math.floor(centimos / 1_000 / 10_000 + 1e-9) / 100;
}

export interface DesglosePrecio {
  /** El precio sin el IVA */
  baseUSD: number;
  ivaUSD: number;
  /** Base menos costo; null si no hay costo */
  gananciaUSD: number | null;
  /** Ganancia sobre el costo, en %; null si no hay costo */
  margenPercent: number | null;
}

/** Qué parte del precio es IVA, qué queda, y cuánto se gana sobre el costo. El IVA sale igual que en la tienda (lib/pricing.ts). */
export function desglosePrecio(precioUSD: number, costoUSD: number | null, ivaPercent: number): DesglosePrecio | null {
  if (!(precioUSD > 0)) return null;
  const { baseUSD, ivaUSD } = ivaIncluido(precioUSD, ivaPercent);
  if (costoUSD === null || !(costoUSD > 0)) return { baseUSD, ivaUSD, gananciaUSD: null, margenPercent: null };
  const gananciaUSD = Math.round((baseUSD - costoUSD) * 100) / 100;
  return { baseUSD, ivaUSD, gananciaUSD, margenPercent: (gananciaUSD / costoUSD) * 100 };
}

/** "30 %", "12,5 %", "−3,4 %" */
export function formatMargen(percent: number): string {
  const redondo = Math.round(percent * 10) / 10;
  return `${redondo < 0 ? '−' : ''}${Math.abs(redondo).toLocaleString('es-VE', { maximumFractionDigits: 1 })} %`;
}
