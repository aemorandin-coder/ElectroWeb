// Detalle de producto (C-31). Prisma directo, sin llamar a la propia API.
// `cache()`: generateMetadata y la página comparten la misma consulta en cada petición.

import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { visibleProducts } from '@/lib/queries/home';

/** Producto publicado por slug (o id, para enlaces viejos). null si no existe o no está publicado. */
export const getProductBySlug = cache(async (slugOrId: string): Promise<PublicProduct | null> => {
  const value = decodeURIComponent(slugOrId).slice(0, 200);
  const row = await prisma.product.findFirst({
    where: { status: 'PUBLISHED', OR: [{ slug: value }, { id: value }] },
    include: publicProductInclude,
  });
  return row ? toPublicProduct(row) : null;
});

export interface ReviewSummary {
  average: number;
  count: number;
}

/** Promedio y cantidad de reseñas aprobadas. */
export const getReviewSummary = cache(async (productId: string): Promise<ReviewSummary> => {
  const result = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { average: result._avg.rating ?? 0, count: result._count._all };
});

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
  /** "Andrés M." — nunca el email ni el apellido completo */
  userName: string;
}

/** Nombre público de quien reseña: primer nombre e inicial del apellido. */
export function publicReviewerName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts[0].includes('@')) return 'Cliente';
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];
}

/** Reseñas aprobadas para mostrar en la tienda (sin datos personales). */
export async function getPublicReviews(productId: string, take = 50): Promise<PublicReview[]> {
  const rows = await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, rating: true, comment: true, createdAt: true, userId: true, user: { select: { name: true } } },
  });
  if (rows.length === 0) return [];
  // "Compra verificada": la persona tiene un pedido entregado con este producto
  const buyers = await prisma.order.findMany({
    where: { userId: { in: rows.map((r) => r.userId) }, status: 'DELIVERED', items: { some: { productId } } },
    select: { userId: true },
  });
  const verified = new Set(buyers.map((b) => b.userId));
  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment ?? '',
    createdAt: row.createdAt.toISOString(),
    isVerifiedPurchase: verified.has(row.userId),
    userName: publicReviewerName(row.user?.name),
  }));
}

/** Relacionados: primero de la misma categoría (destacados y recientes), luego del resto del catálogo. */
export async function getRelatedProducts(product: PublicProduct, max = 8): Promise<PublicProduct[]> {
  const sameCategory = await prisma.product.findMany({
    where: await visibleProducts({ categoryId: product.category.id, id: { not: product.id } }),
    include: publicProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: max,
  });
  if (sameCategory.length >= max) return sameCategory.map(toPublicProduct);

  const others = await prisma.product.findMany({
    where: await visibleProducts({ categoryId: { not: product.category.id }, id: { not: product.id } }),
    include: publicProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: max - sameCategory.length,
  });
  return [...sameCategory, ...others].map(toPublicProduct);
}
