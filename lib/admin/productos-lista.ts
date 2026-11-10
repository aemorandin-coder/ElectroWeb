// C-196: la lista de Admin → Productos por páginas. Antes el panel pedía todos los productos con su descripción y sus
// especificaciones y filtraba en el navegador: con 3.000 eran varios megas y la página se trababa al escribir.
// Ahora la búsqueda, los filtros, los números de cada filtro y el orden se resuelven aquí, y viajan 50 filas livianas.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizar } from '@/lib/cotizaciones/busqueda';
import { parseProductImages } from '@/lib/product-utils';

export const FILTROS_LISTA = ['todos', 'publicados', 'borradores', 'sin-stock', 'archivados', 'sin-foto', 'sin-marca', 'sin-medidas'] as const;
export type FiltroLista = (typeof FILTROS_LISTA)[number];

export const ORDENES_LISTA = ['recientes', 'nombre', 'precio-asc', 'precio-desc', 'stock', 'actualizados'] as const;
export type OrdenLista = (typeof ORDENES_LISTA)[number];

export const POR_PAGINA = 50;
export const POR_PAGINA_MAX = 100;
/** "Seleccionar todos los que coinciden" y la exportación tienen tope */
export const IDS_MAX = 5_000;
export const EXPORTAR_MAX = 20_000;

const FISICO_PUBLICADO: Prisma.ProductWhereInput = { status: 'PUBLISHED', productType: 'PHYSICAL' };

/**
 * Cada filtro, con las mismas reglas que tenía la lista (C-187) y que usan los avisos del Dashboard
 * (lib/queries/dashboard.ts), para que los números coincidan. Lo archivado no cuenta en "Todos" ni en "Sin stock".
 */
export const WHERE_FILTRO: Record<FiltroLista, Prisma.ProductWhereInput> = {
  todos: { status: { not: 'ARCHIVED' } },
  publicados: { status: 'PUBLISHED' },
  borradores: { status: 'DRAFT' },
  archivados: { status: 'ARCHIVED' },
  'sin-stock': { status: { not: 'ARCHIVED' }, productType: { not: 'DIGITAL' }, stock: { lte: 0 } },
  'sin-foto': { status: 'PUBLISHED', mainImage: null, images: { in: ['', '[]'] } },
  'sin-marca': { ...FISICO_PUBLICADO, brandId: null },
  'sin-medidas': { ...FISICO_PUBLICADO, OR: [{ weightKg: null }, { weightKg: { lte: 0 } }, { dimensions: null }, { dimensions: '' }] },
};

