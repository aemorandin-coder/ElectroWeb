/**
 * ELECTRO SHOP — EL MARCO DE TODOS LOS CORREOS (C-219)
 * La maqueta C que eligió el equipo el 14/11: clara, con la cinta ES en la esquina, ELECTRO SHOP grande arriba ("que el
 * header te reciba ELECTRO SHOP"), el mensaje con su sello, Chispa abajo y el cierre de los reels: "Compra tecnología sin
 * miedo", el contacto, ZOOM y MRW, y la razón social con el RIF.
 *
 * Los datos salen de Configuración (`getPublicSettings`): el lema, el contacto, las redes, el RIF y el gorro de Navidad.
 * Lo que llega en `encabezado`, `cuerpo`, `chispa` y `motivo` ya viene escapado por quien llama.
 */

import { getPublicSettings } from '@/lib/site-settings';
import { escapeHtml } from '@/lib/html';
import { COLOR, FUENTE, FUENTE_TITULO, chispaCorreo, imagenCorreo, urlTienda, type PoseChispa } from './estilo';

export interface AjustesCorreo {
  empresa: string;
  lema: string;
  telefono: string;
  correo: string;
  /** Solo dígitos, para wa.me */
  whatsapp: string;
  /** "+58 257 251 1282" */
  whatsappVisible: string;
  ciudad: string;
  direccion: string;
  razonSocial: string;
  rif: string;
  redes: Array<{ nombre: string; archivo: string; url: string }>;
  /** El tema de Navidad está encendido hoy: Chispa lleva el gorro */
  gorro: boolean;
  /** Bs. por dólar del día */
  tasaVES: number;
}

const LEMA = 'Todo lo encuentras con nosotros.';

