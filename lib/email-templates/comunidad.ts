/**
 * C-219: los correos de la comunidad de la tienda: empresas, promotores, el sorteo, los descuentos pedidos, los creadores
 * de cursos y la gift card vista por quien la regaló. Antes la mayoría quedaba en la campanita, o se escribía a mano
 * (el ganador del sorteo).
 */
import { formatPuntos, formatUSD } from '@/lib/currency';
import { escapeHtml } from '@/lib/html';
import {
  CORREO, FUENTE_TITULO, avisoCorreo, boletoCorreo, boletoEpicoCorreo, botonCorreo, datosCorreo, enlaceWhatsAppCorreo, exitoCorreo, imagenCorreo,
  notaCorreo, placaCorreo, placaInteriorCorreo, productosCorreo, urlTienda, ventajasCorreo,
} from './estilo';
import { ajustesCorreo, fotoCorreo, marcoCorreo } from './marco';
import type { Correo } from './pedidos';

const e = escapeHtml;
const nombreDe = (nombre: string | null | undefined) => e((nombre || '').trim().split(/\s+/)[0] || '');
const fechaLarga = (fecha: Date) => fecha.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long' });

/* ── Empresas ───────────────────────────────────────────────────────────── */

/** El equipo revisó el acta y el RIF (app/api/admin/verifications). `motivo` lo escribe el equipo. */
export async function correoEmpresaVerificada(d: { nombre: string | null; empresa: string; aprobada: boolean; motivo?: string | null }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const empresa = e(d.empresa || 'tu empresa');
  const html = d.aprobada
    ? await marcoCorreo({
      preheader: `${d.empresa} ya compra como empresa en Electro Shop.`,
      encabezado: {
        sello: 'EMPRESA VERIFICADA',
        titulo: `¡${empresa} ya está verificada!`,
        texto: `${nombre ? `${nombre}, desde` : 'Desde'} hoy compras como empresa: con los datos fiscales en cada compra y presupuestos con su RIF.`,
      },
      cuerpo: botonCorreo(`${urlTienda()}/customer/profile?tab=empresa`, 'Ver mi cuenta de empresa'),
      chispa: { pose: 'celebra', texto: '¿Compras para la oficina o un proyecto? Pide un presupuesto y te lo armamos con los precios del día.' },
    })
    : await marcoCorreo({
      preheader: 'Revisa los datos de tu empresa y envíalos de nuevo.',
      encabezado: {
        sello: 'VERIFICACIÓN DE EMPRESA',
        titulo: 'Nos faltó algo para verificarla',
        texto: `Revisamos los documentos de ${empresa} y no pudimos verificarla todavía.`,
      },
      cuerpo: `
        ${d.motivo ? datosCorreo([['Motivo', e(d.motivo)]]) : ''}
        ${avisoCorreo('Envíalos de nuevo', 'Corrige lo que falta y sube el acta y el RIF otra vez desde tu cuenta de empresa.', 'documento')}
        ${botonCorreo(`${urlTienda()}/customer/profile?tab=empresa`, 'Corregir los datos')}`,
      chispa: { pose: 'explica', texto: 'Cuando los recibimos, los revisamos de nuevo y te avisamos por aquí.' },
    });
  return { asunto: d.aprobada ? `¡${d.empresa} ya está verificada en Electro Shop!` : 'Nos faltó algo para verificar tu empresa', html };
}

/* ── Promotores ─────────────────────────────────────────────────────────── */

/** La solicitud para ser promotor se aprobó (app/api/influencers/solicitudes/[id]). */
export async function correoPromotorAprobado(d: { nombre: string | null; codigo: string; descuento: number; comision: number; diasParaAcreditar: number }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Tu código es ${d.codigo}. Compártelo y gana Puntos ES.`,
    encabezado: {
      sello: 'YA ERES PROMOTOR',
      titulo: `¡Ya eres del equipo de promotores${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Aprobamos tu solicitud. Desde hoy, cada compra con tu código suma para ti.',
    },
    cuerpo: `
      ${placaCorreo(`
        <p style="${CORREO.placaRotulo}">Tu código de promotor</p>
        ${placaInteriorCorreo('Código', e(d.codigo), '', 24)}`, '0 0 6px')}
      ${ventajasCorreo([
        { icono: 'regalo', titulo: `${d.descuento} % para tus seguidores`, texto: 'Quien escriba tu código en el carrito recibe el descuento.' },
        { icono: 'puntos', titulo: `${d.comision} % para ti, en Puntos ES`, texto: `Del valor de los productos (sin IVA ni envío). Se acreditan ${d.diasParaAcreditar} días después de que el cliente recibe su pedido.` },
      ])}
      ${botonCorreo(`${urlTienda()}/customer/referrals`, 'Ver mi panel de promotor')}`,
    chispa: { pose: 'celebra', texto: 'Comparte tu código en tus historias y en tu bio: es donde más compras salen.' },
  });
  return { asunto: `¡Ya eres promotor! Tu código es ${d.codigo}`, html };
}

