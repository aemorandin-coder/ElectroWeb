// Carga masiva con .json (C-118): lo que necesita la base. Solo en el servidor.
// Las reglas del archivo están en lib/product-import.ts, que también usa la vista previa.

import { randomInt } from 'crypto';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generateShortCode } from '@/lib/short-code';
import {
  CONDITIONS, CONDITION_HELP, CONDITION_LABEL, DEFAULT_WARRANTY_DAYS, GRADES, GRADE_DEFINITION, GRADE_LABEL, PACKAGINGS, PACKAGING_LABEL,
} from '@/lib/product-condition';
import {
  IMPORT_FORMAT, IMPORT_MAX_ITEMS, IMPORT_MAX_PHOTOS, IMPORT_MIN_PHOTOS_SECOND_HAND, IMPORT_MIN_SPECS, IMPORT_VERSION,
  normalizeKey, photoCountError, reviewImportItem, toSlug,
} from '@/lib/product-import';

interface CategoryRow { id: string; name: string; slug: string; parentId: string | null }
export interface ImportContext {
  categories: { id: string; path: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
}

/** "Audio > Audífonos": así ve Claude las categorías y así se pueden escribir en el .json */
function withPaths(rows: CategoryRow[]): ImportContext['categories'] {
  const byId = new Map(rows.map((c) => [c.id, c]));
  return rows
    .map((c) => {
      const names = [c.name];
      let parent = c.parentId ? byId.get(c.parentId) : undefined;
      for (let i = 0; parent && i < 10; i++) {
        names.unshift(parent.name);
        parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      }
      return { id: c.id, path: names.join(' > '), name: c.name, slug: c.slug };
    })
    .sort((a, b) => a.path.localeCompare(b.path, 'es'));
}

export async function loadImportContext(): Promise<ImportContext> {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } }),
    prisma.brand.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } }),
  ]);
  return { categories: withPaths(categories), brands };
}

/** La categoría del .json: la ruta completa, el slug o el nombre solo (si no se repite). Nunca se crea una nueva. */
export function resolveCategory(text: string, ctx: ImportContext): { id: string; path: string } | { error: string } {
  const key = normalizeKey(text);
  const exact = ctx.categories.find((c) => normalizeKey(c.path) === key || c.slug === toSlug(text));
  if (exact) return exact;
  const byName = ctx.categories.filter((c) => normalizeKey(c.name) === key);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) return { error: `La categoría "${text}" se repite: escribe la ruta completa (${byName.map((c) => `"${c.path}"`).join(' o ')})` };
  return { error: `La categoría "${text}" no existe en la tienda (se crea desde Categorías)` };
}

export function resolveBrand(text: string | null, ctx: ImportContext): { id: string | null; name: string; isNew: boolean } | null {
  if (!text) return null;
  const found = ctx.brands.find((b) => normalizeKey(b.name) === normalizeKey(text) || b.slug === toSlug(text));
  return found ? { id: found.id, name: found.name, isNew: false } : { id: null, name: text, isNew: true };
}

/** Lo que depende de la base. Lo demás (precio, fotos, campos) lo revisa la vista previa con reviewImportItem. */
export interface ImportRowCheck {
  errors: string[];
  warnings: string[];
  category: string | null;
  brand: string | null;
  sku: string | null;
}

