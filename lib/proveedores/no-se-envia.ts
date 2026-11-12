// C-204: lo que ZOOM y MRW no transportan (pinturas, solventes, aerosoles, pegas con solvente, gas). La lista del
// proveedor lo marca y no deja crearlo: decisión de Andrés del 12/11, cuando las pinturas de la ferretería aliada
// quedaron fuera porque no se pueden enviar. Módulo puro: lo usan la pantalla y la API.
//
// Se compara por palabras enteras, sin acentos ni mayúsculas, con el nombre de su lista y con el de la tienda: "ESM" es
// esmalte, pero "ESMERIL" no; "P/PINTAR" (la pistola para pintar) tampoco cae, porque "pint" no está en la lista.

import { normalizar } from '@/lib/cotizaciones/busqueda';

/**
 * La lista de siempre, calibrada el 12/11 con los 3.114 nombres de la ferretería aliada: marca 439, todos pinturas,
 * solventes, pegas con solvente y aerosoles (fuera de esos departamentos, solo el WD-40 y un aceite en spray, que
 * tampoco viajan). Las abreviaturas son las de su sistema ("CAUC SEDA BL COC 1G" es un caucho).
 */
export const NO_SE_ENVIA_BASE: readonly string[] = [
  // Pinturas y lo que viene en galón con ellas
  'pintura', 'esmalte', 'esm', 'caucho', 'cauc', 'fondo', 'fond', 'barniz', 'laca', 'satinado', 'sati', 'brillo sat', 'seda',
  'poliuretano', 'tinte', 'tinta p mad', 'mastique', 'mastic', 'mastiq', 'pastabiq', 'anticorrosivo', 'cromato',
  'imper', 'impermeabilizante', 'manto flex', 'primer', 'manpisol', 'manpicancha',
  // Solventes y combustibles
  'thinner', 'thineer', 'thin', 'tiner', 'solvente', 'solv', 'aguarras', 'varsol', 'kerosene', 'kerosen', 'gasolina',
  'alcohol', 'acetona', 'removedor',
  // Aerosoles
  'spray', 'aerosol',
  // Pegas con solvente
  'pega pvc', 'pega cpvc', 'pega de contacto', 'cemento de contacto',
  // Gas
  'bombona', 'cilindro de gas',
];

export const TERMINOS_MAX = 120;
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

/** Lo que escribe el equipo (uno por línea o separados por coma) → la lista, sin repetidos y en su orden */
export function terminosDesdeTexto(texto: string): string[] {
  const vistos = new Set<string>();
  for (const parte of texto.split(/[\n,;]+/)) {
    const t = normalizarTermino(parte);
    if (t) vistos.add(t);
  }
  return [...vistos].slice(0, TERMINOS_MAX);
}

/** La lista que llega en un pedido, revisada. null si no es una lista de textos o pasa del tope */
export function leerTerminos(valor: unknown): string[] | null {
  if (!Array.isArray(valor) || valor.length > TERMINOS_MAX) return null;
  if (!valor.every((v) => typeof v === 'string')) return null;
  return terminosDesdeTexto((valor as string[]).join('\n'));
}

/** La que vale para un proveedor: la suya o, si está vacía, la de siempre */
export function terminosEfectivos(guardados: readonly string[] | null | undefined): readonly string[] {
  return guardados && guardados.length > 0 ? guardados : NO_SE_ENVIA_BASE;
}

/** true si la lista es la de siempre (el mismo contenido en cualquier orden): entonces no hace falta guardarla */
export function esLaDeSiempre(terminos: readonly string[]): boolean {
  if (terminos.length !== NO_SE_ENVIA_BASE.length) return false;
  const base = new Set(NO_SE_ENVIA_BASE);
  return terminos.every((t) => base.has(t));
}

/** El primer término de la lista que aparece entero en alguno de los textos, o null si se puede enviar */
export function terminoQueNoSeEnvia(textos: ReadonlyArray<string | null | undefined>, terminos: readonly string[]): string | null {
  const frases = textos.filter((t): t is string => Boolean(t && t.trim())).map((t) => ` ${palabrasDe(t)} `);
  if (frases.length === 0) return null;
  for (const termino of terminos) {
    const buscado = ` ${termino} `;
    if (frases.some((f) => f.includes(buscado))) return termino;
  }
  return null;
}
