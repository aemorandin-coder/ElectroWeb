// Cálculo único de una orden: subtotal, descuentos, envío, impuesto y total.
// El servidor lo usa como fuente de verdad (POST /api/orders) y el checkout solo para mostrar.
// Módulo puro: no importa Prisma ni APIs del navegador.

import { formatUSD } from '@/lib/currency';
import { armarPaquetes, reglasEmbalajeActivas, type PlanEmbalaje, type ReglasEmbalaje } from '@/lib/embalaje';

// C-100: SHIPPING = ZOOM o MRW (oficina o puerta a puerta), LOCAL_DELIVERY = delivery propio en Guanare.
// Las órdenes viejas pueden decir HOME_DELIVERY o STORE_PICKUP; el checkout ya no los manda.
export type DeliveryMethod = 'SHIPPING' | 'LOCAL_DELIVERY' | 'PICKUP';

export const DELIVERY_METHODS: readonly DeliveryMethod[] = ['SHIPPING', 'LOCAL_DELIVERY', 'PICKUP'];

/**
 * IVA (C-146, decisión de Andrés del 30/09): **los precios publicados ya llevan el IVA**. La tienda nunca suma nada
 * al total (C-01): dice cuánto del total es IVA, con el porcentaje de Configuración → Precios.
 * El IVA va sobre todo lo que cobra la tienda en la orden: productos menos descuentos, más embalaje o delivery.
 */
export function ivaIncluido(totalUSD: number, percent: number): { baseUSD: number; ivaUSD: number } {
  if (!(totalUSD > 0) || !(percent > 0)) return { baseUSD: Math.max(totalUSD, 0), ivaUSD: 0 };
  const ivaUSD = Math.round((totalUSD - totalUSD / (1 + percent / 100)) * 100) / 100;
  return { baseUSD: Math.round((totalUSD - ivaUSD) * 100) / 100, ivaUSD };
}

/** El porcentaje con el que se calculó un IVA incluido ya guardado (órdenes): 16 para $8,28 dentro de $60. */
export function porcentajeIva(totalUSD: number, ivaUSD: number): number {
  if (!(ivaUSD > 0) || !(totalUSD > ivaUSD)) return 0;
  // Entero: el IVA guardado está redondeado al céntimo, y en montos chicos el cociente da 16,3 en vez de 16
  return Math.round((ivaUSD / (totalUSD - ivaUSD)) * 100);
}

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
  /** C-102: descuento de la línea en USD (oferta o cupón), ya elegido por el servidor. Gana el mayor con discountPercent. */
  discountUSD?: number;
  /** C-199: la ciudad de ZOOM desde donde la despacha su proveedor (null = sale de la tienda, Guanare) y su nombre */
  origen?: string | null;
  origenNombre?: string | null;
}

/** C-199: de dónde salen los paquetes de la tienda */
export const ORIGEN_TIENDA_NOMBRE = 'Guanare';

/** Descuento de una línea: el mayor entre el porcentaje aprobado y el monto de oferta o cupón, sin pasar del total. */
export function lineDiscountUSD(line: Pick<PricingLine, 'unitPriceUSD' | 'quantity' | 'discountPercent' | 'discountUSD'>): number {
  const lineTotal = line.unitPriceUSD * line.quantity;
  const percent = Math.min(Math.max(line.discountPercent || 0, 0), 100);
  const byPercent = lineTotal * (percent / 100);
  const byAmount = Math.max(line.discountUSD || 0, 0);
  return Math.min(Math.max(byPercent, byAmount), lineTotal);
}