/** La solicitud para ser promotor no se aprobó. `nota` la escribe el equipo. */
export async function correoPromotorNoAprobado(d: { nombre: string | null; nota?: string | null }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: 'Revisamos tu solicitud para ser promotor.',
    encabezado: {
      sello: 'PROGRAMA DE PROMOTORES',
      titulo: `Por ahora no${nombre ? `, ${nombre}` : ''}`,
      texto: 'Revisamos tu solicitud para ser promotor y esta vez no la aprobamos.',
    },
    cuerpo: `${d.nota ? notaCorreo(`<strong style="${CORREO.fuerte}">Mensaje del equipo:</strong> ${e(d.nota)}`) : ''}${botonCorreo(`${urlTienda()}/customer/referrals`, 'Ver el programa')}`,
    chispa: { pose: 'explica', texto: 'No es para siempre: cuando tu comunidad crezca, vuelve a intentarlo.' },
  });
  return { asunto: 'Revisamos tu solicitud para ser promotor', html };
}

/** Alguien compró con su código: nace la comisión pendiente (lib/influencer-commission, al pagarse la orden). */
export async function correoVentaPromotor(d: { nombre: string | null; comision: number; diasParaAcreditar: number }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Una compra con tu código: ${formatPuntos(d.comision)} en camino.`,
    encabezado: {
      sello: 'VENTA CON TU CÓDIGO',
      titulo: `¡Alguien compró con tu código${nombre ? `, ${nombre}` : ''}!`,
      texto: `Ganaste ${e(formatPuntos(d.comision))}. Se acreditan ${d.diasParaAcreditar} días después de que el cliente recibe su pedido.`,
    },
    cuerpo: botonCorreo(`${urlTienda()}/customer/referrals`, 'Ver mis comisiones'),
    chispa: { pose: 'celebra', texto: '¡Así se hace! Cada compra con tu código suma para tu próxima compra en la tienda.' },
  });
  return { asunto: `¡Venta con tu código! Ganaste ${formatPuntos(d.comision)}`, html };
}

/* ── El sorteo (C-212) ──────────────────────────────────────────────────── */

export interface DatosSorteo {
  titulo: string;
  premio: string;
  imagen: string | null;
  resultadoEl: Date;
  /** C-263: la compra mínima (USD) y el tope de invitar, para lo que dice Chispa; y el logo del premio para el boleto */
  minimoUSD: number;
  tope: number;
  logo: 'ps4' | 'ps5' | null;
  /** Lo que se escribe en el boleto si el premio no tiene logo */
  nombreCorto: string;
  /** C-297: la regla de la compra en una línea ("Desde $5, 2 boletos. Desde $50, 5 por cada $50."), para Chispa y el recordatorio */
  reglaCorta?: string;
}

/** C-263: el boleto que acaba de ganar, como lo ve en la tienda (su código, de dónde salió y su lugar entre los suyos) */
export interface BoletoDelCorreo { codigo: string; origen: string; n: number; correo: string }

const parrafoCentrado = (html: string) => `<p style="margin:0 0 14px;text-align:center;font-size:16px;line-height:1.55;">${html}</p>`;
const montoCorto = (usd: number) => (Number.isInteger(usd) ? `$${usd}` : formatUSD(usd));
const diaCorto = (fecha: Date) => fecha.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();

const fotoPremio = (s: DatosSorteo) => s.imagen
  ? `<img src="${fotoCorreo(s.imagen, 600) ?? ''}" width="520" alt="${e(s.premio)}" style="display:block;width:100%;max-width:520px;height:auto;margin:0 auto 6px;border:0;border-radius:16px;">`
  : '';

/**
 * Ganó un boleto: por una compra pagada o por invitar a 2 amigos. `total` es cuántos lleva.
 * C-263: con el boleto épico que acaba de ganar (el mismo de la tienda, quieto); sin él, el boleto con el número de antes.
 * Chispa ya no dice "no hace falta comprar" (el equipo, 15/11: "la idea es que compren"): los dos caminos, con el mínimo de verdad.
 */
export async function correoBoletoSorteo(d: { nombre: string | null; sorteo: DatosSorteo; porque: 'compra' | 'invitados'; total: number; boleto?: BoletoDelCorreo | null; nuevos?: number }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  // C-297: una compra da varios (por el monto y el producto estrella): "¡Ganaste 15 boletos!"
  const nuevos = Math.max(1, d.nuevos ?? 1);
  const ganaste = nuevos === 1 ? 'un boleto' : `${nuevos} boletos`;
  const html = await marcoCorreo({
    preheader: `Ya tienes ${d.total} ${d.total === 1 ? 'boleto' : 'boletos'} para ${d.sorteo.premio}.`,
    encabezado: {
      sello: 'SORTEO',
      titulo: `¡Ganaste ${ganaste}${nombre ? `, ${nombre}` : ''}!`,
      texto: d.porque === 'compra'
        ? `Tu compra te dio ${ganaste} para el sorteo de <strong style="${CORREO.fuerte}">${e(d.sorteo.premio)}</strong>.`
        : `Dos amigos tuyos se unieron a la tienda: eso te dio un boleto para el sorteo de <strong style="${CORREO.fuerte}">${e(d.sorteo.premio)}</strong>.`,
    },
    cuerpo: `
      ${fotoPremio(d.sorteo)}
      ${d.boleto
        ? `${boletoEpicoCorreo({
          rotulo: e(d.sorteo.titulo.toUpperCase()), logo: d.sorteo.logo ? imagenCorreo(`logo-${d.sorteo.logo}.png`) : null, nombre: e(d.sorteo.nombreCorto),
          correo: e(d.boleto.correo), origen: e(d.boleto.origen), codigo: e(d.boleto.codigo), dia: e(diaCorto(d.sorteo.resultadoEl)), lugar: nuevos > 1 ? `${nuevos} boletos` : `${d.boleto.n} de ${d.total}`,
        })}
          <p style="margin:20px 0 0;text-align:center;font-family:${FUENTE_TITULO};font-size:20px;line-height:1.3;font-weight:800;color:#212529;">${d.total === 1 ? '¡Ya estás participando!' : `¡Ya llevas ${d.total} boletos!`}</p>
          <p style="margin:6px auto 0;max-width:440px;text-align:center;font-size:15px;line-height:1.55;">Cada uno es una oportunidad. El ganador sale el <strong style="${CORREO.fuerte}">${e(fechaLarga(d.sorteo.resultadoEl))}</strong>, al azar entre todos los boletos.</p>`
        : boletoCorreo({ rotulo: e(d.sorteo.titulo), titulo: d.total === 1 ? '¡Ya estás participando!' : `¡Ya llevas ${d.total} boletos!`, texto: `El resultado sale el ${e(fechaLarga(d.sorteo.resultadoEl))}. Más boletos, más chances.`, numero: String(d.total), unidad: d.total === 1 ? 'BOLETO' : 'BOLETOS' })}
      ${botonCorreo(`${urlTienda()}/sorteo`, 'Ver mis boletos')}`,
    chispa: {
      pose: 'celebra',
      texto: d.sorteo.reglaCorta
        ? `¿Vamos por más? ${e(d.sorteo.reglaCorta)}${d.sorteo.tope > 0 ? ' Y 2 amigos con tu enlace te dan otro.' : ''}`
        : `¿Vamos por otro? Cada compra de ${e(montoCorto(d.sorteo.minimoUSD))} o más es un boleto${d.sorteo.tope > 0 ? ', y 2 amigos con tu enlace te dan otro' : ''}.`,
    },
    motivo: 'Recibes este correo porque participas en el sorteo de la tienda.',
  });
  return { asunto: `¡Ganaste ${ganaste} para el sorteo de ${d.sorteo.premio}!`, html };
}

/** Faltan pocos días para el resultado (una sola vez, a quien tiene boletos). */
export async function correoRecordatorioSorteo(d: { nombre: string | null; sorteo: DatosSorteo; boletos: number; cierre: Date }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `El ${fechaLarga(d.sorteo.resultadoEl)} se sabe quién se lleva ${d.sorteo.premio}.`,
    encabezado: {
      sello: 'SORTEO · ÚLTIMOS DÍAS',
      titulo: `¡Se acerca el día${nombre ? `, ${nombre}` : ''}!`,
      texto: `El ${e(fechaLarga(d.sorteo.resultadoEl))} sabremos quién se lleva <strong style="${CORREO.fuerte}">${e(d.sorteo.premio)}</strong>. Tienes ${d.boletos} ${d.boletos === 1 ? 'boleto' : 'boletos'}.`,
    },
    cuerpo: `
      ${fotoPremio(d.sorteo)}
      ${avisoCorreo('Todavía puedes sumar boletos', `Hasta el ${e(fechaLarga(d.cierre))}: cada compra pagada de la tienda${d.sorteo.reglaCorta ? ` (${e(d.sorteo.reglaCorta.replace(/\.$/, ''))})` : ''}, tus reseñas o 2 amigos que se unan con tu enlace.`, 'calendario')}
      ${botonCorreo(`${urlTienda()}/sorteo`, 'Ver el sorteo')}`,
    chispa: { pose: 'senala', texto: 'Yo que tú no lo dejaría para el último día. ¡Mucha suerte!' },
    motivo: 'Recibes este correo porque participas en el sorteo de la tienda.',
  });
  return { asunto: `¡Faltan pocos días para el sorteo de ${d.sorteo.premio}!`, html };
}

/** Se sorteó: a todos los que participaron. `ganadorTapado` es el correo con asteriscos (correoTapado). */
export async function correoResultadoSorteo(d: { nombre: string | null; sorteo: DatosSorteo; ganadorTapado: string; boletos: number; codigo?: string | null }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Ya hay ganador de ${d.sorteo.premio}.`,
    encabezado: {
      sello: 'SORTEO · RESULTADO',
      titulo: '¡Ya tenemos ganador!',
      texto: `${nombre ? `${nombre}, gracias` : 'Gracias'} por participar en el sorteo de <strong style="${CORREO.fuerte}">${e(d.sorteo.premio)}</strong>. Se sortearon ${d.boletos} boletos.`,
    },
    cuerpo: `
      ${d.codigo
        ? `${parrafoCentrado(`Ganó el boleto <strong style="${CORREO.fuerte}">${e(d.codigo)}</strong> de <strong style="${CORREO.fuerte}">${e(d.ganadorTapado)}</strong>.`)}${datosCorreo([['Boleto ganador', e(d.codigo)], ['Ganador', e(d.ganadorTapado)]])}`
        : datosCorreo([['Ganador', e(d.ganadorTapado)]])}
      ${notaCorreo('El ganador sale al azar entre todos los boletos, y la lista queda guardada con su huella para que se pueda comprobar. Las bases están en la página del sorteo.')}
      ${botonCorreo(`${urlTienda()}/sorteo`, 'Ver el resultado')}`,
    chispa: { pose: 'saluda', texto: 'Esta vez no fue, pero se vienen más sorteos. ¡Gracias por estar!' },
    motivo: 'Recibes este correo porque participaste en el sorteo de la tienda.',
  });
  return { asunto: `Resultado del sorteo de ${d.sorteo.premio}`, html };
}

