// C-288 · Las reglas de la tienda de cada uso de Claude, aplicadas a lo que respondió. Módulo PURO (sin Prisma, sin red): cada
// función recibe la respuesta de Claude (o la ficha ya armada) más lo que se le mandó, y devuelve los datos limpios, lo que la
// tienda hizo para limpiarlos y, si alguna regla de tipo "pide" se rompió, qué decirle a Claude para que lo haga otra vez
// (lib/ia/claude.ts lo pide una sola vez). Las frases prohibidas se reciben por parámetro: el servidor las lee de los ajustes.
//
// Reutilizan lo que ya comprobaban comprobarLectura y normalizarBusqueda (lib/busqueda-web/groq.ts), cada lib/ia/*.ts y
// limpiarTextoIA: aquí se completa y se anota; no se duplica.

import type { ResultadoBusquedaWeb } from '@/lib/busqueda-web/tipos';
import {
  contarOraciones, enlacesDe, estaEnIngles, fraseQueTrae, limpiarSalida, oracionesDe, quitarDatosPersonales,
  quitarOracionesQue, quitarPromesasDeLaDescripcion, recortar, sinGritos, type ResultadoTexto,
} from './limpieza';
import { reglasDeTienda, type Cambio, type PedirOtraVez, type ResultadoReglas, type UsoIa } from './reglas';

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');
const objetos = (valor: unknown): Array<Record<string, unknown>> =>
  (Array.isArray(valor) ? valor : []).filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x));

/** El armazón de toda revisión: junta lo que van haciendo las reglas */
class Acta {
  cambios: Cambio[] = [];
  pedir: PedirOtraVez[] = [];
  avisos: string[] = [];

  /** Pasa un texto por una regla y se queda con el resultado */
  texto(valor: string, regla: (t: string) => ResultadoTexto): string {
    const r = regla(valor);
    this.cambios.push(...r.cambios);
    return r.texto;
  }

  pide(regla: string, motivo: string, antes: string) {
    if (!this.pedir.some((p) => p.regla === regla)) this.pedir.push({ regla, motivo, antes: recortar(antes) });
  }

  resultado<T>(uso: UsoIa, datos: T): ResultadoReglas<T> {
    return { datos, cambios: this.cambios, pedirOtraVez: this.pedir, avisos: [...new Set(this.avisos)], revisadas: reglasDeTienda(uso).map((r) => r.id) };
  }
}

// ───── Modelos de producto ─────

/** Prefijos que parecen un modelo y no lo son: estándares, unidades, conectores y chips de LED */
const NO_SON_MODELO = new Set([
  'IP', 'RJ', 'CAT', 'USB', 'DDR', 'LPDDR', 'ISO', 'DIN', 'IEC', 'IEEE', 'UL', 'CE', 'FCC', 'ROHS', 'NTSC', 'PAL', 'SATA', 'PCIE', 'HD', 'SD',
  'GB', 'TB', 'MB', 'KB', 'MM', 'CM', 'KG', 'AC', 'DC', 'AA', 'AAA', 'TF', 'TYPEC', 'USBC', 'WIFI', 'BT', 'BLE', 'AWG', 'LED', 'SMD', 'COB',
  'HDMI', 'VGA', 'DVI', 'RPM', 'EAN', 'UPC', 'GTIN', 'SKU', 'ASIN', 'RGB', 'PWM', 'LTE', 'NFC',
]);
const CODIGO_DE_MODELO = /(?<![\p{L}\p{N}])([A-Za-z]{2,})-?(\d{2,}[A-Za-z0-9]*)(?![\p{L}\p{N}])/gu;

