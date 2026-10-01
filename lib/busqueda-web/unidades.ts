// Peso y medidas escritos como texto en una página (C-155). Módulo puro.
// "14 g", "0,25 kg", "1.2 lb" → kg. "100 x 69,9 x 7 mm", '13.93"l. x 4.86"an. x 1.46"al.' → cm.

export interface Medidas {
  largo: number;
  ancho: number;
  alto: number;
}

/** "1.234,5", "1,25" o "0.03" → número. NaN si no lo es */
export function numero(texto: string): number {
  let t = texto.trim();
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const PESO = new RegExp(String.raw`${NUM}\s*(kg|kgs|kilos?|kilogramos?|kilograms?|gr|grs|gramos?|gramas?|grams?|g|lbs?|libras?|pounds?|oz|onzas?|ounces?)(?![a-záéíóúñ])`, 'i');

const A_KG: Array<[RegExp, number]> = [
  [/^(kg|kgs|kilo|kilos|kilogramo|kilogramos|kilogram|kilograms)$/, 1],
  [/^(g|gr|grs|gramo|gramos|grama|gramas|gram|grams)$/, 0.001],
  [/^(lb|lbs|libra|libras|pound|pounds)$/, 0.45359237],
  [/^(oz|onza|onzas|ounce|ounces)$/, 0.028349523],
];

/** Peso en kg, o null. Fuera de 1 g a 200 kg se descarta: es otro número de la página */
export function leerPeso(texto: string): number | null {
  const m = texto.match(PESO);
  if (!m) return null;
  const valor = numero(m[1]);
  const factor = A_KG.find(([patron]) => patron.test(m[2].toLowerCase()))?.[1];
  if (!Number.isFinite(valor) || !factor) return null;
  const kg = valor * factor;
  return kg >= 0.001 && kg <= 200 ? redondear(kg, 3) : null;
}

const UNIDAD_LARGO = String.raw`(mm|mil[ií]metros?|millimeters?|cm|cent[ií]metros?|centimeters?|pulgadas?|pulg|inches|inch|in|"|''|”|″|m|metros?)`;
const SEPARADOR = String.raw`\s*(?:${UNIDAD_LARGO})?\s*(?:\([^)]{0,12}\))?\s*[a-záéíóú.]{0,6}\s*[x×*]\s*`;
const TRES = new RegExp(String.raw`${NUM}${SEPARADOR}${NUM}${SEPARADOR}${NUM}\s*(?:${UNIDAD_LARGO})?(?:[^a-z0-9"]{0,3}(?:\([^)]{0,12}\))?[^a-z0-9"]{0,3}[a-záéíóú.]{0,6}?\s*(?:${UNIDAD_LARGO}))?`, 'i');

function aCentimetros(unidad: string | undefined): number | null {
  if (!unidad) return null;
  const u = unidad.toLowerCase();
  if (/^(mm|mil|millimeter)/.test(u)) return 0.1;
  if (/^(cm|cent)/.test(u)) return 1;
  if (/^(pulg|inch|in$|"|''|”|″)/.test(u)) return 2.54;
  if (/^(m|metro)/.test(u)) return 100;
  return null;
}

/**
 * Tres medidas en cm, o null. Sin unidad escrita no se adivina: 100 x 70 x 7 puede ser mm o cm.
 * Cada lado entre 1 mm y 3 m.
 */
export function leerMedidas(texto: string): Medidas | null {
  const m = texto.match(TRES);
  if (!m) return null;
  // m: n1, u1, n2, u2, n3, u3, u4. La unidad es la primera que aparezca
  const unidad = [m[2], m[4], m[6], m[7]].find(Boolean);
  const factor = aCentimetros(unidad);
  const lados = [numero(m[1]), numero(m[3]), numero(m[5])];
  if (!factor || lados.some((n) => !Number.isFinite(n))) return null;
  const cm = lados.map((n) => redondear(n * factor, 1));
  if (cm.some((n) => n < 0.1 || n > 300)) return null;
  return { largo: cm[0], ancho: cm[1], alto: cm[2] };
}

/** Una sola medida con su unidad ("Alto: 3,7 cm"), en cm */
export function leerLado(texto: string): number | null {
  const m = texto.match(new RegExp(String.raw`${NUM}\s*${UNIDAD_LARGO}(?![a-záéíóúñ])`, 'i'));
  if (!m) return null;
  const factor = aCentimetros(m[2]);
  const valor = numero(m[1]);
  if (!factor || !Number.isFinite(valor)) return null;
  const cm = redondear(valor * factor, 1);
  return cm >= 0.1 && cm <= 300 ? cm : null;
}

export function redondear(valor: number, decimales: number): number {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
}

/** De mayor a menor: así dos fuentes que escriben el mismo paquete en otro orden coinciden */
export function ordenadas(m: Medidas): Medidas {
  const [largo, ancho, alto] = [m.largo, m.ancho, m.alto].sort((a, b) => b - a);
  return { largo, ancho, alto };
}

/** "0,25" para mostrar y para el formulario, que acepta coma */
export function comoTexto(valor: number): string {
  return String(valor).replace('.', ',');
}
