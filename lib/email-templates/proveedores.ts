/**
 * C-227 · LOS CORREOS AL ALIADO COMERCIAL (el proveedor que despacha él mismo, como la ferretería de La Victoria)
 * El equipo, 14/11: primero el agradecimiento por elegirnos y confiar en nuestros flujos; después, cada venta, con el
 * embalaje y la empresa de envío. Las ocho decisiones están en PLAN.md §7.2 y el flujo en PROPUESTA_C227.md:
 * - se le habla de usted;
 * - ve su costo, nunca el precio de venta ni lo que pagó el cliente;
 * - la relación se llama "aliado comercial" (el equipo, 14/11: nada de jerga);
 * - la bienvenida no habla de pagos (eso queda en el acuerdo).
 * Funciones puras sobre un DTO (lib/proveedores/despacho arma los datos). Todo lo que llega de afuera se escapa aquí.
 */

import { escapeHtml } from '@/lib/html';
import { formatUSD } from '@/lib/currency';
import { fechaLarga } from '@/lib/horarios';
import { NOMBRE_EMPRESA, type EmpresaGuia } from '@/lib/envios/empresas';
import {
  COLOR, CORREO, FUENTE_TITULO, avisoCorreo, botonCorreo, botonSecundarioCorreo, datosCorreo, enlaceWhatsAppCorreo,
  imagenCorreo, notaCorreo, parrafoCorreo, placaCorreo, productosCorreo, rotuloCorreo, totalesCorreo, urlTienda, ventajasCorreo,
} from './estilo';
import { ajustesCorreo, marcoCorreo } from './marco';

const e = escapeHtml;

export interface ProductoDespacho {
  /** Su nombre en su lista (o el de la tienda, si no está) */
  nombre: string;
  /** Su código */
  codigo: string | null;
  cantidad: number;
  /** Su costo por unidad, como lo paga la tienda (con el IVA si su lista lo trae). null: sin costo cargado */
  costo: number | null;
  /** La foto, ya en JPEG (`fotoCorreo`) */
  foto: string | null;
}

export interface DespachoCorreo {
  proveedor: string;
  /** La persona que lo recibe, si se cargó */
  contacto: string | null;
  numero: string;
  /** El día en que se confirmó el pago (YYYY-MM-DD, hora de Venezuela) */
  pagadaEl: string;
  /** El último día para entregarlo en la agencia (YYYY-MM-DD): un día hábil después, con las reglas de C-234 */
  plazo: string;
  /** 'ZOOM' o 'MRW' (la que eligió el cliente) */
  empresa: string;
  /** OFFICE: a una oficina; DOOR: puerta a puerta (la guía pide la dirección) */
  modo: 'OFFICE' | 'DOOR';
  oficina: { nombre: string; codigo: string | null; direccion: string | null } | null;
  ciudad: string | null;
  estado: string | null;
  /** C-246: el código de la ciudad de destino en ZOOM (lo pide su guía) */
  codigoCiudad: string | null;
  /** Solo puerta a puerta: la dirección como la escribió el cliente, con su referencia */
  direccion: string | null;
  destinatario: { nombre: string; cedula: string; telefono: string };
  cobroADestino: boolean;
  productos: ProductoDespacho[];
  ivaIncluido: boolean;
  empaque: { piezas: number; pesoKg: number; renglones: string[] } | null;
  /** El enlace firmado para marcar "Lo estoy preparando" y anotar la guía (null en la cancelación) */
  url: string | null;
}

/** La copia del equipo dice arriba a quién le llegó el original */
export interface Copia { para: string }