/** Los códigos de modelo de un texto: letras y cifras, de 4 caracteres o más ("ETID65", "RTX4060"), en mayúsculas y sin guion */
export function codigosDeModelo(valor: string): string[] {
  const codigos = new Set<string>();
  for (const m of valor.matchAll(CODIGO_DE_MODELO)) {
    const prefijo = m[1].toUpperCase();
    if (NO_SON_MODELO.has(prefijo)) continue;
    const codigo = `${prefijo}${m[2].toUpperCase()}`;
    if (codigo.length >= 4) codigos.add(codigo);
  }
  return [...codigos];
}
const prefijoDe = (codigo: string) => codigo.match(/^[A-Z]+/)?.[0] ?? '';

const MODELOS_POSIBLES = /posibles\s+modelos|modelos\s+posibles|uno\s+de\s+estos\s+modelos|(?:puede|podria)\s+ser\s+el\s+modelo/;
const PODRIA_SER = /(?:puede|podria)\s+ser(?![\p{L}])/u;
const ALTERNATIVA = /(?<![\p{L}\p{N}])(?:o|u|vs)(?![\p{L}\p{N}])|[/|]/u;
const COMPATIBLE = /compatib|funciona\s+con|repuesto|accesorio|para\s+usar\s+con/;

/** La oración dice que podría ser más de un modelo: "posibles modelos", "podría ser el modelo X", "ETID55 o ETID65" */
export function dicePosiblesModelos(oracion: string): boolean {
  const n = sinAcentos(oracion.toLowerCase());
  if (MODELOS_POSIBLES.test(n)) return true;
  const codigos = codigosDeModelo(oracion);
  // "podría ser" a secas puede ser cualquier cosa ("podría ser un regalo"): solo cuenta hablando de modelos
  if (PODRIA_SER.test(n) && (/modelo/.test(n) || codigos.length > 0)) return true;
  // Una lista de alternativas: dos códigos del mismo prefijo y distintos, unidos por "o" o "/"
  if (!COMPATIBLE.test(n) && ALTERNATIVA.test(n)) {
    return codigos.some((a) => codigos.some((b) => a !== b && prefijoDe(a) === prefijoDe(b)));
  }
  return false;
}

/** La primera oración de un texto que habla de varios modelos posibles, o null */
export const oracionDeVariosModelos = (valor: string): string | null => oracionesDe(valor).find(dicePosiblesModelos) ?? null;

// ───── Buscar en la web ─────

export const PESO_MIN_KG = 0.005;
export const PESO_MAX_KG = 200;
export const MEDIDA_MIN_CM = 0.5;
export const MEDIDA_MAX_CM = 300;

/** Un valor tan vago que no le dice nada a quien compra */
const VAGAS = new Set([
  'alta', 'alto', 'baja', 'bajo', 'buena', 'bueno', 'excelente', 'potente', 'varios', 'varias', 'n/a', 'na', 'n a', 'no especificado',
  'no especificada', 'no disponible', 'desconocido', 'desconocida', 'sin datos', 'sin dato', 's/d', 'ninguno', 'ninguna', 'no aplica',
]);
export function esValorVago(valor: string): boolean {
  const limpio = sinAcentos(valor.toLowerCase()).replace(/[.\s]+$/g, '').trim();
  return limpio === '' || /^[-–—?_.]+$/.test(limpio) || VAGAS.has(limpio);
}

const coma = (n: number) => String(n).replace('.', ',');

/**
 * Las reglas de "Buscar en la web" sobre la ficha ya armada (lo que leyeron las páginas y lo que ordenó Claude o Groq):
 * notas para el equipo, enlaces, precios y garantías en la descripción, especificaciones sin dato, un solo modelo, el modelo del
 * nombre, peso y medidas posibles, y la descripción en español y de dos frases o más.
 */
