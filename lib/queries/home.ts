// Consultas del home (C-13). Solo servidor: los Server Components las llaman directamente.
// Todas devuelven el DTO público (lib/dto/product.ts) y respetan autoHideOutOfStock:
// con el ajuste activo, los productos físicos sin stock no aparecen (los digitales sí).
// Envueltas en React cache(): varias secciones de la misma página no repiten la consulta.

import { cache } from 'react';
import type { PaymentMethodType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';

const MAX_LIMIT = 50;
const clampLimit = (value: number) => Math.min(MAX_LIMIT, Math.max(1, Math.floor(value) || 1));

export interface HomeSettings {
  autoHideOutOfStock: boolean;
  maxFeaturedProducts: number;
  lowStockThreshold: number;
  showCategories: boolean;
  maxCategoriesDisplay: number;
}

export const getHomeSettings = cache(async (): Promise<HomeSettings> => {
  const settings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: {
      autoHideOutOfStock: true,
      maxFeaturedProducts: true,
      lowStockThreshold: true,
      showCategories: true,
      maxCategoriesDisplay: true,
    },
  });
  return {
    autoHideOutOfStock: settings?.autoHideOutOfStock ?? false,
    maxFeaturedProducts: settings?.maxFeaturedProducts ?? 8,
    lowStockThreshold: settings?.lowStockThreshold ?? 10,
    showCategories: settings?.showCategories ?? true,
    maxCategoriesDisplay: settings?.maxCategoriesDisplay ?? 6,
  };
});

/** Publicados y, si autoHideOutOfStock está activo, con stock (salvo digitales). */
async function visibleProducts(extra?: Prisma.ProductWhereInput): Promise<Prisma.ProductWhereInput> {
  const { autoHideOutOfStock } = await getHomeSettings();
  const conditions: Prisma.ProductWhereInput[] = [{ status: 'PUBLISHED' }];
  if (autoHideOutOfStock) {
    conditions.push({ OR: [{ productType: 'DIGITAL' }, { stock: { gt: 0 } }] });
  }
  if (extra) conditions.push(extra);
  return { AND: conditions };
}

/** Destacados (isFeatured). Sin `max`, usa maxFeaturedProducts del admin. */
export const getFeatured = cache(async (max?: number): Promise<PublicProduct[]> => {
  const limit = clampLimit(max ?? (await getHomeSettings()).maxFeaturedProducts);
  const rows = await prisma.product.findMany({
    where: await visibleProducts({ isFeatured: true }),
    include: publicProductInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(toPublicProduct);
});

/** Ofertas: precio de comparación mayor al precio, ordenadas por % de ahorro. */
export const getDeals = cache(async (max = 12): Promise<PublicProduct[]> => {
  const rows = await prisma.product.findMany({
    where: await visibleProducts({ compareAtPriceUSD: { gt: prisma.product.fields.priceUSD } }),
    include: publicProductInclude,
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  const savingsPercent = (p: PublicProduct) =>
    p.compareAtPriceUSD ? (p.compareAtPriceUSD - p.priceUSD) / p.compareAtPriceUSD : 0;

  return rows
    .map(toPublicProduct)
    .sort((a, b) => savingsPercent(b) - savingsPercent(a))
    .slice(0, clampLimit(max));
});

/** Lo más vendido: unidades en órdenes no canceladas ni reembolsadas de los últimos `days` días. */
export const getBestSellers = cache(async (days = 90, max = 12): Promise<PublicProduct[]> => {
  const limit = clampLimit(max);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sales = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { createdAt: { gte: since }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    // Margen por si algunos ya no están visibles (borrador, agotado con autoHide)
    take: limit * 3,
  });
  if (sales.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: await visibleProducts({ id: { in: sales.map((s) => s.productId) } }),
    include: publicProductInclude,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return sales
    .map((s) => byId.get(s.productId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, limit)
    .map(toPublicProduct);
});

/** Recién llegados. */
export const getNewArrivals = cache(async (max = 12): Promise<PublicProduct[]> => {
  const rows = await prisma.product.findMany({
    where: await visibleProducts(),
    include: publicProductInclude,
    orderBy: { createdAt: 'desc' },
    take: clampLimit(max),
  });
  return rows.map(toPublicProduct);
});

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  image: string | null;
  productCount: number;
}

/** Categorías ordenadas por cantidad de productos visibles (solo las que tienen alguno). */
async function categoriesByProductCount(max: number): Promise<HomeCategory[]> {
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    where: await visibleProducts(),
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: 'desc' } },
    take: clampLimit(max),
  });
  if (counts.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: counts.map((c) => c.categoryId) } },
    select: { id: true, name: true, slug: true, icon: true, color: true, image: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));

  return counts.flatMap((c) => {
    const category = byId.get(c.categoryId);
    return category ? [{ ...category, productCount: c._count.categoryId }] : [];
  });
}

/** Rail de categorías con íconos (el home decide si mostrarlo con showCategories). */
export const getCategoriesRail = cache(async (max?: number): Promise<HomeCategory[]> => {
  return categoriesByProductCount(max ?? (await getHomeSettings()).maxCategoriesDisplay);
});

/** Las `n` categorías con más productos, cada una con sus productos (destacados primero). */
export const getTopCategoriesWithProducts = cache(
  async (n = 3, perCategory = 10): Promise<Array<{ category: HomeCategory; products: PublicProduct[] }>> => {
    const categories = await categoriesByProductCount(n);

    return Promise.all(
      categories.map(async (category) => {
        const rows = await prisma.product.findMany({
          where: await visibleProducts({ categoryId: category.id }),
          include: publicProductInclude,
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          take: clampLimit(perCategory),
        });
        return { category, products: rows.map(toPublicProduct) };
      })
    );
  }
);

/** Tipos de método de pago que se muestran en el home ("OTHER" no dice nada al cliente). */
export type PaymentMethodKind = Exclude<PaymentMethodType, 'OTHER'>;

/**
 * Tipos de los métodos de pago activos, sin repetir y en el orden del admin.
 * Solo se lee `type`: los datos bancarios no salen de aquí.
 */
export const getActivePaymentMethodKinds = cache(async (): Promise<PaymentMethodKind[]> => {
  const rows = await prisma.companyPaymentMethod.findMany({
    where: { isActive: true, type: { not: 'OTHER' } },
    select: { type: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return [...new Set(rows.map((row) => row.type as PaymentMethodKind))];
});
