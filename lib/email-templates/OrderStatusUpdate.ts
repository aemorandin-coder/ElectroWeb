import { getEmailStyles, getEmailHeader, getEmailFooter } from './base';

interface OrderStatusUpdateData {
    companyName: string;
    companyLogo?: string;
    orderNumber: string;
    customerName: string;
    status: string;
    statusMessage: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
}

export function generateOrderStatusUpdateEmail(data: OrderStatusUpdateData): string {
    const {
        companyName,
        companyLogo,
        orderNumber,
        customerName,
        status,
        statusMessage,
        trackingNumber,
        trackingUrl,
        estimatedDelivery,
    } = data;

    const statusColors: Record<string, string> = {
        CONFIRMED: '#28a745',
        PAID: '#17a2b8',
        PROCESSING: '#ffc107',
        SHIPPED: '#007bff',
        DELIVERED: '#28a745',
        CANCELLED: '#dc3545',
    };

    const statusColor = statusColors[status] || '#2a63cd';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Actualización de Pedido - ${orderNumber}</title>
      ${getEmailStyles(statusColor)}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader({ companyName, companyLogo, primaryColor: statusColor })}
        
        <div class="email-body">
          <h2>Actualización de tu Pedido</h2>
          
          <p>Hola ${customerName},</p>
          
          <p>Tu pedido <strong>${orderNumber}</strong> ha sido actualizado.</p>
          
          <div class="order-details" style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor};">
            <h3 style="color: ${statusColor}; margin-top: 0;">Estado: ${status}</h3>
            <p style="font-size: 16px;">${statusMessage}</p>
            
            ${trackingNumber ? `<p><strong>Número de Rastreo:</strong> ${trackingNumber}</p>` : ''}
            ${estimatedDelivery ? `<p><strong>Entrega Estimada:</strong> ${estimatedDelivery}</p>` : ''}
          </div>

          ${trackingUrl ? `
            <div style="text-align: center;">
              <a href="${trackingUrl}" class="button">Rastrear Pedido</a>
            </div>
          ` : ''}

          <p style="margin-top: 30px;">Gracias por tu compra. Si tienes alguna pregunta, estamos aquí para ayudarte.</p>
        </div>

        ${getEmailFooter({ companyName })}
      </div>
    </body>
    </html>
  `;
}
