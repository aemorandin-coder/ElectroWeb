// Consultas del home (C-13). Solo servidor: los Server Components las llaman directamente.
// Todas devuelven el DTO público (lib/dto/product.ts) y respetan autoHideOutOfStock:
// con el ajuste activo, los productos físicos sin stock no aparecen (los digitales sí).
// Envueltas en React cache(): varias secciones de la misma página no repiten la consulta.

import { cache } from 'react';
import type { PaymentMethodType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { conOfertas, filtroEnOferta } from '@/lib/promotions';
import { repartirCategorias } from '@/lib/inicio/reparto';

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
export async function visibleProducts(extra?: Prisma.ProductWhereInput): Promise<Prisma.ProductWhereInput> {
  const { autoHideOutOfStock } = await getHomeSettings();
  const conditions: Prisma.ProductWhereInput[] = [{ status: 'PUBLISHED' }];
  if (autoHideOutOfStock) {
    conditions.push({ OR: [{ productType: 'DIGITAL' }, { stock: { gt: 0 } }] });
  }
  if (extra) conditions.push(extra);
  return { AND: conditions };
}

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  image: string | null;
  productCount: number;
  /** C-200: es un departamento aparte (Ferretería): los chips del inicio lo muestran con su ícono */
  esDepartamento?: boolean;
}

/** C-200: un departamento aparte (Ferretería), con sus subcategorías. */
export interface Departamento extends HomeCategory {
  /** Lo que escribió el equipo en Categorías: va como aviso arriba de su vitrina y de su página */
  description: string | null;
  /** Sus subcategorías con productos visibles, de más a menos */
  hijos: HomeCategory[];
  /** Su id y los de todas sus subcategorías (para filtrar sus productos) */
  ids: string[];
}

/**
 * C-200: los departamentos aparte (categorías marcadas `isDepartment`), con cuántos productos visibles tienen entre
 * ellos y sus subcategorías. Uno sin productos visibles no sale: ni en la franja ni en el inicio.
 */
export const getDepartamentos = cache(async (): Promise<Departamento[]> => {
  const filas = await prisma.category.findMany({
    where: { isDepartment: true },
    select: {
      id: true, name: true, slug: true, icon: true, color: true, image: true, description: true,
      children: { select: { id: true, name: true, slug: true, icon: true, color: true, image: true } },
    },
    orderBy: { name: 'asc' },
  });
  if (filas.length === 0) return [];
  const todos = filas.flatMap((d) => [d.id, ...d.children.map((c) => c.id)]);
  const cuentas = await prisma.product.groupBy({
    by: ['categoryId'],
    where: await visibleProducts({ categoryId: { in: todos } }),
    _count: { categoryId: true },
  });
  const cuenta = new Map(cuentas.map((c) => [c.categoryId, c._count.categoryId]));
  return filas
    .map(({ children, ...d }) => {
      const hijos = children
        .map((c) => ({ ...c, productCount: cuenta.get(c.id) ?? 0 }))
        .filter((c) => c.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, 'es'));
      const productCount = (cuenta.get(d.id) ?? 0) + hijos.reduce((suma, h) => suma + h.productCount, 0);
      return { ...d, productCount, hijos, ids: [d.id, ...children.map((c) => c.id)] };
    })
    .filter((d) => d.productCount > 0);
});

/**
 * Lo visible del inicio de tecnología: lo publicado, fuera de los departamentos aparte (C-200). Sin esto, los productos
 * de la ferretería llenarían "Recién llegados" el día que se publiquen y sus categorías pasarían a ser los estantes.
 */
async function visiblesDelInicio(extra?: Prisma.ProductWhereInput): Promise<Prisma.ProductWhereInput> {
  const fuera = (await getDepartamentos()).flatMap((d) => d.ids);
  const condiciones: Prisma.ProductWhereInput[] = [];
  if (extra) condiciones.push(extra);
  if (fuera.length > 0) condiciones.push({ categoryId: { notIn: fuera } });
  return visibleProducts(condiciones.length === 0 ? undefined : condiciones.length === 1 ? condiciones[0] : { AND: condiciones });
}

/** C-200: la vitrina de un departamento en el inicio: destacados primero, después lo más nuevo. */
export const getVitrinaDepartamento = cache(async (departamentoId: string, max = 12): Promise<PublicProduct[]> => {
  const departamento = (await getDepartamentos()).find((d) => d.id === departamentoId);
  if (!departamento) return [];
  const rows = await prisma.product.findMany({
    where: await visibleProducts({ categoryId: { in: departamento.ids } }),
    include: publicProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: clampLimit(max),
  });
  return conOfertas(rows.map(toPublicProduct));
});

