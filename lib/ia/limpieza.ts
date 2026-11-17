// C-288 · Las funciones que limpian y comprueban el texto que redacta Claude. Módulo PURO (sin Prisma, sin red): lo usan
// revisar.ts (las reglas de cada uso), texto.ts y el guion de pruebas. Cada una devuelve el texto limpio y la lista de
// cambios { regla, accion, antes, despues } para anotarlos (lib/ia/atajadas.ts) y mostrarlos en Configuración → IA · Claude.
//
// Trabajan por oración: lo que se quita o se cambia es la oración entera de la que sale el problema, y cada cambio dice cómo
// estaba y cómo quedó. Las reglas de comprobación (un modelo, peso, descripción…) están en revisar.ts.

import type { Accion, Cambio } from './reglas';

export interface ResultadoTexto {
  texto: string;
  cambios: Cambio[];
}

export const recortar = (texto: string, largo = 300): string => (texto.length > largo ? `${texto.slice(0, largo - 1).trimEnd()}…` : texto);

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ───── Oraciones ─────

/** Abreviaturas que terminan en punto sin terminar la oración: "Bs. 1.200", "aprox. 30 cm" */
const ABREVIATURA = String.raw`(?<![\p{L}])(?:Bs|Sr|Sra|Srta|Dr|Dra|Ing|Lic|aprox|máx|mín|pág|núm|Nro|Av|Urb|Tel|Cel|ej|vs)`;
/** El fin de una oración: un signo y, después, un espacio o el final. Los decimales ("3.5 cm") y las abreviaturas no cortan */
const FIN_DE_ORACION = new RegExp(String.raw`(?<!${ABREVIATURA})[.!?…]+["'”’)\]]*(?=\s|$)`, 'giu');

/** Las oraciones de una línea, cada una con el espacio que la precede: al juntarlas queda el texto de antes */
function oracionesDeLinea(linea: string): string[] {
  const salida: string[] = [];
  let inicio = 0;
  for (const m of linea.matchAll(FIN_DE_ORACION)) {
    const fin = (m.index ?? 0) + m[0].length;
    salida.push(linea.slice(inicio, fin));
    inicio = fin;
  }
  if (inicio < linea.length) salida.push(linea.slice(inicio));
  return salida;
}

/** Las oraciones de un texto (los saltos de línea también separan) */
export function oracionesDe(texto: string): string[] {
  return texto.split('\n').flatMap(oracionesDeLinea).map((o) => o.trim()).filter(Boolean);
}

export const contarOraciones = (texto: string): number => oracionesDe(texto).length;

/**
 * Pasa cada oración por `transformar`: devuelve la oración nueva, la misma (sin cambio) o null (se quita). Junta el resultado
 * respetando los saltos de línea y anota cada cambio.
 */
function porOracion(texto: string, regla: string, accion: Accion, transformar: (oracion: string) => string | null, verAntes: (o: string) => string = (o) => o): ResultadoTexto {
  const cambios: Cambio[] = [];
  const original = texto.split('\n');
  const lineas = original.map((linea) => {
    let cambio = false;
    const piezas = oracionesDeLinea(linea).map((pieza) => {
      const oracion = pieza.trim();
      if (!oracion) return pieza;
      const nueva = transformar(oracion);
      if (nueva === oracion) return pieza;
      cambio = true;
      cambios.push({ regla, accion, antes: recortar(verAntes(oracion)), despues: nueva === null ? null : recortar(nueva) });
      return nueva === null ? '' : `${pieza.slice(0, pieza.length - pieza.trimStart().length)}${nueva}`;
    });
    return cambio ? piezas.join('').trim() : linea;
  });
  // Una línea que se quedó vacía por quitarle todo no deja un hueco
  return { texto: lineas.filter((l, i) => l !== '' || original[i].trim() === '').join('\n'), cambios };
}

/** Lo mismo, pero por línea entera: para lo que cruza oraciones (un grito como "GRATIS!!! SOLO HOY") */
function porLinea(texto: string, regla: string, accion: Accion, transformar: (linea: string) => string): ResultadoTexto {
  const cambios: Cambio[] = [];
  const lineas = texto.split('\n').map((linea) => {
    const nueva = transformar(linea);
    if (nueva !== linea) cambios.push({ regla, accion, antes: recortar(linea.trim()), despues: recortar(nueva.trim()) });
    return nueva;
  });
  return { texto: lineas.join('\n'), cambios };
}

// ───── Frases que nunca van (notas para el equipo) ─────

