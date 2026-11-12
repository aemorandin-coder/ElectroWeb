// Product.specs (JSON en texto) mezcla las especificaciones que ve el cliente con datos internos del panel.

/** C-204: lo que dejó la búsqueda en la web de la carga masiva en un borrador (lib/proveedores/lista-de-control.ts) */
export const FICHA_WEB_KEY = '__fichaWeb';

/**
 * Claves internas de specs. Nunca salen en el DTO público y el formulario no las edita como especificación:
 * - digitalPricing: montos de productos digitales anteriores a C-60 (respaldo de lib/order-quote.ts).
 * - __adminPricing: el último margen usado en el wizard digital (C-95).
 * - __fichaWeb (C-204): qué trajo la web y si alguien ya lo revisó. Guardar el producto desde el asistente cuenta como
 *   revisado: specsForUpdate no la conserva.
 */
export const INTERNAL_SPEC_KEYS = ['digitalPricing', '__adminPricing', FICHA_WEB_KEY] as const;

/** specs en texto u objeto → objeto plano nuevo ({} si no es válido). */
export function parseSpecsObject(raw: unknown): Record<string, unknown> {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

/** Margen del wizard digital: de 0 a 300 %, como el campo del panel. undefined si no es válido. */
export function parseDigitalMargin(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 300 ? value : undefined;
}

/** Último margen guardado para el producto, o null si nunca se guardó. */
export function digitalMarginFromSpecs(raw: unknown): number | null {
  const pricing = parseSpecsObject(raw).__adminPricing;
  const margin = pricing && typeof pricing === 'object' ? (pricing as Record<string, unknown>).digitalMarginPercent : undefined;
  return parseDigitalMargin(margin) ?? null;
}

/**
 * specs que se guarda al editar un producto.
 * - specifications (del formulario) reemplaza las especificaciones; si no llega, quedan las anteriores.
 * - Las claves internas se conservan salvo que lleguen explícitas (digitalPricing, digitalMarginPercent).
 *   Antes, guardar las especificaciones borraba digitalPricing.
 */
export function specsForUpdate(
  oldSpecs: unknown,
  input: { specifications?: unknown; digitalPricing?: unknown; digitalMarginPercent?: number },
): Record<string, unknown> {
  const old = parseSpecsObject(oldSpecs);
  const next = input.specifications !== undefined ? parseSpecsObject(input.specifications) : { ...old };
  for (const key of INTERNAL_SPEC_KEYS) delete next[key];

  if (Array.isArray(input.digitalPricing)) next.digitalPricing = input.digitalPricing;
  else if (old.digitalPricing !== undefined) next.digitalPricing = old.digitalPricing;

  if (input.digitalMarginPercent !== undefined) next.__adminPricing = { digitalMarginPercent: input.digitalMarginPercent };
  else if (old.__adminPricing !== undefined) next.__adminPricing = old.__adminPricing;

  return next;
}

// C-197: las especificaciones como se leen en la ficha. Se cargaron a mano, desde SADES y con la búsqueda en la web, y
// conviven "TAMAÑO" con "Tipo" y valores como "No especificado". Solo cambia cómo se muestran: lo guardado no se toca.

/** Siglas que se quedan en mayúsculas al escribir normal algo que vino todo en mayúsculas */
const SIGLAS = new Set([
  'LED', 'RGB', 'USB', 'HDMI', 'RAM', 'ROM', 'SSD', 'HDD', 'CPU', 'GPU', 'PC', 'TV', 'DPI', 'IP', 'BT', 'NFC', 'VGA', 'DC', 'AC',
  'LCD', 'OLED', 'IPS', 'HD', 'FHD', 'UHD', 'PSU', 'ATX', 'PCIE', 'NVME', 'SATA', 'BTU', 'HP', 'W', 'V', 'A', 'MAH', 'GB', 'TB', 'MB',
  'MHZ', 'GHZ', 'HZ', 'DB', 'SKU', 'EAN', 'UPC', 'ID', 'AMD', 'IOS', 'AAA', 'AA', 'THW', 'PVC', 'CPVC', 'ABS', 'MM', 'CM', 'KG', 'LBS',
]);
/** Lo que no es un dato */
const VACIO = /^(no especificad[oa]s?|sin especificar|no aplica|n\/?a|-+|—|\?+)$/i;

const enMayusculas = (t: string) => /\p{Lu}/u.test(t) && !/\p{Ll}/u.test(t);

/** "TIPO DE LED" → "Tipo de LED"; "60% SIN NUMPAD" → "60% sin numpad". Lo que no vino todo en mayúsculas queda igual. */
export function escribirNormal(texto: string): string {
  if (!enMayusculas(texto)) return texto;
  let primera = true;
  return texto.replace(/[\p{L}\p{N}%]+/gu, (palabra) => {
    const esPrimera = primera;
    primera = false;
    // Las siglas, lo que lleva números y las letras sueltas (la C de USB-C) quedan; "Y", "O", "E" y "U" son conjunciones
    if (SIGLAS.has(palabra) || /\d/.test(palabra) || (palabra.length === 1 && !'YOEU'.includes(palabra))) return palabra;
    const minusculas = palabra.toLocaleLowerCase('es');
    return esPrimera ? minusculas.charAt(0).toLocaleUpperCase('es') + minusculas.slice(1) : minusculas;
  });
}

/**
 * Las especificaciones para la ficha: sin las internas (`ocultas`), sin las vacías ni las que dicen "No especificado",
 * con los nombres escritos normal y los valores en mayúsculas también (desde 4 letras seguidas, para no tocar códigos
 * de modelo como "M-880" o "PCE011").
 */
export function especificacionesParaMostrar(specs: Record<string, unknown> | null | undefined, ocultas: ReadonlySet<string>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [clave, valor] of Object.entries(specs ?? {})) {
    if (ocultas.has(clave) || valor === null || valor === undefined || typeof valor === 'object') continue;
    const k = String(clave).trim();
    const v = String(valor).trim();
    if (!k || !v || VACIO.test(v)) continue;
    out.push([escribirNormal(k), /\p{Lu}{4,}/u.test(v) ? escribirNormal(v) : v]);
  }
  return out;
}
