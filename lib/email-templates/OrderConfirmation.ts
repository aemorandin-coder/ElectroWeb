import { porcentajeIva } from '@/lib/pricing';
import { getEmailStyles, getEmailHeader, getEmailFooter } from './base';
import { ETIQUETA_ENTREGA } from '@/lib/envios/empresas';
import { escapeHtml } from '@/lib/html';

interface OrderConfirmationData {
  companyName: string;
  companyLogo?: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
    /** C-119: "Usado · Muy bueno" (conditionBadge); null si es nuevo */
    condition?: string | null;
    /** Garantía de la tienda que guardó el pedido */
    warrantyDays?: number | null;
  }>;
  subtotal: string;
  /** Descuento de cupón u ofertas; sin él, el total no cuadraba con el subtotal */
  discount?: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  /** Ya legible ("Saldo de la tienda", "Pago Móvil") */
  paymentMethod: string;
  /** Saldo o Pago Móvil verificado. Si no, el pago está por confirmar */
  paid: boolean;
  deliveryMethod: string;
  deliveryAddress?: string;
  trackingUrl?: string;
}

export function generateOrderConfirmationEmail(data: OrderConfirmationData): string {
  const {
    companyName,
    companyLogo,
    orderNumber,
    customerName,
    orderDate,
    items,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    currency,
    paymentMethod,
    paid,
    deliveryMethod,
    deliveryAddress,
    trackingUrl,
  } = data;
  // C-121: antes decía "debitado de tu billetera prepago" también en un Pago Móvil por verificar
  const hasSecondHand = items.some((item) => item.condition);
  const hasDiscount = !!discount && Number(discount) > 0;

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'PICKUP': return 'Retiro en Tienda';
      case 'HOME_DELIVERY': return 'Entrega a Domicilio';
      case 'SHIPPING': return 'Envío Nacional (ZOOM / MRW)';
      default: return method;
    }
  };

  // C-106: en ZOOM/MRW la tienda cobra solo el embalaje; el flete es cobro a destino y no va en este total.
  // `deliveryMethod` llega ya traducido con ETIQUETA_ENTREGA (app/api/orders/route.ts).
  const etiquetaEnvio = deliveryMethod === ETIQUETA_ENTREGA.SHIPPING
    ? 'Embalaje (el flete se paga al retirar):'
    : deliveryMethod === ETIQUETA_ENTREGA.LOCAL_DELIVERY ? 'Delivery en Guanare:' : 'Envío:';

  // C-146: los precios ya llevan el IVA. Se dice cuánto del total es; un pedido sin IVA guardado no muestra nada.
  // Antes decía "Impuestos (Exento)", que no es cierto para lo que vende la tienda.
  const ivaNum = Number(tax) || 0;
  const totalNum = Number(total) || 0;
  const ivaTexto = ivaNum > 0 && totalNum > ivaNum
    ? `Incluye IVA (${porcentajeIva(totalNum, ivaNum)} %): ${ivaNum.toFixed(2)} ${currency} · Base imponible: ${(totalNum - ivaNum).toFixed(2)} ${currency}`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido - ${orderNumber}</title>
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader({ companyName })}
        
        <div class="email-body">
          <h2>¡Gracias por tu compra, ${escapeHtml(customerName)}!</h2>
          
          <p>${paid
            ? 'Recibimos tu pago y tu pedido ya está en preparación.'
            : 'Recibimos tu pedido. Te avisaremos apenas confirmemos el pago.'}</p>
          
          <div class="order-details">
            <p style="margin: 5px 0;"><strong>Número de Pedido:</strong> ${escapeHtml(orderNumber)}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${escapeHtml(orderDate)}</p>
            <p style="margin: 5px 0;"><strong>Método de Pago:</strong> ${escapeHtml(paymentMethod)}${paid ? '' : ' (por confirmar)'}</p>
            <p style="margin: 5px 0;"><strong>Método de Despacho:</strong> ${escapeHtml(getMethodLabel(deliveryMethod))}</p>
            ${deliveryAddress ? `<p style="margin: 10px 0 0 0;"><strong>Dirección de Entrega:</strong><br><span style="color:#6c757d; font-size:13px;">${escapeHtml(deliveryAddress)}</span></p>` : ''}
          </div>

          <h3 style="color: #212529; border-bottom: 2px solid #f8f9fa; padding-bottom: 8px; margin-top: 25px;">Recibo Digital</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="border-bottom: 2px solid #dee2e6; text-align: left; font-size: 12px; text-transform: uppercase;">
                <th style="padding: 10px 5px; color: #6c757d;">Producto</th>
                <th style="padding: 10px 5px; color: #6c757d; text-align: center;">Cant.</th>
                <th style="padding: 10px 5px; color: #6c757d; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const priceNum = parseFloat(item.price.replace(',', '.')) || 0;
                const qty = item.quantity || 1;
                const rowTotal = priceNum * qty;
                return `
                  <tr style="border-bottom: 1px solid #e9ecef; font-size: 14px;">
                    <td style="padding: 12px 5px; color: #212529;">
                      <strong>${escapeHtml(item.name)}</strong>
                      ${item.condition ? `<br><span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background-color: #212529; color: #ffffff; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${escapeHtml(item.condition)}</span>
                      <span style="font-size: 12px; color: #6c757d;">Garantía de la tienda: ${item.warrantyDays ?? 30} días</span>` : ''}
                    </td>
                    <td style="padding: 12px 5px; text-align: center; color: #495057;">${qty}</td>
                    <td style="padding: 12px 5px; text-align: right; font-weight: 600; color: #212529;">${rowTotal.toFixed(2)} ${currency}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${hasSecondHand ? `
          <p style="margin-top: 12px; font-size: 12px; color: #6c757d; line-height: 1.5;">
            Los productos usados, reacondicionados o de caja abierta se venden en el estado descrito en su ficha. Tienen la garantía de la tienda indicada, contada desde la entrega, por fallas de funcionamiento.
          </p>
          ` : ''}
          
          <div style="margin-top: 20px; padding: 15px; bg-color: #f8f9fa; background-color: #f8f9fa; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #495057;">${subtotal} ${currency}</td>
              </tr>
              ${hasDiscount ? `
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">Descuento:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #198754;">-${discount} ${currency}</td>
              </tr>
              ` : ''}
              ${shipping && shipping !== '0' && shipping !== '0.00' ? `
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">${etiquetaEnvio}</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #495057;">${shipping} ${currency}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 1.5px solid #dee2e6; font-size: 16px; font-weight: bold;">
                <td style="padding: 12px 0 0 0; color: #2a63cd;">${paid ? 'Total pagado:' : 'Total a pagar:'}</td>
                <td style="padding: 12px 0 0 0; text-align: right; color: #2a63cd;">${total} ${currency}</td>
              </tr>
              ${ivaTexto ? `
              <tr>
                <td colspan="2" style="padding: 6px 0 0 0; text-align: right; font-size: 12px; color: #6c757d;">${ivaTexto}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${deliveryMethod !== ETIQUETA_ENTREGA.DIGITAL ? `
          <div style="margin-top: 20px; padding: 12px; background-color: #eef1f6; border-left: 4px solid #2a63cd; border-radius: 4px; font-size: 12px; color: #495057; line-height: 1.5;">
            <strong>Tu comprobante de compra</strong><br>
            Va dentro del paquete, junto con tus productos.
          </div>
          ` : ''}

          ${trackingUrl ? `
            <div style="text-align: center; margin-top: 25px;">
              <a href="${trackingUrl}" class="button" style="color: white !important;">Seguimiento de Envío</a>
            </div>
          ` : ''}

          <p style="margin-top: 30px; font-size: 13px; color: #6c757d; text-align: center;">
            ¿Tienes alguna duda con tu compra? Escríbenos directamente a nuestro WhatsApp de soporte.
          </p>
        </div>

        ${getEmailFooter({ companyName, companyLogo })}
      </div>
    </body>
    </html>
  `;
}