export interface PricingSettings {
  /** Embalaje de precio único: lo que se cobra si no hay empaques configurados */
  packagingFeeUSD: number;
  /** C-153: empaques de la tienda. Con ellos el embalaje sale del paquete que se arma (lib/embalaje.ts); `null` = precio único */
  packagingRules: ReglasEmbalaje | null;
  /** C-153: compra física desde la que el embalaje no se cobra. El flete sigue con cobro a destino (no es "envío gratis") */
  freePackagingThresholdUSD: number | null;
  localDeliveryFeeUSD: number;
  freeDeliveryThresholdUSD: number | null;
  /** Los precios incluyen IVA: el total no cambia, se informa cuánto es IVA (C-146) */
  taxEnabled: boolean;
  taxPercent: number;
  /** C-151: los productos digitales también llevan IVA. Apagado: sus órdenes guardan IVA 0 y la tienda no dice "IVA incluido" en ellos */
  taxDigital: boolean;
}

/** ¿El precio de este tipo de producto lleva IVA dentro? (C-151) */
export function llevaIva(settings: Pick<PricingSettings, 'taxEnabled' | 'taxPercent' | 'taxDigital'>, productType: string | null | undefined): boolean {
  return settings.taxEnabled && settings.taxPercent > 0 && (productType !== 'DIGITAL' || settings.taxDigital);
}

/**
 * Envío desde C-100 (decisión de Andrés, 22/09):
 * - ZOOM o MRW con **cobro a destino**: el cliente le paga el flete a la empresa al recibir; la tienda cobra el embalaje.
 * - **Envío gratis**: si el paquete lleva un producto con envío gratis, o la compra física llega al monto de
 *   Configuración, no se cobra nada y la tienda paga la guía.
 * - Delivery en Guanare: tarifa fija de Configuración (gratis en los mismos casos).
 * - C-153: el embalaje sale del paquete que se arma con las medidas de los productos (o el precio único si la
 *   tienda no configuró empaques) y puede ser gratis desde un monto sin que la tienda pague el flete.
 */
