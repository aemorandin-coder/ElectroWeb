// Catálogo /productos (C-30). La URL es la fuente de verdad: búsqueda, filtros, orden y página
// se leen de searchParams y se resuelven en la base de datos (nada de traer todo y filtrar en el cliente).
// Mismas reglas de visibilidad que el home (publicados; sin stock ocultos si el admin lo pide).

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { visibleProducts } from '@/lib/queries/home';

export const CATALOG_PAGE_SIZE = 24;
const MAX_PRICE = 10_000_000;

export const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'destacados', label: 'Destacados primero' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre (A-Z)' },
] as const;
export type CatalogSort = (typeof SORT_OPTIONS)[number]['value'];

export type CatalogType = 'digital' | 'fisico';

export interface CatalogParams {
  search: string;
  category: string | null;
  sort: CatalogSort;
  min: number | null;
  max: number | null;
  offers: boolean;
  inStock: boolean;
  type: CatalogType | null;
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
  const sort = (SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'recientes') as CatalogSort;
  let min = parsePrice(first(raw.min));
  let max = parsePrice(first(raw.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const typeRaw = first(raw.tipo);
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
  const query = new URLSearchParams();
  if (next.search) query.set('search', next.search);
  if (next.category) query.set('category', next.category);
  if (next.min !== null) query.set('min', String(next.min));
  if (next.max !== null) query.set('max', String(next.max));
  if (next.offers) query.set('oferta', '1');
  if (next.inStock) query.set('disponible', '1');
  if (next.type) query.set('tipo', next.type);
  if (next.sort !== 'recientes') query.set('sort', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  const qs = query.toString();
  return qs ? `/productos?${qs}` : '/productos';
}

/** ¿Hay algún filtro aplicado (sin contar orden ni página)? */
export function hasActiveFilters(params: CatalogParams): boolean {
  return Boolean(params.search || params.category || params.min !== null || params.max !== null || params.offers || params.inStock || params.type);
}

function filterConditions(params: CatalogParams, { withCategory }: { withCategory: boolean }): Prisma.ProductWhereInput[] {
  const conditions: Prisma.ProductWhereInput[] = [];
  // Cada palabra debe aparecer en el nombre, la descripción, la marca o la categoría ("teclado aoas")
  for (const term of params.search.split(/\s+/).filter(Boolean).slice(0, 6)) {
    conditions.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { brand: { name: { contains: term, mode: 'insensitive' } } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
      ],
    });
  }
  if (withCategory && params.category) conditions.push({ category: { slug: params.category } });
  if (params.min !== null) conditions.push({ priceUSD: { gte: params.min } });
  if (params.max !== null) conditions.push({ priceUSD: { lte: params.max } });
  if (params.offers) conditions.push({ compareAtPriceUSD: { gt: prisma.product.fields.priceUSD } });
  if (params.inStock) conditions.push({ OR: [{ productType: 'DIGITAL' }, { stock: { gt: 0 } }] });
  if (params.type) conditions.push({ productType: params.type === 'digital' ? 'DIGITAL' : 'PHYSICAL' });
  return conditions;
}

const ORDER_BY: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput[]> = {
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

export interface CatalogResult {
  products: PublicProduct[];
  total: number;
  page: number;
  totalPages: number;
  /** Categorías con productos para los filtros actuales (ignorando la categoría elegida) */
  categories: CatalogCategoryFacet[];
  /** Categoría elegida, si existe */
  currentCategory: CatalogCategoryFacet | null;
}

export async function getCatalog(params: CatalogParams): Promise<CatalogResult> {
  const where = await visibleProducts({ AND: filterConditions(params, { withCategory: true }) });
  const whereWithoutCategory = await visibleProducts({ AND: filterConditions(params, { withCategory: false }) });

  const [total, counts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ['categoryId'], where: whereWithoutCategory, _count: { categoryId: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  // Una página fuera de rango muestra la última en vez de una lista vacía
  const page = Math.min(params.page, totalPages);

  const [rows, categoryRows, selected] = await Promise.all([
    prisma.product.findMany({
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
    params.category ? prisma.category.findUnique({ where: { slug: params.category }, select: { id: true, name: true, slug: true } }) : null,
  ]);

  const countById = new Map(counts.map((c) => [c.categoryId, c._count.categoryId]));
  const categories = categoryRows
    .map((c) => ({ ...c, count: countById.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));

  return {
    products: rows.map(toPublicProduct),
    total,
    page,
    totalPages,
    categories,
    currentCategory: selected ? { ...selected, count: countById.get(selected.id) ?? 0 } : null,
  };
}
