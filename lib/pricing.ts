// Cálculo único de una orden: subtotal, descuentos, envío, impuesto y total.
// El servidor lo usa como fuente de verdad (POST /api/orders) y el checkout solo para mostrar.
// Módulo puro: no importa Prisma ni APIs del navegador.

export type DeliveryMethod = 'HOME_DELIVERY' | 'SHIPPING' | 'PICKUP';

export const DELIVERY_METHODS: readonly DeliveryMethod[] = ['HOME_DELIVERY', 'SHIPPING', 'PICKUP'];

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
  isConsolidable: boolean;
  shippingCostUSD: number; // Envío fijo por unidad (productos no consolidables)
  discountPercent: number; // 0 si no hay descuento aprobado
}

export interface PricingSettings {
  packagingFeeUSD: number;
  shippingCostPerKg: number;
  minConsolidatedShipping: number;
  freeDeliveryThresholdUSD: number | null;
  taxEnabled: boolean;
  taxPercent: number;
}

export interface ShippingBreakdown {
  total: number;
  packagingFee: number;
  consolidatedCost: number;
  bulkyCost: number;
  totalWeight: number;
  isFreeShipping: boolean;
  consolidableItems: Array<{ name: string; quantity: number; weight: number; volumetricWeight: number; usedWeight: number }>;
  bulkyItems: Array<{ name: string; quantity: number; cost: number }>;
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
 * Conserva los valores por defecto que usaba el checkout: un valor vacío o 0 toma el default.
 */
export function toPricingSettings(raw: {
  packagingFeeUSD?: NumberLike;
  shippingCostPerKg?: NumberLike;
  minConsolidatedShipping?: NumberLike;
  freeDeliveryThresholdUSD?: NumberLike;
  taxEnabled?: boolean | null;
  taxPercent?: NumberLike;
} | null | undefined): PricingSettings {
  const s = raw ?? {};
  return {
    packagingFeeUSD: toNumber(s.packagingFeeUSD) || 2.5,
    shippingCostPerKg: toNumber(s.shippingCostPerKg) || 2,
    minConsolidatedShipping: toNumber(s.minConsolidatedShipping) || 3,
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
    consolidatedCost: 0,
    bulkyCost: 0,
    totalWeight: 0,
    isFreeShipping: false,
    consolidableItems: [],
    bulkyItems: [],
    digitalItems: [],
  };
}

function calculateShipping(
  lines: PricingLine[],
  settings: PricingSettings,
  deliveryMethod: DeliveryMethod,
  cartSubtotal: number
): ShippingBreakdown {
  const breakdown = emptyBreakdown();

  if (deliveryMethod === 'PICKUP') return breakdown;

  if (lines.every(line => line.productType === 'DIGITAL')) {
    lines.forEach(line => breakdown.digitalItems.push({ name: line.name, quantity: line.quantity }));
    return breakdown;
  }

  const packagingFee = settings.packagingFeeUSD;
  breakdown.packagingFee = packagingFee;

  // Envío gratis: solo se cobra el embalaje
  const freeThreshold = settings.freeDeliveryThresholdUSD;
  if (freeThreshold && cartSubtotal >= freeThreshold) {
    breakdown.isFreeShipping = true;
    breakdown.total = packagingFee;
    lines.forEach(line => {
      if (line.productType === 'DIGITAL') {
        breakdown.digitalItems.push({ name: line.name, quantity: line.quantity });
      } else if (line.isConsolidable) {
        breakdown.consolidableItems.push({
          name: line.name,
          quantity: line.quantity,
          weight: (line.weightKg || 0.1) * line.quantity,
          volumetricWeight: 0,
          usedWeight: 0,
        });
      } else {
        breakdown.bulkyItems.push({ name: line.name, quantity: line.quantity, cost: 0 });
      }
    });
    return breakdown;
  }

  let consolidatedWeight = 0;
  let bulkyItemsShipping = 0;

  lines.forEach(line => {
    if (line.productType === 'DIGITAL') {
      breakdown.digitalItems.push({ name: line.name, quantity: line.quantity });
      return;
    }

    if (line.isConsolidable) {
      // Consolidable: se cobra el mayor entre peso real y volumétrico
      const realWeight = (line.weightKg || 0.1) * line.quantity;
      const volumetricWeight = calculateVolumetricWeight(line.dimensions) * line.quantity;
      const usedWeight = Math.max(realWeight, volumetricWeight);

      consolidatedWeight += usedWeight;
      breakdown.consolidableItems.push({
        name: line.name,
        quantity: line.quantity,
        weight: realWeight,
        volumetricWeight,
        usedWeight,
      });
    } else {
      // No consolidable (voluminoso): costo fijo por unidad
      const itemShipping = (line.shippingCostUSD || 0) * line.quantity;
      bulkyItemsShipping += itemShipping;
      breakdown.bulkyItems.push({ name: line.name, quantity: line.quantity, cost: itemShipping });
    }
  });

  const consolidatedShipping = consolidatedWeight > 0
    ? Math.max(consolidatedWeight * settings.shippingCostPerKg, settings.minConsolidatedShipping)
    : 0;

  breakdown.consolidatedCost = roundMoney(consolidatedShipping);
  breakdown.bulkyCost = roundMoney(bulkyItemsShipping);
  breakdown.totalWeight = roundMoney(consolidatedWeight);
  breakdown.total = roundMoney(consolidatedShipping + bulkyItemsShipping + packagingFee);

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
  const cartSubtotal = lines.reduce((sum, line) => sum + line.unitPriceUSD * line.quantity, 0);
  const shipping = calculateShipping(lines, settings, deliveryMethod, cartSubtotal);

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