export function revisarFicha(entrada: ResultadoBusquedaWeb, nombre: string, frases: readonly string[]): ResultadoReglas<ResultadoBusquedaWeb> {
  const a = new Acta();
  const ficha: ResultadoBusquedaWeb = { ...entrada, especificaciones: entrada.especificaciones.map((e) => ({ ...e })), avisos: [...entrada.avisos] };

  // Un solo modelo, sobre lo que Claude escribió tal cual: ni "posibles modelos" ni una lista de alternativas, en la descripción o
  // en las especificaciones. Va primero: las frases de notas para el equipo incluyen "Posibles modelos" y la quitarían sin que
  // nadie se enterara de que Claude no decidió
  const dudosa = oracionDeVariosModelos(ficha.descripcion);
  if (dudosa) {
    a.pide('un-modelo', `La ficha dice «${recortar(dudosa, 120)}»: tiene que ser un solo modelo, el del producto, sin "posibles modelos", "podría ser" ni listas de modelos`, dudosa);
    ficha.descripcion = '';
  }
  ficha.especificaciones = ficha.especificaciones.filter((e) => {
    const completa = `${e.nombre}: ${e.valor}`;
    if (!dicePosiblesModelos(completa)) return true;
    a.pide('un-modelo', `La especificación «${recortar(completa, 120)}» trae más de un modelo: tiene que ser un solo modelo, el del producto`, completa);
    return false;
  });
  if (a.pedir.some((p) => p.regla === 'un-modelo')) a.avisos.push('Claude no pudo decidir un solo modelo: se quitó lo que lo dudaba. Compruébalo con la caja o la etiqueta.');

  // Todo lo que se publica, limpio: emojis, notas para el equipo, enlaces ajenos, Puntos ES y mayúsculas sostenidas
  ficha.descripcion = a.texto(ficha.descripcion, (t) => limpiarSalida(t, { frases, notas: true, enlaces: true }));
  ficha.descripcion = a.texto(ficha.descripcion, quitarPromesasDeLaDescripcion);

  const quedan: typeof ficha.especificaciones = [];
  for (const e of ficha.especificaciones) {
    const completa = `${e.nombre}: ${e.valor}`;
    if (fraseQueTrae(completa, frases)) {
      a.cambios.push({ regla: 'notas-equipo', accion: 'quita', antes: recortar(completa), despues: null });
      continue;
    }
    if (esValorVago(e.valor)) {
      a.cambios.push({ regla: 'specs-con-datos', accion: 'quita', antes: recortar(completa), despues: null });
      continue;
    }
    quedan.push({ ...e, nombre: a.texto(e.nombre, (t) => limpiarSalida(t)), valor: a.texto(e.valor, (t) => limpiarSalida(t, { enlaces: true })) });
  }
  ficha.especificaciones = quedan;

  // El modelo que trae es el del nombre: si la ficha habla de otro código del mismo prefijo, la descripción no se pone
  const delNombre = codigosDeModelo(nombre);
  if (delNombre.length > 0) {
    const prefijos = new Set(delNombre.map(prefijoDe));
    const enLaFicha = codigosDeModelo(`${ficha.descripcion}\n${ficha.especificaciones.map((e) => `${e.nombre}: ${e.valor}`).join('\n')}`);
    const otro = enLaFicha.find((c) => prefijos.has(prefijoDe(c)) && !delNombre.includes(c));
    if (otro) {
      a.cambios.push({ regla: 'modelo-del-nombre', accion: 'marca', antes: `El producto es ${delNombre[0]} y la ficha habla del ${otro}`, despues: null });
      a.avisos.push(`La ficha que se encontró habla del modelo ${otro} y el producto es ${delNombre[0]}: la descripción no se puso y las especificaciones pueden ser de otro modelo. Compruébalas.`);
      ficha.descripcion = '';
    }
  }

  // Peso y medidas posibles
  if (ficha.peso && !(Number.isFinite(ficha.peso.valor) && ficha.peso.valor >= PESO_MIN_KG && ficha.peso.valor <= PESO_MAX_KG)) {
    a.pide('peso-medidas-posibles', `El peso del paquete (${coma(ficha.peso.valor)} kg) no es posible: tiene que estar entre ${coma(PESO_MIN_KG)} y ${PESO_MAX_KG} kg`, `Peso ${coma(ficha.peso.valor)} kg`);
    a.avisos.push(`El peso que se encontró (${coma(ficha.peso.valor)} kg) no es creíble: no se puso. Pesa la caja.`);
    ficha.peso = null;
  }
  if (ficha.medidas) {
    const { largo, ancho, alto } = ficha.medidas.valor;
    if (![largo, ancho, alto].every((m) => Number.isFinite(m) && m >= MEDIDA_MIN_CM && m <= MEDIDA_MAX_CM)) {
      a.pide('peso-medidas-posibles', `Las medidas del paquete (${coma(largo)} × ${coma(ancho)} × ${coma(alto)} cm) no son posibles: cada una tiene que estar entre ${coma(MEDIDA_MIN_CM)} y ${MEDIDA_MAX_CM} cm`, `Medidas ${largo} x ${ancho} x ${alto} cm`);
      a.avisos.push('Las medidas que se encontraron no son creíbles: no se pusieron. Mide la caja.');
      ficha.medidas = null;
    }
  }

  // La descripción, en español y de dos frases o más (sin descripción no hay nada que pedir: la ficha se queda sin ella)
  if (ficha.descripcion.trim()) {
    if (estaEnIngles(ficha.descripcion)) {
      a.pide('descripcion-completa', 'La descripción está en inglés: tiene que ir en español, de 2 a 4 frases', ficha.descripcion);
      ficha.descripcion = '';
    } else if (contarOraciones(ficha.descripcion) < 2) {
      a.pide('descripcion-completa', 'La descripción tiene una sola frase: tiene que ir en español, de 2 a 4 frases', ficha.descripcion);
      ficha.descripcion = '';
    }
    if (!ficha.descripcion) a.avisos.push('La descripción no salió en español o quedó muy corta: no se puso. Escríbela tú.');
  }
  return a.resultado('busqueda', ficha);
}

