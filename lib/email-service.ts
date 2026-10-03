/**
 * ELECTRO SHOP - EMAIL SERVICE
 * Servicio centralizado de emails con soporte para SMTP y Resend API
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { escapeHtml } from './html';
import { formatUSD } from './currency';
import { CORREO, COLOR, FUENTE, botonCorreo, selloCorreo } from './email-templates/estilo';
import { cifrarClaveSmtp, claveSmtpCifrada, leerClaveSmtp, opcionesTlsSmtp } from './smtp-seguro';

// TYPES

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Cabeceras extra (por ejemplo List-Unsubscribe en campañas). */
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

import type { EmailSettings, CompanySettings } from '@prisma/client';

// Cache for email settings from database
let cachedEmailSettings: EmailSettings | null = null;
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
    // C-160: una contraseña guardada en texto plano (de antes) se cifra sola la primera vez que se lee. Condicional:
    // si el panel la cambia en ese instante, no se pisa. Si falla, se sigue con la que hay.
    const guardada = cachedEmailSettings?.smtpPassword;
    if (guardada && !claveSmtpCifrada(guardada)) {
      prisma.emailSettings
        .updateMany({ where: { id: 'default', smtpPassword: guardada }, data: { smtpPassword: cifrarClaveSmtp(guardada) } })
        .catch((error) => console.error('[EMAIL] No se pudo cifrar la contraseña SMTP guardada:', error));
    }
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
  const claveSmtp = leerClaveSmtp(dbSettings?.smtpPassword);
  if (dbSettings?.smtpPassword && !claveSmtp) {
    console.error('[EMAIL] No se pudo leer la contraseña SMTP guardada (¿cambió NEXTAUTH_SECRET?): vuelve a escribirla en Configuración. Se usan las variables del .env.');
  }
  if (dbSettings && dbSettings.isConfigured && dbSettings.smtpHost && dbSettings.smtpUser && claveSmtp) {
    return nodemailer.createTransport({
      host: dbSettings.smtpHost,
      port: dbSettings.smtpPort || 465,
      secure: dbSettings.smtpSecure ?? true,
      auth: {
        user: dbSettings.smtpUser,
        pass: claveSmtp,
      },
      connectionTimeout: 10000,
      // Verifica el certificado del servidor (C-160). Para uno autofirmado: SMTP_ALLOW_SELF_SIGNED=true en el .env
      tls: opcionesTlsSmtp(),
    });
  }

  // Fallback to environment variables
  const provider = process.env.EMAIL_PROVIDER || 'gmail';

  const baseConfig = {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  const providerConfigs: Record<string, nodemailer.TransportOptions> = {
    gmail: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000,
      ...baseConfig,
    } as nodemailer.TransportOptions,
    contabo: {
      host: process.env.SMTP_HOST || 'mail.contabo.net',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      connectionTimeout: 10000,
      ...baseConfig,
    } as nodemailer.TransportOptions,
    godaddy: {
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      connectionTimeout: 10000,
      ...baseConfig,
    } as nodemailer.TransportOptions,
    custom: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000,
      ...baseConfig,
    } as nodemailer.TransportOptions,
  };

  return nodemailer.createTransport(providerConfigs[provider] || providerConfigs.custom);
};

// Vista previa (C-75): dentro de capturarCorreo, sendEmail no envía y guarda el correo tal cual saldría.
// Así la vista previa del panel usa las mismas funciones que los envíos reales en vez de una copia.
const capturaVistaPrevia = new AsyncLocalStorage<{ subject?: string; html?: string }>();

export async function capturarCorreo(enviar: () => Promise<unknown>): Promise<{ subject?: string; html?: string }> {
  const captura: { subject?: string; html?: string } = {};
  await capturaVistaPrevia.run(captura, enviar);
  return captura;
}

// CORE EMAIL FUNCTION - Now uses database settings

