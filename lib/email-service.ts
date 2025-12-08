/**
 * ELECTRO SHOP - EMAIL SERVICE
 * Servicio centralizado de emails con soporte para SMTP y Resend API
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// TYPES

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

// RESEND CLIENT (API HTTP - no se bloquea por ISP)
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

// NODEMAILER TRANSPORTER (SMTP - puede ser bloqueado)
const getTransporter = () => {
  const provider = process.env.EMAIL_PROVIDER || 'gmail';

  const baseConfig = {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  const providerConfigs: Record<string, any> = {
    gmail: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000, // 10 segundos timeout
      ...baseConfig,
    },
    contabo: {
      host: process.env.SMTP_HOST || 'mail.contabo.net',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      connectionTimeout: 10000,
      ...baseConfig,
    },
    custom: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000,
      ...baseConfig,
    },
  };

  return nodemailer.createTransport(providerConfigs[provider] || providerConfigs.custom);
};

// CORE EMAIL FUNCTION

export const sendEmail = async (options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, subject, html, text, replyTo } = options;
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.SMTP_FROM_NAME || 'Electro Shop';

  // OPCION 1: Usar Resend si esta configurado (recomendado)
  const resend = getResendClient();
  if (resend) {
    try {
      let toArray = Array.isArray(to) ? to : [to];

      // En modo de prueba (sin dominio verificado), redirigir a email de prueba
      const testEmail = process.env.RESEND_TEST_EMAIL;
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (testEmail && isDevelopment) {
        console.log(`[EMAIL] Modo prueba: Redirigiendo de ${toArray.join(', ')} a ${testEmail}`);
        toArray = [testEmail];
      }

      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: toArray,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });

      if (result.data) {
        console.log('[EMAIL] Enviado via Resend:', result.data.id);
        return { success: true, messageId: result.data.id };
      } else {
        console.error('[EMAIL] Error Resend:', result.error);
        return { success: false, error: result.error?.message || 'Error desconocido' };
      }
    } catch (error: any) {
      console.error('[EMAIL] Error Resend:', error.message);
      return { success: false, error: error.message };
    }
  }

  // OPCION 2: Usar SMTP (nodemailer)
  if (!process.env.SMTP_HOST && !process.env.EMAIL_PROVIDER) {
    console.warn('[EMAIL] SMTP no configurado. Email simulado:', { to, subject });
    return { success: true, messageId: 'simulated-' + Date.now() };
  }

  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      replyTo: replyTo || fromEmail,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Enviado via SMTP:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[EMAIL] Error SMTP:', error.message);
    return { success: false, error: error.message };
  }
};

// EMAIL TEMPLATES

import { prisma } from './prisma';

// Cache for company settings to avoid too many DB calls
let cachedSettings: any = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCompanySettings = async () => {
  const now = Date.now();
  if (cachedSettings && (now - cacheTime) < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    cachedSettings = await prisma.companySettings.findFirst();
    cacheTime = now;
    return cachedSettings;
  } catch (error) {
    console.error('[EMAIL] Error loading company settings:', error);
    return null;
  }
};

export const getBaseTemplate = async (content: string, preheader?: string) => {
  const settings = await getCompanySettings();
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const companyName = settings?.companyName || 'Electro Shop';
  const tagline = settings?.tagline || 'Tu tienda de tecnologia de confianza';
  const logo = settings?.logo || '';
  const primaryColor = settings?.primaryColor || '#2a63cd';
  const secondaryColor = settings?.secondaryColor || '#1e4ba3';
  const phone = settings?.phone || '';
  const whatsapp = settings?.whatsapp || '';
  const email = settings?.email || '';
  const instagram = settings?.instagram || '';
  const facebook = settings?.facebook || '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- HEADER PREMIUM -->
          <tr>
            <td style="background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);padding:40px;border-radius:20px 20px 0 0;text-align:center;">
              ${logo ? `
              <div style="margin-bottom:20px;">
                <img src="${logo}" alt="${companyName}" style="max-height:60px;max-width:200px;border-radius:12px;">
              </div>
              ` : `
              <div style="width:70px;height:70px;background:rgba(255,255,255,0.2);border-radius:16px;margin:0 auto 15px;">
                <span style="font-size:32px;font-weight:bold;color:white;line-height:70px;">${companyName.charAt(0)}</span>
              </div>
              `}
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${companyName.toUpperCase()}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;font-weight:500;">${tagline}</p>
              <div style="margin-top:15px;height:2px;width:60px;background:rgba(255,255,255,0.4);margin-left:auto;margin-right:auto;border-radius:1px;"></div>
            </td>
          </tr>
          
          <!-- CONTENT -->
          <tr>
            <td style="background-color:#ffffff;padding:45px 40px;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef;">
              ${content}
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background:linear-gradient(180deg,#f8f9fa 0%,#e9ecef 100%);padding:35px 40px;border-radius:0 0 20px 20px;border:1px solid #e9ecef;border-top:none;">
              
              <!-- Social Links -->
              <div style="text-align:center;margin-bottom:20px;">
                ${instagram ? `<a href="${instagram}" style="display:inline-block;margin:0 6px;width:36px;height:36px;background:${primaryColor};border-radius:8px;text-decoration:none;line-height:36px;color:white;font-size:16px;">ig</a>` : ''}
                ${facebook ? `<a href="${facebook}" style="display:inline-block;margin:0 6px;width:36px;height:36px;background:${primaryColor};border-radius:8px;text-decoration:none;line-height:36px;color:white;font-size:16px;">fb</a>` : ''}
                ${whatsapp ? `<a href="https://wa.me/${whatsapp}" style="display:inline-block;margin:0 6px;width:36px;height:36px;background:#25D366;border-radius:8px;text-decoration:none;line-height:36px;color:white;font-size:16px;">wa</a>` : ''}
              </div>
              
              <!-- Contact Info -->
              <div style="text-align:center;margin-bottom:15px;">
                ${phone ? `<p style="margin:4px 0;color:#6a6c6b;font-size:12px;">Tel: ${phone}</p>` : ''}
                ${email ? `<p style="margin:4px 0;color:#6a6c6b;font-size:12px;">Email: ${email}</p>` : ''}
              </div>
              
              <!-- Copyright -->
              <p style="margin:0;text-align:center;color:#adb5bd;font-size:11px;">
                2024 ${companyName}. Todos los derechos reservados.
              </p>
              <p style="margin:8px 0 0;text-align:center;">
                <a href="${appUrl}/contacto" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Contacto</a>
                <span style="color:#adb5bd;margin:0 8px;">|</span>
                <a href="${appUrl}/terminos" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Terminos</a>
                <span style="color:#adb5bd;margin:0 8px;">|</span>
                <a href="${appUrl}/privacidad" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Privacidad</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// PASSWORD RESET EMAIL
export const sendPasswordResetEmail = async (email: string, token: string, userName?: string) => {
  const resetUrl = `${process.env.NEXTAUTH_URL}/recuperar-contrasena/${token}`;

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">Recuperacion de Contrasena</h2>
    <p style="color:#6a6c6b;font-size:16px;line-height:1.6;margin:0 0 20px;">
      ${userName ? `Hola ${userName},` : 'Hola,'}<br><br>
      Hemos recibido una solicitud para restablecer tu contrasena.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Restablecer Contrasena
      </a>
    </div>
    <p style="color:#adb5bd;font-size:12px;margin:30px 0 0;border-top:1px solid #e9ecef;padding-top:20px;">
      Este enlace expirara en 1 hora.
    </p>`;

  return sendEmail({
    to: email,
    subject: 'Recupera tu contrasena - Electro Shop',
    html: await getBaseTemplate(content, 'Restablece tu contrasena'),
  });
};

// WELCOME EMAIL
export const sendWelcomeEmail = async (email: string, userName: string) => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">Bienvenido a Electro Shop</h2>
    <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
      Hola <strong>${userName}</strong>,<br><br>
      Gracias por unirte. Tu cuenta esta lista.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/productos" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Explorar Productos
      </a>
    </div>`;

  return sendEmail({
    to: email,
    subject: 'Bienvenido a Electro Shop',
    html: await getBaseTemplate(content, `Hola ${userName}, tu cuenta esta lista`),
  });
};

// EMAIL VERIFICATION
export const sendVerificationEmail = async (email: string, token: string, userName?: string) => {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verificar-email/${token}`;
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">Verifica tu cuenta</h2>
    <p style="color:#6a6c6b;font-size:16px;line-height:1.6;margin:0 0 20px;">
      ${userName ? `Hola ${userName},` : 'Hola,'}<br><br>
      Gracias por registrarte en Electro Shop. Para activar tu cuenta y comenzar a comprar, 
      por favor verifica tu correo electronico haciendo clic en el boton de abajo.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
        Verificar mi cuenta
      </a>
    </div>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:25px 0;">
      <p style="margin:0;color:#6a6c6b;font-size:14px;">
        Si no creaste esta cuenta, puedes ignorar este mensaje de forma segura.
      </p>
    </div>
    <p style="color:#adb5bd;font-size:12px;margin:30px 0 0;border-top:1px solid #e9ecef;padding-top:20px;">
      Este enlace expirara en 24 horas. Si tienes problemas, contactanos en 
      <a href="${appUrl}/contacto" style="color:#2a63cd;">soporte</a>.
    </p>`;

  return sendEmail({
    to: email,
    subject: 'Verifica tu cuenta - Electro Shop',
    html: await getBaseTemplate(content, 'Activa tu cuenta de Electro Shop'),
  });
};

// ORDER NOTIFICATION EMAIL
export const sendOrderNotificationEmail = async (
  email: string,
  orderData: {
    orderNumber: string;
    status: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    trackingNumber?: string;
    trackingUrl?: string;
  }
) => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PAID: 'Pagado',
    PROCESSING: 'Procesando', SHIPPED: 'Enviado', DELIVERED: 'Entregado',
  };

  const statusLabel = statusLabels[orderData.status] || orderData.status;

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">Pedido ${statusLabel}</h2>
    <p style="color:#6a6c6b;font-size:14px;">Pedido #${orderData.orderNumber}</p>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-weight:700;color:#2a63cd;font-size:18px;">Total: $${orderData.total.toFixed(2)}</p>
    </div>
    ${orderData.trackingNumber ? `<p style="color:#6a6c6b;">Guia: ${orderData.trackingNumber}</p>` : ''}
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/customer/orders" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Ver Pedido
      </a>
    </div>`;

  return sendEmail({
    to: email,
    subject: `Pedido #${orderData.orderNumber} - ${statusLabel}`,
    html: await getBaseTemplate(content, `Tu pedido esta ${statusLabel.toLowerCase()}`),
  });
};

// LEGAL DOCUMENT EMAIL
export const sendLegalDocumentEmail = async (
  email: string,
  documentType: 'terms_acceptance' | 'privacy_update' | 'contract',
  documentUrl?: string,
  pdfAttachment?: Buffer
) => {
  const titles = {
    terms_acceptance: 'Constancia de Aceptacion de Terminos',
    privacy_update: 'Actualizacion de Politica de Privacidad',
    contract: 'Contrato de Servicios',
  };

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">${titles[documentType]}</h2>
    <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
      Adjuntamos tu documento legal para tus registros.
    </p>
    ${documentUrl ? `
    <div style="text-align:center;margin:30px 0;">
      <a href="${documentUrl}" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Ver Documento
      </a>
    </div>` : ''}`;

  return sendEmail({
    to: email,
    subject: `${titles[documentType]} - Electro Shop`,
    html: await getBaseTemplate(content),
  });
};

// MARKETING EMAIL
export const sendMarketingEmail = async (
  emails: string[],
  campaign: { title: string; preheader: string; htmlContent: string; ctaText?: string; ctaUrl?: string; }
) => {
  if (process.env.ENABLE_MARKETING_EMAILS !== 'true') {
    return { success: false, error: 'Marketing emails disabled' };
  }

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">${campaign.title}</h2>
    ${campaign.htmlContent}
    ${campaign.ctaText && campaign.ctaUrl ? `
    <div style="text-align:center;margin:30px 0;">
      <a href="${campaign.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        ${campaign.ctaText}
      </a>
    </div>` : ''}`;

  return sendEmail({
    to: emails,
    subject: campaign.title,
    html: await getBaseTemplate(content, campaign.preheader),
  });
};

// NOTIFICATION EMAIL
export const sendNotificationEmail = async (
  email: string,
  notification: { title: string; message: string; actionUrl?: string; actionText?: string; }
) => {
  if (process.env.SEND_EMAIL_NOTIFICATIONS !== 'true') {
    return { success: true, messageId: 'disabled' };
  }

  const content = `
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">${notification.title}</h2>
    <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">${notification.message}</p>
    ${notification.actionUrl && notification.actionText ? `
    <div style="text-align:center;margin:30px 0;">
      <a href="${notification.actionUrl}" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        ${notification.actionText}
      </a>
    </div>` : ''}`;

  return sendEmail({
    to: email,
    subject: notification.title,
    html: await getBaseTemplate(content),
  });
};

// TEST EMAIL
export const sendTestEmail = async (email: string) => {
  const content = `
    <div style="text-align:center;">
      <div style="width:60px;height:60px;background:#10b981;border-radius:50%;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:24px;font-weight:bold;">OK</span>
      </div>
      <h2 style="margin:0 0 10px;color:#212529;font-size:24px;font-weight:600;">Email de prueba exitoso</h2>
      <p style="color:#6a6c6b;font-size:16px;">La configuracion de email esta funcionando.</p>
      <div style="background:#d1fae5;border-radius:12px;padding:20px;margin:25px 0;border:1px solid #10b981;">
        <p style="margin:0;color:#065f46;font-size:14px;">
          Proveedor: ${process.env.RESEND_API_KEY ? 'Resend API' : (process.env.EMAIL_PROVIDER || 'SMTP')}<br>
          Hora: ${new Date().toLocaleString('es-VE')}
        </p>
      </div>
    </div>`;

  return sendEmail({
    to: email,
    subject: 'Test de Email - Electro Shop',
    html: await getBaseTemplate(content),
  });
};
