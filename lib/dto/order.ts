// Lo que ve el cliente de sus órdenes (C-100). Lista blanca: antes GET /api/orders le devolvía la orden
// entera, con las notas internas del equipo y el proveedor, la referencia y el costo de cada código digital.

import type { Prisma } from '@prisma/client';

export const customerOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  deliveryMethod: true,
  subtotalUSD: true,
  taxUSD: true,
  shippingUSD: true,
  discountUSD: true,
  totalUSD: true,
  totalVES: true,
  notes: true,
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
      product: { select: { id: true, name: true, sku: true, mainImage: true, productType: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type CustomerOrder = Prisma.OrderGetPayload<{ select: typeof customerOrderSelect }>;