export const sendEmail = async (options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, subject, html, text, replyTo, headers } = options;

  const captura = capturaVistaPrevia.getStore();
  if (captura) {
    captura.subject = subject;
    captura.html = html;
    return { success: true, messageId: 'vista-previa' };
  }

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
        console.warn(`[EMAIL] Modo prueba: Redirigiendo de ${toArray.join(', ')} a ${testEmail}`);
        toArray = [testEmail];
      }

      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: toArray,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        headers,
      });

      if (result.data) {
        return { success: true, messageId: result.data.id };
      } else {
        console.error('[EMAIL] Error Resend:', result.error);
        return { success: false, error: result.error?.message || 'Error desconocido' };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[EMAIL] Error Resend:', message);
      return { success: false, error: message };
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
      replyTo: (replyToEmail || undefined) as string | undefined,
      headers,
    };

    const info = await transporter.sendMail(mailOptions) as { messageId?: string };

    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al enviar email';
    console.error('[EMAIL] Error SMTP:', message);
    return { success: false, error: message };
  }
};

// EMAIL TEMPLATES

import { prisma } from './prisma';

// Cache for company settings to avoid too many DB calls
let cachedSettings: CompanySettings | null = null;
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

/** URL pública de la tienda, sin barra final: los correos no resuelven rutas relativas. */
const urlDeLaTienda = () => (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Marco de todos los correos (C-175): logo largo sobre blanco, contenido y pie con contacto y redes.
 * El logo lleva el fondo blanco dentro de la imagen para que se lea igual si el cliente de correo
 * oscurece la página. `content` es HTML ya armado por quien llama (con sus datos escapados).
 */
export const getBaseTemplate = async (content: string, preheader?: string) => {
  const settings = await getCompanySettings();
  const appUrl = urlDeLaTienda();

  const companyName = escapeHtml(settings?.companyName || 'Electro Shop');
  const tagline = escapeHtml(settings?.tagline || 'Tu tienda de tecnología de confianza');
  const phone = settings?.phone ? escapeHtml(settings.phone) : '';
  const email = settings?.email ? escapeHtml(settings.email) : '';
  const whatsapp = (settings?.whatsapp || '').replace(/\D/g, '');

  const redes: Array<[string, string, string | null | undefined]> = [
    ['Instagram', 'instagram', settings?.instagram],
    ['WhatsApp', 'whatsapp', whatsapp ? `https://wa.me/${whatsapp}` : ''],
    ['Facebook', 'facebook', settings?.facebook],
    ['Telegram', 'telegram', settings?.telegram],
    ['TikTok', 'tiktok', settings?.tiktok],
    ['X', 'twitter', settings?.twitter],
    ['YouTube', 'youtube', settings?.youtube],
  ];
  const iconosDeRedes = redes
    .filter(([, , url]) => url && /^https?:\/\//i.test(url))
    .map(([nombre, archivo, url]) => `<a href="${escapeHtml(url as string)}" target="_blank" rel="noopener noreferrer" title="${nombre}" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${appUrl}/images/social/${archivo}.png" alt="${nombre}" width="28" height="28" style="display:block;width:28px;height:28px;border:0;outline:none;border-radius:6px;" /></a>`)
    .join('');
  const enlacePie = `color:${COLOR.marca};font-size:12px;text-decoration:none;font-weight:600;`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.fondo};font-family:${FUENTE};">
  ${preheader ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLOR.fondo};">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.fondo};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Cabecera: franja de marca y logo largo -->
          <tr>
            <td bgcolor="${COLOR.marca}" style="background-color:${COLOR.marca};height:6px;line-height:6px;font-size:0;border-radius:16px 16px 0 0;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:22px 24px 18px;border-left:1px solid ${COLOR.linea};border-right:1px solid ${COLOR.linea};border-bottom:1px solid ${COLOR.linea};">
              <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                <img src="${appUrl}/images/brand/logo-correo.png" alt="${companyName}" width="300" style="display:block;margin:0 auto;width:300px;max-width:100%;height:auto;border:0;outline:none;color:${COLOR.marcaOscura};font-size:22px;font-weight:700;" />
              </a>
              <p style="margin:6px 0 0;color:${COLOR.suave};font-size:13px;line-height:1.4;">${tagline}</p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:36px 32px;border-left:1px solid ${COLOR.linea};border-right:1px solid ${COLOR.linea};color:${COLOR.texto};font-size:16px;line-height:1.6;">
              ${content}
            </td>
          </tr>

          <!-- Pie: redes, contacto y enlaces -->
          <tr>
            <td bgcolor="${COLOR.superficie}" align="center" style="background-color:${COLOR.superficie};padding:26px 32px 28px;border:1px solid ${COLOR.linea};border-radius:0 0 16px 16px;text-align:center;">
              ${iconosDeRedes ? `<div style="margin:0 0 16px;">${iconosDeRedes}</div>` : ''}
              ${phone ? `<p style="margin:3px 0;color:${COLOR.suave};font-size:13px;">Teléfono: ${phone}</p>` : ''}
              ${email ? `<p style="margin:3px 0;color:${COLOR.suave};font-size:13px;">Correo: ${email}</p>` : ''}
              <p style="margin:14px 0 0;">
                <a href="${appUrl}" style="${enlacePie}">Visitar la tienda</a>
                <span style="color:#adb5bd;margin:0 8px;">|</span>
                <a href="${appUrl}/contacto" style="${enlacePie}">Contacto</a>
                <span style="color:#adb5bd;margin:0 8px;">|</span>
                <a href="${appUrl}/terminos" style="${enlacePie}">Términos</a>
              </p>
              <p style="margin:14px 0 0;color:${COLOR.suave};font-size:11px;line-height:1.5;">
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
    <h2 style="${CORREO.titulo}">Recupera tu contraseña</h2>
    <p style="${CORREO.texto}">${userName ? `Hola <strong style="${CORREO.fuerte}">${escapeHtml(userName)}</strong>,` : 'Hola,'}</p>
    <p style="${CORREO.texto}">Recibimos una solicitud para restablecer tu contraseña. Toca el botón para crear una nueva.</p>
    ${botonCorreo(resetUrl, 'Restablecer contraseña')}
    <div style="${CORREO.caja}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">Si no pediste este cambio, ignora este mensaje: tu contraseña sigue siendo la misma.</p>
    </div>
    <p style="${CORREO.nota}">Este enlace vence en 1 hora.</p>`;

  return sendEmail({
    to: email,
    subject: 'Recupera tu contraseña - Electro Shop',
    html: await getBaseTemplate(content, 'Restablece tu contraseña'),
  });
};

// WELCOME EMAIL
export const sendWelcomeEmail = async (email: string, userName: string) => {
  const appUrl = urlDeLaTienda();

  const content = `
    <h2 style="${CORREO.titulo}">Bienvenido a Electro Shop</h2>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(userName)}</strong>,</p>
    <p style="${CORREO.texto}">Gracias por unirte. Tu cuenta está lista para comprar.</p>
    ${botonCorreo(`${appUrl}/productos`, 'Explorar productos')}`;

  return sendEmail({
    to: email,
    subject: 'Bienvenido a Electro Shop',
    html: await getBaseTemplate(content, `Hola ${userName}, tu cuenta está lista`),
  });
};

// EMAIL VERIFICATION
export const sendVerificationEmail = async (email: string, token: string, userName?: string) => {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verificar-email/${token}`;
  const appUrl = urlDeLaTienda();

  const content = `
    <h2 style="${CORREO.titulo}">Verifica tu cuenta</h2>
    <p style="${CORREO.texto}">${userName ? `Hola <strong style="${CORREO.fuerte}">${escapeHtml(userName)}</strong>,` : 'Hola,'}</p>
    <p style="${CORREO.texto}">Gracias por registrarte en Electro Shop. Para activar tu cuenta y comenzar a comprar, verifica tu correo electrónico con el botón de abajo.</p>
    ${botonCorreo(verifyUrl, 'Verificar mi cuenta')}
    <div style="${CORREO.caja}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">Si no creaste esta cuenta, puedes ignorar este mensaje de forma segura.</p>
    </div>
    <p style="${CORREO.nota}">
      Este enlace vence en 24 horas. Si tienes problemas, escríbenos a
      <a href="${appUrl}/contacto" style="${CORREO.enlace}">soporte</a>.
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
  const appUrl = urlDeLaTienda();
  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PAID: 'Pagado',
    PROCESSING: 'Procesando', SHIPPED: 'Enviado', DELIVERED: 'Entregado',
  };

  const statusLabel = statusLabels[orderData.status] || orderData.status;

  const content = `
    <h2 style="${CORREO.titulo}">Pedido ${escapeHtml(statusLabel)}</h2>
    <p style="${CORREO.subtitulo}">Orden #${escapeHtml(orderData.orderNumber)}</p>
    <div style="${CORREO.caja}text-align:center;">
      <p style="${CORREO.rotulo}">Total</p>
      <p style="${CORREO.dato}letter-spacing:0;">${formatUSD(orderData.total)}</p>
    </div>
    ${orderData.trackingNumber ? `<p style="${CORREO.texto}">Guía: <strong style="${CORREO.fuerte}">${escapeHtml(orderData.trackingNumber)}</strong></p>` : ''}
    ${botonCorreo(`${appUrl}/customer/orders`, 'Ver pedido')}`;

  return sendEmail({
    to: email,
    subject: `Pedido #${orderData.orderNumber} - ${statusLabel}`,
    html: await getBaseTemplate(content, `Tu pedido está ${statusLabel.toLowerCase()}`),
  });
};