interface PatronDeFrase { rx: RegExp; enMinusculas: boolean }

/**
 * Una frase se busca por frase completa y sin distinguir mayúsculas ni acentos ("revísalo antes de publicar" es lo mismo que
 * "Revísalo antes de Publicar"). Una frase escrita toda en mayúsculas ("TODO") solo cuenta en mayúsculas: "todo" es una
 * palabra de todos los días. Una con corchetes ("[completar]") se busca con ellos: "completar" suelta no cuenta.
 */
function patronDeFrase(frase: string): PatronDeFrase | null {
  const f = frase.trim();
  if (f.length < 3) return null;
  const enMayusculas = f === f.toUpperCase() && f !== f.toLowerCase();
  const cuerpo = (enMayusculas ? f : sinAcentos(f.toLowerCase())).split(/\s+/).map(escapar).join('\\s+');
  const izquierda = /^[\p{L}\p{N}]/u.test(f) ? '(?<![\\p{L}\\p{N}])' : '';
  const derecha = /[\p{L}\p{N}]$/u.test(f) ? '(?![\\p{L}\\p{N}])' : '';
  return { rx: new RegExp(`${izquierda}${cuerpo}${derecha}`, 'u'), enMinusculas: !enMayusculas };
}

const memoria = new Map<string, PatronDeFrase[]>();
function patronesDe(frases: readonly string[]): PatronDeFrase[] {
  const llave = frases.join('\u0001');
  let patrones = memoria.get(llave);
  if (!patrones) {
    patrones = frases.map(patronDeFrase).filter((p): p is PatronDeFrase => p !== null);
    if (memoria.size > 20) memoria.clear();
    memoria.set(llave, patrones);
  }
  return patrones;
}

/** La primera frase de la lista que trae este texto, o null */
export function fraseQueTrae(texto: string, frases: readonly string[]): string | null {
  const patrones = patronesDe(frases);
  const normal = sinAcentos(texto.toLowerCase());
  const indice = patrones.findIndex((p) => p.rx.test(p.enMinusculas ? normal : texto));
  return indice >= 0 ? frases.filter((f) => f.trim().length >= 3)[indice] : null;
}

/** notas-equipo: quita la oración entera que trae una frase prohibida */
export function quitarNotasDelEquipo(texto: string, frases: readonly string[]): ResultadoTexto {
  return porOracion(texto, 'notas-equipo', 'quita', (o) => (fraseQueTrae(o, frases) ? null : o));
}

// ───── Puntos ES ─────

const SALDO = String.raw`(?:saldo(?: a favor| disponible| actual)?|billetera|monedero|wallet)`;
const LUGAR_DEL_SALDO = new RegExp(String.raw`\s+(?:en|de) (?:su|tu|la|el) (?:billetera|monedero|wallet)(?![\p{L}\p{N}])`, 'giu');
const CON_DETERMINANTE = new RegExp(String.raw`(?<![\p{L}\p{N}])(tu|su|mi|el|la|un|una|del|al)\s+${SALDO}(?![\p{L}\p{N}])`, 'giu');
const SIN_DETERMINANTE = new RegExp(String.raw`(?<![\p{L}\p{N}])${SALDO}(?![\p{L}\p{N}])`, 'giu');
const PLURAL_DE: Record<string, string> = { tu: 'tus', su: 'sus', mi: 'mis', el: 'los', la: 'los', un: 'unos', una: 'unos', del: 'de los', al: 'a los' };

/** Una sola oración o texto corto: "tu saldo" → "tus Puntos ES"; "saldo", "billetera", "monedero" y "wallet" → "Puntos ES" */
export function puntosEsEn(texto: string): string {
  return texto
    // "en su billetera" sobra: lo que queda ("tiene $12,50 de saldo") pasa a "tiene $12,50 de Puntos ES"
    .replace(LUGAR_DEL_SALDO, '')
    .replace(CON_DETERMINANTE, (_todo, det: string) => {
      const plural = PLURAL_DE[det.toLowerCase()] ?? det;
      return `${det[0] === det[0].toUpperCase() ? plural[0].toUpperCase() + plural.slice(1) : plural} Puntos ES`;
    })
    .replace(SIN_DETERMINANTE, 'Puntos ES');
}

/** puntos-es */
export function aPuntosEs(texto: string): ResultadoTexto {
  return porOracion(texto, 'puntos-es', 'cambia', puntosEsEn);
}

// ───── Emojis, mayúsculas sostenidas y signos repetidos ─────

