// Cálculo único de una orden: subtotal, descuentos, envío, impuesto y total.
// El servidor lo usa como fuente de verdad (POST /api/orders) y el checkout solo para mostrar.
// Módulo puro: no importa Prisma ni APIs del navegador.

// C-100: SHIPPING = ZOOM o MRW (oficina o puerta a puerta), LOCAL_DELIVERY = delivery propio en Guanare.
// Las órdenes viejas pueden decir HOME_DELIVERY o STORE_PICKUP; el checkout ya no los manda.
export type DeliveryMethod = 'SHIPPING' | 'LOCAL_DELIVERY' | 'PICKUP';

export const DELIVERY_METHODS: readonly DeliveryMethod[] = ['SHIPPING', 'LOCAL_DELIVERY', 'PICKUP'];

// La tienda no cobra IVA aparte (decisión de Andrés, C-01). El switch del admin se respeta
// solo cuando esto pase a true.
export const STORE_CHARGES_TAX = false;

export interface PricingLine {
  productId: string;
  name: string;
  productType: 'PHYSICAL' | 'DIGITAL';
  unitPriceUSD: number;
  quantity: number;
  weightKg: number | null;
  dimensions: string | null; // JSON: {length, width, height} en cm
  isConsolidable: boolean; // Se empaca con otros en la misma caja (si no, va como pieza aparte)
  shippingCostUSD: number; // Legado de antes de C-100: ya no se cobra (el flete se paga a la empresa)
  freeShipping: boolean; // C-100: la tienda paga el envío del paquete que lo lleve
  discountPercent: number; // 0 si no hay descuento aprobado
}

export interface PricingSettings {
  packagingFeeUSD: number;
  localDeliveryFeeUSD: number;
  freeDeliveryThresholdUSD: number | null;
  taxEnabled: boolean;
  taxPercent: number;
}

/**
 * Envío desde C-100 (decisión de Andrés, 22/09):
 * - ZOOM o MRW con **cobro a destino**: el cliente le paga el flete a la empresa al recibir; la tienda cobra el embalaje.
 * - **Envío gratis**: si el paquete lleva un producto con envío gratis, o la compra física llega al monto de
 *   Configuración, no se cobra nada y la tienda paga la guía.
 * - Delivery en Guanare: tarifa fija de Configuración (gratis en los mismos casos).
 */
export interface ShippingBreakdown {
  /** Lo que la tienda cobra por el envío en esta compra. */
  total: number;
  packagingFee: number;
  localDeliveryFee: number;
  isFreeShipping: boolean;
  freeReason: 'PRODUCT' | 'THRESHOLD' | null;
  /** Quién le paga el flete a ZOOM o MRW. `null` si no hay envío por empresa. */
  paidBy: 'CUSTOMER' | 'STORE' | null;
  /** Kilos que cobra la empresa (el mayor entre el peso real y el volumétrico), para la tarifa de referencia. */
  totalWeight: number;
  pieces: number;
  digitalItems: Array<{ name: string; quantity: number }>;
}

export interface OrderGroupTotals {
  lines: PricingLine[];
  subtotalUSD: number;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
}

export interface OrderCalculation {
  subtotalUSD: number;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
  shipping: ShippingBreakdown;
  // La compra se divide en una orden de productos físicos (con envío) y otra de digitales.
  physical: OrderGroupTotals | null;
  digital: OrderGroupTotals | null;
}

type NumberLike = number | string | { toString(): string } | null | undefined;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Monto listo para una columna Decimal (C-96): texto con 2 decimales.
 * Prisma 6 convierte un number de JS con 16 cifras significativas y guarda el arrastre binario
 * (9.45 → 9.449999999999999). Invisible en pantalla, pero un saldo de $9,45 guardado así no alcanzaba
 * para un precio exacto de $9,45. Para escribir dinero, y para compararlo en un where, siempre esto.
 */
export function montoDecimal(value: number): string {
  return roundMoney(value).toFixed(2);
}

function toNumber(value: NumberLike): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normaliza los ajustes de la empresa (Prisma o /api/settings/public).
 * Sin valor, el embalaje vale $2,50 como antes; un 0 escrito en Configuración ahora sí es 0 (antes subía a 2,50).
 */
export function toPricingSettings(raw: {
  packagingFeeUSD?: NumberLike;
  deliveryFeeUSD?: NumberLike;
  freeDeliveryThresholdUSD?: NumberLike;
  taxEnabled?: boolean | null;
  taxPercent?: NumberLike;
} | null | undefined): PricingSettings {
  const s = raw ?? {};
  const packaging = s.packagingFeeUSD === null || s.packagingFeeUSD === undefined || s.packagingFeeUSD === ''
    ? 2.5
    : Math.max(toNumber(s.packagingFeeUSD), 0);
  return {
    packagingFeeUSD: packaging,
    localDeliveryFeeUSD: Math.max(toNumber(s.deliveryFeeUSD), 0),
    freeDeliveryThresholdUSD: toNumber(s.freeDeliveryThresholdUSD) || null,
    taxEnabled: STORE_CHARGES_TAX && Boolean(s.taxEnabled),
    taxPercent: toNumber(s.taxPercent),
  };
}