// LEGAL DOCUMENT EMAIL
export const sendLegalDocumentEmail = async (
  email: string,
  documentType: 'terms_acceptance' | 'privacy_update' | 'contract',
  documentUrl?: string,
  pdfAttachment?: Buffer
) => {
  void pdfAttachment;
  const titles = {
    terms_acceptance: 'Constancia de aceptación de términos',
    privacy_update: 'Actualización de la política de privacidad',
    contract: 'Contrato de servicios',
  };

  const content = `
    <h2 style="${CORREO.titulo}">${titles[documentType]}</h2>
    <p style="${CORREO.texto}">Te enviamos tu documento legal para que lo guardes.</p>
    ${documentUrl ? botonCorreo(escapeHtml(documentUrl), 'Ver documento') : ''}`;

  return sendEmail({
    to: email,
    subject: `${titles[documentType]} - Electro Shop`,
    html: await getBaseTemplate(content),
  });
};

// TEST EMAIL
export const sendTestEmail = async (email: string) => {
  const content = `
    <div style="text-align:center;">
      ${selloCorreo('exito')}
      <h2 style="${CORREO.titulo}">Correo de prueba recibido</h2>
      <p style="${CORREO.texto}">La configuración de correo está funcionando.</p>
    </div>
    <div style="${CORREO.cajaExito}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoExito}">
        Proveedor: ${process.env.RESEND_API_KEY ? 'Resend API' : escapeHtml(process.env.EMAIL_PROVIDER || 'SMTP')}<br>
        Hora: ${new Date().toLocaleString('es-VE')}
      </p>
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
  const appUrl = urlDeLaTienda();

  const content = `
    <h2 style="${CORREO.titulo}">Pedido en revisión</h2>
    <p style="${CORREO.subtitulo}">Orden #${escapeHtml(orderData.orderNumber)}</p>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(orderData.customerName)}</strong>,</p>
    <p style="${CORREO.texto}">Gracias por tu compra. Recibimos tu pedido y está pendiente de la confirmación del pago.</p>
    <div style="${CORREO.cajaAviso}">
      <p style="${CORREO.cajaTitulo}${CORREO.tonoAviso}">Estamos revisando tu pago</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoAviso}">Nuestro equipo está verificando tu transacción. Este proceso puede tomar hasta 24 horas hábiles.</p>
    </div>
    <div style="${CORREO.caja}text-align:center;">
      <p style="${CORREO.rotulo}">Total a pagar</p>
      <p style="${CORREO.dato}letter-spacing:0;">${formatUSD(orderData.total)}</p>
    </div>
    ${botonCorreo(`${appUrl}/customer/orders`, 'Ver estado del pedido')}`;

  return sendEmail({
    to: email,
    subject: `Pedido Pendiente de Pago - ${orderData.orderNumber}`,
    html: await getBaseTemplate(content, 'Tu pedido está siendo revisado'),
  });
};

// ORDER SHIPPED EMAIL
export const sendOrderShippedEmail = async (
  email: string,
  orderData: {
    orderNumber: string;
    customerName: string;
    trackingNumber?: string;
    shippingCarrier?: string;
    /** C-100: dónde lo retira o recibe, y si el flete se paga al recibir */
    destination?: string;
    payOnDelivery?: boolean;
  }
) => {
  const appUrl = urlDeLaTienda();

  const content = `
    <h2 style="${CORREO.titulo}">Tu pedido está en camino</h2>
    <p style="${CORREO.subtitulo}">Orden #${escapeHtml(orderData.orderNumber)}</p>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(orderData.customerName)}</strong>,</p>
    <p style="${CORREO.texto}">Buenas noticias: tu pedido fue enviado y va en camino.</p>
    ${orderData.trackingNumber ? `
    <div style="${CORREO.cajaInfo}text-align:center;">
      <p style="${CORREO.rotulo}">Número de guía</p>
      <p style="${CORREO.dato}">${escapeHtml(orderData.trackingNumber)}</p>
      ${orderData.shippingCarrier ? `<p style="${CORREO.textoMenor}margin:10px 0 0;">Transportista: ${escapeHtml(orderData.shippingCarrier)}</p>` : ''}
    </div>
    ` : ''}
    ${orderData.destination ? `<p style="${CORREO.texto}"><strong style="${CORREO.fuerte}">Destino:</strong> ${escapeHtml(orderData.destination)}</p>` : ''}
    ${orderData.payOnDelivery ? `
    <div style="${CORREO.cajaAviso}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoAviso}">El envío es con <strong>cobro a destino</strong>: el flete se lo pagas a ${escapeHtml(orderData.shippingCarrier || 'la empresa de envíos')} cuando retires o recibas el paquete. Lleva tu cédula.</p>
    </div>
    ` : ''}
    ${botonCorreo(`${appUrl}/customer/orders`, 'Seguir mi pedido')}`;

  return sendEmail({
    to: email,
    subject: `¡Tu Pedido Ha Sido Enviado! - ${orderData.orderNumber}`,
    html: await getBaseTemplate(content, 'Tu pedido está en camino'),
  });
};

// C-100: novedad del rastreo (el paquete llegó a la oficina)
export const sendShipmentUpdateEmail = async (
  email: string,
  data: { orderNumber: string; customerName: string; title: string; detail: string }
) => {
  const appUrl = urlDeLaTienda();
  const content = `
    <h2 style="${CORREO.titulo}">${escapeHtml(data.title)}</h2>
    <p style="${CORREO.subtitulo}">Orden #${escapeHtml(data.orderNumber)}</p>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(data.customerName)}</strong>,</p>
    <p style="${CORREO.texto}">${escapeHtml(data.detail)}</p>
    ${botonCorreo(`${appUrl}/customer/orders`, 'Ver mi pedido')}`;

  return sendEmail({
    to: email,
    subject: `${data.title} - ${data.orderNumber}`,
    html: await getBaseTemplate(content, data.title),
  });
};

// ORDER DELIVERED EMAIL
export const sendOrderDeliveredEmail = async (
  email: string,
  orderData: { orderNumber: string; customerName: string; }
) => {
  const appUrl = urlDeLaTienda();

  const content = `
    <div style="text-align:center;">
      ${selloCorreo('exito')}
      <h2 style="${CORREO.titulo}">Pedido entregado</h2>
      <p style="${CORREO.subtitulo}">Orden #${escapeHtml(orderData.orderNumber)}</p>
    </div>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(orderData.customerName)}</strong>,</p>
    <p style="${CORREO.texto}">Tu pedido fue entregado. Esperamos que disfrutes tu compra.</p>
    <div style="${CORREO.cajaExito}text-align:center;">
      <p style="${CORREO.cajaTitulo}${CORREO.tonoExito}">Tu opinión es muy importante</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoExito}">¿Qué te pareció tu experiencia de compra? Déjanos tu reseña.</p>
    </div>
    ${botonCorreo(`${appUrl}/customer/reviews`, 'Dejar reseña')}
    <p style="${CORREO.nota}text-align:center;">
      Si tienes algún problema con tu pedido, <a href="${appUrl}/contacto" style="${CORREO.enlace}">contáctanos</a>.
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
  const appUrl = urlDeLaTienda();
  // Todo escapado (C-60b): el nombre del producto lleva la cuenta que escribió el cliente y el código lo pega el equipo
  const e = {
    orderNumber: escapeHtml(codeData.orderNumber),
    customerName: escapeHtml(codeData.customerName),
    productName: escapeHtml(codeData.productName),
    code: escapeHtml(codeData.code),
    platform: codeData.platform ? escapeHtml(codeData.platform) : '',
    redemptionInstructions: codeData.redemptionInstructions ? escapeHtml(codeData.redemptionInstructions).replace(/\n/g, '<br>') : '',
  };

  const content = `
    <h2 style="${CORREO.titulo}">Tu código digital está listo</h2>
    <p style="${CORREO.subtitulo}">Orden #${e.orderNumber}</p>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${e.customerName}</strong>,</p>
    <p style="${CORREO.texto}">Aquí tienes tu código digital para <strong style="${CORREO.fuerte}">${e.productName}</strong>:</p>
    <div style="${CORREO.cajaInfo}text-align:center;border-style:dashed;border-width:2px;">
      <p style="${CORREO.rotulo}">Tu código</p>
      <p style="${CORREO.dato}font-family:'Courier New',Courier,monospace;">${e.code}</p>
      ${e.platform ? `<p style="${CORREO.textoMenor}margin:12px 0 0;">Plataforma: <strong style="${CORREO.fuerte}">${e.platform}</strong></p>` : ''}
    </div>
    ${e.redemptionInstructions ? `
    <div style="${CORREO.caja}">
      <p style="${CORREO.cajaTitulo}${CORREO.fuerte}">Instrucciones de canje</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">${e.redemptionInstructions}</p>
    </div>
    ` : ''}
    <div style="${CORREO.cajaAviso}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoAviso}"><strong>Importante:</strong> guarda este código en un lugar seguro y no lo compartas con nadie.</p>
    </div>
    ${botonCorreo(`${appUrl}/customer/orders`, 'Ver mis códigos')}`;

  return sendEmail({
    to: email,
    subject: `¡Tu Código Digital Está Listo! - ${codeData.productName}`,
    html: await getBaseTemplate(content, 'Tu código digital ha llegado'),
  });
};

