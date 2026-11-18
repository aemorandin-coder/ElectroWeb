/**
 * ELECTRO SHOP - EMAIL SERVICE
 * Servicio centralizado de emails con soporte para SMTP y Resend API
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import nodemailer, { type SMTPTransportOptions } from 'nodemailer';
import { Resend } from 'resend';
import { escapeHtml } from './html';
import { formatUSD } from './currency';
import {
  CORREO, COLOR, FUENTE, avisoCorreo, botonCorreo, datosCorreo, notaCorreo, placaCorreo, placaInteriorCorreo, rotuloCorreo,
  seguimientoCorreo, urlTienda, ventajasCorreo,
} from './email-templates/estilo';
import { marcoCorreo, type OpcionesCorreo } from './email-templates/marco';
import { htmlATexto } from './email-templates/texto';
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

import type { EmailSettings } from '@prisma/client';

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
    console.error('[EMAIL] No se pudo leer la contraseña SMTP guardada (¿cambió NEXTAUTH_SECRET?): vuelve a escribirla en Ajustes → Correo. Se usan las variables del .env.');
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

  const providerConfigs: Record<string, SMTPTransportOptions> = {
    gmail: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000,
      ...baseConfig,
    } as SMTPTransportOptions,
    contabo: {
      host: process.env.SMTP_HOST || 'mail.contabo.net',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      connectionTimeout: 10000,
      ...baseConfig,
    } as SMTPTransportOptions,
    godaddy: {
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      connectionTimeout: 10000,
      ...baseConfig,
    } as SMTPTransportOptions,
    custom: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000,
      ...baseConfig,
    } as SMTPTransportOptions,
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
        text: text || htmlATexto(html),
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
      text: text || htmlATexto(html),
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

// EMAIL TEMPLATES (C-219: el marco y las piezas viven en lib/email-templates; aquí, los correos de siempre con su texto)

/**
 * El marco de todos los correos con un contenido ya armado (las campañas, los avisos sin encabezado propio).
 * C-219: es `marcoCorreo` (ELECTRO SHOP arriba, el cierre "sin miedo" abajo). `content` llega escapado.
 */
export const getBaseTemplate = async (
  content: string,
  preheader?: string,
  opciones: Omit<OpcionesCorreo, 'cuerpo' | 'preheader'> = {}
) => marcoCorreo({ ...opciones, cuerpo: content, preheader });

const e = escapeHtml;

/** El primer nombre, para saludar ("María José Pérez" → "María"). Sin escapar. */
export function primerNombre(nombre: string | null | undefined, siNo = ''): string {
  return (nombre || '').trim().split(/\s+/)[0] || siNo;
}

/** Los pasos de un pedido físico, para la barra de seguimiento. */
export const PASOS_PEDIDO = ['Recibido', 'Pagado', 'Preparando', 'En camino', '¡Es tuyo!'];

// PASSWORD RESET EMAIL
export const sendPasswordResetEmail = async (email: string, token: string, userName?: string) => {
  const resetUrl = `${process.env.NEXTAUTH_URL}/recuperar-contrasena/${token}`;
  const nombre = e(primerNombre(userName));
  const html = await marcoCorreo({
    preheader: 'Tu enlace para entrar de nuevo vence en 1 hora.',
    encabezado: {
      sello: 'TU CUENTA',
      titulo: nombre ? `${nombre}, volvamos<br>a entrar` : 'Volvamos a entrar',
      texto: 'Pediste cambiar tu contraseña. Toca el botón y crea una nueva en un minuto.',
    },
    cuerpo: `
      ${botonCorreo(resetUrl, 'Crear mi nueva contraseña')}
      ${notaCorreo(`<strong style="${CORREO.fuerte}">¿No fuiste tú?</strong> Ignora este correo: tu contraseña sigue igual y nadie entra sin este enlace.`)}
      <p style="${CORREO.nota}">El enlace vence en 1 hora y sirve una sola vez.</p>`,
    chispa: { pose: 'explica', texto: 'No te preocupes: este enlace es solo tuyo y vence pronto. Si no lo pediste, tu cuenta sigue protegida.' },
    motivo: 'Recibes este correo porque alguien pidió cambiar la contraseña de esta cuenta.',
  });
  return sendEmail({ to: email, subject: 'Crea tu nueva contraseña de Electro Shop', html });
};