// Peso volumétrico: largo × ancho × alto (cm) / 5000, estándar de las empresas de encomienda.
export function calculateVolumetricWeight(dimensions: string | null | undefined): number {
  if (!dimensions) return 0;
  try {
    const dims = JSON.parse(dimensions);
    const length = Number(dims?.length) || 0;
    const width = Number(dims?.width) || 0;
    const height = Number(dims?.height) || 0;
    return (length * width * height) / 5000;
  } catch {
    return 0;
  }
}

function emptyBreakdown(): ShippingBreakdown {
  return {
    total: 0,
    packagingFee: 0,
    localDeliveryFee: 0,
    isFreeShipping: false,
    freeReason: null,
    paidBy: null,
    totalWeight: 0,
    pieces: 0,
    digitalItems: [],
  };
}

function calculateShipping(
  lines: PricingLine[],
  settings: PricingSettings,
  deliveryMethod: DeliveryMethod
): ShippingBreakdown {
  const breakdown = emptyBreakdown();
  const physical = lines.filter(line => line.productType !== 'DIGITAL');
  lines.forEach(line => {
    if (line.productType === 'DIGITAL') breakdown.digitalItems.push({ name: line.name, quantity: line.quantity });
  });

  if (deliveryMethod === 'PICKUP' || physical.length === 0) return breakdown;

  // Kilos y piezas para la tarifa de referencia de la empresa
  let weight = 0;
  let loosePieces = 0;
  physical.forEach(line => {
    const realWeight = (line.weightKg || 0.1) * line.quantity;
    const volumetricWeight = calculateVolumetricWeight(line.dimensions) * line.quantity;
    weight += Math.max(realWeight, volumetricWeight);
    if (!line.isConsolidable) loosePieces += line.quantity;
  });
  breakdown.totalWeight = roundMoney(weight);
  breakdown.pieces = loosePieces + (physical.some(line => line.isConsolidable) ? 1 : 0);

  // El umbral cuenta solo lo físico: antes una gift card de $50 le daba envío gratis a un cable de $5 (E1)
  const physicalSubtotal = physical.reduce((sum, line) => {
    const percent = Math.min(Math.max(line.discountPercent || 0, 0), 100);
    return sum + line.unitPriceUSD * line.quantity * (1 - percent / 100);
  }, 0);
  const threshold = settings.freeDeliveryThresholdUSD;
  if (physical.some(line => line.freeShipping)) breakdown.freeReason = 'PRODUCT';
  else if (threshold && roundMoney(physicalSubtotal) >= threshold) breakdown.freeReason = 'THRESHOLD';
  breakdown.isFreeShipping = breakdown.freeReason !== null;

  if (deliveryMethod === 'LOCAL_DELIVERY') {
    breakdown.localDeliveryFee = breakdown.isFreeShipping ? 0 : roundMoney(settings.localDeliveryFeeUSD);
    breakdown.total = breakdown.localDeliveryFee;
    return breakdown;
  }

  breakdown.paidBy = breakdown.isFreeShipping ? 'STORE' : 'CUSTOMER';
  breakdown.packagingFee = breakdown.isFreeShipping ? 0 : roundMoney(settings.packagingFeeUSD);
  breakdown.total = breakdown.packagingFee;
  return breakdown;
}

function calculateGroup(lines: PricingLine[], shippingUSD: number, settings: PricingSettings): OrderGroupTotals | null {
  if (lines.length === 0) return null;

  let subtotal = 0;
  let discount = 0;
  lines.forEach(line => {
    const lineTotal = line.unitPriceUSD * line.quantity;
    subtotal += lineTotal;
    const percent = Math.min(Math.max(line.discountPercent || 0, 0), 100);
    discount += lineTotal * (percent / 100);
  });

  const subtotalUSD = roundMoney(subtotal);
  const discountUSD = roundMoney(discount);
  const taxUSD = settings.taxEnabled && settings.taxPercent > 0
    ? roundMoney((subtotalUSD - discountUSD) * (settings.taxPercent / 100))
    : 0;

  return {
    lines,
    subtotalUSD,
    discountUSD,
    shippingUSD,
    taxUSD,
    totalUSD: roundMoney(subtotalUSD - discountUSD + shippingUSD + taxUSD),
  };
}

export function calculateOrder(
  lines: PricingLine[],
  settings: PricingSettings,
  deliveryMethod: DeliveryMethod
): OrderCalculation {
  const shipping = calculateShipping(lines, settings, deliveryMethod);

  const physicalLines = lines.filter(line => line.productType !== 'DIGITAL');
  const digitalLines = lines.filter(line => line.productType === 'DIGITAL');

  // El envío se carga completo a la orden física; la digital nunca paga envío.
  const physical = calculateGroup(physicalLines, physicalLines.length > 0 ? shipping.total : 0, settings);
  const digital = calculateGroup(digitalLines, 0, settings);
  const groups = [physical, digital].filter((g): g is OrderGroupTotals => g !== null);

  return {
    subtotalUSD: roundMoney(groups.reduce((sum, g) => sum + g.subtotalUSD, 0)),
    discountUSD: roundMoney(groups.reduce((sum, g) => sum + g.discountUSD, 0)),
    shippingUSD: roundMoney(groups.reduce((sum, g) => sum + g.shippingUSD, 0)),
    taxUSD: roundMoney(groups.reduce((sum, g) => sum + g.taxUSD, 0)),
    totalUSD: roundMoney(groups.reduce((sum, g) => sum + g.totalUSD, 0)),
    shipping,
    physical,
    digital,
  };
}
