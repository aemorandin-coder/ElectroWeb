/**
 * C-219: los correos del servicio al cliente que faltaban: la garantía recibida, el mensaje de contacto (el aviso de que
 * llegó y la respuesta del equipo con el diseño de la tienda), el presupuesto pedido y aprobado, y la solicitud de un
 * producto que no está en la tienda. Antes solo le avisaban al equipo.
 */
import { formatUSD } from '@/lib/currency';
import { escapeHtml } from '@/lib/html';
import { CORREO, avisoCorreo, botonCorreo, datosCorreo, enlaceWhatsAppCorreo, notaCorreo, productosCorreo, urlTienda } from './estilo';
import { ajustesCorreo, fotoCorreo, marcoCorreo } from './marco';
import type { Correo } from './pedidos';

const e = escapeHtml;
const nombreDe = (nombre: string | null | undefined) => e((nombre || '').trim().split(/\s+/)[0] || '');

/** El cliente pidió garantía desde Mi panel (app/api/customer/warranty). */
export async function correoGarantiaRecibida(d: { nombre: string | null; codigo: string; producto: string; numeroOrden: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Tu solicitud ${d.codigo} ya está con el equipo.`,
    encabezado: {
      sello: 'GARANTÍA RECIBIDA',
      titulo: `Ya estamos en eso${nombre ? `, ${nombre}` : ''}`,
      texto: `Recibimos tu solicitud de garantía de <strong style="${CORREO.fuerte}">${e(d.producto)}</strong>. El equipo la revisa y te escribe por aquí.`,
      dato: `Solicitud ${e(d.codigo)} · Orden ${e(d.numeroOrden)}`,
    },
    cuerpo: `
      ${notaCorreo(`<strong style="${CORREO.fuerte}">Qué sigue:</strong> revisamos lo que nos contaste y las fotos. Si hace falta algo más, te lo pedimos en tu solicitud. Cada novedad te llega a este correo.`)}
      ${botonCorreo(`${urlTienda()}/customer/warranty`, 'Ver mi solicitud')}`,
    chispa: { pose: 'explica', texto: 'Estamos contigo hasta resolverlo. Mientras tanto, guarda el producto con su caja y sus accesorios.' },
  });
  return { asunto: `Recibimos tu solicitud de garantía ${d.codigo}`, html };
}

/** Llegó un mensaje del formulario de Contacto (app/api/contact): el aviso de que lo recibimos. */
export async function correoContactoRecibido(d: { nombre: string; asunto: string }): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbenos por WhatsApp');
  const html = await marcoCorreo({
    preheader: 'Tu mensaje llegó. Te respondemos por este correo.',
    encabezado: {
      sello: 'MENSAJE RECIBIDO',
      titulo: `¡Te leímos${nombre ? `, ${nombre}` : ''}!`,
      texto: `Tu mensaje sobre <strong style="${CORREO.fuerte}">${e(d.asunto)}</strong> ya está con el equipo. Te respondemos a este correo en horario de atención.`,
    },
    cuerpo: botonCorreo(urlTienda(), 'Seguir viendo la tienda'),
    chispa: { pose: 'pulgar', texto: `¿Es urgente? ${whatsapp ? `Mejor ${whatsapp}` : 'Escríbenos por WhatsApp'}: ahí te contestamos más rápido.` },
    motivo: 'Recibes este correo porque nos escribiste desde la página de Contacto.',
  });
  return { asunto: `Recibimos tu mensaje: ${d.asunto}`.slice(0, 150), html };
}

/** El equipo responde un mensaje de contacto con el diseño de la tienda (antes se abría el correo personal). */
export async function correoRespuestaContacto(d: { nombre: string; asunto: string; respuesta: string; firma: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: d.respuesta.slice(0, 120),
    encabezado: {
      sello: 'RESPUESTA DE ELECTRO SHOP',
      titulo: nombre ? `${nombre}, te respondemos` : 'Te respondemos',
      texto: `Sobre tu mensaje: <strong style="${CORREO.fuerte}">${e(d.asunto)}</strong>`,
    },
    cuerpo: `
      <div style="${CORREO.cita}font-size:16px;">${e(d.respuesta)}</div>
      <p style="${CORREO.textoMenor}margin-top:10px;">${e(d.firma)} · Equipo de Electro Shop</p>
      <p style="${CORREO.nota}">Puedes responder este correo directamente: le llega al equipo.</p>`,
    chispa: { pose: 'saluda', texto: 'Si te queda alguna duda, responde aquí mismo y seguimos la conversación.' },
    motivo: 'Recibes este correo porque nos escribiste desde la página de Contacto.',
  });
  return { asunto: `Re: ${d.asunto}`.slice(0, 150), html };
}

/** Un cliente o una empresa pidió un presupuesto desde la tienda (app/api/cotizaciones). */
export async function correoPresupuestoPedido(d: { nombre: string; numero: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Tu solicitud ${d.numero} ya está con el equipo de ventas.`,
    encabezado: {
      sello: 'PRESUPUESTO PEDIDO',
      titulo: `¡Manos a la obra${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Recibimos tu solicitud de presupuesto. El equipo de ventas lo arma con los precios del día y te lo envía a este correo.',
      dato: `Solicitud N.º ${e(d.numero)}`,
    },
    cuerpo: notaCorreo(`<strong style="${CORREO.fuerte}">Qué sigue:</strong> te llega un enlace para ver el presupuesto, imprimirlo o guardarlo en PDF, y aprobarlo ahí mismo con tu nombre y tu cédula o RIF.`),
    chispa: { pose: 'pulgar', texto: 'Si necesitas factura a nombre de una empresa, ten a mano el RIF: te lo vamos a pedir.' },
    motivo: 'Recibes este correo porque pediste un presupuesto en la tienda.',
  });
  return { asunto: `Recibimos tu solicitud de presupuesto ${d.numero}`, html };
}

/** El cliente aprobó el presupuesto desde su enlace (app/api/cotizaciones/[token]). */
export async function correoPresupuestoAprobado(d: { nombre: string; numero: string; total: number; enlace: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Aprobaste el presupuesto ${d.numero}. Esto es lo que sigue.`,
    encabezado: {
      sello: 'PRESUPUESTO APROBADO',
      titulo: `¡Trato hecho${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Aprobaste el presupuesto. El equipo de ventas ya lo tiene y te escribe para coordinar el pago y la entrega.',
      dato: `Presupuesto N.º ${e(d.numero)}`,
    },
    cuerpo: `
      ${datosCorreo([['Monto total (IVA incluido)', e(formatUSD(d.total))]])}
      ${botonCorreo(e(d.enlace), 'Ver el presupuesto')}
      <p style="${CORREO.nota}">Este presupuesto no es una factura.</p>`,
    chispa: { pose: 'celebra', texto: '¡Gracias por la confianza! Guarda este correo: el enlace siempre muestra el presupuesto aprobado.' },
    motivo: 'Recibes este correo porque aprobaste un presupuesto de la tienda.',
  });
  return { asunto: `Aprobaste el presupuesto ${d.numero}`, html };
}

/** Pidió un producto que no está en la tienda (app/api/product-requests). */
export async function correoSolicitudRecibida(d: { nombre: string; producto: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Ya lo estamos buscando: ${d.producto}`,
    encabezado: {
      sello: 'LO ESTAMOS BUSCANDO',
      titulo: `¡A la caza${nombre ? `, ${nombre}` : ''}!`,
      texto: `Recibimos tu pedido de <strong style="${CORREO.fuerte}">${e(d.producto)}</strong>. Lo buscamos con nuestros proveedores y te avisamos por aquí.`,
    },
    cuerpo: botonCorreo(`${urlTienda()}/productos`, 'Ver lo que ya tenemos'),
    chispa: { pose: 'senala', texto: '¡Todo lo encuentras con nosotros! Si lo conseguimos, te avisamos antes que a nadie.' },
    motivo: 'Recibes este correo porque pediste un producto en la tienda.',
  });
  return { asunto: `Estamos buscando: ${d.producto}`.slice(0, 150), html };
}

/** La solicitud se cumplió: el producto ya está en la tienda. `producto` es el que se publicó, si se sabe. */
export async function correoSolicitudLista(d: {
  nombre: string;
  pedido: string;
  producto?: { nombre: string; slug: string; imagen: string | null; precioUSD: number } | null;
}): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const app = urlTienda();
  const enlace = d.producto ? `${app}/productos/${d.producto.slug}` : `${app}/productos`;
  const html = await marcoCorreo({
    preheader: `Lo que pediste ya está en la tienda: ${d.pedido}`,
    encabezado: {
      sello: '¡YA LLEGÓ!',
      titulo: `¡Lo conseguimos${nombre ? `, ${nombre}` : ''}!`,
      texto: `Lo que nos pediste, <strong style="${CORREO.fuerte}">${e(d.pedido)}</strong>, ya está en la tienda.`,
    },
    cuerpo: `
      ${d.producto ? productosCorreo([{ nombre: e(d.producto.nombre), monto: formatUSD(d.producto.precioUSD), foto: fotoCorreo(d.producto.imagen), enlace }]) : ''}
      ${avisoCorreo('Las existencias vuelan', 'Lo apartas solo al pagarlo. Si lo quieres, mejor no esperar.', 'paquete')}
      ${botonCorreo(enlace, d.producto ? 'Verlo en la tienda' : 'Ir a la tienda')}`,
    chispa: { pose: 'celebra', texto: 'Te dije que lo íbamos a encontrar. ¡Todo lo encuentras con nosotros!' },
    motivo: 'Recibes este correo porque pediste este producto en la tienda.',
  });
  return { asunto: `¡Ya llegó lo que pediste: ${d.pedido}!`.slice(0, 150), html };
}