/** "J40590333-3" o "J-40590333-3" → "J-40590333-3" */
function formatoRif(rif: string | null | undefined): string {
  const limpio = (rif || '').replace(/\s/g, '').toUpperCase();
  const m = limpio.match(/^([JVEGP])-?(\d{7,9})-?(\d)$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : limpio;
}

/** "+58 2572511282" → "+58 257 251 1282" (Venezuela); otro formato queda como se escribió. */
function formatoWhatsApp(digitos: string, original: string): string {
  return /^58\d{10}$/.test(digitos)
    ? `+58 ${digitos.slice(2, 5)} ${digitos.slice(5, 8)} ${digitos.slice(8)}`
    : original.trim();
}

/** Los datos de Configuración que usan los correos. Nunca falla: sin base, los de siempre. */
export async function ajustesCorreo(): Promise<AjustesCorreo> {
  const s = await getPublicSettings().catch(() => null);
  const whatsapp = (s?.whatsapp || '').replace(/\D/g, '');
  const redes: AjustesCorreo['redes'] = [
    { nombre: 'Instagram', archivo: 'instagram', url: s?.instagram || '' },
    { nombre: 'WhatsApp', archivo: 'whatsapp', url: whatsapp ? `https://wa.me/${whatsapp}` : '' },
    { nombre: 'TikTok', archivo: 'tiktok', url: s?.tiktok || '' },
    { nombre: 'YouTube', archivo: 'youtube', url: s?.youtube || '' },
    { nombre: 'Facebook', archivo: 'facebook', url: s?.facebook || '' },
    { nombre: 'Telegram', archivo: 'telegram', url: s?.telegram || '' },
    { nombre: 'X', archivo: 'twitter', url: s?.twitter || '' },
  ].filter((r) => /^https?:\/\//i.test(r.url));
  return {
    empresa: s?.companyName || 'Electro Shop',
    lema: s?.tagline || LEMA,
    telefono: s?.phone || '',
    correo: s?.email || '',
    whatsapp,
    whatsappVisible: formatoWhatsApp(whatsapp, s?.whatsapp || ''),
    ciudad: s?.city || 'Guanare',
    direccion: [s?.address, s?.city, s?.state].filter(Boolean).join(', '),
    // "Electro Shop Morandin CA" → "Electro Shop Morandin C.A.": la abreviatura de compañía anónima
    razonSocial: (s?.legalName || 'Electro Shop Morandin C.A.').replace(/\bC\.?\s?A\.?$/i, 'C.A.'),
    rif: formatoRif(s?.rif),
    redes,
    gorro: Boolean(s?.gorroNavidad),
    tasaVES: Number(s?.exchangeRateVES) || 0,
  };
}

/**
 * La foto de un producto para un correo, en JPEG y del tamaño justo: Outlook de Windows no muestra WebP, que es como se
 * guardan las fotos (C-219). Solo las fotos subidas a la tienda; una dirección https queda como está.
 */
export function fotoCorreo(ruta: string | null | undefined, ancho = 128): string | null {
  if (!ruta) return null;
  if (/^https:\/\//i.test(ruta)) return ruta;
  const m = ruta.match(/^\/(?:api\/)?uploads\/((?:[\w-]+\/)*[\w-][\w.-]*)$/);
  return m ? `${urlTienda()}/api/public/foto-correo/${m[1]}?w=${ancho}` : null;
}

export interface EncabezadoCorreo {
  /** El sello sobre el título, en mayúsculas: "PAGO CONFIRMADO" */
  sello?: string;
  /** Puede llevar <br> */
  titulo: string;
  texto?: string;
  /** La línea chica de abajo: "Orden ORD-2026-0142 · 14 de noviembre de 2026" */
  dato?: string;
}

export type PieCorreo = 'cliente' | 'equipo';

export interface OpcionesCorreo {
  /** El texto que se ve en la bandeja junto al asunto. Va sin escapar: se escapa aquí. */
  preheader?: string;
  encabezado?: EncabezadoCorreo;
  cuerpo: string;
  /** Chispa abajo, con su globo */
  chispa?: { pose: PoseChispa; texto: string };
  /** 'cliente' (el cierre "sin miedo") o 'equipo' (los avisos internos) */
  pie?: PieCorreo;
  /** Por qué le escribimos (va en el pie). Por defecto, su cuenta en la tienda. */
  motivo?: string;
}

/** El correo completo, listo para `sendEmail`. */
export async function marcoCorreo(o: OpcionesCorreo): Promise<string> {
  const a = await ajustesCorreo();
  const app = urlTienda();
  const dominio = app.replace(/^https?:\/\//, '');
  const pie = o.pie || 'cliente';
  const motivo = o.motivo || `Recibes este correo por tu cuenta en ${escapeHtml(dominio)}.`;
  const e = (t: string) => escapeHtml(t);

  const encabezado = o.encabezado
    ? `
        <tr><td align="center" class="cabeza-msj" style="padding:24px 30px 34px;">
          ${o.encabezado.sello ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="${COLOR.marca}" style="background-color:${COLOR.marca};border-radius:999px;padding:7px 16px;"><span style="font-family:${FUENTE};font-size:12px;line-height:1.2;font-weight:800;letter-spacing:2px;color:#ffffff;">${o.encabezado.sello}</span></td></tr></table>` : ''}
          <h1 class="titulo" style="margin:16px 0 0;font-family:${FUENTE_TITULO};font-size:34px;line-height:1.12;font-weight:800;letter-spacing:-0.4px;color:${COLOR.tinta};">${o.encabezado.titulo}</h1>
          ${o.encabezado.texto ? `<p class="bajada" style="margin:14px auto 0;max-width:470px;font-family:${FUENTE};font-size:17px;line-height:1.55;color:${COLOR.texto};">${o.encabezado.texto}</p>` : ''}
          ${o.encabezado.dato ? `<p style="margin:14px 0 0;font-family:${FUENTE};font-size:13px;line-height:1.4;font-weight:600;letter-spacing:0.3px;color:${COLOR.suave};">${o.encabezado.dato}</p>` : ''}
        </td></tr>`
    : '';

  const iconos = a.redes
    .map((r) => `<a href="${e(r.url)}" target="_blank" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${app}/images/social/${r.archivo}.png" width="30" height="30" alt="${r.nombre}" style="display:block;width:30px;height:30px;border:0;border-radius:8px;color:#ffffff;font-family:${FUENTE};font-size:10px;line-height:30px;text-align:center;"></a>`)
    .join('');
  const pastilla = (texto: string) => `<span style="display:inline-block;margin:4px 3px;padding:7px 13px;border-radius:999px;background-color:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.32);font-family:${FUENTE};font-size:12px;line-height:1.2;font-weight:600;color:#ffffff;white-space:nowrap;">${texto}</span>`;
  const legal = (color: string) => `<p style="margin:16px 0 0;font-family:${FUENTE};font-size:11px;line-height:1.6;color:${color};">${e(a.razonSocial)}${a.rif ? ` · RIF ${e(a.rif)}` : ''}${a.direccion ? `<br>${e(a.direccion)}` : ''}<br>${motivo}</p>`;

  const cierre = pie === 'equipo'
    ? `
  <tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;border-radius:0 0 20px 20px;border-top:1px solid ${COLOR.linea};padding:20px 30px 26px;text-align:center;">
    <p style="margin:0;font-family:${FUENTE};font-size:12px;line-height:1.6;color:${COLOR.suave};">Mensaje automático para el equipo de ${e(a.empresa)}. Qué avisos te llegan se cambia en el panel, en Notificaciones.</p>
    ${legal(COLOR.suave)}
  </td></tr>`
    : `
  <tr><td bgcolor="#ffffff" class="pie" style="background-color:#ffffff;border-radius:0 0 20px 20px;padding:4px 18px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${COLOR.marca}" align="center" style="background-color:${COLOR.marca};background-image:url('${imagenCorreo('fondo-azul.jpg')}');background-size:cover;background-position:center;border-radius:16px;padding:30px 18px 24px;text-align:center;">
      <p style="margin:0;font-family:${FUENTE_TITULO};font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;">Compra tecnología<br><span style="display:inline-block;margin-top:8px;background-color:#ffffff;color:${COLOR.marcaOscura};border-radius:999px;padding:3px 18px;transform:rotate(-3deg);">sin miedo</span></p>
      <div style="margin-top:18px;">${pastilla(e(dominio))}${a.whatsappVisible ? pastilla(`WhatsApp ${e(a.whatsappVisible)}`) : ''}${pastilla(`14 años en ${e(a.ciudad)} · Envíos a toda Venezuela`)}</div>
      ${iconos ? `<div style="margin-top:14px;">${iconos}</div>` : ''}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 0;"><tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;padding:8px 14px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle" style="padding:0 8px 0 0;font-family:${FUENTE};font-size:11px;line-height:1;font-weight:600;color:${COLOR.suave};white-space:nowrap;">Envíos por</td>
          <td valign="middle" width="82" style="padding:0 8px 0 0;"><img src="${imagenCorreo('zoom.png')}" height="16" width="82" alt="ZOOM" style="display:block;height:16px;width:82px;border:0;font-family:${FUENTE};font-size:12px;font-weight:700;color:${COLOR.marca};"></td>
          <td valign="middle" width="98"><img src="${imagenCorreo('mrw.png')}" height="16" width="98" alt="MRW" style="display:block;height:16px;width:98px;border:0;font-family:${FUENTE};font-size:12px;font-weight:700;color:${COLOR.tinta};"></td>
        </tr></table>
      </td></tr></table>
      ${legal('#c9d8f6')}
      <p style="margin:6px 0 0;font-family:${FUENTE};font-size:11px;line-height:1.5;color:#c9d8f6;">ZOOM y MRW son marcas de sus dueños.</p>
    </td></tr></table>
  </td></tr>`;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${e(a.empresa)}</title>
<style>
  @media (max-width:520px){
    .marco{padding:12px 8px !important}
    .cabeza{padding:30px 58px 0 !important}
    .cabeza-fondo{background-size:56px 56px !important}
    .cabeza-msj{padding:22px 16px 28px !important}
    .cuerpo{padding:24px 18px 10px !important}
    .pie{padding:4px 10px 10px !important}
    .titulo{font-size:28px !important}
    .bajada{font-size:16px !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.fondo};">
${o.preheader ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLOR.fondo};">${e(o.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.fondo}" style="background-color:${COLOR.fondo};">
<tr><td align="center" class="marco" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

  <!-- ELECTRO SHOP te recibe: el logo grande, la cinta en la esquina y el lema -->
  <tr><td bgcolor="#ffffff" align="center" class="cabeza-fondo" style="background-color:#ffffff;background-image:url('${imagenCorreo('cinta.png')}');background-repeat:no-repeat;background-position:right top;background-size:84px 84px;border-radius:20px 20px 0 0;padding:0;${o.encabezado ? `border-bottom:1px solid ${COLOR.linea};` : ''}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" class="cabeza" style="padding:40px 84px ${o.encabezado ? '0' : '26px'};">
        <a href="${app}" target="_blank" style="text-decoration:none;"><img src="${imagenCorreo('logo.png')}" width="340" alt="ELECTRO SHOP" style="display:block;margin:0 auto;width:340px;max-width:100%;height:auto;border:0;font-family:${FUENTE};font-size:30px;line-height:1.2;font-weight:800;letter-spacing:4px;color:${COLOR.marca};"></a>
        <p style="margin:10px 0 0;font-family:${FUENTE};font-size:13px;line-height:1.4;color:${COLOR.suave};">${e(a.lema)}</p>
      </td></tr>${encabezado}
    </table>
  </td></tr>

  <!-- El mensaje -->
  <tr><td bgcolor="#ffffff" class="cuerpo" style="background-color:#ffffff;padding:28px 30px 12px;font-family:${FUENTE};font-size:16px;line-height:1.6;color:${COLOR.texto};">
    ${o.cuerpo}
    ${o.chispa ? chispaCorreo(o.chispa.pose, o.chispa.texto, a.gorro) : ''}
  </td></tr>
${cierre}
</table>
</td></tr>
</table>
</body>
</html>`;
}
