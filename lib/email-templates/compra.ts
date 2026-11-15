/**
 * C-219: el correo de la compra armado desde la orden, igual al comprar y al confirmarse el pago después.
 * Antes, al quedar el pago en revisión salían dos correos a la vez; ahora es uno solo que cambia según el pago.
 */
import type { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatOrderPaymentMethod } from '@/lib/format-helpers';
import { conditionBadge, warrantyDaysFor } from '@/lib/product-condition';
import { ETIQUETA_ENTREGA } from '@/lib/envios/empresas';
import { asuntoConfirmacion, generateOrderConfirmationEmail } from './OrderConfirmation';
import type { Correo } from './pedidos';

export type OrdenParaCorreo = Prisma.OrderGetPayload<{ include: { items: true; user: { select: { name: true; email: true } } } }>;

export async function correoDeCompra(order: OrdenParaCorreo): Promise<Correo> {
  const pagado = order.paymentStatus === 'PAID';
  const html = await generateOrderConfirmationEmail({
    orderNumber: order.orderNumber,
    customerName: order.user?.name || '',
    orderDate: format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es }),
    items: order.items.map((item) => ({
      name: item.productName || 'Producto',
      quantity: item.quantity,
      price: item.priceUSD.toString(),
      // C-121: lo que guardó el pedido al vender (C-119), igual que "Mis pedidos"
      condition: conditionBadge(item.productCondition, item.conditionGrade),
      warrantyDays: warrantyDaysFor(item.productCondition, item.warrantyDays),
      image: item.productImage,
    })),
    subtotal: order.subtotalUSD.toString(),
    discount: order.discountUSD.toString(),
    shipping: order.shippingUSD.toString(),
    tax: order.taxUSD.toString(),
    total: order.totalUSD.toString(),
    currency: 'USD',
    paymentMethod: formatOrderPaymentMethod(order),
    paid: pagado,
    deliveryCode: order.deliveryMethod,
    deliveryMethod: ETIQUETA_ENTREGA[order.deliveryMethod || ''] || order.deliveryMethod || 'Entrega',
    deliveryAddress: order.shippingAddress || undefined,
    // C-199: si la compra llega en varios paquetes, cada correo dice de dónde sale el suyo
    dispatchCityName: order.dispatchCityName,
    dispatchStateName: order.dispatchStateName,
    totalVES: Number(order.totalVES) || null,
    exchangeRate: Number(order.exchangeRate) || null,
  });
  return { asunto: asuntoConfirmacion({ orderNumber: order.orderNumber, paid: pagado }), html };
}
