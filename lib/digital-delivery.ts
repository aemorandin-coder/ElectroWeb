// Pedidos digitales (C-60b). La tienda no entrega códigos sola: con el pago confirmado, el equipo compra el
// código (o hace la recarga) al proveedor y lo envía desde /admin/orders/[id]/digital. Solo servidor.
import { emitAdminEvent } from '@/lib/admin-events';
import { prisma } from '@/lib/prisma';

/** Avisa al equipo si una orden pagada trae productos digitales. No lanza: el pago ya está hecho. */
export async function avisarPedidoDigitalPorEntregar(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        paymentStatus: true,
        user: { select: { name: true, email: true } },
        items: { select: { productName: true, quantity: true, product: { select: { name: true, productType: true } } } },
      },
    });
    if (!order || order.paymentStatus !== 'PAID') return;
    const digitales = order.items.filter((item) => item.product.productType === 'DIGITAL');
    if (digitales.length === 0) return;

    const unidades = digitales.reduce((sum, item) => sum + item.quantity, 0);
    emitAdminEvent({
      type: 'DIGITAL_ORDER_PENDING',
      title: `Pedido digital por entregar · ${order.orderNumber}`,
      summary: `${unidades === 1 ? 'Falta enviar 1 código o recarga' : `Faltan enviar ${unidades} códigos o recargas`}`,
      fields: [
        ['Productos', digitales.map((item) => `${item.productName || item.product.name} x${item.quantity}`).join(', ')],
        ['Cliente', order.user?.name || order.user?.email],
      ],
      link: `/admin/orders/${orderId}/digital`,
    });
  } catch (error) {
    console.error('[C-60b] Aviso de pedido digital:', error);
  }
}
