/**
 * ELECTRO SHOP — ESTILO DE LOS CORREOS (C-175, rediseñado en C-219)
 * Un solo lugar para el aspecto de todos los correos. Los clientes de correo no leen hojas de estilo de forma confiable
 * (Outlook ignora degradados, flex, position y márgenes negativos; Gmail no lee SVG), así que todo va en `style=""`, en
 * tablas y con colores planos; los fondos con imagen son un extra que Outlook de escritorio no ve. Cada correo arma su
 * contenido con estas piezas y lo envuelve con `marcoCorreo()` de ./marco (C-219: la maqueta C que eligió el equipo el 14/11,
 * clara con la cinta, ELECTRO SHOP grande arriba y Chispa abajo).
 *
 * Todo lo que llega de afuera (nombres, productos, mensajes) se escapa antes de pasarlo a estas piezas: las piezas no escapan.
 */

/** Colores de la marca en los correos (los mismos tokens de PLAN.md §1, en hex porque el correo no lee variables). */
export const COLOR = {
  marca: '#2a63cd',
  marca600: '#1e4ba3',
  marcaOscura: '#1a3b7e',
  marca50: '#f4f7fc',
  marca100: '#eaeffa',
  marca200: '#d4e0f5',
  marca300: '#aac1eb',
  marca900: '#0e1f44',
  // C-243 (el kit de marca, lib/marca.ts): sin azul noche ni cian, que no están en el logo. La pieza fuerte va en
  // `marcaOscura` (el azul oscuro del logo) y sus rótulos en `marca300`; la placa de un aviso, en `marca` con el ícono blanco.
  tinta: '#212529',
  texto: '#495057',
  suave: '#6a6c6b',
  linea: '#e9ecef',
  fondo: '#eef2f9',
  superficie: '#f8f9fa',
  exito: '#047857',
  peligro: '#b91c1c',
  whatsapp: '#25d366',
} as const;

/** Arial primero: es lo que muestran Gmail y Outlook. Poppins (la de los reels) solo donde se pueda, en los títulos. */
export const FUENTE = "Arial,'Helvetica Neue',Helvetica,sans-serif";
export const FUENTE_TITULO = "Poppins,Arial,'Helvetica Neue',Helvetica,sans-serif";