/** Revisión de todo el archivo contra la base, sin escribir nada: la vista previa la muestra por fila */
export async function checkImportItems(items: unknown[]): Promise<ImportRowCheck[]> {
  const ctx = await loadImportContext();
  const reviews = items.slice(0, IMPORT_MAX_ITEMS).map(reviewImportItem);

  const skus = reviews.map((r) => r.draft.sku).filter((s): s is string => !!s);
  const names = reviews.map((r) => r.draft.name).filter(Boolean);
  const [takenSkus, sameNames] = await Promise.all([
    skus.length ? prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } }) : [],
    names.length
      ? prisma.product.findMany({ where: { OR: names.map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })) }, select: { name: true } })
      : [],
  ]);
  const taken = new Set(takenSkus.map((p) => p.sku));
  const existingNames = new Set(sameNames.map((p) => normalizeKey(p.name)));
  const skuCount = new Map<string, number>();
  const nameCount = new Map<string, number>();
  for (const r of reviews) {
    if (r.draft.sku) skuCount.set(r.draft.sku, (skuCount.get(r.draft.sku) ?? 0) + 1);
    if (r.draft.name) nameCount.set(normalizeKey(r.draft.name), (nameCount.get(normalizeKey(r.draft.name)) ?? 0) + 1);
  }

  return reviews.map(({ draft }) => {
    const errs: string[] = [];
    const warns: string[] = [];
    let category: string | null = null;
    if (draft.category) {
      const found = resolveCategory(draft.category, ctx);
      if ('error' in found) errs.push(found.error);
      else category = found.path;
    }
    const brand = resolveBrand(draft.brand, ctx);
    if (brand?.isNew) warns.push(`Marca nueva "${brand.name}": se crea al importar`);
    if (draft.sku && taken.has(draft.sku)) errs.push(`El SKU ${draft.sku} ya lo tiene otro producto`);
    if (draft.sku && (skuCount.get(draft.sku) ?? 0) > 1) errs.push(`El SKU ${draft.sku} se repite en el archivo`);
    const nameKey = normalizeKey(draft.name);
    if (draft.name && existingNames.has(nameKey)) warns.push('Ya hay un producto con este nombre: ¿ya lo importaste?');
    if (draft.name && (nameCount.get(nameKey) ?? 0) > 1) warns.push('El nombre se repite en el archivo');
    return { errors: errs, warnings: warns, category, brand: brand?.name ?? null, sku: draft.sku };
  });
}

/** SKU para quien no trae: 3 letras de la categoría y 5 al azar ("AUD-K3F9Q") */
async function generateSku(categoryName: string): Promise<string> {
  const prefix = (toSlug(categoryName).replace(/-/g, '').slice(0, 3) || 'PRD').toUpperCase();
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 10; attempt++) {
    const sku = `${prefix}-${Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('')}`;
    if (!(await prisma.product.findUnique({ where: { sku }, select: { id: true } }))) return sku;
  }
  throw new Error('No se pudo generar un SKU único');
}