const ORDEN: Record<OrdenLista, Prisma.ProductOrderByWithRelationInput[]> = {
  recientes: [{ createdAt: 'desc' }, { id: 'asc' }],
  nombre: [{ name: 'asc' }, { id: 'asc' }],
  'precio-asc': [{ priceUSD: 'asc' }, { id: 'asc' }],
  'precio-desc': [{ priceUSD: 'desc' }, { id: 'asc' }],
  stock: [{ stock: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  actualizados: [{ updatedAt: 'desc' }, { id: 'asc' }],
};

// translate() de PostgreSQL quita los acentos sin extensiones; va antes de lower() porque lower() de las letras con
// acento depende del idioma con que se creó la base. Las dos cadenas tienen el mismo largo (lo comprueba la prueba).
export const ACENTOS = 'áàâäãåéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ';
export const SIN_ACENTOS = 'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC';

/** Las palabras de la búsqueda como patrones de LIKE: sin acentos, en minúsculas y con % y _ escapados. Seis como máximo. */
export function patronesDeBusqueda(q: string): string[] {
  return normalizar(q)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
}

/**
 * Los productos (fuera de la papelera) cuyo nombre, SKU, código de barras, código del proveedor o marca tienen todas
 * las palabras, en cualquier orden y sin importar acentos ni mayúsculas: "taladro daewoo" encuentra
 * "TALADRO IMPACT 1050W DAEWOO". null = no hay búsqueda.
 */
export async function idsPorBusqueda(q: string): Promise<string[] | null> {
  const patrones = patronesDeBusqueda(q);
  if (patrones.length === 0) return null;
  const filas = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p.id FROM products p LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."deletedAt" IS NULL
      AND lower(translate(concat_ws(' ', p.name, p.sku, p.barcode, p."supplierSku", b.name), ${ACENTOS}, ${SIN_ACENTOS})) LIKE ALL (${patrones}::text[])
    LIMIT ${IDS_MAX * 4}`;
  return filas.map((f) => f.id);
}

export interface ParamsLista {
  q: string;
  filtro: FiltroLista;
  categoria: string;
  /** id del proveedor, 'ninguno' (sin proveedor) o vacío */
  proveedor: string;
  orden: OrdenLista;
  pagina: number;
  porPagina: number;
}

const texto = (v: string | null, max = 120) => (v ?? '').trim().slice(0, max);

/** Lo que llega en la dirección, validado: un valor desconocido vuelve al de siempre */
export function leerParamsLista(sp: URLSearchParams): ParamsLista {
  const filtro = (FILTROS_LISTA as readonly string[]).includes(sp.get('filtro') ?? '') ? sp.get('filtro') as FiltroLista : 'todos';
  const orden = (ORDENES_LISTA as readonly string[]).includes(sp.get('orden') ?? '') ? sp.get('orden') as OrdenLista : 'recientes';
  const pagina = Math.max(1, Math.min(10_000, Number.parseInt(sp.get('pagina') ?? '1', 10) || 1));
  const porPagina = Math.max(1, Math.min(POR_PAGINA_MAX, Number.parseInt(sp.get('porPagina') ?? String(POR_PAGINA), 10) || POR_PAGINA));
  return { q: texto(sp.get('q')), filtro, categoria: texto(sp.get('categoria'), 40), proveedor: texto(sp.get('proveedor'), 40), orden, pagina, porPagina };
}

/** Lo que acota la búsqueda, la categoría y el proveedor (sin el filtro de estado). null = la búsqueda no encontró nada. */
async function faceta(p: ParamsLista): Promise<Prisma.ProductWhereInput | null> {
  const ids = p.q ? await idsPorBusqueda(p.q) : null;
  if (ids && ids.length === 0) return null;
  return {
    deletedAt: null,
    ...(ids ? { id: { in: ids } } : {}),
    ...(p.categoria ? { categoryId: p.categoria } : {}),
    ...(p.proveedor === 'ninguno' ? { supplierId: null } : p.proveedor ? { supplierId: p.proveedor } : {}),
  };
}

const NINGUNO: Prisma.ProductWhereInput = { id: { in: [] } };

/** El where completo de la vista: faceta y filtro de estado */
export async function whereDeLista(p: ParamsLista): Promise<Prisma.ProductWhereInput> {
  const base = await faceta(p);
  return base ? { AND: [base, WHERE_FILTRO[p.filtro]] } : NINGUNO;
}

const SELECT_FILA = {
  id: true, name: true, sku: true, slug: true, priceUSD: true, compareAtPriceUSD: true, costPerItem: true, stock: true,
  status: true, productType: true, isFeatured: true, images: true, mainImage: true, description: true, specs: true,
  brandId: true, weightKg: true, dimensions: true, barcode: true, updatedAt: true,
  supplierId: true, supplierSku: true, supplierSyncedAt: true,
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  _count: { select: { digitalVariants: { where: { isActive: true } } } },
} satisfies Prisma.ProductSelect;

type FilaDb = Prisma.ProductGetPayload<{ select: typeof SELECT_FILA }>;

/** Digital con montos: los de la tabla (C-60) o, en productos viejos, los de specs.digitalPricing */
function tieneMontos(p: FilaDb): boolean {
  if (p.productType !== 'DIGITAL') return false;
  if (p._count.digitalVariants > 0) return true;
  try {
    const specs = p.specs ? JSON.parse(p.specs) : null;
    return Array.isArray(specs?.digitalPricing) && specs.digitalPricing.length > 0;
  } catch {
    return false;
  }
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** La fila que viaja al panel. El costo y el proveedor solo para quien administra productos (no para Marketing). */
export function filaParaPanel(p: FilaDb, verCosto: boolean) {
  return {
    id: p.id, name: p.name, sku: p.sku, slug: p.slug,
    priceUSD: Number(p.priceUSD), compareAtPriceUSD: num(p.compareAtPriceUSD),
    costPerItem: verCosto ? num(p.costPerItem) : null,
    stock: p.stock, status: p.status, productType: p.productType, isFeatured: p.isFeatured,
    images: parseProductImages(p.images).slice(0, 8), mainImage: p.mainImage,
    // La vista rápida muestra 6 líneas: no hace falta el texto entero
    description: (p.description ?? '').slice(0, 600),
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    hasVariants: tieneMontos(p),
    brandId: p.brandId, weightKg: num(p.weightKg), dimensions: p.dimensions || null, barcode: p.barcode || null,
    supplier: verCosto && p.supplier ? { id: p.supplier.id, name: p.supplier.name } : null,
    supplierSku: verCosto ? p.supplierSku : null,
    supplierSyncedAt: verCosto ? p.supplierSyncedAt?.toISOString() ?? null : null,
  };
}
export type FilaPanel = ReturnType<typeof filaParaPanel>;

export async function listarProductosAdmin(p: ParamsLista, verCosto: boolean) {
  const base = await faceta(p);
  const contar = (extra: Prisma.ProductWhereInput, conFaceta = true) =>
    conFaceta && !base ? Promise.resolve(0) : prisma.product.count({ where: { AND: [conFaceta ? base! : { deletedAt: null }, extra] } });

  // Los números de cada filtro respetan la búsqueda, la categoría y el proveedor; los de arriba ("N en el catálogo") no
  const [porFiltro, catalogo, activos, destacados] = await Promise.all([
    Promise.all(FILTROS_LISTA.map((f) => contar(WHERE_FILTRO[f]))),
    contar(WHERE_FILTRO.todos, false),
    contar(WHERE_FILTRO.publicados, false),
    contar({ isFeatured: true, status: 'PUBLISHED' }, false),
  ]);
  const conteos = Object.fromEntries(FILTROS_LISTA.map((f, i) => [f, porFiltro[i]])) as Record<FiltroLista, number>;
  const total = conteos[p.filtro];
  const paginas = Math.max(1, Math.ceil(total / p.porPagina));
  const pagina = Math.min(p.pagina, paginas);

  const filas = base && total > 0
    ? await prisma.product.findMany({
      where: { AND: [base, WHERE_FILTRO[p.filtro]] },
      select: SELECT_FILA,
      orderBy: ORDEN[p.orden],
      skip: (pagina - 1) * p.porPagina,
      take: p.porPagina,
    })
    : [];

  return {
    productos: filas.map((f) => filaParaPanel(f, verCosto)),
    total, pagina, paginas, porPagina: p.porPagina,
    conteos,
    resumen: { catalogo, activos, destacados },
  };
}

/** Todos los ids de la vista (para "Seleccionar los N que coinciden") y cuáles son digitales (su precio no se cambia en lote) */
export async function idsDeLista(p: ParamsLista): Promise<{ ids: string[]; digitales: string[]; recortado: boolean }> {
  const where = await whereDeLista(p);
  const filas = await prisma.product.findMany({ where, select: { id: true, productType: true }, orderBy: ORDEN[p.orden], take: IDS_MAX + 1 });
  const recortado = filas.length > IDS_MAX;
  const lista = filas.slice(0, IDS_MAX);
  return { ids: lista.map((f) => f.id), digitales: lista.filter((f) => f.productType === 'DIGITAL').map((f) => f.id), recortado };
}

/**
 * Una celda del CSV, con comillas escapadas. Un texto que empieza con = + - @ va con un apóstrofo delante: los nombres
 * pueden venir de la lista de un proveedor, y Excel ejecutaría "=…" como fórmula al abrir el archivo.
 */
const csv = (v: string | number | boolean | null | undefined) => {
  const texto = typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v ?? '');
  return `"${texto.replace(/"/g, '""')}"`;
};

