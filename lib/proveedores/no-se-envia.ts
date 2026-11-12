// C-204: lo que ZOOM y MRW no transportan (pinturas, solventes, aerosoles, pegas con solvente, gas). La lista del
// proveedor lo marca y no deja crearlo: decisión de Andrés del 12/11, cuando las pinturas de la ferretería aliada
// quedaron fuera porque no se pueden enviar. Módulo puro: lo usan la pantalla y la API.
//
// Se compara por palabras enteras, sin acentos ni mayúsculas, con el nombre de su lista y con el de la tienda: "ESM" es
// esmalte, pero "ESMERIL" no; "P/PINTAR" (la pistola para pintar) tampoco cae, porque "pint" no está en la lista.
// C-204b: después de "a", "para" o "P/" la palabra dice con qué funciona o para qué sirve, y no cuenta: "Motobomba a
// gasolina" (el caso del 12/11), "Pistola para pintura", "Regulador para bombona". Y lo que la regla marca mal se deja
// pasar con una excepción: una línea con "+" y su código ("+R023137") o una palabra de su nombre ("+motobomba").

import { normalizar } from '@/lib/cotizaciones/busqueda';

/**
 * La lista de siempre, calibrada el 12/11 con los 3.114 nombres de la ferretería aliada: marca 439, todos pinturas,
 * solventes, pegas con solvente y aerosoles (fuera de esos departamentos, solo el WD-40 y un aceite en spray, que
 * tampoco viajan). Las abreviaturas son las de su sistema ("CAUC SEDA BL COC 1G" es un caucho).
 */
export const NO_SE_ENVIA_BASE: readonly string[] = [
  // Pinturas y lo que viene en galón con ellas
  // C-204b: sin "satinado", que también es un acabado de cerradura ("níquel satinado"); la pintura satinada cae por "sati",
  // "pintura" o "esmalte"
  'pintura', 'esmalte', 'esm', 'caucho', 'cauc', 'fondo', 'fond', 'barniz', 'laca', 'sati', 'brillo sat', 'seda',
  'poliuretano', 'tinte', 'tinta p mad', 'mastique', 'mastic', 'mastiq', 'pastabiq', 'anticorrosivo', 'cromato',
  'imper', 'impermeabilizante', 'manto flex', 'primer', 'manpisol', 'manpicancha',
  // Solventes y combustibles
  'thinner', 'thineer', 'thin', 'tiner', 'solvente', 'solv', 'aguarras', 'varsol', 'kerosene', 'kerosen', 'gasolina',
  'alcohol', 'acetona', 'removedor',
  // Aerosoles
  'spray', 'aerosol',
  // Pegas con solvente
  'pega pvc', 'pega cpvc', 'pega para pvc', 'pega de contacto', 'cemento de contacto',
  // Gas
  'bombona', 'cilindro de gas',
];

export const TERMINOS_MAX = 120;
/** Después de estas palabras, la de la lista dice con qué funciona o para qué sirve: "a gasolina", "para pintura", "P/PINT" */
const NO_CUENTA_DESPUES_DE: ReadonlySet<string> = new Set(['a', 'para', 'p']);
/** Las excepciones empiezan con "+" */
export const esExcepcion = (termino: string) => termino.startsWith('+');
export const TERMINO_MIN = 2;
export const TERMINO_MAX = 40;

/** Un texto como palabras sueltas: minúsculas, sin acentos y sin signos ("P/PINT" → "p pint") */
export function palabrasDe(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Un término como lo escribe el equipo, para guardarlo y compararlo. '' si no sirve */
export function normalizarTermino(termino: string): string {
  const t = palabrasDe(termino);
  return t.length >= TERMINO_MIN && t.length <= TERMINO_MAX ? t : '';
}

/** Lo que escribe el equipo (uno por línea o separados por coma) → la lista, sin repetidos y en su orden. "+" = excepción */
export function terminosDesdeTexto(texto: string): string[] {
  const vistos = new Set<string>();
  for (const parte of texto.split(/[\n,;]+/)) {
    const mas = parte.trim().startsWith('+');
    const t = normalizarTermino(mas ? parte.trim().slice(1) : parte);
    if (t) vistos.add(mas ? `+${t}` : t);
  }
  return [...vistos].slice(0, TERMINOS_MAX);
}

/** La lista que llega en un pedido, revisada. null si no es una lista de textos o pasa del tope */
export function leerTerminos(valor: unknown): string[] | null {
  if (!Array.isArray(valor) || valor.length > TERMINOS_MAX) return null;
  if (!valor.every((v) => typeof v === 'string')) return null;
  return terminosDesdeTexto((valor as string[]).join('\n'));
}

/** La que vale para un proveedor: la suya o, si está vacía (o solo trae excepciones), la de siempre con sus excepciones */
export function terminosEfectivos(guardados: readonly string[] | null | undefined): readonly string[] {
  if (!guardados || guardados.length === 0) return NO_SE_ENVIA_BASE;
  return guardados.some((t) => !esExcepcion(t)) ? guardados : [...NO_SE_ENVIA_BASE, ...guardados];
}

/** true si la lista es la de siempre (el mismo contenido en cualquier orden): entonces no hace falta guardarla */
export function esLaDeSiempre(terminos: readonly string[]): boolean {
  if (terminos.length !== NO_SE_ENVIA_BASE.length) return false;
  const base = new Set(NO_SE_ENVIA_BASE);
  return terminos.every((t) => base.has(t));
}

/** true si la frase aparece entera en las palabras y alguna vez no va después de "a", "para" o "P/" */
function cuenta(palabras: string[], frase: string[]): boolean {
  for (let i = 0; i + frase.length <= palabras.length; i++) {
    if (frase.every((p, k) => palabras[i + k] === p) && !(i > 0 && NO_CUENTA_DESPUES_DE.has(palabras[i - 1]))) return true;
  }
  return false;
}

/**
 * El primer término de la lista que aparece entero en alguno de los textos (el nombre de su lista o el de la tienda), o
 * null si se puede enviar. Una excepción ("+código" o "+palabra") que coincida lo deja pasar.
 */
export function terminoQueNoSeEnvia(
  textos: ReadonlyArray<string | null | undefined>, terminos: readonly string[], codigo?: string | null,
): string | null {
  const frases = textos.filter((t): t is string => Boolean(t && t.trim())).map((t) => palabrasDe(t).split(' '));
  if (frases.length === 0) return null;
  const clave = codigo ? palabrasDe(codigo) : '';
  for (const t of terminos) {
    if (!esExcepcion(t)) continue;
    const excepcion = t.slice(1);
    if ((clave && excepcion === clave) || frases.some((f) => ` ${f.join(' ')} `.includes(` ${excepcion} `))) return null;
  }
  for (const termino of terminos) {
    if (esExcepcion(termino)) continue;
    const frase = termino.split(' ');
    if (frases.some((f) => cuenta(f, frase))) return termino;
  }
  return null;
}
