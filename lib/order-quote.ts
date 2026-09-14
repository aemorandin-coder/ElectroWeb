// Cotización de una orden en el servidor: precios, stock y descuentos salen de la base de datos.
// Solo para uso en el servidor (importa Prisma). El cálculo en sí vive en lib/pricing.ts.

import type { CompanySettings } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseProductImages } from '@/lib/product-utils';
import {
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
  digitalAmount?: number;
  digitalUsername?: string;
}

export interface QuotedLine extends PricingLine {
  productSku: string;
  productImage: string | null;
  discountRequestId: string | null;
}

export interface OrderQuote {
  calculation: OrderCalculation;
  lines: QuotedLine[];
  errors: string[];
  settings: CompanySettings | null;
}

/** Valida `items` del body. Solo se aceptan productId, quantity, digitalAmount y digitalUsername. */
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

interface DigitalDenomination {
  amount: number;
  salePrice: number;
}

// Las denominaciones de un producto digital se guardan en specs.digitalPricing (wizard del admin).
function getDigitalPricing(specs: string | null): DigitalDenomination[] {
  if (!specs) return [];
  try {
    const parsed = JSON.parse(specs);
    const pricing: unknown = parsed?.digitalPricing;
    if (!Array.isArray(pricing)) return [];
    return pricing
      .filter((p) => p && p.enabled !== false)
      .map((p) => ({ amount: Number(p.amount), salePrice: Number(p.salePrice) }))
      .filter((p) => Number.isFinite(p.amount) && Number.isFinite(p.salePrice) && p.salePrice > 0);
  } catch {
    return [];
  }
}

export async function quoteOrder(
  userId: string,
  items: OrderItemInput[],
  deliveryMethod: DeliveryMethod
): Promise<OrderQuote> {
  const productIds = [...new Set(items.map((item) => item.productId))];

  const [settings, products, discounts] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 'default' } }),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        productType: true,
        priceUSD: true,
        stock: true,
        mainImage: true,
        images: true,
        specs: true,
        weightKg: true,
        dimensions: true,
        isConsolidable: true,
        shippingCost: true,
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

    if (isDigital) {
      const denominations = getDigitalPricing(product.specs);
      if (denominations.length > 0) {
        const denomination = denominations.find((d) => d.amount === item.digitalAmount);
        if (!denomination) {
          errors.push(`La denominación elegida de "${product.name}" ya no está disponible`);
          continue;
        }
        unitPriceUSD = denomination.salePrice;
        name = `${product.name} ($${denomination.amount})`;
      }
      if (item.digitalUsername) {
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
      discountPercent: discount ? (discount.approvedDiscount || discount.requestedDiscount) : 0,
    };

    pricingLines.push(pricingLine);
    lines.push({
      ...pricingLine,
      productSku: product.sku,
      productImage: product.mainImage || parseProductImages(product.images)[0] || null,
      discountRequestId: discount?.id ?? null,
    });
  }

  for (const [productId, quantity] of physicalQuantities) {
    const product = productMap.get(productId);
    if (product && product.stock < quantity) {
      errors.push(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${quantity}`);
    }
  }

  return {
    calculation: calculateOrder(pricingLines, toPricingSettings(settings), deliveryMethod),
    lines,
    errors,
    settings,
  };
}
