import { getEmailStyles, getEmailHeader, getEmailFooter } from './base';

interface PasswordResetData {
    companyName: string;
    companyLogo?: string;
    userName: string;
    resetUrl: string;
    expirationTime: string;
}

export function generatePasswordResetEmail(data: PasswordResetData): string {
    const { companyName, companyLogo, userName, resetUrl, expirationTime } = data;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Contraseña</title>
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        ${getEmailHeader({ companyName, companyLogo })}
        
        <div class="email-body">
          <h2>Recuperación de Contraseña</h2>
          
          <p>Hola ${userName},</p>
          
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          
          <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          </div>
          
          <div class="order-details" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>⚠️ Importante:</strong></p>
            <p style="margin: 10px 0 0 0;">Este enlace expirará en ${expirationTime}. Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${resetUrl}" style="color: #2a63cd; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>

        ${getEmailFooter({ companyName })}
      </div>
    </body>
    </html>
  `;
}