export interface ShippingBreakdown {
  /** Lo que la tienda cobra por el envío en esta compra. */
  total: number;
  packagingFee: number;
  localDeliveryFee: number;
  isFreeShipping: boolean;
  freeReason: 'PRODUCT' | 'THRESHOLD' | null;
  /** C-153: el embalaje no se cobra porque la compra llegó al monto; el flete lo sigue pagando el cliente */
  packagingFreeByThreshold: boolean;
  /** C-153: en qué viaja el pedido (solo con empaques configurados y envío por empresa) */
  packaging: PlanEmbalaje | null;
  /** C-153: lo que falta en productos físicos para el embalaje gratis y para el envío gratis (`null`: no aplica o ya llegó) */
  missingFreePackagingUSD: number | null;
  missingFreeShippingUSD: number | null;
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

/**
 * C-199: un paquete de la compra. Lo de la tienda sale de Guanare; lo de un proveedor que despacha él mismo (la
 * ferretería, desde La Victoria) va en su propio paquete, con su embalaje, y siempre con cobro a destino.
 */
export interface PaqueteEnvio {
  /** Ciudad de ZOOM desde donde sale; null = la tienda */
  origen: string | null;
  origenNombre: string;
  lines: PricingLine[];
  shipping: ShippingBreakdown;
  totals: OrderGroupTotals;
}

export interface OrderCalculation {
  subtotalUSD: number;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
  /** El envío de toda la compra (con varios paquetes, la suma; `packaging` queda en cada paquete) */
  shipping: ShippingBreakdown;
  // La compra se divide en una orden de productos físicos (con envío) y otra de digitales.
  // C-199: con varios paquetes, `physical` es la suma de los paquetes (cada uno es su propia orden).
  physical: OrderGroupTotals | null;
  digital: OrderGroupTotals | null;
  /** C-199: los paquetes de lo físico, el de la tienda primero. Vacío si no hay físicos */
  paquetes: PaqueteEnvio[];
}

type NumberLike = number | string | { toString(): string } | null | undefined;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Montos mínimo y máximo de compra (0 o null = sin límite). Un solo texto para la orden, la cotización (C-114)
 * y el aviso del carrito (C-115).
 * El mínimo cuenta solo los productos, con sus descuentos: el embalaje y el envío van aparte y no ayudan a llegar
 * (Andrés, 28/09). El máximo cuenta lo que paga el cliente, con envío, porque protege el cobro.
 */
export function orderAmountProblems(
  amounts: { productsUSD: number; totalUSD: number },
  minUSD: number | null,
  maxUSD: number | null
): string[] {
  const out: string[] = [];
  if (minUSD && minUSD > 0 && amounts.productsUSD < minUSD) {
    out.push(
      `La compra mínima es de ${formatUSD(minUSD)} en productos, sin contar embalaje ni envío. ` +
      `Te faltan ${formatUSD(roundMoney(minUSD - amounts.productsUSD))}: agrega algo más al carrito.`
    );
  }
  if (maxUSD && maxUSD > 0 && amounts.totalUSD > maxUSD) {
    out.push(`La compra máxima es de ${formatUSD(maxUSD)}, con envío incluido. Quita productos o divide la compra en dos pedidos.`);
  }
  return out;
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

/** Precio escrito en el panel ("12,5", 12.5): número entre 0 y 1.000.000, o null si no sirve (C-97, C-104). */
export function precioValido(valor: unknown): number | null {
  const n = typeof valor === 'number' ? valor : Number.parseFloat(String(valor).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
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
  /** Nombre de la columna (Prisma) o el del ajuste público */
  taxDigitalProducts?: boolean | null;
  taxDigital?: boolean | null;
  /** Texto JSON de la columna (Prisma) o el objeto del ajuste público */
  packagingRules?: unknown;
  freePackagingThresholdUSD?: NumberLike;
} | null | undefined): PricingSettings {
  const s = raw ?? {};
  const packaging = s.packagingFeeUSD === null || s.packagingFeeUSD === undefined || s.packagingFeeUSD === ''
    ? 2.5
    : Math.max(toNumber(s.packagingFeeUSD), 0);
  return {
    packagingFeeUSD: packaging,
    packagingRules: reglasEmbalajeActivas(s.packagingRules),
    freePackagingThresholdUSD: toNumber(s.freePackagingThresholdUSD) || null,
    localDeliveryFeeUSD: Math.max(toNumber(s.deliveryFeeUSD), 0),
    freeDeliveryThresholdUSD: toNumber(s.freeDeliveryThresholdUSD) || null,
    taxEnabled: Boolean(s.taxEnabled) && toNumber(s.taxPercent) > 0,
    taxPercent: Math.max(toNumber(s.taxPercent), 0),
    taxDigital: Boolean(s.taxDigitalProducts ?? s.taxDigital),
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
    packagingFreeByThreshold: false,
    packaging: null,
    missingFreePackagingUSD: null,
    missingFreeShippingUSD: null,
    paidBy: null,
    totalWeight: 0,
    pieces: 0,
    digitalItems: [],
  };
}

/**
 * El envío de un paquete. C-199: el envío gratis (por producto o por monto, con lo de ese paquete) vale solo para el de
 * la tienda; el de un proveedor va siempre con cobro a destino. El embalaje gratis desde un monto cuenta toda la compra
 * física y vale igual para los dos (Andrés, 10/11).
 */
function calculateShipping(
  lines: PricingLine[],
  settings: PricingSettings,
  deliveryMethod: DeliveryMethod,
  opciones: { esDeLaTienda: boolean; subtotalFisicoCompra: number | null } = { esDeLaTienda: true, subtotalFisicoCompra: null }
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
  const physicalSubtotal = physical.reduce((sum, line) => sum + line.unitPriceUSD * line.quantity - lineDiscountUSD(line), 0);
  const threshold = settings.freeDeliveryThresholdUSD;
  if (!opciones.esDeLaTienda) breakdown.freeReason = null;
  else if (physical.some(line => line.freeShipping)) breakdown.freeReason = 'PRODUCT';
  else if (threshold && roundMoney(physicalSubtotal) >= threshold) breakdown.freeReason = 'THRESHOLD';
  breakdown.isFreeShipping = breakdown.freeReason !== null;
  // C-153: cuánto falta para cada umbral, para avisarlo en el carrito y en el pago
  const falta = (umbral: number | null) =>
    umbral && umbral > 0 && roundMoney(physicalSubtotal) < umbral ? roundMoney(umbral - physicalSubtotal) : null;
  if (!breakdown.isFreeShipping && opciones.esDeLaTienda) breakdown.missingFreeShippingUSD = falta(threshold);
  const subtotalEmbalaje = opciones.subtotalFisicoCompra ?? physicalSubtotal;

  if (deliveryMethod === 'LOCAL_DELIVERY') {
    breakdown.localDeliveryFee = breakdown.isFreeShipping ? 0 : roundMoney(settings.localDeliveryFeeUSD);
    breakdown.total = breakdown.localDeliveryFee;
    return breakdown;
  }

  breakdown.paidBy = breakdown.isFreeShipping ? 'STORE' : 'CUSTOMER';

  // C-153: con empaques configurados, el paquete se arma con las medidas de cada producto y de ahí sale el embalaje
  // y las piezas de la guía. Sin empaques, el precio único de siempre.
  const plan = settings.packagingRules
    ? armarPaquetes(
      physical.map(line => ({ nombre: line.name, cantidad: line.quantity, pesoKg: line.weightKg, dimensions: line.dimensions, consolidable: line.isConsolidable })),
      settings.packagingRules
    )
    : null;
  if (plan) {
    breakdown.packaging = plan;
    breakdown.pieces = plan.piezas;
  }
  const fee = roundMoney(plan ? plan.totalUSD : settings.packagingFeeUSD);
  const packagingThreshold = settings.freePackagingThresholdUSD;
  breakdown.packagingFreeByThreshold = !breakdown.isFreeShipping && fee > 0 && Boolean(packagingThreshold) && roundMoney(subtotalEmbalaje) >= (packagingThreshold ?? 0);
  breakdown.packagingFee = breakdown.isFreeShipping || breakdown.packagingFreeByThreshold ? 0 : fee;
  if (breakdown.packagingFee > 0 && packagingThreshold && packagingThreshold > 0 && roundMoney(subtotalEmbalaje) < packagingThreshold) {
    breakdown.missingFreePackagingUSD = roundMoney(packagingThreshold - subtotalEmbalaje);
  }
  breakdown.total = breakdown.packagingFee;
  return breakdown;
}

function calculateGroup(lines: PricingLine[], shippingUSD: number, settings: PricingSettings, tipo: 'PHYSICAL' | 'DIGITAL'): OrderGroupTotals | null {
  if (lines.length === 0) return null;

  let subtotal = 0;
  let discount = 0;
  lines.forEach(line => {
    subtotal += line.unitPriceUSD * line.quantity;
    discount += lineDiscountUSD(line);
  });

  const subtotalUSD = roundMoney(subtotal);
  const discountUSD = roundMoney(discount);
  // El IVA no se suma: ya está dentro de los precios. `taxUSD` es la parte del total que es IVA (C-146)
  const totalUSD = roundMoney(subtotalUSD - discountUSD + shippingUSD);
  // C-151: la orden digital solo lleva IVA si Configuración dice que los digitales lo llevan
  const taxUSD = llevaIva(settings, tipo) ? ivaIncluido(totalUSD, settings.taxPercent).ivaUSD : 0;

  return {
    lines,
    subtotalUSD,
    discountUSD,
    shippingUSD,
    taxUSD,
    totalUSD,
  };
}

/** C-199: los totales de varios paquetes, sumados tal cual (cada uno ya redondeado): lo cobrado cuadra con las órdenes */
function sumarGrupos(grupos: OrderGroupTotals[], lines: PricingLine[]): OrderGroupTotals {
  const suma = (campo: 'subtotalUSD' | 'discountUSD' | 'shippingUSD' | 'taxUSD' | 'totalUSD') => roundMoney(grupos.reduce((s, g) => s + g[campo], 0));
  return { lines, subtotalUSD: suma('subtotalUSD'), discountUSD: suma('discountUSD'), shippingUSD: suma('shippingUSD'), taxUSD: suma('taxUSD'), totalUSD: suma('totalUSD') };
}

/** C-199: el envío de toda la compra a partir de sus paquetes. Con uno solo, es el suyo (como antes) */
function juntarEnvios(paquetes: PaqueteEnvio[], digitalLines: PricingLine[]): ShippingBreakdown {
  const digitalItems = digitalLines.map(line => ({ name: line.name, quantity: line.quantity }));
  if (paquetes.length === 0) return { ...emptyBreakdown(), digitalItems };
  if (paquetes.length === 1) return { ...paquetes[0].shipping, digitalItems };
  const envios = paquetes.map(p => p.shipping);
  const suma = (f: (e: ShippingBreakdown) => number) => roundMoney(envios.reduce((s, e) => s + f(e), 0));
  const tienda = paquetes.find(p => p.origen === null)?.shipping ?? null;
  const todosGratis = envios.every(e => e.isFreeShipping);
  return {
    total: suma(e => e.total),
    packagingFee: suma(e => e.packagingFee),
    localDeliveryFee: suma(e => e.localDeliveryFee),
    isFreeShipping: todosGratis,
    freeReason: todosGratis ? tienda?.freeReason ?? null : null,
    packagingFreeByThreshold: envios.some(e => e.packagingFreeByThreshold),
    packaging: null,
    missingFreePackagingUSD: envios.find(e => e.missingFreePackagingUSD !== null)?.missingFreePackagingUSD ?? null,
    missingFreeShippingUSD: tienda?.missingFreeShippingUSD ?? null,
    paidBy: envios.some(e => e.paidBy === 'CUSTOMER') ? 'CUSTOMER' : envios.some(e => e.paidBy === 'STORE') ? 'STORE' : null,
    totalWeight: suma(e => e.totalWeight),
    pieces: envios.reduce((n, e) => n + e.pieces, 0),
    digitalItems,
  };
}

export function calculateOrder(
  lines: PricingLine[],
  settings: PricingSettings,
  deliveryMethod: DeliveryMethod
): OrderCalculation {
  const physicalLines = lines.filter(line => line.productType !== 'DIGITAL');
  const digitalLines = lines.filter(line => line.productType === 'DIGITAL');

  // C-199: un paquete por origen (el de la tienda primero), cada uno con su embalaje y su envío
  const porOrigen = new Map<string, PricingLine[]>();
  for (const line of physicalLines) porOrigen.set(line.origen ?? '', [...(porOrigen.get(line.origen ?? '') ?? []), line]);
  const subtotalFisicoCompra = physicalLines.reduce((sum, line) => sum + line.unitPriceUSD * line.quantity - lineDiscountUSD(line), 0);
  const paquetes: PaqueteEnvio[] = [...porOrigen.keys()]
    .sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
    .map((origen) => {
      const delPaquete = porOrigen.get(origen) as PricingLine[];
      const shipping = calculateShipping(delPaquete, settings, deliveryMethod, { esDeLaTienda: origen === '', subtotalFisicoCompra });
      return {
        origen: origen || null,
        origenNombre: origen ? delPaquete[0].origenNombre || 'otra ciudad' : ORIGEN_TIENDA_NOMBRE,
        lines: delPaquete,
        shipping,
        totals: calculateGroup(delPaquete, shipping.total, settings, 'PHYSICAL') as OrderGroupTotals,
      };
    });
  const shipping = juntarEnvios(paquetes, digitalLines);

  // El envío se carga a la orden física (o a cada paquete); la digital nunca paga envío.
  const physical = paquetes.length === 0 ? null : paquetes.length === 1 ? paquetes[0].totals : sumarGrupos(paquetes.map(p => p.totals), physicalLines);
  const digital = calculateGroup(digitalLines, 0, settings, 'DIGITAL');
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
    paquetes,
  };
}