// ───── Importar con claude.ai ─────

/**
 * La descripción que trae una fila de la plantilla de Importar (la llenó Claude en claude.ai, no la tienda): una oración con una
 * nota para el equipo ("Revisar antes de guardar") o con "posibles modelos" sale con un aviso para la vista previa, y al crear el
 * producto esas oraciones se quitan.
 */
export function revisarDescripcionImportada(descripcion: string, frases: readonly string[]): { texto: string; avisos: string[]; cambios: Cambio[] } {
  const avisos: string[] = [];
  for (const oracion of oracionesDe(descripcion)) {
    const frase = fraseQueTrae(oracion, frases);
    if (frase) avisos.push(`La descripción trae una nota para el equipo: «${frase}»`);
    else if (dicePosiblesModelos(oracion)) avisos.push(`La descripción habla de varios modelos posibles: «${recortar(oracion, 80)}»`);
  }
  if (avisos.length === 0) return { texto: descripcion, avisos, cambios: [] };
  const sinNotas = quitarOracionesQue(descripcion, 'importar-revisa-igual', (o) => fraseQueTrae(o, frases) !== null || dicePosiblesModelos(o));
  return { texto: sinNotas.texto, avisos: [...new Set(avisos)], cambios: sinNotas.cambios };
}

// ───── Respuesta a una consulta ─────

const MONTO = /(?:\$|US\$|(?<![\p{L}\p{N}])Bs\.?)\s?(\d[\d.,]*)/giu;

/** "1.234,56" y "1234.56" → 1234.56; "$45" → 45. NaN si no es un monto */
function valorDelMonto(cifra: string): number {
  const c = cifra.replace(/[.,]+$/, '');
  if (/,\d{1,2}$/.test(c) && c.includes('.')) return Number(c.replace(/\./g, '').replace(',', '.'));
  if (/\.\d{1,2}$/.test(c) && c.includes(',')) return Number(c.replace(/,/g, ''));
  if (/^\d{1,3}(\.\d{3})+$/.test(c)) return Number(c.replace(/\./g, ''));
  if (/^\d{1,3}(,\d{3})+$/.test(c)) return Number(c.replace(/,/g, ''));
  return Number(c.replace(',', '.'));
}

