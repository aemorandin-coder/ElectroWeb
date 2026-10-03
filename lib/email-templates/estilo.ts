/**
 * ELECTRO SHOP — ESTILO DE LOS CORREOS (C-175)
 * Un solo lugar para el aspecto de todos los correos. Los clientes de correo no leen hojas de estilo
 * de forma confiable (Gmail recorta <style>, Outlook ignora degradados, flex y position), así que todo
 * va en `style=""` y con colores planos. Cada correo arma su contenido con estas piezas y lo envuelve
 * con `getBaseTemplate()` de lib/email-service.
 */

/** Colores de la marca en los correos (los mismos tokens de PLAN.md §1, en hex porque el correo no lee variables). */
export const COLOR = {
  marca: '#2a63cd',
  marcaOscura: '#1a3b7e',
  tinta: '#212529',
  texto: '#495057',
  suave: '#6a6c6b',
  linea: '#e9ecef',
  fondo: '#f4f6fb',
  superficie: '#f8f9fa',
  exito: '#047857',
  aviso: '#b45309',
  peligro: '#b91c1c',
} as const;

export const FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const caja = (fondo: string, borde: string) =>
  `background-color:${fondo};border:1px solid ${borde};border-radius:12px;padding:18px 20px;margin:20px 0;`;

/** Estilos en línea. Se usan como `<p style="${CORREO.texto}">`. */
export const CORREO = {
  titulo: `margin:0 0 12px;color:${COLOR.tinta};font-size:24px;line-height:1.3;font-weight:700;`,
  /** Línea bajo el título: número de orden, remitente… */
  subtitulo: `margin:0 0 20px;color:${COLOR.marca};font-size:15px;line-height:1.4;font-weight:600;`,
  texto: `margin:0 0 16px;color:${COLOR.texto};font-size:16px;line-height:1.6;`,
  textoMenor: `margin:0 0 12px;color:${COLOR.suave};font-size:14px;line-height:1.6;`,
  /** Nota al pie del contenido, separada por una línea. */
  nota: `margin:28px 0 0;padding-top:16px;border-top:1px solid ${COLOR.linea};color:${COLOR.suave};font-size:12px;line-height:1.5;`,
  fuerte: `color:${COLOR.tinta};`,
  enlace: `color:${COLOR.marca};font-weight:600;`,
  boton: `display:inline-block;background-color:${COLOR.marca};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;line-height:1.2;font-weight:700;`,
  caja: caja(COLOR.superficie, COLOR.linea),
  cajaInfo: caja('#eff6ff', '#bfdbfe'),
  cajaExito: caja('#ecfdf5', '#a7f3d0'),
  cajaAviso: caja('#fffbeb', '#fde68a'),
  cajaPeligro: caja('#fef2f2', '#fecaca'),
  /** Título y texto dentro de una caja. El color lo hereda de `tono*`. */
  cajaTitulo: 'margin:0 0 6px;font-size:15px;line-height:1.4;font-weight:700;',
  cajaTexto: 'margin:0;font-size:14px;line-height:1.6;',
  tonoNeutro: `color:${COLOR.texto};`,
  tonoInfo: 'color:#1e40af;',
  tonoExito: 'color:#065f46;',
  tonoAviso: 'color:#92400e;',
  tonoPeligro: 'color:#991b1b;',
  /** Rótulo pequeño en mayúsculas sobre un dato. */
  rotulo: `margin:0 0 6px;color:${COLOR.suave};font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:1px;`,
  /** Dato grande: código, número de guía, monto. */
  dato: `margin:0;color:${COLOR.marcaOscura};font-size:26px;line-height:1.3;font-weight:700;letter-spacing:2px;word-break:break-all;`,
  /** Cita o mensaje escrito por una persona. */
  cita: `border-left:4px solid ${COLOR.marca};padding:8px 14px;margin:16px 0;color:${COLOR.texto};font-size:14px;line-height:1.6;white-space:pre-line;`,
} as const;

/**
 * Botón principal centrado. Va en una tabla con color sólido: Outlook no pinta degradados ni botones hechos
 * solo con CSS. `url` y `texto` deben llegar ya escapados si vienen de fuera.
 */
export function botonCorreo(url: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;"><tr><td bgcolor="${COLOR.marca}" style="background-color:${COLOR.marca};border-radius:10px;"><a href="${url}" style="${CORREO.boton}">${texto}</a></td></tr></table>`;
}

/** Círculo con una marca, sin flex: Outlook y Gmail no lo centran de otra forma. */
export function selloCorreo(tono: 'exito' | 'info' = 'exito'): string {
  const fondo = tono === 'exito' ? '#10b981' : COLOR.marca;
  return `<div style="width:56px;height:56px;line-height:56px;margin:0 auto 16px;border-radius:50%;background-color:${fondo};color:#ffffff;font-size:28px;font-weight:700;text-align:center;">&#10003;</div>`;
}
