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

// Cache for email settings from database
let cachedEmailSettings: any = null;
let emailSettingsCacheTime = 0;
const EMAIL_SETTINGS_CACHE_DURATION = 60 * 1000; // 1 minute - shorter for email settings

// Get email settings from database
const getEmailSettings = async () => {
  const now = Date.now();
  if (cachedEmailSettings && (now - emailSettingsCacheTime) < EMAIL_SETTINGS_CACHE_DURATION) {
    return cachedEmailSettings;
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { prisma } = await import('./prisma');
    cachedEmailSettings = await prisma.emailSettings.findFirst({
      where: { id: 'default' },
    });
    emailSettingsCacheTime = now;
    return cachedEmailSettings;
  } catch (error) {
    console.error('[EMAIL] Error loading email settings from DB:', error);
    return null;
  }
};

// RESEND CLIENT (API HTTP - no se bloquea por ISP)
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

// NODEMAILER TRANSPORTER - Now uses DB settings first, then falls back to env vars
const getTransporterWithSettings = async () => {
  const dbSettings = await getEmailSettings();

  // If we have database settings and they're configured, use them
  if (dbSettings && dbSettings.isConfigured && dbSettings.smtpHost && dbSettings.smtpUser && dbSettings.smtpPassword) {
    console.log('[EMAIL] Using database SMTP configuration:', dbSettings.smtpHost);
    return nodemailer.createTransport({
      host: dbSettings.smtpHost,
      port: dbSettings.smtpPort || 465,
      secure: dbSettings.smtpSecure ?? true,
      auth: {
        user: dbSettings.smtpUser,
        pass: dbSettings.smtpPassword,
      },
      connectionTimeout: 10000,
      tls: {
        rejectUnauthorized: false, // For self-signed certificates
      },
    });
  }

  // Fallback to environment variables
  const provider = process.env.EMAIL_PROVIDER || 'gmail';
  console.log('[EMAIL] Using environment variable configuration:', provider);

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
      connectionTimeout: 10000,
      ...baseConfig,
    },
    contabo: {
      host: process.env.SMTP_HOST || 'mail.contabo.net',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      connectionTimeout: 10000,
      ...baseConfig,
    },
    godaddy: {
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
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

// CORE EMAIL FUNCTION - Now uses database settings

export const sendEmail = async (options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, subject, html, text, replyTo } = options;

  // Get email settings from database first
  const dbSettings = await getEmailSettings();

  // Determine from email/name - prioritize DB settings
  const fromEmail = dbSettings?.fromEmail || dbSettings?.smtpUser || process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = dbSettings?.fromName || process.env.SMTP_FROM_NAME || 'Electro Shop';
  const replyToEmail = replyTo || dbSettings?.replyTo || fromEmail;

  // Check if transactional emails are enabled (for things like password reset, verification)
  // We don't block here because some emails are critical, but we log a warning
  if (dbSettings && !dbSettings.transactionalEnabled) {
    console.warn('[EMAIL] Transactional emails are disabled in settings, but sending anyway for critical emails');
  }

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

  // OPCION 2: Usar SMTP (nodemailer) with database settings
  // Check if we have any SMTP configuration (either from DB or env vars)
  const hasDbConfig = dbSettings?.isConfigured && dbSettings?.smtpHost;
  const hasEnvConfig = process.env.SMTP_HOST || process.env.EMAIL_PROVIDER;

  if (!hasDbConfig && !hasEnvConfig) {
    console.warn('[EMAIL] SMTP no configurado. Email simulado:', { to, subject });
    return { success: true, messageId: 'simulated-' + Date.now() };
  }

  try {
    const transporter = await getTransporterWithSettings();

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      replyTo: replyToEmail,
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
  const telegram = settings?.telegram || '';
  const tiktok = settings?.tiktok || '';
  const twitter = settings?.twitter || '';

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
          
          <!-- HEADER - Simple text-based (no images that might not load) -->
          <tr>
            <td style="background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);padding:25px 40px;border-radius:20px 20px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${companyName.toUpperCase()}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;">${tagline}</p>
            </td>
          </tr>
          
          <!-- CONTENT - Main focus -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef;">
              ${content}
            </td>
          </tr>
          
          <!-- FOOTER with Company Logo and Social Links -->
          <tr>
            <td style="background:linear-gradient(180deg,#f8f9fa 0%,#e9ecef 100%);padding:30px 40px;border-radius:0 0 20px 20px;border:1px solid #e9ecef;border-top:none;">
              
              <!-- Company Logo at bottom (optional, won't break if it doesn't load) -->
              ${logo ? `
              <div style="text-align:center;margin-bottom:20px;">
                <img src="${logo}" alt="${companyName}" style="max-height:50px;max-width:160px;border-radius:8px;" onerror="this.style.display='none'">
              </div>
              ` : ''}
              
              <!-- Social Links - All configured networks -->
              <div style="text-align:center;margin-bottom:15px;">
                ${instagram ? `<a href="${instagram}" style="display:inline-block;margin:0 5px;width:32px;height:32px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);border-radius:8px;text-decoration:none;line-height:32px;color:white;font-size:12px;font-weight:bold;">IG</a>` : ''}
                ${facebook ? `<a href="${facebook}" style="display:inline-block;margin:0 5px;width:32px;height:32px;background:#1877f2;border-radius:8px;text-decoration:none;line-height:32px;color:white;font-size:12px;font-weight:bold;">FB</a>` : ''}
                ${whatsapp ? `<a href="https://wa.me/${whatsapp}" style="display:inline-block;margin:0 5px;width:32px;height:32px;background:#25D366;border-radius:8px;text-decoration:none;line-height:32px;color:white;font-size:12px;font-weight:bold;">WA</a>` : ''}
                ${telegram ? `<a href="${telegram}" style="display:inline-block;margin:0 5px;width:32px;height:32px;background:#0088cc;border-radius:8px;text-decoration:none;line-height:32px;color:white;font-size:12px;font-weight:bold;">TG</a>` : ''}
                ${tiktok ? `<a href="${tiktok}" style="display:inline-block;margin:0 5px;width:32px;height:32px;background:#000000;border-radius:8px;text-decoration:none;line-height:32px;color:white;font-size:12px;font-weight:bold;">TK</a>` : ''}
                ${twitter ? `<a href="${twitter}" style="display:inline-block;margin:0 5px;width:32px;height:32px;background:#1da1f2;border-radius:8px;text-decoration:none;line-height:32px;color:white;font-size:12px;font-weight:bold;">X</a>` : ''}
              </div>
              
              <!-- Contact Info -->
              <div style="text-align:center;margin-bottom:12px;">
                ${phone ? `<p style="margin:3px 0;color:#6a6c6b;font-size:12px;">📞 ${phone}</p>` : ''}
                ${email ? `<p style="margin:3px 0;color:#6a6c6b;font-size:12px;">✉️ ${email}</p>` : ''}
              </div>
              
              <!-- Links -->
              <p style="margin:10px 0;text-align:center;">
                <a href="${appUrl}" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:600;">Visitar Tienda</a>
                <span style="color:#adb5bd;margin:0 8px;">•</span>
                <a href="${appUrl}/contacto" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Contacto</a>
                <span style="color:#adb5bd;margin:0 8px;">•</span>
                <a href="${appUrl}/terminos" style="color:${primaryColor};font-size:11px;text-decoration:none;font-weight:500;">Términos</a>
              </p>
              
              <!-- Copyright -->
              <p style="margin:12px 0 0;text-align:center;color:#adb5bd;font-size:10px;">
                © ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.
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
    <h2 style="margin:0 0 20px;color:#212529;font-size:24px;font-weight:600;">Recuperación de Contraseña</h2>
    <p style="color:#6a6c6b;font-size:16px;line-height:1.6;margin:0 0 20px;">
      ${userName ? `Hola ${userName},` : 'Hola,'}<br><br>
      Hemos recibido una solicitud para restablecer tu contraseña.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Restablecer Contraseña
      </a>
    </div>
    <p style="color:#adb5bd;font-size:12px;margin:30px 0 0;border-top:1px solid #e9ecef;padding-top:20px;">
      Este enlace expirará en 1 hora.
    </p>`;

  return sendEmail({
    to: email,
    subject: 'Recupera tu contraseña - Electro Shop',
    html: await getBaseTemplate(content, 'Restablece tu contraseña'),
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

// ORDER PENDING PAYMENT EMAIL
export const sendOrderPendingPaymentEmail = async (
  email: string,
  orderData: { orderNumber: string; total: number; customerName: string; }
) => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const content = `
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:70px;height:70px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:28px;">⏳</span>
      </div>
      <h2 style="margin:0 0 10px;color:#212529;font-size:24px;font-weight:600;">Pedido en Revisión</h2>
      <p style="color:#f59e0b;font-size:16px;font-weight:600;">Orden #${orderData.orderNumber}</p>
    </div>
    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hola <strong style="color:#212529;">${orderData.customerName}</strong>,<br><br>
      Gracias por tu compra. Hemos recibido tu pedido y está pendiente de confirmación de pago.
    </p>
    <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;">
      <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600;">Estamos revisando tu pago</p>
      <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;">
        Nuestro equipo está verificando tu transacción. Este proceso puede tomar hasta 24 horas hábiles.
      </p>
    </div>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0;color:#6a6c6b;font-size:14px;">
        <strong>Total a pagar:</strong> $${orderData.total.toFixed(2)} USD
      </p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/customer/orders" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Ver Estado del Pedido
      </a>
    </div>`;

  return sendEmail({
    to: email,
    subject: `Pedido Pendiente de Pago - ${orderData.orderNumber}`,
    html: await getBaseTemplate(content, 'Tu pedido está siendo revisado'),
  });
};

// ORDER SHIPPED EMAIL
export const sendOrderShippedEmail = async (
  email: string,
  orderData: { orderNumber: string; customerName: string; trackingNumber?: string; shippingCarrier?: string; }
) => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const content = `
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:70px;height:70px;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:28px;">🚚</span>
      </div>
      <h2 style="margin:0 0 10px;color:#212529;font-size:24px;font-weight:600;">¡Tu Pedido Está en Camino!</h2>
      <p style="color:#3b82f6;font-size:16px;font-weight:600;">Orden #${orderData.orderNumber}</p>
    </div>
    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hola <strong style="color:#212529;">${orderData.customerName}</strong>,<br><br>
      ¡Buenas noticias! Tu pedido ha sido enviado y está en camino hacia ti.
    </p>
    ${orderData.trackingNumber ? `
    <div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-radius:12px;padding:20px;margin:20px 0;text-align:center;border:1px solid #3b82f6;">
      <p style="margin:0 0 5px;color:#6a6c6b;font-size:13px;">Número de Guía</p>
      <p style="margin:0;color:#1d4ed8;font-size:22px;font-weight:700;letter-spacing:2px;">${orderData.trackingNumber}</p>
      ${orderData.shippingCarrier ? `<p style="margin:10px 0 0;color:#6a6c6b;font-size:12px;">Transportista: ${orderData.shippingCarrier}</p>` : ''}
    </div>
    ` : ''}
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/customer/orders" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Seguir mi Pedido
      </a>
    </div>`;

  return sendEmail({
    to: email,
    subject: `¡Tu Pedido Ha Sido Enviado! - ${orderData.orderNumber}`,
    html: await getBaseTemplate(content, 'Tu pedido está en camino'),
  });
};

// ORDER DELIVERED EMAIL
export const sendOrderDeliveredEmail = async (
  email: string,
  orderData: { orderNumber: string; customerName: string; }
) => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const content = `
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:70px;height:70px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:28px;">✓</span>
      </div>
      <h2 style="margin:0 0 10px;color:#212529;font-size:24px;font-weight:600;">¡Pedido Entregado!</h2>
      <p style="color:#10b981;font-size:16px;font-weight:600;">Orden #${orderData.orderNumber}</p>
    </div>
    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hola <strong style="color:#212529;">${orderData.customerName}</strong>,<br><br>
      Tu pedido ha sido entregado exitosamente. Esperamos que disfrutes tu compra.
    </p>
    <div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;padding:20px;margin:20px 0;text-align:center;border:1px solid #10b981;">
      <p style="margin:0 0 10px;color:#065f46;font-size:14px;font-weight:600;">Tu opinión es muy importante</p>
      <p style="margin:0;color:#047857;font-size:13px;">
        ¿Qué te pareció tu experiencia de compra? Déjanos tu reseña.
      </p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/customer/reviews" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Dejar Reseña
      </a>
    </div>
    <p style="color:#adb5bd;font-size:12px;margin:20px 0 0;text-align:center;">
      Si tienes algún problema con tu pedido, <a href="${appUrl}/contacto" style="color:#2a63cd;">contáctanos</a>.
    </p>`;

  return sendEmail({
    to: email,
    subject: `¡Tu Pedido Ha Sido Entregado! - ${orderData.orderNumber}`,
    html: await getBaseTemplate(content, 'Tu pedido ha llegado'),
  });
};

// DIGITAL CODE DELIVERED EMAIL
export const sendDigitalCodeEmail = async (
  email: string,
  codeData: {
    orderNumber: string;
    customerName: string;
    productName: string;
    code: string;
    platform?: string;
    redemptionInstructions?: string;
  }
) => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const platformColors: Record<string, string> = {
    STEAM: '#1b2838',
    PLAYSTATION: '#003791',
    PSN: '#003791',
    XBOX: '#107c10',
    NINTENDO: '#e60012',
    ROBLOX: '#e31b1b',
  };

  const platformBg = codeData.platform ? (platformColors[codeData.platform.toUpperCase()] || '#6366f1') : '#6366f1';

  const content = `
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:80px;height:80px;background:linear-gradient(135deg,${platformBg} 0%,#4f46e5 100%);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(99,102,241,0.3);">
        <span style="color:white;font-size:32px;">🎮</span>
      </div>
      <h2 style="margin:0 0 10px;color:#212529;font-size:24px;font-weight:600;">¡Tu Código Digital Está Listo!</h2>
      <p style="color:#6366f1;font-size:16px;font-weight:600;margin:0;">Orden #${codeData.orderNumber}</p>
    </div>
    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;margin:0 0 25px;">
      Hola <strong style="color:#212529;">${codeData.customerName}</strong>,<br><br>
      Aquí tienes tu código digital para <strong>${codeData.productName}</strong>:
    </p>
    <div style="background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border-radius:16px;padding:25px;margin:25px 0;text-align:center;border:2px dashed #3b82f6;">
      <p style="margin:0 0 8px;color:#6a6c6b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Tu Código</p>
      <p style="margin:0;color:#1e40af;font-size:28px;font-weight:800;font-family:monospace;letter-spacing:3px;word-break:break-all;">
        ${codeData.code}
      </p>
      ${codeData.platform ? `<p style="margin:12px 0 0;color:#6a6c6b;font-size:13px;">Plataforma: <strong>${codeData.platform}</strong></p>` : ''}
    </div>
    ${codeData.redemptionInstructions ? `
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:25px 0;border-left:4px solid #6366f1;">
      <p style="margin:0 0 10px;color:#212529;font-size:14px;font-weight:600;">📋 Instrucciones de Canje:</p>
      <p style="margin:0;color:#6a6c6b;font-size:13px;line-height:1.7;">${codeData.redemptionInstructions}</p>
    </div>
    ` : ''}
    <div style="background:#fef3c7;border-radius:12px;padding:15px;margin:25px 0;border:1px solid #f59e0b;">
      <p style="margin:0;color:#92400e;font-size:12px;text-align:center;">
        ⚠️ <strong>Importante:</strong> Guarda este código en un lugar seguro. No lo compartas con nadie.
      </p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/customer/orders" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Ver Mis Códigos
      </a>
    </div>`;

  return sendEmail({
    to: email,
    subject: `🎮 ¡Tu Código Digital Está Listo! - ${codeData.productName}`,
    html: await getBaseTemplate(content, 'Tu código digital ha llegado'),
  });
};