/** Todos los montos de un texto, con su valor (para ver si el borrador usa cifras que no estaban en los datos) */
export function montosDe(valor: string): Array<{ texto: string; valor: number }> {
  return [...valor.matchAll(MONTO)].map((m) => ({ texto: m[0].trim(), valor: valorDelMonto(m[1]) })).filter((m) => Number.isFinite(m.valor));
}

const OBJETO_SENSIBLE = /contrase[ñn]a|clave|\bpin\b|c[oó]digo\s+(?:de\s+)?(?:verificaci[oó]n|seguridad|sms|que\s+te\s+lleg|enviado)|\bcvv\b|\bcvc\b|n[uú]mero\s+de\s+(?:tu\s+)?tarjeta|datos\s+de\s+(?:tu\s+)?tarjeta|tarjeta\s+de\s+(?:cr[eé]dito|d[eé]bito)|fecha\s+de\s+vencimiento|\btoken\b/;
const PIDE = /env[ií]a|m[aá]nda|p[aá]sa(?:n|me|nos)?\b|comparte|d[ií]me|d[ií]nos|ind[ií]ca|proporciona|facilita|escribe|ingresa|necesit|requer|solicit|por\s+favor|confirma|dame|danos/;
const NIEGA = /nunca|jam[aá]s|no\s+(?:te\s+)?(?:pedim|pedir|solicit|compartas|des\b|env[ií]es|m[aá]ndes|facilit)|no\s+(?:debes|tienes\s+que)|evita|cuidado/;

/** La oración le pide al cliente una clave, un código que le llegó o datos de su tarjeta (y no le dice que nunca lo haga) */
export function pideDatosSensibles(oracion: string): boolean {
  const n = sinAcentos(oracion.toLowerCase());
  return OBJETO_SENSIBLE.test(n) && PIDE.test(n) && !NIEGA.test(n);
}

export interface ContextoRespuesta {
  /** El primer nombre de quien escribió */
  nombre: string;
  /** Todo lo que se le mandó a Claude: de ahí salen las cifras y los enlaces válidos */
  datos: string;
  frases: readonly string[];
}

const FIRMA = 'Equipo Electro Shop';

/** Las reglas del borrador de respuesta a un cliente: notas, enlaces, claves, cifras de los datos, saludo y cierre */
export function revisarRespuestaIa(entrada: Record<string, unknown>, ctx: ContextoRespuesta): ResultadoReglas {
  const a = new Acta();
  const permitidas = enlacesDe(ctx.datos);
  let respuesta = a.texto(texto(entrada.respuesta), (t) => limpiarSalida(t, { frases: ctx.frases, notas: true, enlaces: true, permitidas }));

  // Nunca pide claves, códigos de SMS ni datos de tarjeta: la oración que lo pide no sale (y se le pide otra vez)
  const sinClaves = quitarOracionesQue(respuesta, 'sin-pedir-claves', pideDatosSensibles);
  if (sinClaves.cambios.length > 0) {
    a.pide('sin-pedir-claves', 'El borrador le pide al cliente una clave, un código que le llegó o datos de su tarjeta: la tienda nunca los pide', sinClaves.cambios[0].antes);
    respuesta = sinClaves.texto;
  }

  // Los montos del borrador tienen que estar en los datos que se le mandaron
  const delaTienda = new Set(montosDe(ctx.datos).map((m) => Math.round(m.valor * 100) / 100));
  const sueltos = montosDe(respuesta).filter((m) => !delaTienda.has(Math.round(m.valor * 100) / 100));
  const porConfirmar = (Array.isArray(entrada.porConfirmar) ? entrada.porConfirmar : []).map((t) => a.texto(texto(t), (x) => limpiarSalida(x))).filter(Boolean);
  for (const m of [...new Map(sueltos.map((s) => [s.texto, s])).values()]) {
    a.cambios.push({ regla: 'cifras-de-los-datos', accion: 'marca', antes: `El borrador dice ${m.texto}, que no está en los datos de la tienda`, despues: null });
    const aviso = `Revisa el monto ${m.texto}: no está en los datos de la tienda`;
    a.avisos.push(aviso);
    porConfirmar.push(aviso);
  }

  // Saludo y cierre: si faltan, los pone la tienda
  const nombre = ctx.nombre.trim() || 'cliente';
  let conSaludo = respuesta.trim();
  if (conSaludo && !/^hola\b/i.test(conSaludo)) {
    conSaludo = `Hola, ${nombre}.\n\n${conSaludo}`;
    a.cambios.push({ regla: 'saludo-y-cierre', accion: 'cambia', antes: recortar(respuesta.trim().slice(0, 80)), despues: `Hola, ${nombre}.` });
  }
  if (conSaludo && !/equipo\s+electro\s+shop\W*$/i.test(conSaludo)) {
    conSaludo = `${conSaludo}\n\n${FIRMA}`;
    a.cambios.push({ regla: 'saludo-y-cierre', accion: 'cambia', antes: recortar(respuesta.trim().slice(-80)), despues: FIRMA });
  }

  return a.resultado('respuesta', {
    ...entrada,
    asunto: a.texto(texto(entrada.asunto), (t) => limpiarSalida(t)),
    respuesta: conSaludo,
    porConfirmar: [...new Set(porConfirmar)],
  });
}

