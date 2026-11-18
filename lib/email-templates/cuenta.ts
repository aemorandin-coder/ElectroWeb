/**
 * C-219: correos de la cuenta y la seguridad. El inicio de sesión y la invitación al panel estaban escritos en
 * lib/sesiones y lib/equipo; la contraseña cambiada y el pedido de eliminar la cuenta no tenían correo.
 */
import { escapeHtml } from '@/lib/html';
import { CORREO, avisoCorreo, botonCorreo, datosCorreo, enlaceWhatsAppCorreo, notaCorreo, urlTienda } from './estilo';
import { ajustesCorreo, marcoCorreo } from './marco';
import type { Correo } from './pedidos';

const e = escapeHtml;
const nombreDe = (nombre: string | null | undefined) => e((nombre || '').trim().split(/\s+/)[0] || '');

/** Entraron a la cuenta desde un dispositivo nuevo (C-140). */
export async function correoSesionNueva(d: { nombre: string | null; dispositivo: string; cuando: string; conGoogle: boolean }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Entraron a tu cuenta desde ${d.dispositivo}.`,
    encabezado: {
      sello: 'SEGURIDAD',
      titulo: `¿Fuiste tú${nombre ? `, ${nombre}` : ''}?`,
      texto: 'Alguien entró a tu cuenta desde un dispositivo que no habías usado.',
    },
    cuerpo: `
      ${datosCorreo([['Dispositivo', e(d.dispositivo)], ['Cuándo', e(d.cuando)], ['Cómo', d.conGoogle ? 'Con Google' : 'Con tu contraseña']])}
      ${avisoCorreo('¿No fuiste tú?', 'Cambia tu contraseña y cierra esa sesión desde Mi perfil → Seguridad.', 'candado')}
      ${botonCorreo(`${urlTienda()}/customer/profile?tab=seguridad`, 'Revisar mis sesiones')}`,
    chispa: { pose: 'explica', texto: 'Te aviso cada vez que entras desde un equipo nuevo. Si fuiste tú, no tienes que hacer nada.' },
    motivo: 'Recibes este correo para proteger tu cuenta.',
  });
  return { asunto: `Nuevo inicio de sesión: ${d.dispositivo}`, html };
}

/**
 * C-291: un navegador quedó como dispositivo de confianza del panel (30 días sin pedir el código). Si no fue quien
 * recibe el correo, "No fui yo" (la ruta de C-140, que vale 24 horas) cierra todo y lo anula.
 */
export async function correoDispositivoConfianza(d: { nombre: string | null; dispositivo: string; cuando: string; vence: string; rutaNoFuiYo: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `${d.dispositivo} no te pedirá el código del panel por 30 días.`,
    encabezado: {
      sello: 'SEGURIDAD',
      titulo: `Marcaste un dispositivo de confianza${nombre ? `, ${nombre}` : ''}`,
      texto: 'En ese navegador, el panel no te pedirá el número de tu app por 30 días. La contraseña, sí.',
    },
    cuerpo: `
      ${datosCorreo([['Dispositivo', e(d.dispositivo)], ['Cuándo', e(d.cuando)], ['Hasta', e(d.vence)]])}
      ${avisoCorreo('¿No fuiste tú?', 'Toca «No fui yo»: se cierran tus sesiones, se anula este dispositivo y te mandamos el enlace para una contraseña nueva. Sirve 24 horas.', 'candado')}
      ${botonCorreo(`${urlTienda()}${d.rutaNoFuiYo}`, 'No fui yo')}
      <p style="${CORREO.nota}">Si fuiste tú, no tienes que hacer nada. Lo puedes quitar cuando quieras en el panel → Mi seguridad.</p>`,
    chispa: { pose: 'explica', texto: 'Te aviso cada vez que un dispositivo deja de pedir el código. Si fuiste tú, todo bien.' },
    pie: 'equipo',
    motivo: 'Recibes este correo para proteger tu cuenta del panel.',
  });
  return { asunto: `Dispositivo de confianza: ${d.dispositivo}`, html };
}

/** La contraseña cambió (con el enlace de "Olvidé mi contraseña" o desde Mi perfil). */
export async function correoContrasenaCambiada(d: { nombre: string | null; sesionesCerradas: boolean }): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const cuando = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbenos por WhatsApp de una vez', 'Hola, cambiaron la contraseña de mi cuenta y no fui yo');
  const html = await marcoCorreo({
    preheader: 'Tu contraseña de Electro Shop cambió.',
    encabezado: {
      sello: 'SEGURIDAD',
      titulo: `Tu contraseña cambió${nombre ? `, ${nombre}` : ''}`,
      texto: `Listo: desde el ${e(cuando)} entras con tu contraseña nueva.${d.sesionesCerradas ? ' Por seguridad, cerramos las demás sesiones abiertas.' : ''}`,
    },
    cuerpo: `
      ${avisoCorreo('¿No fuiste tú?', 'Pide una contraseña nueva con "Olvidé mi contraseña" y revisa tus sesiones en Mi perfil → Seguridad.', 'candado')}
      ${botonCorreo(`${urlTienda()}/customer/profile?tab=seguridad`, 'Revisar mi cuenta')}`,
    chispa: { pose: 'explica', texto: `Si no reconoces este cambio, ${whatsapp || 'escríbenos'}: lo revisamos contigo.` },
    motivo: 'Recibes este correo para proteger tu cuenta.',
  });
  return { asunto: 'Tu contraseña de Electro Shop cambió', html };
}

/** El cliente pidió eliminar su cuenta desde Mi perfil: el equipo le escribe para confirmarlo. */
export async function correoEliminarCuenta(d: { nombre: string | null }): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbenos por WhatsApp', 'Hola, pedí eliminar mi cuenta y quiero dejarla activa');
  const html = await marcoCorreo({
    preheader: 'Recibimos tu pedido. Te escribimos para confirmarlo.',
    encabezado: {
      sello: 'TU CUENTA',
      titulo: `Recibimos tu pedido${nombre ? `, ${nombre}` : ''}`,
      texto: 'Pediste eliminar tu cuenta. Antes de hacerlo, alguien del equipo te escribe a este correo para confirmarlo contigo.',
    },
    cuerpo: notaCorreo(`<strong style="${CORREO.fuerte}">Si tienes pedidos,</strong> la cuenta se desactiva en lugar de borrarse, y desde ese momento nadie puede entrar con ella.`),
    chispa: { pose: 'explica', texto: `¿Te arrepentiste o no fuiste tú? ${whatsapp ? `Solo ${whatsapp}` : 'Escríbenos'} y la dejamos como estaba.` },
    motivo: 'Recibes este correo porque se pidió eliminar esta cuenta.',
  });
  return { asunto: 'Recibimos tu pedido de eliminar la cuenta', html };
}

// C-290: la invitación dice antes lo que va a hacer falta (skill herramientas-claras, regla 2): la app y dónde se baja
const APP_ANDROID = 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2';
const APP_IPHONE = 'https://apps.apple.com/app/google-authenticator/id388497605';

/** Invitación al panel (lib/equipo). `rol` llega legible ("Ventas"). */
export async function correoInvitacionEquipo(d: { nombre: string; rol: string; invitadoPor: string; enlace: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: 'Crea tu contraseña para entrar al panel.',
    encabezado: {
      sello: 'INVITACIÓN AL PANEL',
      titulo: `¡Ya eres del equipo${nombre ? `, ${nombre}` : ''}!`,
      texto: `${e(d.invitadoPor)} te dio acceso al panel de Electro Shop como <strong style="${CORREO.fuerte}">${e(d.rol)}</strong>.`,
    },
    cuerpo: `
      ${avisoCorreo('Ten tu teléfono a mano', `Para entrar vas a usar tu contraseña y un número que te da una app gratis del teléfono. Te recomendamos Google Authenticator (<a href="${APP_ANDROID}" style="${CORREO.enlace}">Android</a> · <a href="${APP_IPHONE}" style="${CORREO.enlace}">iPhone</a>); también sirven Microsoft Authenticator o Authy. Primero creas tu contraseña y después el panel te guía paso a paso.`, 'clave')}
      ${botonCorreo(e(d.enlace), 'Crear mi contraseña')}
      <p style="${CORREO.nota}">El enlace sirve 24 horas y una sola vez. Si no esperabas esta invitación, ignora este correo: sin la contraseña nadie puede entrar.</p>`,
    chispa: { pose: 'saluda', texto: '¡Qué bueno tenerte! Desde el panel se mueve toda la tienda: pedidos, productos y clientes.' },
    pie: 'equipo',
    motivo: 'Recibes este correo porque te invitaron al panel de la tienda.',
  });
  return { asunto: 'Te invitaron al panel de Electro Shop', html };
}