/** Al ganador. Antes, el equipo le escribía a mano. */
export async function correoGanadorSorteo(d: { nombre: string | null; sorteo: DatosSorteo; detalle: string; codigo?: string | null }): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'Escríbenos por WhatsApp', `Hola, gané el sorteo de ${d.sorteo.premio}`);
  const html = await marcoCorreo({
    preheader: `¡Ganaste ${d.sorteo.premio}!`,
    encabezado: {
      sello: '¡GANASTE!',
      titulo: `¡${nombre ? `${nombre}, ganaste` : 'Ganaste'} ${e(d.sorteo.premio)}!`,
      texto: 'Tu boleto salió entre todos los del sorteo. ¡Felicitaciones!',
    },
    cuerpo: `
      ${fotoPremio(d.sorteo)}
      ${placaCorreo(`
        <p style="${CORREO.placaRotulo}">${e(d.sorteo.titulo)}</p>
        <p style="${CORREO.placaTitulo}">${e(d.sorteo.premio)}</p>
        <p style="${CORREO.placaTexto}">Boleto ganador${d.codigo ? ` <strong style="color:#ffffff;letter-spacing:1px;">${e(d.codigo)}</strong>` : ''}: ${e(d.detalle)}</p>`, '0 0 6px')}
      ${avisoCorreo('Coordinemos la entrega', 'Escríbenos para confirmar tus datos y cómo te llega el premio. Te pediremos tu cédula.', 'premio')}
      ${whatsapp ? `<p style="margin:18px 0 0;text-align:center;font-size:16px;">${whatsapp}</p>` : botonCorreo(`${urlTienda()}/contacto`, 'Escríbenos')}`,
    chispa: { pose: 'celebra', texto: '¡No lo puedo creer! Mándanos una foto cuando lo tengas en tus manos.' },
    motivo: 'Recibes este correo porque ganaste el sorteo de la tienda.',
  });
  return { asunto: `¡Ganaste el sorteo de ${d.sorteo.premio}!`, html };
}