// ───── Urgencia de las consultas ─────

const URGENCIAS_VALIDAS = ['alta', 'media', 'baja'];

/** Lo que valen las reglas para el motivo de una fila (la urgencia de un mensaje o de una solicitud) */
function filaDeUrgencia(fila: Record<string, unknown>, a: Acta): Record<string, unknown> {
  const urgencia = texto(fila.urgencia).trim().toLowerCase();
  const valida = URGENCIAS_VALIDAS.includes(urgencia) ? urgencia : 'media';
  if (valida !== fila.urgencia) a.cambios.push({ regla: 'urgencia-valida', accion: 'cambia', antes: recortar(String(fila.urgencia ?? '(vacío)')), despues: valida });
  let motivo = a.texto(texto(fila.motivo), (t) => limpiarSalida(t));
  motivo = a.texto(motivo, (t) => quitarDatosPersonales(t, 'motivo-sin-datos'));
  return { ...fila, urgencia: valida, motivo };
}

export function revisarUrgenciaIa(entrada: Record<string, unknown>): ResultadoReglas {
  const a = new Acta();
  return a.resultado('urgencia', {
    ...entrada,
    mensajes: objetos(entrada.mensajes).map((f) => filaDeUrgencia(f, a)),
    solicitudes: objetos(entrada.solicitudes).map((f) => filaDeUrgencia(f, a)),
  });
}

// ───── Resumen del cliente ─────

export function revisarResumenIa(entrada: Record<string, unknown>, ctx: { productos: ReadonlySet<string> }): ResultadoReglas {
  const a = new Acta();
  const limpio = (t: unknown) => {
    const s = a.texto(texto(t), (x) => limpiarSalida(x));
    return a.texto(s, (x) => quitarDatosPersonales(x, 'sin-datos-personales', true));
  };
  const vistos = new Set<string>();
  const ofrecer = objetos(entrada.ofrecer).flatMap((o) => {
    const id = texto(o.id);
    if (!ctx.productos.has(id) || vistos.has(id)) {
      a.cambios.push({ regla: 'solo-productos-de-la-lista', accion: 'quita', antes: ctx.productos.has(id) ? 'Un producto repetido en "Qué ofrecerle"' : 'Un producto que no está en la lista de la tienda', despues: null });
      return [];
    }
    vistos.add(id);
    return [{ ...o, motivo: limpio(o.motivo) }];
  });
  return a.resultado('cliente', {
    ...entrada,
    resumen: limpio(entrada.resumen),
    comoCompra: (Array.isArray(entrada.comoCompra) ? entrada.comoCompra : []).map(limpio),
    ofrecer,
    siguientePaso: limpio(entrada.siguientePaso),
  });
}

