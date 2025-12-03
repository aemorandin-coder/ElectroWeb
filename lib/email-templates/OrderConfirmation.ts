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
        ${getEmailHeader({ companyName, companyLogo })}
        
        <div class="email-body">
          <h2>¡Gracias por tu pedido, ${customerName}!</h2>
          
          <p>Hemos recibido tu pedido y lo estamos procesando. Te enviaremos una actualización cuando sea enviado.</p>
          
          <div class="order-details">
            <p><strong>Número de Pedido:</strong> ${orderNumber}</p>
            <p><strong>Fecha:</strong> ${orderDate}</p>
            <p><strong>Método de Pago:</strong> ${paymentMethod}</p>
            <p><strong>Método de Entrega:</strong> ${deliveryMethod}</p>
            ${deliveryAddress ? `<p><strong>Dirección de Entrega:</strong><br>${deliveryAddress}</p>` : ''}
          </div>

          <h3>Detalles del Pedido</h3>
          <div class="order-details">
            ${items.map(item => `
              <div class="order-item">
                <strong>${item.name}</strong><br>
                Cantidad: ${item.quantity} × ${item.price} ${currency}
              </div>
            `).join('')}
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
              <p style="margin: 5px 0;">Subtotal: ${subtotal} ${currency}</p>
              ${shipping !== '0.00' ? `<p style="margin: 5px 0;">Envío: ${shipping} ${currency}</p>` : ''}
              ${tax !== '0.00' ? `<p style="margin: 5px 0;">Impuestos: ${tax} ${currency}</p>` : ''}
              <p class="total-row">Total: ${total} ${currency}</p>
            </div>
          </div>

          ${trackingUrl ? `
            <div style="text-align: center;">
              <a href="${trackingUrl}" class="button">Rastrear Pedido</a>
            </div>
          ` : ''}

          <p style="margin-top: 30px;">Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
        </div>

        ${getEmailFooter({ companyName })}
      </div>
    </body>
    </html>
  `;
}