async function uniqueSlug(name: string): Promise<string> {
  const base = toSlug(name) || 'producto';
  if (!(await prisma.product.findUnique({ where: { slug: base }, select: { id: true } }))) return base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = `${base}-${randomInt(36 ** 4).toString(36).padStart(4, '0')}`;
    if (!(await prisma.product.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  throw new Error('No se pudo generar el enlace del producto');
}

/** Solo fotos que la tienda acaba de guardar (/api/upload), no enlaces de afuera */
const UPLOADED_PHOTO = /^\/api\/uploads\/products\/product-\d+-[a-z0-9]+\.(webp|png|jpe?g|gif)$/;

export type ImportCreateResult = { id: string; sku: string; name: string } | { error: string };

/**
 * Crea un producto del .json en borrador. Vuelve a revisar todo: la vista previa puede estar vieja
 * (otro admin creó el SKU) o el pedido puede venir armado a mano.
 */
export async function createImportedProduct(raw: unknown, images: unknown): Promise<ImportCreateResult> {
  const { draft, errors } = reviewImportItem(raw);
  if (errors.length > 0) return { error: errors[0] };

  const photos = Array.isArray(images) ? images.filter((u): u is string => typeof u === 'string' && UPLOADED_PHOTO.test(u)) : [];
  if (!Array.isArray(images) || photos.length !== images.length) return { error: 'Fotos inválidas' };
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
  if (photos.some((u) => !existsSync(path.join(uploadDir, path.basename(u))))) return { error: 'Una foto no terminó de subir: intenta de nuevo' };
  const photoProblem = photoCountError(photos.length, draft.condition?.condition ?? 'NEW');
  if (photoProblem) return { error: photoProblem };

  const ctx = await loadImportContext();
  const category = resolveCategory(draft.category, ctx);
  if ('error' in category) return { error: category.error };
  if (draft.sku && (await prisma.product.findUnique({ where: { sku: draft.sku }, select: { id: true } }))) {
    return { error: `El SKU ${draft.sku} ya lo tiene otro producto` };
  }

  const sku = draft.sku ?? (await generateSku(category.path.split(' > ').pop() ?? ''));
  const slug = await uniqueSlug(draft.name);
  const shortCode = await generateShortCode(prisma);
  const brand = resolveBrand(draft.brand, ctx);

  const product = await prisma.$transaction(async (tx) => {
    let brandId = brand?.id ?? null;
    if (brand && !brandId) {
      // upsert: dos filas con la misma marca nueva no chocan
      const created = await tx.brand.upsert({ where: { slug: toSlug(brand.name) }, update: {}, create: { name: brand.name, slug: toSlug(brand.name) } });
      brandId = created.id;
    }
    return tx.product.create({
      data: {
        name: draft.name,
        sku,
        slug,
        shortCode,
        description: draft.description,
        priceUSD: draft.priceUSD as number,
        compareAtPriceUSD: draft.compareAtPriceUSD,
        costPerItem: draft.costPerItem,
        stock: draft.stock,
        barcode: draft.barcode,
        tags: draft.tags.length > 0 ? JSON.stringify(draft.tags) : null,
        categoryId: category.id,
        brandId,
        images: JSON.stringify(photos),
        mainImage: photos[0],
        specs: JSON.stringify(draft.specifications),
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        // Siempre en borrador: Andrés revisa y publica
        status: 'DRAFT',
        productType: 'PHYSICAL',
        weightKg: draft.weightKg ?? 0,
        dimensions: draft.dimensions ? JSON.stringify(draft.dimensions) : null,
        ...(draft.condition ?? {}),
      },
      select: { id: true, sku: true, name: true },
    });
  });
  return product;
}

const EXAMPLE: Record<string, unknown> = {
  nombre: 'Control inalámbrico Sony DualSense para PS5, blanco',
  sku: null,
  categoria: 'Ruta exacta de la lista "categorias"',
  marca: 'Sony',
  precioUSD: null,
  precioAntesUSD: null,
  stock: 1,
  descripcion: 'Control original de PlayStation 5 con vibración háptica y gatillos adaptativos.\n\nProbado por la tienda: todos los botones, los gatillos, la vibración y la carga por USB-C funcionan.',
  especificaciones: { Compatibilidad: 'PlayStation 5, PC', Conexión: 'Bluetooth y USB-C', Batería: 'Recargable, integrada' },
  etiquetas: ['playstation', 'control', 'ps5'],
  pesoKg: 0.45,
  medidasCm: { largo: 17, ancho: 11, alto: 7 },
  condicion: 'Usado',
  grado: 'Muy bueno',
  empaque: 'Sin caja',
  incluye: 'Control y cable USB-C',
  noIncluye: 'Caja y manual',
  horasDeUso: null,
  bateriaPorcentaje: 85,
  detallesEsteticos: 'Rayón leve en la parte de atrás',
  pruebasHechas: 'Botones, gatillos, vibración, micrófono y carga',
  garantiaDias: null,
  numeroDeSerie: null,
  fotos: ['control-frente.jpg', 'control-atras.jpg', 'control-detalle.jpg'],
  notas: null,
};

/** La plantilla que se descarga: instrucciones para Claude, valores válidos, un ejemplo y la lista vacía */
export async function buildImportTemplate() {
  const ctx = await loadImportContext();
  return {
    formato: IMPORT_FORMAT,
    version: IMPORT_VERSION,
    tienda: 'Electro Shop Morandin C.A. (electroshopve.com), Guanare, Venezuela',
    instrucciones: [
      'Eres el asistente de catálogo de la tienda. Te paso fotos de productos. Llena la lista "productos" con un objeto por producto, con los mismos campos del "ejemplo".',
      'Devuelve este archivo completo como JSON válido, sin comentarios ni texto antes o después. No cambies "formato" ni "version". Puedes borrar "ejemplo" e "instrucciones".',
      'precioUSD: déjalo en null salvo que Andrés te diga el precio. Nunca inventes precios ni costos.',
      'categoria: copia exactamente una de la lista "categorias". Si ninguna encaja, usa la más cercana y explícalo en "notas".',
      'marca: si está en "marcas", escríbela igual. Si no, como aparece en el producto. Si no se ve la marca, null.',
      'nombre: tipo de producto, marca, modelo y un detalle (color, capacidad). Hasta 120 caracteres. Ejemplo: "Audífonos inalámbricos Sony WH-1000XM5, negros".',
      'descripcion: de 2 a 4 párrafos cortos, en español de Venezuela, para el cliente. Sin emojis, sin exagerar y sin prometer nada que no se vea en las fotos o no sea del modelo exacto.',
      `especificaciones: al menos ${IMPORT_MIN_SPECS}, como {"Nombre": "valor"}. Solo lo que se lee en el producto, la caja o la etiqueta, o lo que es seguro de ese modelo exacto. Si dudas, no lo pongas.`,
      'pesoKg y medidasCm (largo, ancho y alto): del paquete como se envía, para calcular el envío. Si no los sabes, estímalos y dilo en "notas".',
      `condicion: ${CONDITIONS.map((c) => `"${CONDITION_LABEL[c]}"`).join(', ')}. Si no es "Nuevo", son obligatorios "grado" (${GRADES.map((g) => `"${GRADE_LABEL[g]}"`).join(', ')}; en "Caja abierta" es opcional), "empaque" (${PACKAGINGS.map((p) => `"${PACKAGING_LABEL[p]}"`).join(', ')}) e "incluye". Mira las definiciones en "valores".`,
      `En un producto que no es nuevo describe lo que se ve en las fotos: detallesEsteticos (rayones, marcas), incluye y noIncluye. Las pruebas, las horas de uso y la batería las da Andrés: si no te las dice, null. Lleva al menos ${IMPORT_MIN_PHOTOS_SECOND_HAND} fotos reales.`,
      'garantiaDias: null usa la garantía de su condición (ver "valores"). numeroDeSerie: solo si se lee en la foto; es interno y no se publica.',
      `fotos: los nombres exactos de los archivos de foto de ese producto, la principal primero, hasta ${IMPORT_MAX_PHOTOS}. Andrés las sube junto con este archivo. Si no ves los nombres de los archivos, deja la lista vacía: Andrés las elige en la vista previa.`,
      'sku: null. La tienda lo crea. stock: cuántas unidades hay; si no lo sabes, null.',
      'notas: dudas o avisos para Andrés (no se publican).',
    ],
    valores: {
      condicion: Object.fromEntries(CONDITIONS.map((c) => [CONDITION_LABEL[c], CONDITION_HELP[c]])),
      grado: Object.fromEntries(GRADES.map((g) => [GRADE_LABEL[g], GRADE_DEFINITION[g]])),
      empaque: PACKAGINGS.map((p) => PACKAGING_LABEL[p]),
      garantiaPorDefectoDias: Object.fromEntries(CONDITIONS.map((c) => [CONDITION_LABEL[c], DEFAULT_WARRANTY_DAYS[c]])),
    },
    categorias: ctx.categories.map((c) => c.path),
    marcas: ctx.brands.map((b) => b.name),
    ejemplo: EXAMPLE,
    productos: [] as unknown[],
  };
}