/** Destacados (isFeatured). Sin `max`, usa maxFeaturedProducts del admin. */
export const getFeatured = cache(async (max?: number): Promise<PublicProduct[]> => {
  const limit = clampLimit(max ?? (await getHomeSettings()).maxFeaturedProducts);
  const rows = await prisma.product.findMany({
    where: await visiblesDelInicio({ isFeatured: true }),
    include: publicProductInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return conOfertas(rows.map(toPublicProduct));
});

/** Ofertas: precio anterior mayor al precio o una oferta de la tienda vigente (C-102), ordenadas por % de ahorro. */
export const getDeals = cache(async (max = 12): Promise<PublicProduct[]> => {
  const rows = await prisma.product.findMany({
    where: await visiblesDelInicio(await filtroEnOferta()),
    include: publicProductInclude,
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  const savingsPercent = (p: PublicProduct) =>
    p.compareAtPriceUSD ? (p.compareAtPriceUSD - p.priceUSD) / p.compareAtPriceUSD : 0;

  return (await conOfertas(rows.map(toPublicProduct)))
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
    where: await visiblesDelInicio({ id: { in: sales.map((s) => s.productId) } }),
    include: publicProductInclude,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return conOfertas(sales
    .map((s) => byId.get(s.productId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, limit)
    .map(toPublicProduct));
});

/** Lo más nuevo de tecnología (sin los departamentos aparte): completa la vitrina de destacados cuando hay pocos. */
export const getNewArrivals = cache(async (max = 12): Promise<PublicProduct[]> => {
  const rows = await prisma.product.findMany({
    where: await visiblesDelInicio(),
    include: publicProductInclude,
    orderBy: { createdAt: 'desc' },
    take: clampLimit(max),
  });
  return conOfertas(rows.map(toPublicProduct));
});

/**
 * C-207: "Recién llegados" es lo último de toda la tienda, ferretería incluida (Andrés, 13/11: "se tiene que ver de
 * todo"). Trae más de los que se muestran: el inicio quita lo que ya salió arriba y deja pocos de cada departamento o
 * categoría (lib/inicio/reparto.ts).
 */
export const getRecienLlegados = cache(async (max = 48): Promise<PublicProduct[]> => {
  const rows = await prisma.product.findMany({
    where: await visibleProducts(),
    include: publicProductInclude,
    orderBy: { createdAt: 'desc' },
    take: clampLimit(max),
  });
  return conOfertas(rows.map(toPublicProduct));
});

/**
 * C-207: las gift cards y recargas de las plataformas (los productos digitales), para su única sección del inicio: cada
 * plataforma con su monto. Antes salían en su franja (como enlaces a búsquedas, algunas sin nada), en "Recién llegados"
 * y en su estante.
 */
export const getCodigosDigitales = cache(async (max = 12): Promise<PublicProduct[]> => {
  const rows = await prisma.product.findMany({
    where: await visibleProducts({ productType: 'DIGITAL' }),
    include: publicProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: clampLimit(max),
  });
  return conOfertas(rows.map(toPublicProduct));
});

/** Categorías ordenadas por cantidad de productos visibles (solo las que tienen alguno), fuera de los departamentos aparte. */
async function categoriesByProductCount(max: number): Promise<HomeCategory[]> {
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    where: await visiblesDelInicio(),
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

/**
 * Rail de categorías con íconos (el home decide si mostrarlo con showCategories). C-200: cada departamento aparte entra
 * primero como una sola entrada, con todos sus productos ("Ferretería" y no sus 9 categorías).
 */
export const getCategoriesRail = cache(async (max?: number): Promise<HomeCategory[]> => {
  const limite = max ?? (await getHomeSettings()).maxCategoriesDisplay;
  const departamentos = (await getDepartamentos()).map(({ id, name, slug, icon, color, image, productCount }) => ({ id, name, slug, icon, color, image, productCount, esDepartamento: true }));
  return [...departamentos, ...(await categoriesByProductCount(limite))].slice(0, clampLimit(limite));
});

/** C-200: las categorías que no son de un departamento aparte (la franja las muestra aparte de los departamentos). */
export const getCategoriasSueltas = cache(async (max: number): Promise<HomeCategory[]> => categoriesByProductCount(max));

/** C-207: una casilla de "Compra por categoría", con la foto de uno de sus productos (destacado o, si no, el más nuevo). */
export interface CasillaCategoria extends HomeCategory {
  foto: string | null;
}

/** C-207: la casilla "Más categorías": las que tienen pocos productos y las que no caben, con la foto de hasta 4 de ellas. */
export interface MasCategorias {
  nombres: string[];
  fotos: string[];
}

/** La foto de una categoría (o de un departamento con sus subcategorías): la de un producto suyo visible */
async function fotoDeCategoria(ids: string[]): Promise<string | null> {
  const fila = await prisma.product.findFirst({
    where: await visibleProducts({ categoryId: { in: ids }, mainImage: { not: null } }),
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    select: { mainImage: true },
  });
  return fila?.mainImage ?? null;
}

/**
 * C-207: "Compra por categoría" (computadora). Cada casilla lleva la foto de un producto real y no un ícono suelto; las
 * categorías con pocos productos van juntas en "Más categorías", para que ninguna diga "1 producto" (lib/inicio/reparto.ts).
 * Los departamentos aparte (Ferretería) van primero, como en la franja (C-200).
 */
export const getCompraPorCategoria = cache(async (max?: number): Promise<{ casillas: CasillaCategoria[]; mas: MasCategorias | null }> => {
  const limite = clampLimit(max ?? (await getHomeSettings()).maxCategoriesDisplay);
  const departamentos = await getDepartamentos();
  const lista: HomeCategory[] = [
    ...departamentos.map(({ id, name, slug, icon, color, image, productCount }) => ({ id, name, slug, icon, color, image, productCount, esDepartamento: true })),
    ...(await categoriesByProductCount(MAX_LIMIT)),
  ];
  const { solas, resto } = repartirCategorias(lista, limite);
  const idsDe = (categoria: HomeCategory) => departamentos.find((d) => d.id === categoria.id)?.ids ?? [categoria.id];
  const [fotos, fotosResto] = await Promise.all([
    Promise.all(solas.map((categoria) => fotoDeCategoria(idsDe(categoria)))),
    Promise.all(resto.slice(0, 4).map((categoria) => fotoDeCategoria(idsDe(categoria)))),
  ]);
  return {
    casillas: solas.map((categoria, i) => ({ ...categoria, foto: fotos[i] })),
    mas: resto.length > 0 ? { nombres: resto.map((categoria) => categoria.name), fotos: fotosResto.filter((foto): foto is string => Boolean(foto)) } : null,
  };
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
        return { category, products: await conOfertas(rows.map(toPublicProduct)) };
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
