// Cotización de una orden en el servidor: precios, stock y descuentos salen de la base de datos.
// Solo para uso en el servidor (importa Prisma). El cálculo en sí vive en lib/pricing.ts.

import type { CompanySettings } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { legacyDigitalVariants } from '@/lib/dto/product';
import { parseProductImages } from '@/lib/product-utils';
import { buscarCupon, getOfertasVigentes, toRule } from '@/lib/promotions';
import { mejorOferta, repartirCupon, type LineaParaCupon } from '@/lib/promotions-core';
import { formatUSD } from '@/lib/currency';
import {
  roundMoney,
  orderAmountProblems,
  calculateOrder,
  toPricingSettings,
  DELIVERY_METHODS,
  type DeliveryMethod,
  type OrderCalculation,
  type PricingLine,
} from '@/lib/pricing';

export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QUANTITY = 999;

export class OrderInputError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status = 400, details?: string[]) {
    super(message);
    this.name = 'OrderInputError';
    this.status = status;
    this.details = details;
  }
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  /** Variante digital elegida (C-60) */
  digitalVariantId?: string;
  /** Monto de carritos guardados antes de C-60: se busca la variante con ese valor */
  digitalAmount?: number;
  digitalUsername?: string;
}

export interface QuotedLine extends PricingLine {
  productSku: string;
  productImage: string | null;
  discountRequestId: string | null;
  /** C-102: oferta o cupón que ganó en esta línea (null si ganó un descuento aprobado o no hay) */
  promotionId: string | null;
  /** C-102: cuánto ahorró el cliente con esa oferta o cupón (para promotion_redemptions) */
  promotionSavingsUSD: number;
  digitalVariantId: string | null;
  digitalVariantLabel: string | null;
  digitalAccount: string | null;
}

/** Estado del cupón que escribió el cliente (C-102) */
export interface CouponQuote {
  code: string;
  applied: boolean;
  /** Ahorro que aporta el cupón (0 si otra oferta del mismo producto era mejor) */
  savingsUSD: number;
  message: string;
  promotionId: string | null;
}

export interface OrderQuote {
  calculation: OrderCalculation;
  lines: QuotedLine[];
  errors: string[];
  settings: CompanySettings | null;
  coupon: CouponQuote | null;
}

/**
 * Reglas de la tienda que impiden crear la orden aunque el carrito esté bien: montos mínimo y máximo de compra y
 * formas de entrega apagadas. Las revisan la cotización (el checkout no deja pagar mientras haya alguna) y
 * POST /api/orders. C-114: antes solo las revisaba la orden, después de que el cliente ya había pagado por Pago Móvil.
 */
export function orderBlockers(calculation: OrderCalculation, settings: CompanySettings | null, deliveryMethod: DeliveryMethod): string[] {
  const out = orderAmountProblems(
    calculation.totalUSD,
    settings?.minOrderAmountUSD ? Number(settings.minOrderAmountUSD) : null,
    settings?.maxOrderAmountUSD ? Number(settings.maxOrderAmountUSD) : null
  );
  if (calculation.physical) {
    if (deliveryMethod === 'PICKUP' && !settings?.pickupEnabled) out.push('El retiro en tienda no está disponible: elige otra forma de entrega.');
    if (deliveryMethod === 'SHIPPING' && settings?.deliveryEnabled === false) out.push('Por ahora no hacemos envíos nacionales: elige otra forma de entrega.');
    if (deliveryMethod === 'LOCAL_DELIVERY' && !settings?.localDeliveryEnabled) out.push('El delivery en Guanare no está disponible: elige otra forma de entrega.');
  }
  return out;
}

