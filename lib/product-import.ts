// Carga masiva de productos con un archivo .json (C-118). Módulo puro: lo usan la vista previa del admin y la API.
// Flujo: Andrés descarga la plantilla, se la pasa a Claude en la nube con las fotos, Claude llena la ficha
// (el precio lo da Andrés) y el panel importa el .json con las fotos. Todo nace en borrador.

import {
  CONDITIONS, CONDITION_LABEL, GRADES, GRADE_LABEL, PACKAGINGS, PACKAGING_LABEL,
  conditionInputSchema, isSecondHand, type Condition, type ConditionInput,
} from '@/lib/product-condition';

export const IMPORT_FORMAT = 'electroshop-productos';
export const IMPORT_VERSION = 1;
/** Productos por archivo */
export const IMPORT_MAX_ITEMS = 100;
/** Fotos por producto, como el formulario (ImagePanel) */
export const IMPORT_MAX_PHOTOS = 8;
/** Un usado lleva fotos reales de la unidad (C-119) */
export const IMPORT_MIN_PHOTOS_SECOND_HAND = 3;
/** Especificaciones que pide el formulario para publicar */
export const IMPORT_MIN_SPECS = 3;

/** Campos que entiende la importación. Lo demás se avisa y se ignora (atrapa los errores de tipeo). */
export const IMPORT_FIELDS = [
  'nombre', 'sku', 'categoria', 'marca', 'precioUSD', 'precioAntesUSD', 'costoUSD', 'stock', 'descripcion',
  'especificaciones', 'etiquetas', 'pesoKg', 'medidasCm', 'codigoDeBarras', 'seoTitulo', 'seoDescripcion',
  'condicion', 'grado', 'empaque', 'incluye', 'noIncluye', 'horasDeUso', 'bateriaPorcentaje', 'detallesEsteticos',
  'pruebasHechas', 'garantiaDias', 'numeroDeSerie', 'fotos', 'notas',
] as const;

/** Un producto ya leído del .json, con los nombres de la base */
export interface ImportDraft {
  name: string;
  sku: string | null;
  category: string;
  brand: string | null;
  priceUSD: number | null;
  compareAtPriceUSD: number | null;
  costPerItem: number | null;
  stock: number;
  description: string;
  specifications: Record<string, string>;
  tags: string[];
  weightKg: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  barcode: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  condition: ConditionInput | null;
  photos: string[];
  notes: string | null;
}

export interface ImportReview {
  draft: ImportDraft;
  errors: string[];
  warnings: string[];
}

/** Minúsculas, sin acentos ni signos: "Caja genérica" = "caja_generica" = "CAJA GENERICA" */
export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function toSlug(value: string): string {
  return normalizeKey(value).replace(/ /g, '-');
}

/** Nombre de una foto sin carpeta ni extensión, para emparejar el .json con los archivos elegidos */
export function photoKey(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  return normalizeKey(base.replace(/\.(png|jpe?g|webp|gif|heic)$/i, ''));
}

function matchEnum<T extends string>(value: unknown, codes: readonly T[], labels: Record<T, string>): T | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const key = normalizeKey(value);
  return codes.find((c) => normalizeKey(c) === key || normalizeKey(labels[c]) === key);
}

const asText = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);

/** Número del .json: 12.5, "12.50" o "12,50". null si no vino; NaN si vino mal */
function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : Number.NaN;
  if (typeof v === 'string') {
    const clean = v.trim().replace(/^\$/, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(clean) ? Number(clean) : Number.NaN;
  }
  return Number.NaN;
}

/** Fotos que pide cada condición. Lo usan la vista previa (archivos) y la API (enlaces subidos). */
export function photoCountError(count: number, condition: Condition): string | null {
  if (count === 0) return 'Falta al menos una foto';
  if (count > IMPORT_MAX_PHOTOS) return `Son ${IMPORT_MAX_PHOTOS} fotos como máximo (tiene ${count})`;
  if (isSecondHand(condition) && count < IMPORT_MIN_PHOTOS_SECOND_HAND) {
    return `Un producto que no es nuevo lleva al menos ${IMPORT_MIN_PHOTOS_SECOND_HAND} fotos reales de la unidad (tiene ${count})`;
  }
  return null;
}

export function priceError(price: number | null): string | null {
  if (price === null) return 'Falta el precio (lo pones tú)';
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return 'Precio inválido';
  return null;
}

