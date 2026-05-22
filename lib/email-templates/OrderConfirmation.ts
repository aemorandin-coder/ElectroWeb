import { getEmailStyles, getEmailHeader, getEmailFooter } from './base';

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
  }>;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  paymentMethod: string;
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
    shipping,
    tax,
    total,
    currency,
    paymentMethod,
    deliveryMethod,
    deliveryAddress,
    trackingUrl,
  } = data;

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'PICKUP': return 'Retiro en Tienda';
      case 'HOME_DELIVERY': return 'Entrega a Domicilio';
      case 'SHIPPING': return 'Envío Nacional (ZOOM / MRW)';
      default: return method;
    }
  };

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
          <h2>¡Gracias por tu compra, ${customerName}!</h2>
          
          <p>Hemos procesado tu pago de forma exitosa y debitado el total correspondiente de tu billetera prepago. Tu orden ya se encuentra en nuestro sistema.</p>
          
          <div class="order-details">
            <p style="margin: 5px 0;"><strong>Número de Pedido:</strong> ${orderNumber}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${orderDate}</p>
            <p style="margin: 5px 0;"><strong>Método de Pago:</strong> Billetera Prepago (${paymentMethod})</p>
            <p style="margin: 5px 0;"><strong>Método de Despacho:</strong> ${getMethodLabel(deliveryMethod)}</p>
            ${deliveryAddress ? `<p style="margin: 10px 0 0 0;"><strong>Dirección de Entrega:</strong><br><span style="color:#6c757d; font-size:13px;">${deliveryAddress}</span></p>` : ''}
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
                      <strong>${item.name}</strong>
                    </td>
                    <td style="padding: 12px 5px; text-align: center; color: #495057;">${qty}</td>
                    <td style="padding: 12px 5px; text-align: right; font-weight: 600; color: #212529;">${rowTotal.toFixed(2)} ${currency}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; bg-color: #f8f9fa; background-color: #f8f9fa; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #495057;">${subtotal} ${currency}</td>
              </tr>
              ${shipping && shipping !== '0' && shipping !== '0.00' ? `
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">Envío / Delivery:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #495057;">${shipping} ${currency}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">Impuestos (Exento):</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #495057;">${tax} ${currency}</td>
              </tr>
              <tr style="border-top: 1.5px solid #dee2e6; font-size: 16px; font-weight: bold;">
                <td style="padding: 12px 0 0 0; color: #2a63cd;">Total Debitado:</td>
                <td style="padding: 12px 0 0 0; text-align: right; color: #2a63cd;">${total} ${currency}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 20px; padding: 12px; background-color: #eef1f6; border-left: 4px solid #2a63cd; border-radius: 4px; font-size: 12px; color: #495057; line-height: 1.5;">
            <strong>Nota Importante sobre tu Facturación:</strong><br>
            Para tu total tranquilidad y transparencia, tu factura física original y sellada ha sido impresa, firmada y embalada dentro de la caja de tu paquete junto con tus productos físicos.
          </div>

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