// GIFT CARD EMAIL - Send gift card to recipient
export const sendGiftCardEmail = async (
  email: string,
  giftCardData: {
    code: string;
    pin?: string;
    amount: number;
    senderName: string;
    recipientName: string;
    personalMessage?: string;
    designName?: string;
  }
) => {
  const appUrl = urlDeLaTienda();
  const redeemUrl = `${appUrl}/canjear-gift-card`;
  // El remitente, el destinatario y el mensaje los escribe quien regala
  const e = {
    senderName: escapeHtml(giftCardData.senderName),
    recipientName: escapeHtml(giftCardData.recipientName),
    personalMessage: giftCardData.personalMessage ? escapeHtml(giftCardData.personalMessage) : '',
    code: escapeHtml(giftCardData.code),
    pin: giftCardData.pin ? escapeHtml(giftCardData.pin) : '',
  };

  const content = `
    <div style="text-align:center;">
      <h2 style="${CORREO.titulo}">Te enviaron una Gift Card</h2>
      <p style="${CORREO.subtitulo}">De parte de ${e.senderName}</p>
    </div>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${e.recipientName}</strong>,</p>
    <p style="${CORREO.texto}"><strong style="${CORREO.fuerte}">${e.senderName}</strong> te envió una Gift Card de Electro Shop para que la uses en lo que más te guste.</p>

    ${e.personalMessage ? `
    <div style="${CORREO.cajaAviso}text-align:center;">
      <p style="${CORREO.rotulo}${CORREO.tonoAviso}">Mensaje personal</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoAviso}font-size:15px;font-style:italic;">"${e.personalMessage}"</p>
    </div>
    ` : ''}

    <!-- La tarjeta: tabla y colores planos para que se vea igual en todos los clientes de correo -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td bgcolor="${COLOR.marcaOscura}" style="background-color:${COLOR.marcaOscura};border-radius:16px;padding:26px 24px;text-align:center;">
          <p style="margin:0;color:#bfdbfe;font-size:12px;line-height:1.4;letter-spacing:2px;">ELECTRO SHOP · GIFT CARD</p>
          <p style="margin:14px 0 0;color:#ffffff;font-size:44px;line-height:1.1;font-weight:700;">${formatUSD(giftCardData.amount)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;padding:14px 12px;text-align:center;">
                <p style="${CORREO.rotulo}">Código de canje</p>
                <p style="${CORREO.dato}font-size:20px;font-family:'Courier New',Courier,monospace;">${e.code}</p>
                ${e.pin ? `<p style="${CORREO.textoMenor}margin:10px 0 0;">PIN: <strong style="${CORREO.fuerte}letter-spacing:2px;">${e.pin}</strong></p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="${CORREO.cajaExito}">
      <p style="${CORREO.cajaTitulo}${CORREO.tonoExito}">¿Cómo canjear tu Gift Card?</p>
      <ol style="margin:0;padding:0 0 0 20px;font-size:14px;line-height:1.8;${CORREO.tonoExito}">
        <li>Entra a Electro Shop y crea una cuenta o inicia sesión</li>
        <li>Ve a la página de <strong>Canjear Gift Card</strong></li>
        <li>Escribe el código de arriba${e.pin ? ' y el PIN' : ''}</li>
        <li>Los Puntos ES se acreditan al instante en tu cuenta</li>
      </ol>
    </div>

    ${botonCorreo(redeemUrl, 'Canjear mi Gift Card')}

    <div style="${CORREO.cajaAviso}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoAviso}text-align:center;"><strong>Importante:</strong> guarda este correo. El código es único y no tiene fecha de vencimiento.</p>
    </div>

    <p style="${CORREO.nota}text-align:center;">
      ¿Tienes problemas? <a href="${appUrl}/contacto" style="${CORREO.enlace}">Contáctanos</a>
    </p>`;

  return sendEmail({
    to: email,
    subject: `¡${giftCardData.senderName} te ha enviado una Gift Card de $${giftCardData.amount}!`,
    html: await getBaseTemplate(content, `${giftCardData.senderName} te regaló una Gift Card de $${giftCardData.amount}`),
  });
};

// C-122: el equipo respondió o cambió el estado de una solicitud de garantía
export const sendWarrantyUpdateEmail = async (
  email: string,
  data: { customerName: string; code: string; productName: string; status: string; statusHelp: string; message?: string | null },
) => {
  const appUrl = urlDeLaTienda();
  const content = `
    <h2 style="${CORREO.titulo}">Tu solicitud de garantía ${escapeHtml(data.code)}</h2>
    <p style="${CORREO.texto}">
      Hola <strong style="${CORREO.fuerte}">${escapeHtml(data.customerName)}</strong>, tenemos novedades sobre <strong style="${CORREO.fuerte}">${escapeHtml(data.productName)}</strong>.
    </p>
    <div style="${CORREO.caja}">
      <p style="${CORREO.cajaTitulo}${CORREO.fuerte}">Estado: ${escapeHtml(data.status)}</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">${escapeHtml(data.statusHelp)}</p>
    </div>
    ${data.message ? `<div style="${CORREO.cita}">${escapeHtml(data.message)}</div>` : ''}
    ${botonCorreo(`${appUrl}/customer/warranty`, 'Ver mi solicitud')}`;
  return sendEmail({
    to: email,
    subject: `Garantía ${data.code}: ${data.status}`,
    html: await getBaseTemplate(content, `Novedades de tu solicitud de garantía ${data.code}`),
  });
};