/* ── Descuentos, cursos y gift cards ────────────────────────────────────── */

/** El equipo aprobó el descuento que pidió en un producto de su lista de deseos. */
export async function correoDescuentoAprobado(d: {
  nombre: string | null;
  producto: { nombre: string; slug: string; imagen: string | null };
  precioAntes: number;
  precioAhora: number;
  vence?: Date | null;
}): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const enlace = `${urlTienda()}/productos/${d.producto.slug}`;
  const html = await marcoCorreo({
    preheader: `Tu descuento en ${d.producto.nombre} ya está listo.`,
    encabezado: {
      sello: 'DESCUENTO APROBADO',
      titulo: `¡Te lo dejamos en ${e(formatUSD(d.precioAhora))}${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Aprobamos el descuento que pediste. Es tuyo: entra con tu cuenta y lo ves aplicado.',
    },
    cuerpo: `
      ${productosCorreo([{ nombre: e(d.producto.nombre), monto: formatUSD(d.precioAhora), antes: formatUSD(d.precioAntes), foto: fotoCorreo(d.producto.imagen), enlace }])}
      ${d.vence ? avisoCorreo('Aprovéchalo a tiempo', `El descuento vale hasta el ${e(fechaLarga(d.vence))}.`, 'reloj') : ''}
      ${botonCorreo(enlace, 'Comprarlo con descuento')}`,
    chispa: { pose: 'celebra', texto: 'Pedir no cuesta nada, ¿viste? Este precio es solo para ti.' },
  });
  return { asunto: `¡Descuento aprobado en ${d.producto.nombre}!`.slice(0, 150), html };
}

/** Un administrador aprobó el curso de un creador (app/api/admin/courses/[id]). */
export async function correoCursoAprobado(d: { nombre: string | null; curso: string; slug: string }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `${d.curso} ya está publicado.`,
    encabezado: {
      sello: 'CURSO APROBADO',
      titulo: `¡Tu curso ya está en la tienda${nombre ? `, ${nombre}` : ''}!`,
      texto: `Aprobamos <strong style="${CORREO.fuerte}">${e(d.curso)}</strong> y ya lo pueden tomar los clientes.`,
    },
    cuerpo: botonCorreo(`${urlTienda()}/cursos/${encodeURIComponent(d.slug)}`, 'Ver mi curso'),
    chispa: { pose: 'celebra', texto: 'Compártelo en tus redes: los primeros alumnos son los que más ayudan con sus reseñas.' },
  });
  return { asunto: `¡${d.curso} ya está publicado!`.slice(0, 150), html };
}

/** A quien compró la gift card: ya le llegó a la otra persona. */
export async function correoGiftCardEntregada(d: { nombre: string | null; para: string; correoPara: string; monto: number }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `Tu gift card de ${formatUSD(d.monto)} ya le llegó a ${d.para}.`,
    encabezado: {
      sello: 'REGALO ENTREGADO',
      titulo: `¡Tu regalo ya llegó${nombre ? `, ${nombre}` : ''}!`,
      texto: `Le enviamos a <strong style="${CORREO.fuerte}">${e(d.para)}</strong> tu gift card de ${e(formatUSD(d.monto))} con tu mensaje.`,
    },
    cuerpo: `${datosCorreo([['Para', `${e(d.para)} (${e(d.correoPara)})`], ['Monto', e(formatUSD(d.monto))]])}${notaCorreo('Te avisamos por aquí cuando la canjee.')}`,
    chispa: { pose: 'celebra', texto: '¡Qué detalle! Un regalo que se elige solo: tecnología, gaming, recargas y más.' },
  });
  return { asunto: `Tu gift card ya le llegó a ${d.para}`.slice(0, 150), html };
}

/** A quien compró la gift card: la otra persona ya la canjeó. */
export async function correoGiftCardCanjeada(d: { nombre: string | null; para: string; monto: number }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `${d.para} ya canjeó la gift card que le regalaste.`,
    encabezado: {
      sello: 'REGALO CANJEADO',
      titulo: `¡${e(d.para)} ya usó tu regalo!`,
      texto: `${nombre ? `${nombre}, la` : 'La'} gift card de ${e(formatUSD(d.monto))} que regalaste ya está canjeada. Misión cumplida.`,
    },
    cuerpo: `${exitoCorreo('Regalo canjeado', `${e(d.para)} ya tiene sus ${e(formatPuntos(d.monto))} para comprar en la tienda.`)}${botonCorreo(`${urlTienda()}/gift-cards`, 'Regalar otra')}`,
    chispa: { pose: 'celebra', texto: '¿Viene un cumpleaños o una fecha especial? Una gift card nunca falla.' },
  });
  return { asunto: `${d.para} ya canjeó tu gift card`.slice(0, 150), html };
}