/** La vista en CSV para Excel (con BOM y comillas escapadas, como la exportación de antes). Con costo y proveedor si se pueden ver. */
export async function csvDeLista(p: ParamsLista, verCosto: boolean): Promise<string> {
  const where = await whereDeLista(p);
  const filas = await prisma.product.findMany({
    where, orderBy: ORDEN[p.orden], take: EXPORTAR_MAX,
    select: {
      name: true, sku: true, description: true, productType: true, priceUSD: true, costPerItem: true, stock: true, status: true, isFeatured: true,
      barcode: true, supplierSku: true, category: { select: { name: true } }, brand: { select: { name: true } }, supplier: { select: { name: true } },
    },
  });
  const encabezado = ['nombre', 'sku', 'descripcion', 'categoria', 'marca', 'tipo', 'precioUSD', ...(verCosto ? ['costoUSD', 'proveedor', 'codigoProveedor'] : []), 'stock', 'estado', 'destacado', 'codigoBarras'];
  const lineas = filas.map((f) => [
    f.name, f.sku, f.description, f.category?.name, f.brand?.name, f.productType === 'DIGITAL' ? 'digital' : 'fisico', Number(f.priceUSD).toFixed(2),
    ...(verCosto ? [f.costPerItem === null ? '' : Number(f.costPerItem).toFixed(2), f.supplier?.name, f.supplierSku] : []),
    f.stock, f.status, f.isFeatured ? 'si' : 'no', f.barcode,
  ].map(csv).join(','));
  return '\uFEFF' + [encabezado.join(','), ...lineas].join('\n');
}
