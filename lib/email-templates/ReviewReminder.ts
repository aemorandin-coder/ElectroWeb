import { getEmailStyles, getEmailHeader, getEmailFooter } from './base';

interface ReviewReminderData {
  companyName: string;
  companyLogo?: string;
  customerName: string;
  orderNumber: string;
  productName: string;
  productImage?: string;
  reviewUrl: string;
}

export function generateReviewReminderEmail(data: ReviewReminderData): string {
  const { companyName, companyLogo, customerName, orderNumber, productName, productImage, reviewUrl } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¿Qué te pareció tu compra?</title>
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader({ companyName, companyLogo })}
        
        <div class="email-body">
          <h2>¡Hola ${customerName}!</h2>
          
          <p>Esperamos que estés disfrutando de tu compra. Tu opinión es muy importante para nosotros y para otros clientes.</p>
          
          ${productImage ? `
            <div style="text-align: center; margin: 30px 0;">
              <img src="${productImage}" alt="${productName}" style="max-width: 200px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
            </div>
          ` : ''}

          <div class="order-details">
            <p><strong>Producto:</strong> ${productName}</p>
            <p><strong>Pedido:</strong> ${orderNumber}</p>
          </div>

          <h3 style="color: #2a63cd; margin-top: 30px;">¿Qué te pareció?</h3>
          <p>Nos encantaría conocer tu experiencia con este producto. Tu reseña ayuda a otros clientes a tomar mejores decisiones.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" class="button">Dejar una Reseña</a>
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; border-left: 4px solid #2a63cd;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #212529; font-weight: 600;">
              <svg style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px;" fill="none" stroke="#2a63cd" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Consejos para una buena reseña:
            </p>
            <ul style="margin: 10px 0 0 20px; font-size: 14px; color: #6c757d; line-height: 1.8;">
              <li>Calidad del producto</li>
              <li>Facilidad de uso</li>
              <li>Relación calidad-precio</li>
              <li>Si lo recomendarías a otros</li>
            </ul>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
            Gracias por tu compra y por tomarte el tiempo de compartir tu opinión.
          </p>
        </div>

        ${getEmailFooter({ companyName })}
      </div>
    </body>
    </html>
  `;
}
