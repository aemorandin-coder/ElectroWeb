// Consultas del feed de productos, de llms.txt y del sitemap (C-149). Solo servidor.
// Mismas reglas de visibilidad que la tienda (visibleProducts) y el mismo DTO público: el costo nunca sale.

import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { conOfertas } from '@/lib/promotions';
import { visibleProducts } from '@/lib/queries/home';

/** Tope de productos por archivo: muy por encima del catálogo, y acota la consulta */
const MAX_PRODUCTS = 5000;

/**
 * Guarda el resultado unos minutos en memoria: son direcciones públicas que cualquiera puede pedir sin parar,
 * y cada una lee todo el catálogo. Si la consulta falla no se guarda nada (el siguiente pedido lo intenta de nuevo).
 */
export function memoMinutes<T>(minutes: number, load: () => Promise<T>): () => Promise<T> {
  let saved: { at: number; value: T } | null = null;
  return async () => {
    if (saved && Date.now() - saved.at < minutes * 60_000) return saved.value;
    const value = await load();
    saved = { at: Date.now(), value };
    return value;
  };
}

/** Productos visibles con su precio de oferta, del más nuevo al más viejo. */
export async function getVisibleProducts(extra?: Parameters<typeof visibleProducts>[0]): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: await visibleProducts(extra),
    include: publicProductInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: MAX_PRODUCTS,
  });
  return conOfertas(rows.map(toPublicProduct));
}

export interface CategoryWithCount {
  name: string;
  slug: string;
  count: number;
  updatedAt: Date;
}

/** Categorías que tienen al menos un producto visible, primero las que tienen más. */
export async function getCategoriesWithProducts(): Promise<CategoryWithCount[]> {
  const counts = await prisma.product.groupBy({ by: ['categoryId'], where: await visibleProducts(), _count: { categoryId: true }, _max: { updatedAt: true } });
  if (counts.length === 0) return [];
  const ids = counts.map((c) => c.categoryId);
  // C-200: también las categorías madre (el departamento Ferretería), que no tienen productos propios
  const rows = await prisma.category.findMany({
    where: { OR: [{ id: { in: ids } }, { children: { some: { id: { in: ids } } } }] },
    select: { id: true, name: true, slug: true, updatedAt: true, parentId: true },
  });
  // Cada una cuenta lo suyo y lo de sus subcategorías
  const suma = new Map<string, { count: number; ultimo: Date | null }>();
  for (const c of counts) {
    const madre = rows.find((r) => r.id === c.categoryId)?.parentId ?? null;
    for (const destino of madre ? [c.categoryId, madre] : [c.categoryId]) {
      const s = suma.get(destino) ?? { count: 0, ultimo: null };
      const ultimo = c._max.updatedAt;
      suma.set(destino, { count: s.count + c._count.categoryId, ultimo: ultimo && (!s.ultimo || ultimo > s.ultimo) ? ultimo : s.ultimo });
    }
  }
  return rows
    .map((row) => {
      const stats = suma.get(row.id);
      const lastProduct = stats?.ultimo ?? row.updatedAt;
      return { name: row.name, slug: row.slug, count: stats?.count ?? 0, updatedAt: lastProduct > row.updatedAt ? lastProduct : row.updatedAt };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}