const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{FE0F}\u{200D}\u{20E3}]/gu;

export const quitarEmojisEn = (texto: string): string => (EMOJI.test(texto) ? texto.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([.,;:!?])/g, '$1') : texto);

/** sin-emojis: quita emojis y pictogramas. En el registro no se guardan: queda "[emoji]" */
export function sinEmojis(texto: string): ResultadoTexto {
  return porOracion(texto, 'sin-emojis', 'quita', (o) => {
    const limpia = quitarEmojisEn(o).trim();
    return limpia === o ? o : limpia === '' ? null : limpia;
  }, (o) => o.replace(EMOJI, '[emoji]'));
}

/** Siglas y marcas que se escriben en mayúsculas: dentro de una racha de gritos se respetan */
const SIGLAS = new Set([
  'USB', 'HDMI', 'LED', 'LCD', 'OLED', 'QLED', 'UHD', 'FHD', 'SSD', 'HDD', 'NVME', 'RAM', 'ROM', 'GPU', 'CPU', 'DVD', 'VGA', 'DVI',
  'RGB', 'LAN', 'WIFI', 'NFC', 'GPS', 'PVC', 'PPR', 'IPS', 'HDR', 'AMD', 'RTX', 'GTX', 'ARC', 'DDR', 'PCIE', 'SATA', 'MIDI', 'XLR',
  'RCA', 'AUX', 'TWS', 'ANC', 'RPM', 'CCTV', 'DVR', 'NVR', 'POE', 'HDTV', 'VPN', 'SIM', 'OTG', 'DPI', 'FPS', 'LTE', 'UPS', 'AVR',
  'BIOS', 'PCB', 'PLC', 'PWM', 'AWG', 'PTFE', 'HEPA', 'ABS', 'EVA', 'TPU', 'PET', 'ATX', 'MIG', 'TIG', 'MMA', 'AGM', 'IGBT',
]);
const esGrito = (palabra: string) => /^\p{Lu}{3,}$/u.test(palabra);
const PALABRA = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
/** Entre dos palabras de un grito solo hay espacios y un poco de puntuación */
const ENTRE_GRITOS = /^[ \t,;:.!¡?¿-]*$/;

