// C-227: lo que recibe el cliente cuando su pedido sale (la campana y el correo con la guía). Antes estaba escrito en el
// PATCH de app/api/orders; ahora lo usan el panel y la guía que anota el proveedor desde su enlace. Mismo texto que antes.

import { createNotification } from '@/lib/notifications';
import { sendOrderShippedEmail } from '@/lib/email-service';
import { NOMBRE_EMPRESA, type EmpresaGuia } from '@/lib/envios/empresas';

export interface OrdenEnviada {
  userId: string | null;
  orderNumber: string;
  deliveryMethod: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  shippingPaidBy: string | null;
  shippingAddress: string | null;
  user: { name: string | null; email: string | null } | null;
}

/** La notificación y el correo de "va en camino". Solo con cuenta, como siempre: la orden de invitado no tiene campana. */
export async function avisarClienteEnvio(orden: OrdenEnviada): Promise<void> {
  if (!orden.userId) return;
  const local = orden.deliveryMethod === 'LOCAL_DELIVERY';
  const empresa = orden.shippingCarrier ? NOMBRE_EMPRESA[orden.shippingCarrier as EmpresaGuia] ?? orden.shippingCarrier : '';
  const carrierInfo = empresa ? ` por ${empresa}` : '';
  const trackingInfo = orden.trackingNumber ? `. Guía: ${orden.trackingNumber}` : '';
  const cobro = orden.shippingPaidBy === 'CUSTOMER' ? '. El flete lo pagas al retirar (cobro a destino)' : '';
  // Una sola notificación (antes salían dos: la genérica y esta con guía y transportista)
  await createNotification({
    userId: orden.userId,
    type: 'ORDER_SHIPPED',
    title: local ? 'Tu pedido va en camino' : 'Pedido enviado',
    message: local
      ? `Tu pedido #${orden.orderNumber} salió a entregar en Guanare.`
      : `Tu pedido #${orden.orderNumber} salió${carrierInfo}${trackingInfo}${cobro}.`,
    link: `/customer/orders`,
    icon: 'shipping',
  });
  if (orden.user?.email) {
    try {
      await sendOrderShippedEmail(orden.user.email, {
        orderNumber: orden.orderNumber,
        customerName: orden.user.name || 'Cliente',
        trackingNumber: orden.trackingNumber || undefined,
        shippingCarrier: empresa || undefined,
        destination: orden.shippingAddress || undefined,
        payOnDelivery: orden.shippingPaidBy === 'CUSTOMER',
        local,
      });
    } catch (emailError) {
      console.error('Error sending shipped email:', emailError);
    }
  }
}
