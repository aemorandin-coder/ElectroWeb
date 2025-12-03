import { generateReviewReminderEmail } from './ReviewReminder';

interface ReviewApprovedData {
    companyName: string;
    companyLogo?: string;
    customerName: string;
    productName: string;
    productUrl: string;
    rating: number;
}

export function generateReviewApprovedEmail(data: ReviewApprovedData): string {
    const { companyName, companyLogo, customerName, productName, productUrl, rating } = data;

    const stars = '⭐'.repeat(rating);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu reseña ha sido publicada</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f8f9fa;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #2a63cd 0%, #1e4ba3 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .logo {
          max-width: 150px;
          height: auto;
          margin-bottom: 20px;
        }
        .header-title {
          color: #ffffff;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .email-body {
          padding: 40px 30px;
        }
        h2 {
          color: #212529;
          font-size: 24px;
          margin-top: 0;
        }
        p {
          color: #6c757d;
          line-height: 1.6;
          margin: 16px 0;
        }
        .success-box {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }
        .success-box p {
          color: #155724;
          margin: 0;
          font-weight: 600;
        }
        .rating-display {
          text-align: center;
          font-size: 32px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #2a63cd 0%, #1e4ba3 100%);
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          color: #6c757d;
          font-size: 14px;
          margin: 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo" />` : ''}
          <h1 class="header-title">¡Tu reseña ha sido publicada!</h1>
        </div>
        
        <div class="email-body">
          <h2>¡Hola ${customerName}!</h2>
          
          <div class="success-box">
            <p>
              <svg style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;" fill="none" stroke="#28a745" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Tu reseña ha sido aprobada y ahora es visible para otros clientes
            </p>
          </div>

          <p>Gracias por tomarte el tiempo de compartir tu experiencia con <strong>${productName}</strong>.</p>

          <div class="rating-display">
            ${[...Array(5)].map((_, i) =>
        i < rating
            ? '<span style="color: #ffc107;">★</span>'
            : '<span style="color: #e9ecef;">★</span>'
    ).join('')}
          </div>

          <p>Tu opinión ayuda a otros clientes a tomar mejores decisiones de compra. ¡Apreciamos mucho tu contribución a nuestra comunidad!</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${productUrl}" class="button">Ver tu Reseña</a>
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #212529; font-weight: 600;">
              <svg style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px;" fill="none" stroke="#2a63cd" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ¿Sabías que?
            </p>
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
              Las reseñas verificadas como la tuya son las más valiosas para otros compradores. ¡Gracias por ser parte de nuestra comunidad!
            </p>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
            Si tienes alguna pregunta o comentario adicional, no dudes en contactarnos.
          </p>
        </div>

        <div class="footer">
          <p><strong>${companyName}</strong></p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
