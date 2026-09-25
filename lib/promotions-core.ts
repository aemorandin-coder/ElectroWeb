// Reglas de las ofertas y cupones de la tienda (C-102). Módulo puro: sin Prisma ni APIs del navegador.
// - Nunca aplican a productos digitales (decisión de Andrés, 25/09).
// - Si un producto tiene varios descuentos (oferta, cupón, descuento aprobado), gana el mayor: no se suman.
// - El servidor es la fuente de verdad; la tienda solo muestra lo que estas funciones calculan.

import { roundMoney } from '@/lib/pricing';

export type PromotionKindValue = 'AUTOMATIC' | 'COUPON';
export type PromotionScopeValue = 'ALL' | 'CATEGORY' | 'PRODUCT';

export interface PromotionRule {
  id: string;
  kind: PromotionKindValue;
  label: string | null;
  code: string | null;
  percentOff: number | null;
  /** Automática: por unidad. Cupón: por compra (se reparte entre los productos que aplican). */
  amountOffUSD: number | null;
  scope: PromotionScopeValue;
  productIds: string[];
  categoryIds: string[];
  minSubtotalUSD: number | null;
  endsAt: string | null;
}

export interface ProductoParaOferta {
  id: string;
  categoryId: string;
  productType: 'PHYSICAL' | 'DIGITAL';
}

export const PORCENTAJE_MAXIMO = 90;

/** Código escrito por el cliente o el admin: mayúsculas, sin espacios, letras, números y guiones. */
export function normalizarCodigo(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9-]{3,30}$/.test(code) ? code : null;
}

export function aplicaA(promo: PromotionRule, producto: ProductoParaOferta): boolean {
  if (producto.productType === 'DIGITAL') return false;
  if (promo.scope === 'PRODUCT') return promo.productIds.includes(producto.id);
  if (promo.scope === 'CATEGORY') return promo.categoryIds.includes(producto.categoryId);
  return true;
}

/** Descuento por unidad de una oferta automática sobre un precio. */
export function descuentoUnitario(promo: PromotionRule, precioUSD: number): number {
  if (!(precioUSD > 0)) return 0;
  if (promo.percentOff) return roundMoney(precioUSD * Math.min(promo.percentOff, PORCENTAJE_MAXIMO) / 100);
  if (promo.amountOffUSD) return roundMoney(Math.min(promo.amountOffUSD, precioUSD));
  return 0;
}

export interface OfertaAplicada {
  promotionId: string;
  label: string | null;
  endsAt: string | null;
  unitDiscountUSD: number;
  /** Precio con la oferta */
  priceUSD: number;
  /** Ahorro en % redondeado, para la etiqueta "-15%" */
  percent: number;
}

/** La mejor oferta automática para un producto a ese precio, o null. */
export function mejorOferta(promos: PromotionRule[], producto: ProductoParaOferta, precioUSD: number): OfertaAplicada | null {
  let mejor: OfertaAplicada | null = null;
  for (const promo of promos) {
    if (promo.kind !== 'AUTOMATIC' || !aplicaA(promo, producto)) continue;
    const unit = descuentoUnitario(promo, precioUSD);
    if (unit <= 0 || (mejor && unit <= mejor.unitDiscountUSD)) continue;
    mejor = {
      promotionId: promo.id,
      label: promo.label,
      endsAt: promo.endsAt,
      unitDiscountUSD: unit,
      priceUSD: roundMoney(precioUSD - unit),
      percent: Math.round((unit / precioUSD) * 100),
    };
  }
  return mejor;
}

export interface LineaParaCupon {
  key: string;
  producto: ProductoParaOferta;
  lineTotalUSD: number;
}

export type ResultadoCupon =
  | { ok: true; porLinea: Map<string, number>; totalUSD: number }
  | { ok: false; motivo: 'SIN_PRODUCTOS' | 'MINIMO'; faltaUSD?: number };

/**
 * Cuánto descuenta un cupón en cada línea. El monto fijo se reparte en proporción al total de cada línea
 * que aplica; la última línea absorbe el centavo del redondeo para que la suma sea exacta.
 */
export function repartirCupon(promo: PromotionRule, lineas: LineaParaCupon[]): ResultadoCupon {
  const aplican = lineas.filter((l) => l.lineTotalUSD > 0 && aplicaA(promo, l.producto));
  if (aplican.length === 0) return { ok: false, motivo: 'SIN_PRODUCTOS' };
  const base = roundMoney(aplican.reduce((sum, l) => sum + l.lineTotalUSD, 0));
  if (promo.minSubtotalUSD && base < promo.minSubtotalUSD) {
    return { ok: false, motivo: 'MINIMO', faltaUSD: roundMoney(promo.minSubtotalUSD - base) };
  }

  const porLinea = new Map<string, number>();
  if (promo.percentOff) {
    const pct = Math.min(promo.percentOff, PORCENTAJE_MAXIMO) / 100;
    for (const l of aplican) porLinea.set(l.key, roundMoney(l.lineTotalUSD * pct));
  } else if (promo.amountOffUSD) {
    const total = roundMoney(Math.min(promo.amountOffUSD, base));
    let repartido = 0;
    aplican.forEach((l, i) => {
      const parte = i === aplican.length - 1 ? roundMoney(total - repartido) : roundMoney((total * l.lineTotalUSD) / base);
      porLinea.set(l.key, Math.min(parte, l.lineTotalUSD));
      repartido = roundMoney(repartido + parte);
    });
  }
  return { ok: true, porLinea, totalUSD: roundMoney([...porLinea.values()].reduce((a, b) => a + b, 0)) };
}

/** Texto corto del valor: "15%" o "$10" */
export function valorPromocion(promo: Pick<PromotionRule, 'percentOff' | 'amountOffUSD'>): string {
  if (promo.percentOff) return `${promo.percentOff}%`;
  if (promo.amountOffUSD) return `$${Number.isInteger(promo.amountOffUSD) ? promo.amountOffUSD : promo.amountOffUSD.toFixed(2)}`;
  return '';
}

/**
 * Cuándo termina una oferta, solo si falta poco (como Amazon o Best Buy, sin inventar urgencia):
 * menos de 24 h → "Termina en 5 h"; menos de 48 h → "Termina mañana"; hasta 7 días → "Hasta el 28 sep".
 * Más lejos, o sin fecha, no se dice nada.
 */
export function textoFinOferta(endsAt: string | null, now: number = Date.now()): string | null {
  if (!endsAt) return null;
  const fin = new Date(endsAt).getTime();
  const falta = fin - now;
  if (!Number.isFinite(falta) || falta <= 0) return null;
  const horas = falta / 3_600_000;
  if (horas < 1) return 'Termina en menos de 1 h';
  if (horas < 24) return `Termina en ${Math.floor(horas)} h`;
  if (horas < 48) return 'Termina mañana';
  if (horas <= 24 * 7) {
    const dia = new Date(fin).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' });
    return `Hasta el ${dia.replace('.', '')}`;
  }
  return null;
}