function bajarGritosEn(linea: string): string {
  const palabras = [...linea.matchAll(PALABRA)].map((m) => ({ texto: m[0], inicio: m.index ?? 0 }));
  let salida = linea;
  let i = 0;
  while (i < palabras.length) {
    if (!esGrito(palabras[i].texto)) { i++; continue; }
    // La racha: gritos seguidos, uno tras otro
    let j = i;
    while (j + 1 < palabras.length && esGrito(palabras[j + 1].texto)
      && ENTRE_GRITOS.test(linea.slice(palabras[j].inicio + palabras[j].texto.length, palabras[j + 1].inicio))) j++;
    const racha = palabras.slice(i, j + 1);
    // Dos o más palabras, y alguna de 5 letras o más que no sea una sigla: "USB HDMI" no es un grito, "GRATIS SOLO HOY" sí
    if (racha.length >= 2 && racha.some((p) => p.texto.length >= 5 && !SIGLAS.has(p.texto))) {
      const empiezaOracion = /(?:^|[.!?…]\s+)["'“(¡¿-]*$/.test(linea.slice(0, racha[0].inicio));
      racha.forEach((p, k) => {
        if (SIGLAS.has(p.texto)) return;
        const bajada = p.texto.toLowerCase();
        const nueva = k === 0 && empiezaOracion ? bajada[0].toUpperCase() + bajada.slice(1) : bajada;
        // Misma longitud: las posiciones de las demás palabras no se mueven
        salida = salida.slice(0, p.inicio) + nueva + salida.slice(p.inicio + p.texto.length);
      });
    }
    i = j + 1;
  }
  return salida;
}

/** "!!" y "¡¡" quedan en uno (y "??", "¿¿") */
const unSigno = (texto: string) => texto.replace(/!{2,}/g, '!').replace(/¡{2,}/g, '¡').replace(/\?{2,}/g, '?').replace(/¿{2,}/g, '¿');

/** sin-gritos: "GRATIS SOLO HOY!!!" → "Gratis solo hoy!". "Cable USB HDMI 4K" no se toca */
export function sinGritos(texto: string): ResultadoTexto {
  return porLinea(texto, 'sin-gritos', 'cambia', (linea) => unSigno(bajarGritosEn(linea)));
}

// ───── Enlaces ─────

const URL_CON_ESQUEMA = /(?:https?:\/\/|www\.)[^\s<>"'`)\]]+/gi;
const DOMINIO_SUELTO = /(?<![@\w./-])(?:[a-z0-9-]+\.)+(?:com|net|org|info|biz|shop|store|online|site|app|io|co|ve|es|mx|us|ly)(?:\.[a-z]{2})?(?:\/[^\s<>"'`)\]]*)?(?![\w@-])/gi;
const hostDe = (url: string) => url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/:?#]/)[0].toLowerCase();
const esDeLaTienda = (host: string) => host === 'electroshopve.com' || host.endsWith('.electroshopve.com');

/** Los enlaces que aparecen en un texto (para saber cuáles le mandó la tienda a Claude) */
export function enlacesDe(texto: string): string[] {
  return [...(texto.match(URL_CON_ESQUEMA) ?? []), ...(texto.match(DOMINIO_SUELTO) ?? [])];
}

/** solo-enlaces-tienda: quita las direcciones que no son de electroshopve.com ni de las que le mandó la tienda (`permitidas`) */
export function soloEnlacesDeLaTienda(texto: string, permitidas: readonly string[] = []): ResultadoTexto {
  const hostsPermitidos = new Set(permitidas.map(hostDe));
  const valido = (url: string) => {
    const host = hostDe(url);
    return esDeLaTienda(host) || hostsPermitidos.has(host);
  };
  return porOracion(texto, 'solo-enlaces-tienda', 'quita', (o) => {
    const quitar = (rx: RegExp) => (s: string) => s.replace(rx, (url) => {
      const limpia = url.replace(/[.,;:!?]+$/, '');
      return valido(limpia) ? url : url.slice(limpia.length);
    });
    const nueva = quitar(DOMINIO_SUELTO)(quitar(URL_CON_ESQUEMA)(o))
      .replace(/\(\s*\)/g, '').replace(/\s+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
    return nueva === o ? o : nueva === '' ? null : nueva;
  });
}

// ───── Oraciones con precios, garantías o envíos ─────

/** Un precio: una cifra con $, USD, Bs o dólares/bolívares, de un lado o del otro. La cifra no es parte de un código ("ETID65 $45") */
export const PRECIO = /(?:\$|US\$|(?<![\p{L}\p{N}])(?:USD|VES|BsF|BsS|Bs)\.?)\s?\d|(?<![\p{L}\p{N}.,])\d[\d.,]*\s?(?:\$(?!\s?\d)|(?<![\p{L}\p{N}])(?:USD|VES|Bs)(?![\p{L}\p{N}])|d[óo]lares|bol[íi]vares)/iu;
const GARANTIA = /(?<![\p{L}\p{N}])(?:garant[íi]a|garantizad[oa]s?|warranty)(?![\p{L}\p{N}])/iu;
const ENVIO_GRATIS = /(?<![\p{L}\p{N}])(?:env[íi]os?\s+(?:gratis|gratuitos?|sin costo)|free\s+shipping|delivery\s+gratis)(?![\p{L}\p{N}])/iu;

export const tienePrecio = (texto: string): boolean => PRECIO.test(texto);

/** Quita las oraciones que cumplen una condición. Quien llama decide cómo anotarlo */
export function quitarOracionesQue(valor: string, regla: string, cuando: (oracion: string) => boolean): ResultadoTexto {
  return porOracion(valor, regla, 'quita', (o) => (cuando(o) ? null : o));
}

/** Quita las oraciones que traen un precio (campañas: la tienda pone el precio de cada producto) */
export function quitarOracionesConPrecio(texto: string, regla: string): ResultadoTexto {
  return porOracion(texto, regla, 'quita', (o) => (tienePrecio(o) ? null : o));
}

/** descripcion-limpia: quita las oraciones con precios, garantías o "envío gratis" (los pone la tienda) */
export function quitarPromesasDeLaDescripcion(texto: string): ResultadoTexto {
  return porOracion(texto, 'descripcion-limpia', 'quita', (o) => (tienePrecio(o) || GARANTIA.test(o) || ENVIO_GRATIS.test(o) ? null : o));
}

// ───── Datos personales ─────

const CORREO = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
/** Teléfonos de Venezuela y de afuera: 0412-1234567, +58 412 123 45 67, (0414) 111.22.33. Un monto con $ no cuenta */
const TELEFONO = /(?<![\d$.,])(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?![\d,]\d)(?!\d)/g;
const CEDULA = /(?<![\p{L}\p{N}])[VvEe][-\s]?\d{1,2}\.?\d{3}\.?\d{3}(?!\d)|(?<![\p{L}\p{N}])(?:c[ée]dula|c\.i\.?|ci)\s*(?:n[úu]mero|nro\.?|n[°º])?\s*[:#-]?\s*\d[\d.]{5,12}/giu;

/** Lo que se ve de un texto sin correos, teléfonos ni cédulas: cada dato pasa a "[correo]", "[teléfono]" o "[cédula]" */
export function enmascararDatosPersonales(texto: string): string {
  return texto.replace(CORREO, '[correo]').replace(CEDULA, '[cédula]').replace(TELEFONO, '[teléfono]');
}

/**
 * Quita correos, teléfonos y cédulas. Con `oracion`, quita la oración entera que trae uno (en un resumen largo, lo que queda
 * de "Su correo es pedro@x.com." no dice nada). Quien registra el cambio los enmascara: el registro nunca guarda un dato personal.
 */
export function quitarDatosPersonales(texto: string, regla: string, oracion = false): ResultadoTexto {
  return porOracion(texto, regla, 'quita', (o) => {
    const limpia = o.replace(CORREO, '').replace(CEDULA, '').replace(TELEFONO, '');
    if (limpia === o) return o;
    if (oracion) return null;
    const ordenada = limpia.replace(/\(\s*\)/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
    return ordenada === '' ? null : ordenada;
  });
}

// ───── Idioma ─────

const INGLES = new Set(['the', 'and', 'with', 'for', 'are', 'was', 'were', 'this', 'that', 'from', 'your', 'you', 'its', 'which', 'also', 'will',
  'have', 'not', 'but', 'these', 'they', 'their', 'into', 'when', 'what', 'where', 'can', 'has', 'been', 'more', 'than', 'our', 'any', 'such',
  'perfect', 'designed', 'features', 'easy', 'high', 'quality', 'great', 'built']);
const ESPANOL = new Set(['de', 'la', 'el', 'en', 'con', 'para', 'que', 'los', 'las', 'un', 'una', 'y', 'es', 'se', 'por', 'del', 'al', 'su', 'sus',
  'más', 'mas', 'como', 'sin', 'o', 'ideal', 'permite', 'incluye', 'tiene', 'hogar', 'uso', 'fácil', 'facil', 'alta', 'calidad', 'diseñado']);

/** true si el texto está escrito en inglés: más palabras corrientes del inglés que del español, y al menos 3 */
export function estaEnIngles(texto: string): boolean {
  const palabras = texto.toLowerCase().normalize('NFC').match(/[a-záéíóúñü]+/g) ?? [];
  const en = palabras.filter((p) => INGLES.has(p) && !ESPANOL.has(p)).length;
  const es = palabras.filter((p) => ESPANOL.has(p) && !INGLES.has(p)).length;
  return en >= 3 && en > es;
}

// ───── Juntas: lo de todos los usos ─────

export interface OpcionesDeSalida {
  frases?: readonly string[];
  /** Direcciones que la tienda le mandó a Claude y pueden aparecer */
  permitidas?: readonly string[];
  /** Cuáles de las reglas de varios usos valen para este texto */
  notas?: boolean;
  enlaces?: boolean;
  precios?: string;
  datosPersonales?: string;
}

/**
 * Lo que valen para todo texto que escribe Claude (emojis, Puntos ES, mayúsculas sostenidas) y, según el campo, las notas
 * para el equipo, los enlaces, los precios y los datos personales. El orden importa: primero lo que quita, después lo que cambia.
 */
export function limpiarSalida(texto: string, opciones: OpcionesDeSalida = {}): ResultadoTexto {
  const pasos: Array<(t: string) => ResultadoTexto> = [sinEmojis];
  if (opciones.notas) pasos.push((t) => quitarNotasDelEquipo(t, opciones.frases ?? []));
  if (opciones.enlaces) pasos.push((t) => soloEnlacesDeLaTienda(t, opciones.permitidas));
  if (opciones.precios) pasos.push((t) => quitarOracionesConPrecio(t, opciones.precios as string));
  if (opciones.datosPersonales) pasos.push((t) => quitarDatosPersonales(t, opciones.datosPersonales as string));
  pasos.push(aPuntosEs, sinGritos);
  let actual = texto;
  const cambios: Cambio[] = [];
  for (const paso of pasos) {
    const r = paso(actual);
    actual = r.texto;
    cambios.push(...r.cambios);
  }
  return { texto: actual, cambios };
}