export function stockError(stock: number): string | null {
  return Number.isInteger(stock) && stock >= 0 && stock <= 100000 ? null : 'Stock: un número entero desde 0';
}

/** Lee un producto del .json y dice qué le falta. No toca la base (categoría, marca y SKU los revisa el servidor). */
export function reviewImportItem(raw: unknown): ImportReview {
  const errors: string[] = [];
  const warnings: string[] = [];
  const item = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!item) {
    const empty: ImportDraft = {
      name: '', sku: null, category: '', brand: null, priceUSD: null, compareAtPriceUSD: null, costPerItem: null, stock: 0, description: '',
      specifications: {}, tags: [], weightKg: null, dimensions: null, barcode: null, seoTitle: null, seoDescription: null, condition: null,
      photos: [], notes: null,
    };
    return { draft: empty, errors: ['No es un producto (se esperaba un objeto con "nombre", "categoria"…)'], warnings: [] };
  }

  for (const key of Object.keys(item)) {
    if (!(IMPORT_FIELDS as readonly string[]).includes(key)) warnings.push(`Campo desconocido "${key}": se ignora`);
  }

  const name = asText(item.nombre) ?? '';
  if (!name) errors.push('Falta el nombre');
  else if (name.length > 150) errors.push('El nombre pasa de 150 caracteres');

  const sku = asText(item.sku)?.toUpperCase() ?? null;
  if (sku && !/^[A-Z0-9][A-Z0-9._-]{1,39}$/.test(sku)) errors.push('SKU inválido: letras, números, guiones o puntos (hasta 40)');

  const category = asText(item.categoria) ?? '';
  if (!category) errors.push('Falta la categoría');

  const brand = asText(item.marca);
  if (brand && brand.length > 60) errors.push('La marca pasa de 60 caracteres');

  const priceUSD = asNumber(item.precioUSD);
  const priceProblem = priceError(priceUSD);
  if (priceProblem) errors.push(priceProblem);

  const compareAtPriceUSD = asNumber(item.precioAntesUSD);
  if (compareAtPriceUSD !== null && !(Number.isFinite(compareAtPriceUSD) && priceUSD !== null && compareAtPriceUSD > priceUSD)) {
    errors.push('"precioAntesUSD" tiene que ser mayor que el precio');
  }
  const costPerItem = asNumber(item.costoUSD);
  if (costPerItem !== null && !(Number.isFinite(costPerItem) && costPerItem >= 0)) errors.push('Costo inválido');

  // Condición (C-119): acepta "Usado", "usado" o "USED"
  const conditionCode = matchEnum(item.condicion, CONDITIONS, CONDITION_LABEL);
  const grade = matchEnum(item.grado, GRADES, GRADE_LABEL);
  const packaging = matchEnum(item.empaque, PACKAGINGS, PACKAGING_LABEL);
  if (conditionCode === undefined) errors.push(`Condición inválida: usa ${CONDITIONS.map((c) => `"${CONDITION_LABEL[c]}"`).join(', ')}`);
  if (grade === undefined) errors.push(`Grado inválido: usa ${GRADES.map((g) => `"${GRADE_LABEL[g]}"`).join(', ')}`);
  if (packaging === undefined) errors.push(`Empaque inválido: usa ${PACKAGINGS.map((p) => `"${PACKAGING_LABEL[p]}"`).join(', ')}`);

  let condition: ConditionInput | null = null;
  if (conditionCode !== undefined && grade !== undefined && packaging !== undefined) {
    const parsed = conditionInputSchema.safeParse({
      condition: conditionCode ?? 'NEW',
      conditionGrade: grade,
      packaging,
      includedItems: asText(item.incluye),
      missingItems: asText(item.noIncluye),
      usageHours: item.horasDeUso ?? null,
      batteryHealth: item.bateriaPorcentaje ?? null,
      cosmeticNotes: asText(item.detallesEsteticos),
      testNotes: asText(item.pruebasHechas),
      warrantyDays: item.garantiaDias ?? null,
      serialNumber: asText(item.numeroDeSerie),
    });
    if (parsed.success) {
      condition = parsed.data;
      // El formulario lo exige: el cliente tiene que saber qué trae la caja
      if (isSecondHand(condition.condition) && !condition.includedItems) errors.push('Falta "incluye": qué trae el equipo');
    } else {
      for (const issue of parsed.error.issues) errors.push(issue.message);
    }
  }

  const stockRaw = asNumber(item.stock);
  // Un usado es una unidad; un nuevo sin stock queda en 0 hasta que Andrés lo cargue
  const stock = stockRaw ?? (isSecondHand(condition?.condition) ? 1 : 0);
  const stockProblem = stockError(stock);
  if (stockProblem) errors.push(stockProblem);
  else if (stockRaw === null && stock === 0) warnings.push('Sin stock: queda en 0');

  const description = asText(item.descripcion) ?? '';
  if (!description) warnings.push('Sin descripción');
  else if (description.length > 5000) errors.push('La descripción pasa de 5000 caracteres');

  const specifications: Record<string, string> = {};
  const rawSpecs = item.especificaciones;
  if (rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)) {
    for (const [k, v] of Object.entries(rawSpecs)) {
      const key = k.trim().slice(0, 60);
      const value = asText(v);
      if (key && value) specifications[key] = value.slice(0, 200);
    }
  } else if (rawSpecs !== undefined && rawSpecs !== null) {
    errors.push('"especificaciones" va como objeto: {"Conectividad": "Bluetooth 5.3"}');
  }
  if (Object.keys(specifications).length < IMPORT_MIN_SPECS) errors.push(`Faltan especificaciones: al menos ${IMPORT_MIN_SPECS}`);

  const tags = Array.isArray(item.etiquetas)
    ? item.etiquetas.map(asText).filter((t): t is string => !!t).map((t) => t.slice(0, 40)).slice(0, 20)
    : [];

  const weightKg = asNumber(item.pesoKg);
  if (weightKg === null) errors.push('Falta el peso (pesoKg, con empaque)');
  else if (!(Number.isFinite(weightKg) && weightKg > 0 && weightKg <= 1000)) errors.push('Peso inválido');

  let dimensions: ImportDraft['dimensions'] = null;
  const dims = item.medidasCm;
  if (dims && typeof dims === 'object' && !Array.isArray(dims)) {
    const d = dims as Record<string, unknown>;
    const [length, width, height] = [asNumber(d.largo), asNumber(d.ancho), asNumber(d.alto)];
    if ([length, width, height].some((n) => n !== null && !(Number.isFinite(n) && n >= 0 && n <= 1000))) errors.push('Medidas inválidas');
    else if (length || width || height) dimensions = { length: length ?? 0, width: width ?? 0, height: height ?? 0 };
  }
  if (!dimensions && !errors.includes('Medidas inválidas')) errors.push('Faltan las medidas (medidasCm: largo, ancho y alto)');

  const photos = Array.isArray(item.fotos) ? item.fotos.map(asText).filter((f): f is string => !!f) : [];
  if (item.fotos !== undefined && !Array.isArray(item.fotos)) errors.push('"fotos" va como lista: ["frente.png", "atras.png"]');

  const barcode = asText(item.codigoDeBarras);
  const seoTitle = asText(item.seoTitulo)?.slice(0, 70) ?? null;
  const seoDescription = asText(item.seoDescripcion)?.slice(0, 170) ?? null;
  const notes = asText(item.notas);
  if (notes) warnings.push(`Nota de Claude: ${notes}`);

  return {
    draft: {
      name, sku, category, brand, priceUSD, compareAtPriceUSD, costPerItem, stock, description, specifications, tags,
      weightKg, dimensions, barcode, seoTitle, seoDescription, condition, photos, notes,
    },
    errors,
    warnings,
  };
}

/** Lee el archivo: la plantilla llena ({ productos: [...] }) o una lista suelta de productos */
export function parseImportFile(text: string): { items: unknown[]; error: string | null } {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { items: [], error: 'El archivo no es un JSON válido. Pídele a Claude que lo devuelva completo, sin texto antes ni después.' };
  }
  const items = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { productos?: unknown }).productos)
      ? (data as { productos: unknown[] }).productos
      : null;
  if (!items) return { items: [], error: 'No se encontró la lista "productos" en el archivo' };
  if (items.length === 0) return { items: [], error: 'La lista "productos" está vacía' };
  if (items.length > IMPORT_MAX_ITEMS) return { items: [], error: `Son ${IMPORT_MAX_ITEMS} productos por archivo como máximo (tiene ${items.length})` };
  return { items, error: null };
}
