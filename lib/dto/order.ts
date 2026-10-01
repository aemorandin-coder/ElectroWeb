// Lo que ve el cliente de sus órdenes (C-100). Lista blanca: antes GET /api/orders le devolvía la orden
// entera, con las notas internas del equipo y el proveedor, la referencia y el costo de cada código digital.

import type { Prisma } from '@prisma/client';

export const customerOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  // C-132: parte pagada con Puntos ES (pago mixto) y referencia de un pago manual, para "Mis pedidos"
  pointsUSD: true,
  paymentReference: true,
  deliveryMethod: true,
  subtotalUSD: true,
  taxUSD: true,
  shippingUSD: true,
  discountUSD: true,
  totalUSD: true,
  totalVES: true,
  // C-137: tasa del día de la compra, para el recibo
  exchangeRateVES: true,
  notes: true,
  // C-147: a nombre de quién va la factura y su número cuando la tienda la emite
  billingType: true,
  billingName: true,
  billingTaxId: true,
  billingAddress: true,
  invoiceNumber: true,
  createdAt: true,
  paidAt: true,
  shippedAt: true,
  deliveredAt: true,
  cancelledAt: true,
  // Envío
  shippingAddress: true,
  shippingCarrier: true,
  trackingNumber: true,
  trackingUrl: true,
  shippingNotes: true,
  estimatedDelivery: true,
  shippingMode: true,
  shippingPaidBy: true,
  shippingState: true,
  shippingCity: true,
  courierOfficeCode: true,
  courierOfficeName: true,
  courierOfficeAddress: true,
  recipientName: true,
  recipientPhone: true,
  shipmentEvents: {
    select: { id: true, source: true, description: true, occurredAt: true },
    orderBy: { occurredAt: 'asc' },
  },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      productSku: true,
      productImage: true,
      quantity: true,
      priceUSD: true,
      totalUSD: true,
      digitalVariantLabel: true,
      digitalAccount: true,
      // C-119: cómo se vendió y su garantía (copia en la orden)
      productCondition: true,
      conditionGrade: true,
      warrantyDays: true,
      product: { select: { id: true, name: true, sku: true, mainImage: true, productType: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type CustomerOrder = Prisma.OrderGetPayload<{ select: typeof customerOrderSelect }>;