/** Valida `items` del body. Solo se aceptan productId, quantity, digitalVariantId, digitalAmount y digitalUsername. */
export function parseOrderItems(raw: unknown): OrderItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new OrderInputError('La orden debe contener al menos un producto');
  }
  if (raw.length > MAX_ORDER_LINES) {
    throw new OrderInputError(`La orden no puede tener más de ${MAX_ORDER_LINES} productos distintos`);
  }

  return raw.map((entry) => {
    const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const quantity = item.quantity;

    if (!productId || productId.length > 100) {
      throw new OrderInputError('Hay un producto inválido en la orden');
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new OrderInputError('Hay una cantidad inválida en la orden');
    }

    const parsed: OrderItemInput = { productId, quantity };

    if (item.digitalVariantId !== undefined && item.digitalVariantId !== null) {
      if (typeof item.digitalVariantId !== 'string' || !/^[A-Za-z0-9-]{1,60}$/.test(item.digitalVariantId)) {
        throw new OrderInputError('Hay un monto digital inválido en la orden');
      }
      parsed.digitalVariantId = item.digitalVariantId;
    }

    if (item.digitalAmount !== undefined && item.digitalAmount !== null) {
      if (typeof item.digitalAmount !== 'number' || !Number.isFinite(item.digitalAmount) || item.digitalAmount <= 0) {
        throw new OrderInputError('Hay una denominación inválida en la orden');
      }
      parsed.digitalAmount = item.digitalAmount;
    }

    if (typeof item.digitalUsername === 'string' && item.digitalUsername.trim()) {
      parsed.digitalUsername = item.digitalUsername.trim().slice(0, 100);
    }

    return parsed;
  });
}

export function parseDeliveryMethod(raw: unknown): DeliveryMethod {
  const method = DELIVERY_METHODS.find((m) => m === raw);
  if (!method) {
    throw new OrderInputError('Método de entrega inválido');
  }
  return method;
}