/** URL pública de la tienda, sin barra final: los correos no resuelven rutas relativas. */
export function urlTienda(): string {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Las imágenes propias de los correos (public/images/correo). `?v=` cambia si cambia el dibujo: Gmail guarda las imágenes. */
export function imagenCorreo(archivo: string): string {
  // C-243: v=2, los íconos de las placas pasaron de cian a blanco. C-296: v=3, Chispa 3.1 (el logo oficial en la camisa)
  return `${urlTienda()}/images/correo/${archivo}?v=3`;
}

const caja = (fondo: string, borde: string) =>
  `background-color:${fondo};border:1px solid ${borde};border-radius:14px;padding:16px 18px;margin:18px 0;`;

/** Estilos en línea. Se usan como `<p style="${CORREO.texto}">`. */
export const CORREO = {
  titulo: `margin:0 0 12px;color:${COLOR.tinta};font-family:${FUENTE_TITULO};font-size:24px;line-height:1.25;font-weight:800;`,
  /** Línea bajo un título: un dato corto en azul de marca. */
  subtitulo: `margin:0 0 18px;color:${COLOR.marca};font-size:15px;line-height:1.4;font-weight:700;`,
  texto: `margin:0 0 16px;color:${COLOR.texto};font-size:16px;line-height:1.6;`,
  textoMenor: `margin:0 0 12px;color:${COLOR.suave};font-size:14px;line-height:1.6;`,
  /** Nota al pie del contenido, centrada y chica. */
  nota: `margin:22px 0 0;color:${COLOR.suave};font-size:12px;line-height:1.5;text-align:center;`,
  fuerte: `color:${COLOR.tinta};`,
  enlace: `color:${COLOR.marca};font-weight:700;text-decoration:none;`,
  boton: `display:inline-block;background-color:${COLOR.marca};color:#ffffff;text-decoration:none;padding:16px 38px;border-radius:12px;font-size:16px;line-height:1.2;font-weight:800;letter-spacing:0.2px;`,
  caja: caja(COLOR.superficie, COLOR.linea),
  /** Nota informativa en el azul de la marca. Para destacar un código o un certificado va la placa (`placaCorreo`). */
  cajaInfo: caja(COLOR.marca50, COLOR.marca200),
  cajaExito: caja('#ecfdf5', '#a7f3d0'),
  /**
   * Solo cuando el cliente tiene que hacer algo (pagar el flete, no compartir un código). Nunca para destacar.
   * C-226 (Andrés, 14/11: "ese color de contenedor ámbar lo detesto"): va en el azul claro de la tienda, nunca en ámbar.
   * Con ícono, mejor `avisoCorreo()`.
   */
  cajaAviso: caja(COLOR.marca50, COLOR.marca200),
  cajaPeligro: caja('#fef2f2', '#fecaca'),
  /** Título y texto dentro de una caja. El color lo hereda de `tono*`. */
  cajaTitulo: 'margin:0 0 6px;font-size:15px;line-height:1.4;font-weight:700;',
  cajaTexto: 'margin:0;font-size:14px;line-height:1.6;',
  tonoNeutro: `color:${COLOR.texto};`,
  tonoInfo: `color:${COLOR.marcaOscura};`,
  tonoExito: `color:${COLOR.exito};`,
  /** C-226: el texto de `cajaAviso`, en el azul más oscuro de la marca, como texto (antes ámbar). */
  tonoAviso: `color:${COLOR.marca900};`,
  tonoPeligro: `color:${COLOR.peligro};`,
  /** Rótulo de sección en mayúsculas ("LO QUE VIENE EN TU CAJA"). */
  rotulo: `margin:0 0 6px;color:${COLOR.marcaOscura};font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:1.6px;font-weight:800;`,
  /** Dato grande: código, número de guía, monto. */
  dato: `margin:0;color:${COLOR.marcaOscura};font-size:26px;line-height:1.3;font-weight:800;letter-spacing:2px;word-break:break-all;`,
  /** Dentro de la placa (`placaCorreo`, el azul oscuro del logo): rótulo en azul claro, título en blanco y el texto en azul más claro. */
  placaRotulo: `margin:0;color:${COLOR.marca300};font-size:11px;line-height:1.4;letter-spacing:2px;font-weight:800;text-transform:uppercase;`,
  placaTitulo: `margin:10px 0 6px;color:#ffffff;font-family:${FUENTE_TITULO};font-size:24px;line-height:1.25;font-weight:800;`,
  placaTexto: `margin:0;color:${COLOR.marca200};font-size:14px;line-height:1.6;`,
  /** Cita o mensaje escrito por una persona. */
  cita: `border-left:4px solid ${COLOR.marca};padding:8px 14px;margin:16px 0;color:${COLOR.texto};font-size:15px;line-height:1.6;white-space:pre-line;`,
} as const;

/* ── Piezas ─────────────────────────────────────────────────────────────── */

/**
 * Botón principal centrado. Va en una tabla con color sólido: Outlook no pinta degradados ni botones hechos solo con CSS.
 * `url` y `texto` deben llegar ya escapados si vienen de fuera.
 */
export function botonCorreo(url: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 6px;"><tr><td bgcolor="${COLOR.marca}" style="background-color:${COLOR.marca};border-radius:12px;box-shadow:0 8px 18px rgba(42,99,205,0.32);"><a href="${url}" target="_blank" style="${CORREO.boton}">${texto}</a></td></tr></table>`;
}

/** Botón de segundo orden: contorno azul, para una acción al lado de la principal. */
export function botonSecundarioCorreo(url: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto 4px;"><tr><td style="border:2px solid ${COLOR.marca200};border-radius:12px;"><a href="${url}" target="_blank" style="display:inline-block;padding:12px 26px;border-radius:12px;color:${COLOR.marca};font-size:15px;line-height:1.2;font-weight:700;text-decoration:none;">${texto}</a></td></tr></table>`;
}

/** Círculo con una marca, sin flex: Outlook y Gmail no lo centran de otra forma. */
export function selloCorreo(tono: 'exito' | 'info' = 'exito'): string {
  const fondo = tono === 'exito' ? COLOR.exito : COLOR.marca;
  return `<div style="width:56px;height:56px;line-height:56px;margin:0 auto 16px;border-radius:50%;background-color:${fondo};color:#ffffff;font-size:28px;font-weight:700;text-align:center;">&#10003;</div>`;
}

/** Rótulo de una sección del cuerpo ("LO QUE VIENE EN TU CAJA", "ASÍ TE LLEGA"). */
export function rotuloCorreo(texto: string, arriba = 26): string {
  return `<p style="${CORREO.rotulo}margin-top:${arriba}px;">${texto}</p>`;
}

/** Párrafo del cuerpo. `html` llega escapado. */
export function parrafoCorreo(html: string, estilo: string = CORREO.texto): string {
  return `<p style="${estilo}">${html}</p>`;
}

/** Los íconos de los avisos: los del pack de la tienda en cian, en PNG (Gmail no lee SVG). */
export type IconoCorreo =
  | 'envio' | 'info' | 'reloj' | 'candado' | 'tienda' | 'regalo' | 'puntos' | 'garantia' | 'correo' | 'verificado'
  | 'paquete' | 'ubicacion' | 'clave' | 'premio' | 'chat' | 'calendario' | 'documento' | 'cuenta' | 'estrella' | 'pago';

/**
 * C-226: lo que el cliente tiene que hacer (o tiene que saber para no llevarse una sorpresa), en el azul claro de la tienda
 * con el ícono blanco en su placa del azul de la marca (C-243). Nunca ámbar. `titulo` y `texto` llegan escapados.
 */
export function avisoCorreo(titulo: string, texto: string, icono: IconoCorreo = 'info'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;"><tr><td bgcolor="${COLOR.marca50}" style="background-color:${COLOR.marca50};border:1px solid ${COLOR.marca200};border-radius:14px;padding:14px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="52" valign="top" style="padding:0 12px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" bgcolor="${COLOR.marca}" style="width:40px;height:40px;background-color:${COLOR.marca};border-radius:12px;"><img src="${imagenCorreo(`icono-${icono}.png`)}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;border:0;"></td></tr></table></td>
      <td valign="top"><p style="margin:0;font-size:15px;line-height:1.4;font-weight:700;color:${COLOR.marca900};">${titulo}</p><p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:${COLOR.texto};">${texto}</p></td>
    </tr></table></td></tr></table>`;
}

/** Una buena noticia en verde (Puntos ES devueltos, algo acreditado). Nunca para una tarea. Todo llega escapado. */
export function exitoCorreo(titulo: string, texto: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;"><tr><td bgcolor="#ecfdf5" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:14px 16px;">
    <p style="margin:0;font-size:15px;line-height:1.4;font-weight:700;color:${COLOR.exito};">${titulo}</p><p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:${COLOR.exito};">${texto}</p></td></tr></table>`;
}

/** Lo que gana el cliente, una ventaja por fila con su ícono en su placa del azul de la marca (la bienvenida, el promotor). */
export function ventajasCorreo(items: Array<{ icono: IconoCorreo; titulo: string; texto: string }>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0;">${items.map((it) => `<tr>
    <td width="52" valign="top" style="padding:10px 12px 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" bgcolor="${COLOR.marca}" style="width:40px;height:40px;background-color:${COLOR.marca};border-radius:12px;"><img src="${imagenCorreo(`icono-${it.icono}.png`)}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;border:0;"></td></tr></table></td>
    <td valign="top" style="padding:10px 0;"><p style="margin:0;font-size:15px;line-height:1.4;font-weight:700;color:${COLOR.tinta};">${it.titulo}</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:${COLOR.texto};">${it.texto}</p></td>
  </tr>`).join('')}</table>`;
}

/** Una nota neutra en caja gris (un dato, no una tarea). `html` llega escapado. */
export function notaCorreo(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;"><tr><td bgcolor="${COLOR.superficie}" style="background-color:${COLOR.superficie};border:1px solid ${COLOR.linea};border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.6;color:${COLOR.texto};">${html}</td></tr></table>`;
}

/**
 * La barra de seguimiento del pedido: lo hecho en verde con su marca, lo de ahora en azul y lo que falta en gris.
 * Celdas de tabla con color sólido: se ve igual en Outlook. `actual` es el índice del paso en curso.
 */
export function seguimientoCorreo(pasos: string[], actual: number): string {
  const ancho = Math.floor(100 / pasos.length);
  const celdas = pasos.map((paso, i) => {
    const color = i < actual ? COLOR.exito : i === actual ? COLOR.marca : '#d5dbe5';
    const texto = i < actual ? COLOR.tinta : i === actual ? COLOR.marca : COLOR.suave;
    return `<td width="${ancho}%" valign="top" style="padding:0 2px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" bgcolor="${color}" style="background-color:${color};height:6px;line-height:6px;font-size:0;border-radius:3px;">&nbsp;</td></tr></table>
      <p style="margin:8px 0 0;font-size:12px;line-height:1.3;font-weight:${i === actual ? 700 : 400};color:${texto};text-align:center;">${i < actual ? '&#10003; ' : ''}${paso}</p></td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;"><tr>${celdas}</tr></table>`;
}

export interface ProductoCorreo {
  nombre: string;
  /** "Cantidad: 1" o un detalle corto ("Usado · Muy bueno · garantía de 30 días") */
  detalle?: string;
  /** "$52,78" */
  monto?: string;
  /** Precio anterior tachado */
  antes?: string;
  /** URL absoluta de la foto (ya en JPEG para Outlook: `fotoCorreo()` de ./marco) */
  foto?: string | null;
  /** A dónde lleva tocar el producto */
  enlace?: string;
  /** Un botón chico debajo del nombre ("Dejar mi reseña") */
  boton?: { texto: string; url: string };
}

/** Lista de productos con foto, nombre, detalle y monto. Todo llega escapado. */
export function productosCorreo(items: ProductoCorreo[]): string {
  const filas = items.map((it) => {
    const foto = it.foto
      ? `<img src="${it.foto}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border:1px solid ${COLOR.linea};border-radius:12px;background-color:#ffffff;">`
      : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="64" height="64" bgcolor="${COLOR.marca50}" style="width:64px;height:64px;background-color:${COLOR.marca50};border-radius:12px;"></td></tr></table>`;
    const nombre = it.enlace
      ? `<a href="${it.enlace}" target="_blank" style="color:${COLOR.tinta};text-decoration:none;">${it.nombre}</a>`
      : it.nombre;
    return `<tr>
      <td width="76" valign="top" style="padding:14px 12px 14px 0;border-bottom:1px solid ${COLOR.linea};">${it.enlace ? `<a href="${it.enlace}" target="_blank">${foto}</a>` : foto}</td>
      <td valign="top" style="padding:14px 0;border-bottom:1px solid ${COLOR.linea};">
        <p style="margin:0;font-size:15px;line-height:1.35;font-weight:600;color:${COLOR.tinta};">${nombre}</p>
        ${it.detalle ? `<p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:${COLOR.suave};">${it.detalle}</p>` : ''}
        ${it.boton ? `<p style="margin:10px 0 0;"><a href="${it.boton.url}" target="_blank" style="display:inline-block;padding:9px 18px;border-radius:10px;background-color:${COLOR.marca};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${it.boton.texto}</a></p>` : ''}
      </td>
      ${it.monto ? `<td valign="top" align="right" style="padding:14px 0 14px 10px;border-bottom:1px solid ${COLOR.linea};white-space:nowrap;"><p style="margin:0;font-size:15px;line-height:1.35;font-weight:700;color:${COLOR.tinta};">${it.monto}</p>${it.antes ? `<p style="margin:2px 0 0;font-size:12px;line-height:1.35;color:${COLOR.suave};text-decoration:line-through;">${it.antes}</p>` : ''}</td>` : ''}
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLOR.linea};">${filas}</table>`;
}

/**
 * Totales: filas chicas y la última en grande, con una nota debajo (el monto en Bs., el IVA).
 * `filas` y `total` llegan escapados y ya con su formato (`formatUSD`).
 */
export function totalesCorreo(filas: [string, string][], total: [string, string], nota?: string): string {
  const fila = ([etiqueta, valor]: [string, string]) => `<tr>
    <td style="padding:4px 0;font-size:14px;line-height:1.4;color:${COLOR.suave};">${etiqueta}</td>
    <td align="right" style="padding:4px 0;font-size:14px;line-height:1.4;font-weight:700;color:${COLOR.tinta};white-space:nowrap;">${valor}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
    ${filas.map(fila).join('')}
    <tr>
      <td style="padding:12px 0 0;border-top:2px solid ${COLOR.linea};font-size:17px;line-height:1.4;font-weight:700;color:${COLOR.tinta};">${total[0]}</td>
      <td align="right" style="padding:12px 0 0;border-top:2px solid ${COLOR.linea};font-size:22px;line-height:1.3;font-weight:800;color:${COLOR.marca};white-space:nowrap;">${total[1]}</td>
    </tr>
    ${nota ? `<tr><td colspan="2" align="right" style="padding:4px 0 0;font-size:13px;line-height:1.5;color:${COLOR.suave};">${nota}</td></tr>` : ''}
  </table>`;
}

/** Pares rótulo/valor ("Referencia: 1234", "Banco: BDV"). Todo llega escapado. */
export function datosCorreo(filas: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLOR.linea};margin:6px 0 0;">${filas.map(([etiqueta, valor]) => `<tr>
    <td style="padding:10px 12px 10px 0;border-bottom:1px solid ${COLOR.linea};font-size:14px;line-height:1.45;color:${COLOR.suave};width:38%;vertical-align:top;">${etiqueta}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${COLOR.linea};font-size:14px;line-height:1.45;font-weight:600;color:${COLOR.tinta};vertical-align:top;">${valor}</td></tr>`).join('')}</table>`;
}

/**
 * C-192: la pieza fuerte de un correo, una sola: el código, el certificado, la gift card, el boleto. C-243: en el azul
 * oscuro del logo, con texto blanco y los rótulos en azul claro. `contenido` llega armado con `CORREO.placa*` y, si hace falta, `placaInteriorCorreo`.
 */
export function placaCorreo(contenido: string, margen = '20px 0 24px'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${margen};"><tr><td bgcolor="${COLOR.marcaOscura}" style="background-color:${COLOR.marcaOscura};border-radius:18px;padding:26px 24px;text-align:center;">${contenido}</td></tr></table>`;
}

/** Recuadro blanco dentro de la placa, para el dato que se copia: el código o el ID de verificación. */
export function placaInteriorCorreo(rotulo: string, dato: string, extra = '', tamano = 20): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;padding:14px 12px;text-align:center;"><p style="margin:0 0 6px;color:${COLOR.suave};font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:1px;">${rotulo}</p><p style="${CORREO.dato}font-size:${tamano}px;font-family:'Courier New',Courier,monospace;">${dato}</p>${extra}</td></tr></table>`;
}

/**
 * El boleto (sorteo) o una entrada: el azul oscuro del logo con el talón a la derecha, separado por una línea punteada.
 * `rotulo`, `titulo`, `texto` y el talón llegan escapados.
 */
export function boletoCorreo(o: { rotulo: string; titulo: string; texto: string; numero: string; unidad: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;"><tr><td bgcolor="${COLOR.marcaOscura}" style="background-color:${COLOR.marcaOscura};border-radius:16px;padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding:18px 16px 18px 20px;border-right:2px dashed ${COLOR.marca};">
        <p style="${CORREO.placaRotulo}">${o.rotulo}</p>
        <p style="margin:6px 0 0;font-family:${FUENTE_TITULO};font-size:19px;line-height:1.25;font-weight:800;color:#ffffff;">${o.titulo}</p>
        <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${COLOR.marca300};">${o.texto}</p>
      </td>
      <td width="88" align="center" valign="middle" style="padding:12px;"><p style="margin:0;font-family:${FUENTE_TITULO};font-size:38px;line-height:1;font-weight:800;color:#ffffff;">${o.numero}</p><p style="margin:4px 0 0;font-size:11px;line-height:1.2;font-weight:800;letter-spacing:1.5px;color:${COLOR.marca300};">${o.unidad}</p></td>
    </tr></table></td></tr></table>`;
}

/**
 * C-263: el boleto épico (la A, "el talón", que eligió el equipo el 15/11), quieto, como el de la tienda: el sorteo, el logo
 * del premio (o su nombre), el correo tapado con que participa, de dónde salió y, en el talón, el código, el día y "2 de 3".
 * En tablas, sin las muescas del troquel (Outlook no las dibuja) y sin la foto adentro: el correo ya la muestra arriba, y
 * en el teléfono no cabrían tres columnas. Todo llega escapado; `logo` es la URL de una imagen propia (o null).
 */
export function boletoEpicoCorreo(o: { rotulo: string; logo: string | null; nombre: string; correo: string; origen: string; codigo: string; dia: string; lugar: string }): string {
  const [c1, c2] = o.codigo.split('-');
  const premio = o.logo
    ? `<img src="${o.logo}" width="108" height="28" alt="${o.nombre}" style="display:block;width:108px;height:28px;margin:10px 0 0;border:0;color:#ffffff;font-size:18px;font-weight:800;">`
    : `<p style="margin:8px 0 0;font-family:${FUENTE_TITULO};font-size:20px;line-height:1.2;font-weight:800;color:#ffffff;">${o.nombre}</p>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;"><tr><td bgcolor="${COLOR.marcaOscura}" style="background-color:${COLOR.marcaOscura};border-radius:16px;padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" style="padding:18px 14px 18px 20px;">
        <p style="${CORREO.placaRotulo}">${o.rotulo}</p>
        ${premio}
        <p style="margin:14px 0 0;font-size:12px;line-height:1.3;color:${COLOR.marca300};">Participa con</p>
        <p style="margin:2px 0 0;font-size:17px;line-height:1.3;font-weight:700;color:#ffffff;word-break:break-all;">${o.correo}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;"><tr><td style="border:1px solid ${COLOR.marca300};border-radius:999px;padding:5px 12px;font-size:12px;line-height:1.3;font-weight:700;color:#ffffff;white-space:nowrap;">${o.origen}</td></tr></table>
      </td>
      <td width="96" align="center" valign="middle" style="width:96px;padding:16px 8px;border-left:2px dashed ${COLOR.marca300};">
        <p style="margin:0;font-size:11px;line-height:1.3;font-weight:800;letter-spacing:2px;color:${COLOR.marca300};">BOLETO</p>
        <p style="margin:8px 0 0;font-family:${FUENTE_TITULO};font-size:24px;line-height:1.15;font-weight:800;letter-spacing:3px;color:#ffffff;">${c1}<br>${c2 ?? ''}</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.3;font-weight:800;color:#ffffff;">${o.dia}</p>
        <p style="margin:2px 0 0;font-size:12px;line-height:1.3;color:${COLOR.marca300};">${o.lugar}</p>
      </td>
    </tr></table></td></tr></table>`;
}

/** Las poses de Chispa (las mismas de ElectroStudio, `public/images/studio/chispa-31`, a la mitad). */
export type PoseChispa = 'celebra' | 'saluda' | 'pulgar' | 'explica' | 'senala';

/**
 * Chispa, abajo, hablando en un globo (pedido del equipo el 14/11: "que el header te reciba ELECTRO SHOP, Chispa puede ir
 * abajo"). Con gorro mientras el tema de Navidad está encendido. `texto` llega escapado (puede traer un enlace armado).
 */
export function chispaCorreo(pose: PoseChispa, texto: string, gorro: boolean): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0;"><tr>
    <td width="112" valign="bottom" style="padding:0 8px 0 0;"><img src="${imagenCorreo(`chispa-${pose}${gorro ? '-gorro' : ''}.png`)}" width="104" alt="" style="display:block;width:104px;height:auto;border:0;"></td>
    <td valign="middle"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${COLOR.marca50}" style="background-color:${COLOR.marca50};border:1px solid ${COLOR.marca200};border-radius:18px 18px 18px 4px;padding:14px 16px;">
      <p style="margin:0;font-size:11px;line-height:1.3;font-weight:800;letter-spacing:1.5px;color:${COLOR.marca};">CHISPA · ELECTRO SHOP</p>
      <p style="margin:6px 0 0;font-size:15px;line-height:1.55;color:${COLOR.tinta};">${texto}</p>
    </td></tr></table></td>
  </tr></table>`;
}

/** "Escríbenos por WhatsApp" como enlace verde con su ícono. `numero` son solo dígitos (582572511282). */
export function enlaceWhatsAppCorreo(numero: string, texto = 'Escríbenos por WhatsApp', mensaje?: string): string {
  if (!numero) return '';
  const url = `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
  return `<a href="${url}" target="_blank" style="color:${COLOR.exito};font-weight:700;text-decoration:none;white-space:nowrap;">${texto}</a>`;
}