// WELCOME EMAIL (C-219: sale al verificar el correo; antes existía y nadie la enviaba)
export const sendWelcomeEmail = async (email: string, userName: string) => {
  const nombre = primerNombre(userName);
  const html = await marcoCorreo({
    preheader: 'Tu cuenta está activa. Esto es lo que tienes desde hoy.',
    encabezado: {
      sello: 'CUENTA ACTIVA',
      titulo: nombre ? `¡Te damos la bienvenida, ${e(nombre)}!` : '¡Te damos la bienvenida!',
      texto: 'Tu cuenta está lista. Desde hoy compras tecnología sin miedo, con 14 años de respaldo en Guanare y envíos a toda Venezuela.',
    },
    cuerpo: `
      ${rotuloCorreo('Lo que tienes desde hoy', 0)}
      ${ventajasCorreo([
        { icono: 'envio', titulo: 'Tu pedido, paso a paso', texto: 'Te avisamos cuando se paga, cuando sale y cuando llega a tus manos.' },
        { icono: 'puntos', titulo: 'Puntos ES', texto: 'Recarga una vez y paga tus compras con un toque, sin esperar verificaciones.' },
        { icono: 'garantia', titulo: 'La garantía de la tienda', texto: 'Si algo falla, la pides desde Mi panel y te acompañamos hasta resolverlo.' },
        { icono: 'chat', titulo: 'Gente real del otro lado', texto: 'Escríbenos por WhatsApp: te atiende el equipo de Electro Shop.' },
      ])}
      ${botonCorreo(`${urlTienda()}/productos`, 'Ver la tienda')}`,
    chispa: { pose: 'saluda', texto: '¿Buscas algo y no lo ves en la tienda? Pídelo y te lo conseguimos. ¡Todo lo encuentras con nosotros!' },
  });
  return sendEmail({ to: email, subject: nombre ? `¡Te damos la bienvenida a Electro Shop, ${nombre}!` : '¡Te damos la bienvenida a Electro Shop!', html });
};