// ───── Campaña de correo ─────

export const ASUNTO_MIN_PALABRAS = 6;
export const ASUNTO_MAX_PALABRAS = 9;
export const PRODUCTOS_MAX = 4;
const palabrasDe = (valor: string) => valor.trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;

export interface ContextoCampana {
  /** De cada producto de la lista (clave p1, p2…): si se puede elegir (hay existencia o es digital) */
  productos: ReadonlyMap<string, { disponible: boolean }>;
  /** Todo lo que se le mandó a Claude: de ahí salen los enlaces válidos */
  datos: string;
  frases: readonly string[];
}

export function revisarCampanaIa(entrada: Record<string, unknown>, ctx: ContextoCampana): ResultadoReglas {
  const a = new Acta();
  const permitidas = enlacesDe(ctx.datos);
  const publicable = (t: unknown, precios: boolean) =>
    a.texto(texto(t), (x) => limpiarSalida(x, { frases: ctx.frases, notas: true, enlaces: true, permitidas, ...(precios ? { precios: 'sin-precios-en-texto' } : {}) }));

  // El asunto: de 6 a 9 palabras, sin mayúsculas sostenidas ni signos repetidos. Se evalúa tal como lo escribió Claude
  const crudo = texto(entrada.asunto).trim();
  let asunto = publicable(crudo, false);
  const palabras = palabrasDe(crudo);
  const motivos: string[] = [];
  if (crudo && (sinGritos(crudo).cambios.length > 0)) motivos.push('sin mayúsculas sostenidas ni signos repetidos');
  if (crudo && (palabras < ASUNTO_MIN_PALABRAS || palabras > ASUNTO_MAX_PALABRAS)) motivos.push(`de ${ASUNTO_MIN_PALABRAS} a ${ASUNTO_MAX_PALABRAS} palabras (tiene ${palabras})`);
  if (motivos.length > 0) {
    a.pide('asunto-sin-gritos', `El asunto tiene que ir ${motivos.join(' y ')}`, crudo);
    // Lo que rompió la regla por la cantidad de palabras queda vacío: el equipo lo escribe. Las mayúsculas ya se corrigieron
    if (palabras < ASUNTO_MIN_PALABRAS || palabras > ASUNTO_MAX_PALABRAS) asunto = '';
  }

  // Los productos: solo de la lista, sin repetir, con existencia y hasta 4
  const elegidos: Array<Record<string, unknown>> = [];
  for (const p of objetos(entrada.productos)) {
    const clave = texto(p.clave);
    const dato = ctx.productos.get(clave);
    const motivo = !dato ? 'Un producto que no está en la lista de la tienda'
      : elegidos.some((e) => e.clave === clave) ? 'Un producto repetido'
        : !dato.disponible ? 'Un producto agotado'
          : elegidos.length >= PRODUCTOS_MAX ? 'Un producto de más (son hasta 4)' : null;
    if (motivo) {
      a.cambios.push({ regla: 'productos-de-la-lista', accion: 'quita', antes: motivo, despues: null });
      continue;
    }
    elegidos.push({ ...p, texto: publicable(p.texto, true) });
  }

  const boton = (entrada.boton && typeof entrada.boton === 'object' ? entrada.boton : {}) as Record<string, unknown>;
  return a.resultado('campana', {
    ...entrada,
    asunto,
    preheader: publicable(entrada.preheader, false),
    titulo: publicable(entrada.titulo, true),
    intro: publicable(entrada.intro, true),
    productos: elegidos,
    // El cierre puede decir lo que la tienda le mandó (el envío gratis desde cierto monto, el sorteo): no se le quitan los montos
    cierre: publicable(entrada.cierre, false),
    boton: { ...boton, texto: a.texto(texto(boton.texto), (t) => limpiarSalida(t)) },
  });
}