const nombreEmpresa = (empresa: string) => NOMBRE_EMPRESA[empresa as EmpresaGuia] ?? empresa;
const lugar = (d: Pick<DespachoCorreo, 'ciudad' | 'estado'>) => [d.ciudad, d.estado].filter(Boolean).join(', ');
const kilos = (kg: number) => `${String(Math.round(kg * 100) / 100).replace('.', ',')} kg`;
/** "14 de noviembre de 2026" (YYYY-MM-DD, sin el día de la semana: va en la credencial) */
const fechaCompleta = (fecha: string) =>
  new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dominio = () => urlTienda().replace(/^https?:\/\//, '');

const LOGOS: Record<string, { archivo: string; ancho: number }> = {
  ZOOM: { archivo: 'zoom.png', ancho: 203 },
  MRW: { archivo: 'mrw.png', ancho: 245 },
};

/**
 * La empresa en grande, con su logo, y a dónde va (la decisión del equipo: "por cuál empresa de encomienda debe irse").
 * C-246 (el equipo, 15/11: "tienes que insertar claramente dónde el cliente necesita el envío, eso va a la guía de ZOOM"):
 * debajo, "Envíelo a" con la ciudad en grande, la oficina con su código o la dirección de la casa, y a nombre de quién.
 */
function bloqueEmpresa(d: DespachoCorreo): string {
  const logo = LOGOS[d.empresa];
  const nombre = nombreEmpresa(d.empresa);
  const marca = logo
    ? `<img src="${imagenCorreo(logo.archivo)}" width="${logo.ancho}" height="40" alt="${e(nombre)}" style="display:block;margin:10px auto 0;width:${logo.ancho}px;max-width:100%;height:auto;border:0;font-family:${FUENTE_TITULO};font-size:30px;line-height:40px;font-weight:800;color:${COLOR.marca};">`
    : `<p style="margin:10px 0 0;font-family:${FUENTE_TITULO};font-size:30px;line-height:1.2;font-weight:800;color:${COLOR.tinta};">${e(nombre)}</p>`;
  const linea = (texto: string, estilo: string) => `<p style="margin:4px 0 0;line-height:1.45;${estilo}">${texto}</p>`;
  const fuerte = `font-size:17px;font-weight:700;color:${COLOR.tinta};`;
  const normal = `font-size:14px;color:${COLOR.texto};`;
  const destino = d.modo === 'DOOR'
    ? `${linea('Puerta a puerta, a la casa del cliente:', normal)}${d.direccion ? linea(e(d.direccion), fuerte) : ''}`
    : `${linea(`${d.empresa === 'MRW' ? 'Agencia' : 'Oficina'} ${e(nombre)} ${e(d.oficina?.nombre ?? '')}${d.oficina?.codigo ? ` · código ${e(d.oficina.codigo)}` : ''}`, fuerte)}${d.oficina?.direccion ? linea(e(d.oficina.direccion), normal) : ''}`;
  const flete = d.cobroADestino
    ? 'Cobro a destino: el flete lo paga el cliente al retirar.'
    : 'El flete no va a cobro a destino: confírmelo con el equipo antes de enviarlo.';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;"><tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;border:2px solid ${COLOR.marca200};border-radius:18px;padding:22px 18px;text-align:center;">
    <p style="${CORREO.rotulo}margin:0;">Va por</p>
    ${marca}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;"><tr><td bgcolor="${COLOR.marca50}" align="center" style="background-color:${COLOR.marca50};border-radius:14px;padding:16px 14px;text-align:center;">
      <p style="${CORREO.rotulo}margin:0;">Envíelo a</p>
      <p style="margin:6px 0 0;font-family:${FUENTE_TITULO};font-size:26px;line-height:1.2;font-weight:800;color:${COLOR.marcaOscura};">${e(lugar(d) || 'Destino sin ciudad')}</p>
      ${d.codigoCiudad ? linea(`Ciudad de destino en ${e(nombre)}: código ${e(d.codigoCiudad)}`, `font-size:13px;color:${COLOR.suave};`) : ''}
      ${destino}
      ${linea(`A nombre de <strong style="color:${COLOR.tinta};">${e(d.destinatario.nombre)}</strong> · ${e(d.destinatario.cedula)} · ${e(d.destinatario.telefono)}`, `${normal}margin-top:10px;`)}
    </td></tr></table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.5;font-weight:600;color:${COLOR.marcaOscura};">${flete}</p>
  </td></tr></table>`;
}

/** Lo que pide la guía, en el orden de su formulario. Nunca el correo del cliente ni lo que pagó (decisión 2 del 14/11) */
function datosGuia(d: DespachoCorreo): string {
  const filas: [string, string][] = [
    ['Destinatario', e(d.destinatario.nombre)],
    ['Cédula', e(d.destinatario.cedula)],
    ['Teléfono', e(d.destinatario.telefono)],
    ['Ciudad de destino', e(`${lugar(d)}${d.codigoCiudad ? ` (código ${d.codigoCiudad})` : ''}`)],
    ...(d.modo === 'DOOR'
      ? [['Dirección de entrega', e(d.direccion ?? '')] as [string, string]]
      : [
        [d.empresa === 'MRW' ? 'Agencia de destino' : 'Oficina de destino', e(`${d.oficina?.nombre ?? ''}${d.oficina?.codigo ? ` (código ${d.oficina.codigo})` : ''}`)] as [string, string],
        ...(d.oficina?.direccion ? [['Dirección de la oficina', e(d.oficina.direccion)] as [string, string]] : []),
      ]),
    ['Contenido', e(d.productos.map((p) => `${p.cantidad} × ${p.nombre}`).join(', '))],
  ];
  if (d.empaque) {
    filas.push(['Piezas', String(d.empaque.piezas)]);
    filas.push(['Peso aprox.', kilos(d.empaque.pesoKg)]);
  }
  return datosCorreo(filas);
}

/** Sus productos con su código, la cantidad y su costo (nunca el precio de venta) */
function productosDespacho(d: DespachoCorreo, conCosto: boolean): string {
  return productosCorreo(d.productos.map((p) => ({
    nombre: e(p.nombre),
    detalle: [p.codigo ? `Código ${e(p.codigo)}` : null, `Cantidad: ${p.cantidad}`].filter(Boolean).join(' · '),
    monto: conCosto && p.costo !== null ? formatUSD(p.costo * p.cantidad) : undefined,
    foto: p.foto,
  })));
}

function totalCosto(d: DespachoCorreo): string {
  if (d.productos.some((p) => p.costo === null)) return '';
  const total = d.productos.reduce((s, p) => s + (p.costo ?? 0) * p.cantidad, 0);
  return totalesCorreo([], ['Total a su costo', formatUSD(total)], d.ivaIncluido ? 'IVA incluido, como en su lista' : undefined);
}

function empaque(d: DespachoCorreo): string {
  if (!d.empaque) return '';
  const piezas = d.empaque.piezas === 1 ? '1 pieza' : `${d.empaque.piezas} piezas`;
  const texto = d.empaque.renglones.length > 0
    ? `${d.empaque.renglones.map(e).join('<br>')}<br>En total: ${piezas}, ${kilos(d.empaque.pesoKg)} aprox.`
    : `${piezas}, ${kilos(d.empaque.pesoKg)} aprox. Que viaje firme, protegido y bien cerrado.`;
  return avisoCorreo('Embálelo así', texto, 'paquete');
}

const avisoDeCopia = (c?: Copia) => (c ? notaCorreo(`<strong>Copia para el equipo.</strong> El original le llegó a ${e(c.para)}. El botón también sirve desde aquí.`) + '<div style="height:10px;"></div>' : '');
const motivoProveedor = (proveedor: string) => `Recibe este correo porque ${e(proveedor)} es aliado comercial de ${e(dominio())}.`;

/* ── 1. La bienvenida ───────────────────────────────────────────────────── */

export interface DatosBienvenida {
  proveedor: string;
  contacto: string | null;
  /** Cuántos de sus productos están publicados hoy */
  publicados: number;
  /** Desde cuándo vende con la tienda (YYYY-MM-DD) */
  desde: string;
  /** El catálogo filtrado por su estado ("Desde Aragua"), si despacha él mismo */
  enlaceCatalogo: string | null;
  /** "Aragua": de dónde salen sus paquetes */
  estado: string | null;
  /** C-246: como en su RIF ("Ferretería Ejemplo, C.A." y "J-12345678-9"), si se cargaron */
  razonSocial: string | null;
  rif: string | null;
}

export async function correoBienvenidaProveedor(d: DatosBienvenida): Promise<{ asunto: string; html: string }> {
  const a = await ajustesCorreo();
  const fecha = fechaCompleta(d.desde);
  const productos = d.publicados === 1 ? '1 producto suyo publicado' : `${d.publicados} productos suyos publicados`;
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbanos por WhatsApp', `Hola, les escribe ${d.proveedor}`);
  const cuerpo = `
    ${parrafoCorreo(`${d.contacto ? `${e(d.contacto)}, es` : 'Es'} un gusto darle la bienvenida. Desde hoy, ${e(d.proveedor)} vende con Electro Shop en toda Venezuela, y cada venta le llega clara, a tiempo y con todo lo que necesita para despacharla.`)}
    ${placaCorreo(`
      <p style="${CORREO.placaRotulo}">Credencial</p>
      <p style="${CORREO.placaTitulo}">${e(d.proveedor)}</p>
      <p style="${CORREO.placaTexto}">Aliado comercial de Electro Shop · desde el ${e(fecha)}</p>
      ${d.razonSocial || d.rif ? `<p style="${CORREO.placaTexto}margin-top:6px;">${[d.razonSocial ? e(d.razonSocial) : null, d.rif ? `RIF ${e(d.rif)}` : null].filter(Boolean).join(' · ')}</p>` : ''}`)}
    ${rotuloCorreo('Sus productos en la tienda', 6)}
    ${parrafoCorreo(`Ya hay <strong style="${CORREO.fuerte}">${productos}</strong>, con su foto, su ficha y el envío calculado para cada cliente${d.estado ? `. En la tienda aparecen "Desde ${e(d.estado)}", para que el cliente sepa de dónde sale su paquete` : ''}.`)}
    ${d.enlaceCatalogo ? botonSecundarioCorreo(e(d.enlaceCatalogo), 'Verlos en la tienda') : ''}
    ${rotuloCorreo('Cómo trabajamos juntos')}
    ${ventajasCorreo([
      { icono: 'pago', titulo: '1. El cliente paga en la tienda', texto: 'Le escribimos solo cuando el pago está confirmado. Nunca antes.' },
      { icono: 'correo', titulo: '2. Le llega "¡Se vendió su producto!"', texto: 'Con sus productos y su código, el empaque, la empresa de envío y la oficina de destino.' },
      { icono: 'paquete', titulo: '3. Usted lo embala y lo lleva a la agencia', texto: 'Con los datos de la guía, que van en el mismo correo.' },
      { icono: 'envio', titulo: '4. Anota la guía con un botón', texto: 'Sin cuenta ni contraseña. La orden queda enviada y el cliente recibe su número de guía al instante.' },
      { icono: 'reloj', titulo: '5. Un día hábil para despacharlo', texto: 'Si algo se complica, le recordamos una sola vez y lo resolvemos juntos.' },
    ])}
    ${rotuloCorreo('¿Una duda?')}
    ${parrafoCorreo(`Estamos para ayudarle: ${whatsapp || 'responda este correo'}${a.correo ? ` o escriba a <a href="mailto:${e(a.correo)}" style="${CORREO.enlace}">${e(a.correo)}</a>` : ''}.`, CORREO.textoMenor)}`;

  return {
    asunto: `Gracias por elegirnos: ${d.proveedor} ya es aliado comercial de Electro Shop`,
    html: await marcoCorreo({
      preheader: `Sus productos ya se venden en ${dominio()}, con envío a toda Venezuela. Así trabajamos juntos.`,
      encabezado: {
        sello: 'ALIADO COMERCIAL',
        titulo: '¡Gracias por elegirnos!',
        texto: `${e(d.proveedor)} ya vende con Electro Shop. Gracias por confiar en nosotros y en nuestros flujos.`,
        dato: `${productos} · ${e(fecha)}`,
      },
      cuerpo,
      chispa: { pose: 'saluda', texto: 'Es un gusto trabajar con usted. Cada vez que alguien compre lo suyo, le aviso de primero, con todo listo para despachar.' },
      pie: 'proveedor',
      motivo: motivoProveedor(d.proveedor),
    }),
  };
}

/* ── 2. "¡Se vendió su producto!" ───────────────────────────────────────── */

export async function correoVentaProveedor(d: DespachoCorreo, copia?: Copia): Promise<{ asunto: string; html: string }> {
  const empresa = nombreEmpresa(d.empresa);
  const plazo = fechaLarga(d.plazo);
  const cuerpo = `
    ${avisoDeCopia(copia)}
    ${bloqueEmpresa(d)}
    ${rotuloCorreo('Datos para la guía')}
    ${datosGuia(d)}
    ${rotuloCorreo('Lo que va en la caja')}
    ${productosDespacho(d, true)}
    ${totalCosto(d)}
    ${empaque(d)}
    ${d.url ? botonCorreo(e(d.url), 'Anotar la guía') : ''}
    ${d.url ? parrafoCorreo('Con el mismo botón puede marcar "Lo estoy preparando". No necesita cuenta ni contraseña.', `${CORREO.nota}margin-top:8px;`) : ''}`;

  return {
    asunto: `${copia ? 'Copia · ' : ''}¡Se vendió su producto! Va por ${empresa} · ${d.numero}`,
    html: await marcoCorreo({
      preheader: `Prepárelo y entréguelo en ${empresa} a más tardar ${plazo}.`,
      encabezado: {
        sello: 'VENTA CONFIRMADA',
        titulo: '¡Se vendió su producto!',
        texto: `El cliente ya pagó. Embálelo y llévelo a ${e(empresa)} a más tardar <strong style="color:${COLOR.tinta};">${e(plazo)}</strong>.`,
        dato: `Orden ${e(d.numero)} · pagada ${e(fechaLarga(d.pagadaEl))}`,
      },
      cuerpo,
      chispa: { pose: 'senala', texto: `Cuando lo entregue en ${e(empresa)}, toque "Anotar la guía": el cliente recibe su número al instante y yo sigo el paquete hasta que llegue.` },
      pie: 'proveedor',
      motivo: motivoProveedor(d.proveedor),
    }),
  };
}

/* ── 3. El recordatorio (una sola vez, el día del plazo) ───────────────── */

export async function correoRecordatorioProveedor(d: DespachoCorreo, hoy: string, copia?: Copia): Promise<{ asunto: string; html: string }> {
  const a = await ajustesCorreo();
  const empresa = nombreEmpresa(d.empresa);
  const venceHoy = hoy === d.plazo;
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbanos por WhatsApp', `Hola, les escribe ${d.proveedor} por la orden ${d.numero}`);
  const cuerpo = `
    ${avisoDeCopia(copia)}
    ${bloqueEmpresa(d)}
    ${rotuloCorreo('Para')}
    ${datosCorreo([['Destinatario', e(d.destinatario.nombre)], ['Cédula', e(d.destinatario.cedula)], ['Teléfono', e(d.destinatario.telefono)]])}
    ${rotuloCorreo('Lo que va en la caja')}
    ${productosDespacho(d, false)}
    ${d.url ? botonCorreo(e(d.url), 'Anotar la guía') : ''}`;

  return {
    asunto: `${copia ? 'Copia · ' : ''}${venceHoy ? 'Hoy vence' : 'Falta'} la guía de la orden ${d.numero}`,
    html: await marcoCorreo({
      preheader: venceHoy ? `Si ya la entregó en ${empresa}, anote la guía: el cliente está pendiente.` : `El plazo era ${fechaLarga(d.plazo)}. Si ya salió, anote la guía.`,
      encabezado: {
        sello: 'RECORDATORIO',
        titulo: '¿Ya salió el paquete?',
        texto: venceHoy
          ? `La orden ${e(d.numero)} vence hoy. Si ya la entregó en ${e(empresa)}, anote la guía: el cliente está pendiente.`
          : `El plazo de la orden ${e(d.numero)} era ${e(fechaLarga(d.plazo))}. Si ya salió, anote la guía; si no, avísenos.`,
        dato: `Orden ${e(d.numero)} · pagada ${e(fechaLarga(d.pagadaEl))}`,
      },
      cuerpo,
      chispa: { pose: 'explica', texto: `¿Algo se complicó? Falta un producto, la agencia cerró… ${whatsapp || 'Responda este correo'} y lo resolvemos juntos.` },
      pie: 'proveedor',
      motivo: motivoProveedor(d.proveedor),
    }),
  };
}

/* ── 4. "Se canceló: no lo despache" ────────────────────────────────────── */

export async function correoCancelacionProveedor(d: DespachoCorreo, copia?: Copia): Promise<{ asunto: string; html: string }> {
  const empresa = nombreEmpresa(d.empresa);
  const cuerpo = `
    ${avisoDeCopia(copia)}
    ${avisoCorreo('Si ya hizo la guía', `Pídale a ${e(empresa)} que la anule. El enlace para anotar la guía de esta orden ya no funciona.`, 'info')}
    ${rotuloCorreo('Lo que iba en la caja')}
    ${productosDespacho(d, false)}`;

  return {
    asunto: `${copia ? 'Copia · ' : ''}Se canceló la orden ${d.numero}: no la despache`,
    html: await marcoCorreo({
      preheader: 'Si ya la embaló, guárdela: no hace falta enviarla.',
      encabezado: {
        sello: 'ORDEN CANCELADA',
        titulo: 'No lo despache',
        texto: `La orden ${e(d.numero)} se canceló. Si ya la embaló, guárdela: no hace falta enviarla.`,
        dato: `Orden ${e(d.numero)}`,
      },
      cuerpo,
      chispa: { pose: 'explica', texto: 'Gracias por estar pendiente. Le aviso apenas llegue la próxima venta.' },
      pie: 'proveedor',
      motivo: motivoProveedor(d.proveedor),
    }),
  };
}
