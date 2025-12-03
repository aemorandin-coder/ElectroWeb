import { getEmailStyles, getEmailHeader, getEmailFooter } from './base';

interface WelcomeEmailData {
    companyName: string;
    companyLogo?: string;
    userName: string;
    userEmail: string;
    loginUrl: string;
    shopUrl: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData): string {
    const { companyName, companyLogo, userName, userEmail, loginUrl, shopUrl } = data;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a ${companyName}</title>
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader({ companyName, companyLogo })}
        
        <div class="email-body">
          <h2>¡Bienvenido a ${companyName}, ${userName}!</h2>
          
          <p>Estamos emocionados de tenerte con nosotros. Tu cuenta ha sido creada exitosamente.</p>
          
          <div class="order-details">
            <p><strong>Email de la cuenta:</strong> ${userEmail}</p>
          </div>

          <h3>¿Qué puedes hacer ahora?</h3>
          <ul style="line-height: 2;">
            <li>Explora nuestro catálogo de productos</li>
            <li>Agrega productos a tu lista de deseos</li>
            <li>Realiza tu primera compra</li>
            <li>Recibe ofertas exclusivas</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${shopUrl}" class="button">Comenzar a Comprar</a>
          </div>

          <p style="margin-top: 30px;">Si tienes alguna pregunta o necesitas ayuda, nuestro equipo está aquí para asistirte.</p>
          
          <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
            Puedes iniciar sesión en cualquier momento visitando: <a href="${loginUrl}" style="color: #2a63cd;">${loginUrl}</a>
          </p>
        </div>

        ${getEmailFooter({ companyName })}
      </div>
    </body>
    </html>
  `;
}