// ───── Catálogo del proveedor ─────

export const NOMBRE_MAX = 90;

export interface ContextoCatalogo {
  /** Las claves de categoría que se le dieron (c1, c2…) */
  categorias: ReadonlySet<string>;
  /** El código del proveedor de cada artículo de la lista (k1, k2…) */
  codigos: ReadonlyMap<string, string>;
  frases: readonly string[];
}

const PRECIO_EN_NOMBRE = String.raw`(?:\$|US\$|(?<![\p{L}\p{N}])(?:USD|Bs)\.?)\s?\d[\d.,]*|(?<![\p{L}\p{N}.,])\d[\d.,]*\s?(?:\$(?!\s?\d)|(?<![\p{L}\p{N}])(?:USD|Bs)(?![\p{L}\p{N}]))`;

/** Hasta 90 caracteres, sin partir una palabra */
export function recortarNombre(nombre: string, maximo = NOMBRE_MAX): string {
  if (nombre.length <= maximo) return nombre;
  const corte = nombre.slice(0, maximo + 1);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > maximo * 0.6 ? corte.slice(0, espacio) : nombre.slice(0, maximo)).replace(/[\s,;:-]+$/, '');
}

/** Un nombre de la tienda: sin el código del proveedor ni precios, y hasta 90 caracteres */
function nombreLimpio(nombre: string, codigo: string | undefined): string {
  let limpio = nombre;
  if (codigo && codigo.length >= 3) {
    limpio = limpio.replace(new RegExp(`(?<![\\p{L}\\p{N}])${codigo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'giu'), '');
  }
  limpio = limpio.replace(new RegExp(PRECIO_EN_NOMBRE, 'giu'), '');
  return recortarNombre(limpio.replace(/\s{2,}/g, ' ').replace(/^[\s,;:/-]+|[\s,;:/-]+$/g, ''));
}

export function revisarCatalogoIa(entrada: Record<string, unknown>, ctx: ContextoCatalogo): ResultadoReglas {
  const a = new Acta();
  const articulos = objetos(entrada.articulos).map((r) => {
    const codigo = ctx.codigos.get(texto(r.clave));
    let nombre = a.texto(texto(r.nombre), (t) => limpiarSalida(t, { frases: ctx.frases, notas: true }));
    const limpio = nombreLimpio(nombre, codigo);
    if (limpio !== nombre) a.cambios.push({ regla: 'nombre-limpio', accion: 'quita', antes: recortar(`${codigo ?? ''}${codigo ? ': ' : ''}${nombre}`), despues: limpio });
    nombre = limpio;
    let categoria = r.categoria;
    let duda = a.texto(texto(r.duda), (t) => limpiarSalida(t)) || null;
    if (typeof categoria === 'string' && !ctx.categorias.has(categoria)) {
      a.cambios.push({ regla: 'categoria-de-la-tienda', accion: 'marca', antes: `${codigo ? `${codigo}: ` : ''}propuso una categoría que no existe en la tienda`, despues: null });
      categoria = null;
      duda ??= 'La categoría que propuso no existe en la tienda.';
    }
    return { ...r, nombre, categoria, duda };
  });
  return a.resultado('proveedor', { ...entrada, articulos });
}

/** Lo que se le agrega al pedido cuando se le pide otra vez: la regla que rompió y qué hacer */
export function mensajeDeCorreccion(pedir: readonly PedirOtraVez[]): string {
  const motivos = pedir.map((p) => p.motivo).join('. ');
  return pedir.length === 1
    ? `Tu respuesta anterior no cumplió esta regla de la tienda: ${motivos}. Responde otra vez cumpliéndola.`
    : `Tu respuesta anterior no cumplió estas reglas de la tienda: ${motivos}. Responde otra vez cumpliéndolas.`;
}
