// Catálogo /productos (C-30). La URL es la fuente de verdad: búsqueda, filtros, orden y página
// se leen de searchParams y se resuelven en la base de datos (nada de traer todo y filtrar en el cliente).
// Mismas reglas de visibilidad que el home (publicados; sin stock ocultos si el admin lo pide).

import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { conOfertas, filtroEnOferta, getOfertasVigentes } from '@/lib/promotions';
import { mejorOferta } from '@/lib/promotions-core';
import { visibleProducts } from '@/lib/queries/home';
import { buscarEnCatalogo } from '@/lib/queries/busqueda-catalogo';

export const CATALOG_PAGE_SIZE = 24;
const MAX_PRICE = 10_000_000;

export const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'destacados', label: 'Destacados primero' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre (A-Z)' },
] as const;
/** "Más relevantes" solo existe con una búsqueda (C-160); sin ella el orden es "recientes". */
export const SORT_RELEVANCIA = { value: 'relevancia', label: 'Más relevantes' } as const;
export type CatalogSort = (typeof SORT_OPTIONS)[number]['value'] | typeof SORT_RELEVANCIA.value;

/** El orden cuando la URL no dice cuál: por relevancia si hay búsqueda, si no el más reciente. */
export const ordenPorDefecto = (search: string): CatalogSort => (search ? 'relevancia' : 'recientes');

export type CatalogType = 'digital' | 'fisico';
export type CatalogCondition = 'nuevo' | 'usado';

export interface CatalogParams {
  search: string;
  category: string | null;
  sort: CatalogSort;
  min: number | null;
  max: number | null;
  offers: boolean;
  inStock: boolean;
  type: CatalogType | null;
  /** C-119: nuevos, o usados/reacondicionados/caja abierta */
  condition: CatalogCondition | null;
  page: number;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

function parsePrice(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_PRICE) : null;
}