// EMAIL VERIFICATION
// C-255: `destino`, adónde vuelve al activarla (una ruta de la tienda: /sorteo, el checkout); `invitadoAlSorteo`, si se registró
// con el enlace de un amigo del sorteo: su invitación cuenta cuando active la cuenta, y el correo se lo dice.
export const sendVerificationEmail = async (email: string, token: string, userName?: string, opciones: { destino?: string | null; invitadoAlSorteo?: boolean } = {}) => {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verificar-email/${token}${opciones.destino ? `?destino=${encodeURIComponent(opciones.destino)}` : ''}`;
  const nombre = e(primerNombre(userName));
  const html = await marcoCorreo({
    preheader: 'Un toque y tu cuenta queda lista para comprar sin miedo.',
    encabezado: {
      sello: 'UN PASO MÁS',
      titulo: nombre ? `¡Ya casi, ${nombre}!<br>Activa tu cuenta` : '¡Ya casi!<br>Activa tu cuenta',
      texto: 'Confirma que este correo es tuyo y tu cuenta queda lista: tus pedidos con seguimiento, tus favoritos y tus Puntos ES.',
    },
    cuerpo: `
      ${botonCorreo(verifyUrl, 'Activar mi cuenta')}
      ${opciones.invitadoAlSorteo ? notaCorreo(`<strong style="${CORREO.fuerte}">Te invitó un amigo al sorteo.</strong> Al activar tu cuenta sumas para su boleto, y tú también puedes ganar los tuyos.`) : ''}
      <p style="${CORREO.nota}">El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo: no pasa nada.</p>`,
    chispa: { pose: 'saluda', texto: '¡Qué bueno que llegaste! Apenas actives tu cuenta tienes todo el catálogo: tecnología, gaming, gift cards y ferretería, con envíos a toda Venezuela.' },
    motivo: 'Recibes este correo porque alguien creó una cuenta con esta dirección.',
  });
  return sendEmail({ to: email, subject: 'Activa tu cuenta de Electro Shop', html });
};

// TEST EMAIL
export const sendTestEmail = async (email: string) => {
  const html = await marcoCorreo({
    preheader: 'La configuración de correo está funcionando.',
    encabezado: { sello: 'CORREO DE PRUEBA', titulo: '¡El correo funciona!', texto: 'Si lees esto, la tienda ya puede escribirles a tus clientes.' },
    cuerpo: datosCorreo([
      ['Proveedor', e(process.env.RESEND_API_KEY ? 'Resend API' : process.env.EMAIL_PROVIDER || 'SMTP')],
      ['Hora', e(new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' }))],
    ]),
    chispa: { pose: 'pulgar', texto: 'Todo en orden por aquí. Ábrelo también en el teléfono para ver cómo les llega a los clientes.' },
    pie: 'equipo',
    motivo: 'Lo pidió alguien del equipo desde Ajustes → Correo.',
  });
  return sendEmail({ to: email, subject: 'Correo de prueba de Electro Shop', html });
};

// ORDER SHIPPED EMAIL (C-219: el delivery en Guanare tiene su propio texto)
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
    /** C-219: el delivery en Guanare (sin guía ni empresa de envíos) */
    local?: boolean;
  }
) => {
  const nombre = e(primerNombre(orderData.customerName));
  const empresa = orderData.shippingCarrier ? e(orderData.shippingCarrier) : '';
  const destino = orderData.destination ? e(orderData.destination) : '';
  const dato = `Orden ${e(orderData.orderNumber)}`;
  const seguir = botonCorreo(`${urlTienda()}/customer/orders`, 'Seguir mi pedido');

  const html = orderData.local
    ? await marcoCorreo({
      preheader: 'Nuestro delivery ya salió con tu pedido.',
      encabezado: {
        sello: 'SALE A TU PUERTA',
        titulo: `¡Va directo a tu puerta${nombre ? `, ${nombre}` : ''}!`,
        texto: `Nuestro delivery ya salió con tu pedido${destino ? ` hacia ${destino}` : ''}. Ten tu teléfono a mano por si te llamamos al llegar.`,
        dato,
      },
      cuerpo: `${seguimientoCorreo(PASOS_PEDIDO, 3)}${seguir}`,
      chispa: { pose: 'pulgar', texto: '¡Ya casi! En un rato lo tienes en tus manos.' },
    })
    : await marcoCorreo({
      preheader: `Tu pedido salió${empresa ? ` por ${orderData.shippingCarrier}` : ''}. Aquí está tu guía.`,
      encabezado: {
        sello: 'EN CAMINO',
        titulo: `¡Tu caja ya va rumbo a ti${nombre ? `, ${nombre}` : ''}!`,
        texto: `Salió${empresa ? ` por ${empresa}` : ''}${destino ? ` hacia ${destino}` : ''}. Con la guía la sigues en todo momento.`,
        dato,
      },
      cuerpo: `
        ${seguimientoCorreo(PASOS_PEDIDO, 3)}
        ${orderData.trackingNumber ? placaCorreo(`
          <p style="${CORREO.placaRotulo}">Tu guía${empresa ? ` de ${empresa}` : ''}</p>
          ${placaInteriorCorreo('Número de guía', e(orderData.trackingNumber), '', 22)}`) : ''}
        ${orderData.payOnDelivery ? avisoCorreo('Al retirar: tu cédula y el flete', `Tu caja viaja con cobro a destino: el flete se lo pagas a ${empresa || 'la empresa de envíos'} en la oficina y, con tu cédula en mano, es tuya.`, 'envio') : ''}
        ${seguir}`,
      chispa: { pose: 'pulgar', texto: '¡Ya salió! Guarda tu guía: con ella sigues tu caja hasta que llegue.' },
    });

  return sendEmail({
    to: email,
    subject: orderData.local ? `¡Tu pedido ${orderData.orderNumber} va camino a tu puerta!` : `¡Tu pedido ${orderData.orderNumber} va en camino!`,
    html,
  });
};

// C-100: novedad del rastreo (el paquete llegó a la oficina)
export const sendShipmentUpdateEmail = async (
  email: string,
  data: { orderNumber: string; customerName: string; title: string; detail: string }
) => {
  const nombre = e(primerNombre(data.customerName));
  const html = await marcoCorreo({
    preheader: data.title,
    encabezado: {
      sello: 'LISTO PARA RETIRAR',
      titulo: `¡Llegó${nombre ? `, ${nombre}` : ''}!<br>Ya puedes buscarlo`,
      texto: e(data.detail),
      dato: `Orden ${e(data.orderNumber)}`,
    },
    cuerpo: `
      ${seguimientoCorreo(PASOS_PEDIDO, 3)}
      ${avisoCorreo('Lleva tu cédula', 'En la oficina te la piden para entregarte el paquete. Si tu envío es con cobro a destino, ahí mismo pagas el flete.', 'ubicacion')}
      ${botonCorreo(`${urlTienda()}/customer/orders`, 'Ver mi pedido')}`,
    chispa: { pose: 'pulgar', texto: '¡Ya casi es tuyo! Búscalo cuando puedas, con tu cédula en mano.' },
  });
  return sendEmail({ to: email, subject: `¡Tu pedido ${data.orderNumber} llegó a la oficina!`, html });
};

// ORDER DELIVERED EMAIL
export const sendOrderDeliveredEmail = async (
  email: string,
  orderData: { orderNumber: string; customerName: string; }
) => {
  const app = urlTienda();
  const nombre = e(primerNombre(orderData.customerName));
  const html = await marcoCorreo({
    preheader: 'Tu pedido llegó a tus manos. ¡Que lo disfrutes!',
    encabezado: {
      sello: 'ENTREGADO',
      titulo: `¡Misión cumplida${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Tu pedido llegó a tus manos. Que lo disfrutes al máximo.',
      dato: `Orden ${e(orderData.orderNumber)}`,
    },
    cuerpo: `
      ${seguimientoCorreo(PASOS_PEDIDO, PASOS_PEDIDO.length)}
      ${notaCorreo(`<strong style="${CORREO.fuerte}">¿Algo no anda bien?</strong> Lo que compraste tiene la garantía de la tienda: pídela desde <a href="${app}/customer/warranty" style="${CORREO.enlace}">Mi panel → Garantía</a> y te acompañamos hasta resolverlo.`)}
      ${botonCorreo(`${app}/customer/orders`, 'Ver mi pedido')}`,
    chispa: { pose: 'celebra', texto: '¡Disfrútalo! En unos días te pido tu opinión: ayuda muchísimo a otros clientes.' },
  });
  return sendEmail({ to: email, subject: `¡Tu pedido ${orderData.orderNumber} ya es tuyo!`, html });
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
  // Todo escapado (C-60b): el nombre del producto lleva la cuenta que escribió el cliente y el código lo pega el equipo
  const nombre = e(primerNombre(codeData.customerName));
  const producto = e(codeData.productName);
  const plataforma = codeData.platform ? e(codeData.platform) : '';
  const instrucciones = codeData.redemptionInstructions ? e(codeData.redemptionInstructions).replace(/\n/g, '<br>') : '';
  const html = await marcoCorreo({
    preheader: `Tu código de ${codeData.productName} ya está aquí.`,
    encabezado: {
      sello: 'CÓDIGO DIGITAL',
      titulo: `¡Aquí está${nombre ? `, ${nombre}` : ''}!<br>Tu código ya llegó`,
      texto: `Cópialo y canjéalo${plataforma ? ` en ${plataforma}` : ''}. También queda guardado en Mi pedido.`,
      dato: `Orden ${e(codeData.orderNumber)}`,
    },
    cuerpo: `
      ${placaCorreo(`
        <p style="${CORREO.placaRotulo}">Tu código digital</p>
        <p style="${CORREO.placaTitulo}">${producto}</p>
        ${placaInteriorCorreo('Código', e(codeData.code))}`, '0 0 6px')}
      ${instrucciones ? `${rotuloCorreo('Cómo canjearlo')}${notaCorreo(instrucciones)}` : ''}
      ${avisoCorreo('Este código es solo para ti', 'No lo compartas con nadie: quien lo tenga puede canjearlo.', 'candado')}
      ${botonCorreo(`${urlTienda()}/customer/orders`, 'Ver mis códigos')}`,
    chispa: { pose: 'celebra', texto: '¡A disfrutarlo! Si el código te da algún problema al canjearlo, escríbenos por WhatsApp de una vez.' },
  });
  return sendEmail({ to: email, subject: `¡Tu código de ${codeData.productName} llegó!`, html });
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
  // El remitente, el destinatario y el mensaje los escribe quien regala
  const de = e(giftCardData.senderName);
  const para = e(primerNombre(giftCardData.recipientName));
  const monto = formatUSD(giftCardData.amount);
  const html = await marcoCorreo({
    preheader: `${giftCardData.senderName} te regaló una gift card de ${monto}.`,
    encabezado: {
      sello: 'UN REGALO PARA TI',
      titulo: `¡${de} te regaló ${monto}!`,
      texto: `${para ? `${para}, es` : 'Es'} una gift card de Electro Shop para lo que tú quieras: tecnología, gaming, recargas y más.`,
    },
    cuerpo: `
      ${giftCardData.personalMessage ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;"><tr><td style="border-left:4px solid ${COLOR.marca};padding:6px 0 6px 16px;">
        <p style="${CORREO.rotulo}margin:0 0 4px;">${de} te escribió</p>
        <p style="margin:0;color:${COLOR.tinta};font-size:18px;line-height:1.5;font-style:italic;">"${e(giftCardData.personalMessage)}"</p>
      </td></tr></table>` : ''}
      ${placaCorreo(`
        <p style="${CORREO.placaRotulo}">Electro Shop · Gift card</p>
        <p style="margin:12px 0 0;color:#ffffff;font-family:${FUENTE};font-size:46px;line-height:1.1;font-weight:800;">${monto}</p>
        ${placaInteriorCorreo('Código de canje', e(giftCardData.code), giftCardData.pin ? `<p style="${CORREO.textoMenor}margin:10px 0 0;">PIN: <strong style="${CORREO.fuerte}letter-spacing:2px;">${e(giftCardData.pin)}</strong></p>` : '')}`)}
      ${rotuloCorreo('Cómo canjearla', 4)}
      <ol style="margin:0 0 8px;padding:0 0 0 20px;font-size:15px;line-height:1.8;color:${COLOR.texto};">
        <li>Entra a Electro Shop y crea tu cuenta o inicia sesión.</li>
        <li>Ve a <strong style="${CORREO.fuerte}">Canjear gift card</strong>.</li>
        <li>Escribe el código${giftCardData.pin ? ' y el PIN' : ''}.</li>
        <li>El monto te queda al instante en tus Puntos ES.</li>
      </ol>
      ${botonCorreo(`${urlTienda()}/canjear-gift-card`, 'Canjear mi gift card')}
      <p style="${CORREO.nota}">Guarda este correo: el código es único y no vence.</p>`,
    chispa: { pose: 'celebra', texto: '¡Qué buen regalo! Canjéala cuando quieras y elige lo que más te guste.' },
    motivo: `Recibes este correo porque ${de} te envió una gift card de ${e(new URL(urlTienda()).host)}.`,
  });
  return sendEmail({ to: email, subject: `¡${giftCardData.senderName} te regaló una gift card de ${monto}!`, html });
};

// C-122: el equipo respondió o cambió el estado de una solicitud de garantía
export const sendWarrantyUpdateEmail = async (
  email: string,
  data: { customerName: string; code: string; productName: string; status: string; statusHelp: string; message?: string | null },
) => {
  const nombre = e(primerNombre(data.customerName));
  const html = await marcoCorreo({
    preheader: `Novedades de tu solicitud de garantía ${data.code}`,
    encabezado: {
      sello: 'TU GARANTÍA',
      titulo: `Novedades de tu garantía ${e(data.code)}`,
      texto: `${nombre ? `${nombre}, tenemos` : 'Tenemos'} noticias sobre <strong style="${CORREO.fuerte}">${e(data.productName)}</strong>.`,
    },
    cuerpo: `
      ${datosCorreo([['Estado', e(data.status)], ['Qué significa', e(data.statusHelp)]])}
      ${data.message ? `${rotuloCorreo('El equipo te escribió')}<div style="${CORREO.cita}">${e(data.message)}</div>` : ''}
      ${botonCorreo(`${urlTienda()}/customer/warranty`, 'Ver mi solicitud')}`,
    chispa: { pose: 'explica', texto: 'Estamos contigo hasta que quede resuelto. Si quieres agregar algo, respóndenos desde tu solicitud.' },
  });
  return sendEmail({ to: email, subject: `Garantía ${data.code}: ${data.status}`, html });
};