export async function quoteOrder(
  userId: string,
  items: OrderItemInput[],
  deliveryMethod: DeliveryMethod,
  couponCode?: string | null
): Promise<OrderQuote> {
  const productIds = [...new Set(items.map((item) => item.productId))];

  const [settings, products, discounts, ofertas, cupon] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 'default' } }),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        productType: true,
        categoryId: true,
        priceUSD: true,
        stock: true,
        mainImage: true,
        images: true,
        specs: true,
        digitalPlatform: true,
        deliveryMethod: true,
        digitalVariants: {
          where: { isActive: true },
          select: { id: true, label: true, faceValue: true, unit: true, priceUSD: true },
        },
        weightKg: true,
        dimensions: true,
        isConsolidable: true,
        shippingCost: true,
        freeShipping: true,
      },
    }),
    prisma.discountRequest.findMany({
      where: {
        userId,
        productId: { in: productIds },
        status: 'APPROVED',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, productId: true, approvedDiscount: true, requestedDiscount: true },
    }),
    getOfertasVigentes(),
    couponCode ? buscarCupon(couponCode, userId) : Promise.resolve(null),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const discountMap = new Map<string, (typeof discounts)[number]>();
  for (const discount of discounts) {
    if (!discountMap.has(discount.productId)) discountMap.set(discount.productId, discount);
  }

  const errors: string[] = [];
  const pricingLines: PricingLine[] = [];
  const lines: QuotedLine[] = [];
  const physicalQuantities = new Map<string, number>();
  // Candidatos de descuento por línea: se elige el mayor al final, cuando se conoce el cupón
  const candidatos: Array<{ oferta: { id: string; usd: number } | null; ofertaUnit: number | null; solicitud: { id: string; usd: number } | null; categoryId: string }> = [];

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      errors.push(item.productId.startsWith('gift-card-')
        ? 'Las gift cards no se pueden pagar desde el checkout. Cómprala desde la sección Gift Cards.'
        : 'Uno de los productos de tu carrito ya no existe. Elimínalo para continuar.');
      continue;
    }

    if (product.status !== 'PUBLISHED') {
      errors.push(`El producto "${product.name}" no está disponible`);
      continue;
    }

    const isDigital = product.productType === 'DIGITAL';
    let unitPriceUSD = Number(product.priceUSD);
    let name = product.name;
    let digitalVariantId: string | null = null;
    let digitalVariantLabel: string | null = null;
    let digitalAccount: string | null = null;

    if (isDigital) {
      // Variantes de la tabla (C-60) o, si el producto aún no se migró, las de specs.digitalPricing
      const variants = product.digitalVariants.length > 0
        ? product.digitalVariants.map((v) => ({ id: v.id, label: v.label, faceValue: Number(v.faceValue), priceUSD: Number(v.priceUSD), stored: true }))
        : legacyDigitalVariants(product.specs, product.digitalPlatform).map((v) => ({ ...v, stored: false }));
      if (variants.length > 0) {
        const variant =
          (item.digitalVariantId ? variants.find((v) => v.id === item.digitalVariantId) : undefined) ??
          (item.digitalAmount !== undefined ? variants.find((v) => v.faceValue === item.digitalAmount) : undefined);
        if (!variant) {
          errors.push(`El monto elegido de "${product.name}" ya no está disponible. Vuelve a elegirlo.`);
          continue;
        }
        unitPriceUSD = variant.priceUSD;
        name = `${product.name} (${variant.label})`;
        digitalVariantId = variant.stored ? variant.id : null;
        digitalVariantLabel = variant.label;
      }
      if (product.deliveryMethod === 'MANUAL' && !item.digitalUsername) {
        errors.push(`Indica la cuenta donde recargamos "${product.name}"`);
        continue;
      }
      if (item.digitalUsername) {
        digitalAccount = item.digitalUsername;
        name = `${name} [Recarga para: ${item.digitalUsername}]`;
      }
    }

    if (!(unitPriceUSD > 0)) {
      errors.push(`El producto "${product.name}" no está disponible`);
      continue;
    }

    if (!isDigital) {
      physicalQuantities.set(product.id, (physicalQuantities.get(product.id) ?? 0) + item.quantity);
    }

    const discount = discountMap.get(product.id);
    const lineTotal = unitPriceUSD * item.quantity;
    const productoOferta = { id: product.id, categoryId: product.categoryId, productType: product.productType };
    const oferta = mejorOferta(ofertas, productoOferta, unitPriceUSD);
    const percentSolicitud = discount ? (discount.approvedDiscount || discount.requestedDiscount) : 0;
    candidatos.push({
      oferta: oferta ? { id: oferta.promotionId, usd: roundMoney(oferta.unitDiscountUSD * item.quantity) } : null,
      ofertaUnit: oferta ? oferta.unitDiscountUSD : null,
      solicitud: discount && percentSolicitud > 0 ? { id: discount.id, usd: roundMoney(lineTotal * Math.min(percentSolicitud, 100) / 100) } : null,
      categoryId: product.categoryId,
    });
    const pricingLine: PricingLine = {
      productId: product.id,
      name,
      productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
      unitPriceUSD,
      quantity: item.quantity,
      weightKg: product.weightKg === null ? null : Number(product.weightKg),
      dimensions: product.dimensions,
      isConsolidable: product.isConsolidable,
      shippingCostUSD: product.shippingCost === null ? 0 : Number(product.shippingCost),
      freeShipping: !isDigital && product.freeShipping,
      // Se fija abajo con el mayor descuento (oferta, cupón o solicitud aprobada)
      discountPercent: 0,
      discountUSD: 0,
    };

    pricingLines.push(pricingLine);
    lines.push({
      ...pricingLine,
      productSku: product.sku,
      productImage: product.mainImage || parseProductImages(product.images)[0] || null,
      discountRequestId: null,
      promotionId: null,
      promotionSavingsUSD: 0,
      digitalVariantId,
      digitalVariantLabel,
      digitalAccount,
    });
  }

  for (const [productId, quantity] of physicalQuantities) {
    const product = productMap.get(productId);
    if (product && product.stock < quantity) {
      errors.push(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${quantity}`);
    }
  }

  // Cupón: cuánto aportaría en cada línea
  let coupon: CouponQuote | null = null;
  let partesCupon = new Map<string, number>();
  if (couponCode) {
    const code = String(couponCode).trim().toUpperCase();
    if (!cupon || !cupon.ok) {
      coupon = { code, applied: false, savingsUSD: 0, message: cupon && !cupon.ok ? cupon.mensaje : 'Ese código no es válido.', promotionId: null };
    } else {
      const regla = toRule(cupon.promo);
      const lineasCupon: LineaParaCupon[] = lines.map((l, i) => ({
        key: String(i),
        producto: { id: l.productId, categoryId: candidatos[i].categoryId, productType: l.productType },
        lineTotalUSD: l.unitPriceUSD * l.quantity,
      }));
      let reparto = repartirCupon(regla, lineasCupon);
      // Monto fijo: primero sobre los productos sin otra rebaja (como Best Buy); si todos tienen una, compite con ellas.
      // Así un cupón de $15 no se diluye en productos donde la oferta ya gana. La compra mínima se revisó con todos.
      if (reparto.ok && regla.amountOffUSD && !regla.percentOff) {
        const sinRebaja = lineasCupon.filter((_, i) => !candidatos[i].oferta && !candidatos[i].solicitud);
        const soloSinRebaja = repartirCupon({ ...regla, minSubtotalUSD: null }, sinRebaja);
        if (soloSinRebaja.ok) reparto = soloSinRebaja;
      }
      if (!reparto.ok) {
        coupon = {
          code: cupon.promo.code ?? code,
          applied: false,
          savingsUSD: 0,
          message: reparto.motivo === 'MINIMO'
            ? `Te faltan ${formatUSD(reparto.faltaUSD ?? 0)} en productos que aplican para usar este cupón.`
            : 'Este cupón no aplica a los productos de tu carrito (los digitales no llevan cupones).',
          promotionId: cupon.promo.id,
        };
      } else {
        partesCupon = reparto.porLinea;
        coupon = { code: cupon.promo.code ?? code, applied: false, savingsUSD: 0, message: '', promotionId: cupon.promo.id };
      }
    }
  }

  // Por línea gana el mayor descuento; no se suman (decisión de Andrés, 25/09)
  let ahorroCupon = 0;
  lines.forEach((line, i) => {
    const c = candidatos[i];
    const opciones = [
      c.oferta ? { tipo: 'oferta' as const, id: c.oferta.id, usd: c.oferta.usd } : null,
      c.solicitud ? { tipo: 'solicitud' as const, id: c.solicitud.id, usd: c.solicitud.usd } : null,
      partesCupon.has(String(i)) && coupon?.promotionId
        ? { tipo: 'cupon' as const, id: coupon.promotionId, usd: partesCupon.get(String(i)) ?? 0 }
        : null,
    ].filter((o): o is NonNullable<typeof o> => o !== null && o.usd > 0);
    const mejor = opciones.sort((a, b) => b.usd - a.usd)[0];
    if (!mejor) return;
    const usd = Math.min(mejor.usd, roundMoney(line.unitPriceUSD * line.quantity));
    if (mejor.tipo === 'oferta') {
      // La oferta automática es el precio (como en la tienda, que lo muestra rebajado); no es una línea de descuento
      const unit = roundMoney(line.unitPriceUSD - (c.ofertaUnit ?? 0));
      pricingLines[i].unitPriceUSD = unit;
      line.unitPriceUSD = unit;
    } else {
      pricingLines[i].discountUSD = usd;
      line.discountUSD = usd;
    }
    if (mejor.tipo === 'solicitud') line.discountRequestId = mejor.id;
    else {
      line.promotionId = mejor.id;
      line.promotionSavingsUSD = usd;
    }
    if (mejor.tipo === 'cupon') ahorroCupon = roundMoney(ahorroCupon + usd);
  });

  if (coupon && partesCupon.size > 0) {
    coupon.applied = ahorroCupon > 0;
    coupon.savingsUSD = ahorroCupon;
    coupon.message = coupon.applied
      ? `Cupón ${coupon.code} aplicado: ahorras ${formatUSD(ahorroCupon)}.`
      : 'Tus productos ya tienen un descuento mayor que este cupón.';
  }

  return {
    calculation: calculateOrder(pricingLines, toPricingSettings(settings), deliveryMethod),
    lines,
    errors,
    settings,
    coupon,
  };
}