/** Lee y sanea los parámetros. Acepta los nombres viejos (`q`, `categoria`) que puedan quedar en enlaces. */
export function parseCatalogParams(raw: RawSearchParams): CatalogParams {
  const search = (first(raw.search) || first(raw.q)).trim().slice(0, 100);
  const categoryRaw = (first(raw.category) || first(raw.categoria)).trim().toLowerCase();
  const category = /^[a-z0-9-]{1,80}$/.test(categoryRaw) ? categoryRaw : null;
  const sortRaw = first(raw.sort);
  const valido = SORT_OPTIONS.some((o) => o.value === sortRaw) || (sortRaw === SORT_RELEVANCIA.value && search !== '');
  const sort = (valido ? sortRaw : ordenPorDefecto(search)) as CatalogSort;
  let min = parsePrice(first(raw.min));
  let max = parsePrice(first(raw.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const typeRaw = first(raw.tipo);
  const conditionRaw = first(raw.condicion);
  const page = Math.min(1000, Math.max(1, Number.parseInt(first(raw.page), 10) || 1));
  return {
    search,
    category,
    sort,
    min,
    max,
    offers: first(raw.oferta) === '1',
    inStock: first(raw.disponible) === '1',
    type: typeRaw === 'digital' || typeRaw === 'fisico' ? typeRaw : null,
    condition: conditionRaw === 'nuevo' || conditionRaw === 'usado' ? conditionRaw : null,
    page,
  };
}

/**
 * URL de /productos con los parámetros actuales cambiados por `changes`.
 * Cualquier cambio que no sea de página vuelve a la página 1. Solo se escriben los valores que no son por defecto.
 */
export function catalogHref(params: CatalogParams, changes: Partial<CatalogParams> = {}): string {
  const next = { ...params, ...changes };
  if (!('page' in changes)) next.page = 1;
  // Sin búsqueda no hay "relevancia": al quitarla, el orden vuelve al más reciente
  if (!next.search && next.sort === 'relevancia') next.sort = 'recientes';
  const query = new URLSearchParams();
  if (next.search) query.set('search', next.search);
  if (next.category) query.set('category', next.category);
  if (next.min !== null) query.set('min', String(next.min));
  if (next.max !== null) query.set('max', String(next.max));
  if (next.offers) query.set('oferta', '1');
  if (next.inStock) query.set('disponible', '1');
  if (next.type) query.set('tipo', next.type);
  if (next.condition) query.set('condicion', next.condition);
  if (next.sort !== ordenPorDefecto(next.search)) query.set('sort', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  const qs = query.toString();
  return qs ? `/productos?${qs}` : '/productos';
}

/** ¿Hay algún filtro aplicado (sin contar orden ni página)? */
export function hasActiveFilters(params: CatalogParams): boolean {
  return Boolean(params.search || params.category || params.min !== null || params.max !== null || params.offers || params.inStock || params.type || params.condition);
}

/** La página que se indexa: el catálogo o una categoría, sin búsqueda, filtros, orden ni páginas siguientes. */
export function isIndexableCatalog(params: CatalogParams): boolean {
  return !hasActiveFilters({ ...params, category: null }) && params.page === 1 && params.sort === ordenPorDefecto(params.search);
}

function filterConditions(params: CatalogParams, { withCategory, ofertas, busqueda }: { withCategory: boolean; ofertas: Prisma.ProductWhereInput; busqueda: string[] | null }): Prisma.ProductWhereInput[] {
  const conditions: Prisma.ProductWhereInput[] = [];
  // La búsqueda (C-158) ya se resolvió sin acentos ni mayúsculas: aquí solo se pide esos productos
  if (busqueda) conditions.push({ id: { in: busqueda } });
  if (withCategory && params.category) conditions.push({ category: { slug: params.category } });
  if (params.min !== null) conditions.push({ priceUSD: { gte: params.min } });
  if (params.max !== null) conditions.push({ priceUSD: { lte: params.max } });
  if (params.offers) conditions.push(ofertas);
  if (params.inStock) conditions.push({ OR: [{ productType: 'DIGITAL' }, { stock: { gt: 0 } }] });
  if (params.condition === 'nuevo') conditions.push({ condition: 'NEW' });
  if (params.condition === 'usado') conditions.push({ condition: { not: 'NEW' } });
  if (params.type) conditions.push({ productType: params.type === 'digital' ? 'DIGITAL' : 'PHYSICAL' });
  return conditions;
}

const ORDER_BY: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput[]> = {
  // "relevancia" no la da la base: la resuelve `idsEnOrden`. Si algo la pide aquí, cae al más reciente.
  relevancia: [{ createdAt: 'desc' }, { id: 'asc' }],
  recientes: [{ createdAt: 'desc' }, { id: 'asc' }],
  destacados: [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
  'precio-asc': [{ priceUSD: 'asc' }, { id: 'asc' }],
  'precio-desc': [{ priceUSD: 'desc' }, { id: 'asc' }],
  nombre: [{ name: 'asc' }, { id: 'asc' }],
};

export interface CatalogCategoryFacet {
  id: string;
  name: string;
  slug: string;
  count: number;
}

/** Categoría elegida: además del conteo, ícono y descripción para el encabezado (C-54). */
export interface CatalogCurrentCategory extends CatalogCategoryFacet {
  icon: string | null;
  description: string | null;
}

export interface CatalogResult {
  products: PublicProduct[];
  total: number;
  page: number;
  totalPages: number;
  /** Categorías con productos para los filtros actuales (ignorando la categoría elegida) */
  categories: CatalogCategoryFacet[];
  /** Categoría elegida, si existe */
  currentCategory: CatalogCurrentCategory | null;
  /** La búsqueda no coincidió exacto: se muestran productos que se parecen (C-158) */
  aproximado: boolean;
}

/**
 * Los ids que cumplen `where`, en el orden que la base no puede dar (C-160); null si basta con ordenar en la base.
 * - Relevancia: el orden de `buscarEnCatalogo`.
 * - Precio con una oferta de la tienda vigente: se ordena por el precio que paga el cliente (con la oferta), no por el
 *   precio de lista: con la base, un producto rebajado salía en un lugar que no era el de su precio.
 * Son pocos productos: se trae la lista de ids y se pagina aquí.
 */
async function idsEnOrden(where: Prisma.ProductWhereInput, params: CatalogParams, coincidencias: { ids: string[] } | null): Promise<string[] | null> {
  if (params.sort === 'relevancia' && coincidencias) {
    const puesto = new Map(coincidencias.ids.map((id, i) => [id, i]));
    const filas = await prisma.product.findMany({ where, select: { id: true } });
    return filas.map((f) => f.id).sort((a, b) => (puesto.get(a) ?? Infinity) - (puesto.get(b) ?? Infinity));
  }
  if (params.sort === 'precio-asc' || params.sort === 'precio-desc') {
    const ofertas = (await getOfertasVigentes()).filter((o) => o.kind === 'AUTOMATIC');
    if (ofertas.length === 0) return null;
    const filas = await prisma.product.findMany({ where, select: { id: true, priceUSD: true, categoryId: true, productType: true } });
    const sentido = params.sort === 'precio-asc' ? 1 : -1;
    return filas
      .map((f) => {
        const lista = Number(f.priceUSD);
        return { id: f.id, precio: mejorOferta(ofertas, { id: f.id, categoryId: f.categoryId, productType: f.productType }, lista)?.priceUSD ?? lista };
      })
      .sort((a, b) => sentido * (a.precio - b.precio) || a.id.localeCompare(b.id))
      .map((f) => f.id);
  }
  return null;
}

export async function getCatalog(params: CatalogParams): Promise<CatalogResult> {
  // "Solo ofertas" incluye las ofertas de la tienda vigentes (C-102), no solo el precio anterior
  const ofertas = params.offers ? await filtroEnOferta() : {};
  const coincidencias = params.search ? await buscarEnCatalogo(params.search) : null;
  const busqueda = coincidencias?.ids ?? null;
  const where = await visibleProducts({ AND: filterConditions(params, { withCategory: true, ofertas, busqueda }) });
  const whereWithoutCategory = await visibleProducts({ AND: filterConditions(params, { withCategory: false, ofertas, busqueda }) });

  const [total, counts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ['categoryId'], where: whereWithoutCategory, _count: { categoryId: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  // Una página fuera de rango muestra la última en vez de una lista vacía
  const page = Math.min(params.page, totalPages);

  const enOrden = await idsEnOrden(where, params, coincidencias);
  const idsDeLaPagina = enOrden?.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE) ?? null;

  const [filas, categoryRows, selected] = await Promise.all([
    idsDeLaPagina
      ? prisma.product.findMany({ where: { id: { in: idsDeLaPagina } }, include: publicProductInclude })
      : prisma.product.findMany({
          where,
          include: publicProductInclude,
          orderBy: ORDER_BY[params.sort],
          skip: (page - 1) * CATALOG_PAGE_SIZE,
          take: CATALOG_PAGE_SIZE,
        }),
    prisma.category.findMany({
      where: { id: { in: counts.map((c) => c.categoryId) } },
      select: { id: true, name: true, slug: true },
    }),
    params.category ? prisma.category.findUnique({ where: { slug: params.category }, select: { id: true, name: true, slug: true, icon: true, description: true } }) : null,
  ]);

  // Con orden en memoria, la base devuelve la página sin orden: se acomoda como dijo `idsEnOrden`
  const rows = idsDeLaPagina
    ? [...filas].sort((a, b) => idsDeLaPagina.indexOf(a.id) - idsDeLaPagina.indexOf(b.id))
    : filas;

  const countById = new Map(counts.map((c) => [c.categoryId, c._count.categoryId]));
  const categories = categoryRows
    .map((c) => ({ ...c, count: countById.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));

  return {
    products: await conOfertas(rows.map(toPublicProduct)),
    total,
    page,
    totalPages,
    categories,
    currentCategory: selected ? { ...selected, count: countById.get(selected.id) ?? 0 } : null,
    aproximado: coincidencias?.aproximado ?? false,
  };
}

export interface CategorySummary {
  name: string;
  slug: string;
  /** Texto que escribió el equipo en Categorías; null si no hay */
  description: string | null;
  /** Hasta 4 marcas, primero las que tienen más productos */
  brands: string[];
}

/**
 * C-149: lo que hay hoy en una categoría, para su texto en la página y en los buscadores.
 * `cache()`: generateMetadata y la página comparten la consulta.
 */
export const getCategorySummary = cache(async (slug: string): Promise<CategorySummary | null> => {
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, description: true } });
  if (!category) return null;
  const byBrand = await prisma.product.groupBy({
    by: ['brandId'],
    where: await visibleProducts({ categoryId: category.id, brandId: { not: null } }),
    _count: { brandId: true },
    orderBy: { _count: { brandId: 'desc' } },
    take: 4,
  });
  const ids = byBrand.map((row) => row.brandId).filter((id): id is string => Boolean(id));
  const names = ids.length > 0 ? await prisma.brand.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nameById = new Map(names.map((brand) => [brand.id, brand.name]));
  return {
    name: category.name,
    slug: category.slug,
    description: category.description?.trim() || null,
    brands: ids.map((id) => nameById.get(id)).filter((name): name is string => Boolean(name)),
  };
});

const listaEs = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}` : items[0] ?? '');

/**
 * Texto propio de la categoría: el que escribió el equipo o, si no hay, uno armado con las marcas que la tienda
 * tiene hoy en ella. Sin la cantidad: la página ya la dice debajo. El envío solo se menciona si está activo en Configuración.
 */
export function categoryText(summary: CategorySummary, deliveryEnabled: boolean): string {
  if (summary.description) return summary.description;
  const que = summary.brands.length > 0
    ? `${summary.name} de ${summary.brands.length === 1 ? 'la marca' : 'marcas como'} ${listaEs(summary.brands)}`
    : `Todo lo que tenemos en ${summary.name}`;
  return `${que}. Precios en dólares y en bolívares${deliveryEnabled ? ', con envíos a toda Venezuela' : ''}.`;
}
