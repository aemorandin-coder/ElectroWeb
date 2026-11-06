// Ideas para regalar (C-190): los productos que se pueden comprar hoy, por presupuesto. Solo servidor: la página
// (app/ideas-para-regalar) y su imagen para compartir (lib/og/datos.ts) la llaman directo.
// El tramo sale del precio que paga el cliente: con la oferta de la tienda vigente (lib/promotions.ts). Un digital con
// montos (las gift cards de PlayStation, Steam…) entra en cada tramo donde tenga alguno, y su tarjeta dice el precio de
// esos montos: "Desde $78,00" en Más de $50. Sin eso, todas quedaban en el primer tramo por su monto más chico. En los
// tramos de arriba van después de lo propio del tramo, para que cada uno no abra con las mismas tarjetas.

import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { conOfertas } from '@/lib/promotions';
import { visibleProducts } from '@/lib/queries/home';

export interface Tramo {
  /** El ancla de su sección (#hasta-20) */
  id: string;
  titulo: string;
  /** Lo que dice el botón del tramo, en dos partes: "Hasta" y "$20" */
  rotulo: string;
  monto: string;
  /** Precio mayor que `desde` (si hay) y hasta `hasta` incluido (si hay) */
  desde: number | null;
  hasta: number | null;
}

export const TRAMOS: readonly Tramo[] = [
  { id: 'hasta-20', titulo: 'Hasta $20', rotulo: 'Hasta', monto: '$20', desde: null, hasta: 20 },
  { id: 'de-20-a-50', titulo: 'De $20 a $50', rotulo: 'De $20 a', monto: '$50', desde: 20, hasta: 50 },
  { id: 'mas-de-50', titulo: 'Más de $50', rotulo: 'Más de', monto: '$50', desde: 50, hasta: null },
];

/** Cuántos se muestran por tramo; el resto, en el catálogo con el filtro de precio */
export const POR_TRAMO = 12;

const enTramo = (precio: number, tramo: Tramo) => (tramo.desde === null || precio > tramo.desde) && (tramo.hasta === null || precio <= tramo.hasta);

/** El producto como se ofrece en un tramo, o null si no cabe. A un digital con montos solo le quedan los de ese tramo */
function enElTramo(p: PublicProduct, tramo: Tramo): PublicProduct | null {
  if (p.productType === 'DIGITAL' && p.digitalVariants.length > 0) {
    const montos = p.digitalVariants.filter((v) => enTramo(v.priceUSD, tramo));
    if (montos.length === 0) return null;
    return { ...p, priceUSD: Math.min(...montos.map((v) => v.priceUSD)), digitalVariants: montos };
  }
  return enTramo(p.priceUSD, tramo) ? p : null;
}

/** El catálogo con el mismo rango y solo lo disponible, para "Ver todos" */
export function catalogoDelTramo(tramo: Tramo): string {
  const query = new URLSearchParams();
  if (tramo.desde !== null) query.set('min', String(tramo.desde));
  if (tramo.hasta !== null) query.set('max', String(tramo.hasta));
  query.set('disponible', '1');
  query.set('sort', 'destacados');
  return `/productos?${query.toString()}`;
}

export interface TramoConProductos {
  tramo: Tramo;
  productos: PublicProduct[];
  /** Todos los que caben, aunque se muestren menos */
  total: number;
}

/**
 * Los tramos con sus productos: publicados y que se pueden comprar (los físicos con stock, aunque la tienda muestre los
 * agotados). En cada tramo, los destacados primero, después los más vendidos de los últimos 90 días y después los más
 * nuevos; los digitales que vienen de un tramo más barato, al final. Los tramos vacíos no vienen.
 */
export const getIdeasParaRegalar = cache(async (): Promise<TramoConProductos[]> => {
  const filas = await prisma.product.findMany({
    where: await visibleProducts({ OR: [{ productType: 'DIGITAL' }, { stock: { gt: 0 } }] }),
    include: publicProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
  const productos = (await conOfertas(filas.map(toPublicProduct))).filter((p) => p.priceUSD > 0);
  if (productos.length === 0) return [];

  const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const ventas = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { productId: { in: productos.map((p) => p.id) }, order: { createdAt: { gte: desde }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
    _sum: { quantity: true },
  });
  const vendidos = new Map(ventas.map((v) => [v.productId, v._sum.quantity ?? 0]));
  const orden = (a: PublicProduct, b: PublicProduct) =>
    Number(b.isFeatured) - Number(a.isFeatured) || (vendidos.get(b.id) ?? 0) - (vendidos.get(a.id) ?? 0) || b.createdAt.localeCompare(a.createdAt);

  return TRAMOS.flatMap((tramo) => {
    const caben = productos
      .flatMap((p) => {
        const ofrecido = enElTramo(p, tramo);
        // Propio: su precio de tarjeta ("Desde") es de este tramo
        return ofrecido ? [{ producto: ofrecido, propio: enTramo(p.priceUSD, tramo) }] : [];
      })
      .sort((a, b) => Number(b.propio) - Number(a.propio) || orden(a.producto, b.producto))
      .map(({ producto }) => producto);
    return caben.length > 0 ? [{ tramo, productos: caben.slice(0, POR_TRAMO), total: caben.length }] : [];
  });
});

/** Las fotos de la imagen para compartir: el primero de cada tramo y, si falta, el segundo de los más llenos (hasta 4) */
export const fotosDeRegalos = cache(async (): Promise<string[]> => {
  const tramos = await getIdeasParaRegalar();
  const fotos: string[] = [];
  for (let puesto = 0; fotos.length < 4 && tramos.some((t) => t.productos.length > puesto); puesto++) {
    for (const { productos } of tramos) {
      const foto = productos[puesto]?.mainImage || productos[puesto]?.images[0];
      if (foto && !fotos.includes(foto) && fotos.length < 4) fotos.push(foto);
    }
  }
  return fotos;
});
