// C-297: el producto estrella de la semana como lo ve la tienda (Andrés, 18/11: "Producto estrella con pack de boletos:
// descubre el producto estrella; seleccionamos uno a la semana"). Lo elige el equipo en Marketing → Sorteo, cualquier
// producto. Sale en /sorteo ("Descubre el producto estrella"), en su ficha, en el catálogo y en el carrito.
// Solo servidor: lee la base. Lo que sale a la tienda es la lista blanca de EstrellaPublica (nunca el costo ni el proveedor).
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct } from '@/lib/dto/product';
import { conOfertas } from '@/lib/promotions';
import { boletosPorMonto, reglaDe, type ReglaDeCompra } from './escala';
import { estrellaDeAhora, getSorteoVigente } from './servidor';

export interface EstrellaPublica {
  productId: string;
  nombre: string;
  slug: string;
  imagen: string | null;
  /** El precio de hoy (con su oferta, si tiene) y el de antes de la oferta */
  precioUSD: number;
  antesUSD: number | null;
  agotado: boolean;
  /** Boletos por cada unidad, además de los del monto */
  boletos: number;
  /** Lo último que cuenta de su semana (ISO) */
  hasta: string;
  /** Los boletos de una compra con uno solo: los del monto y los de la estrella ("te da 15") */
  conUno: number;
}

/** Lo que la tienda necesita saber del sorteo para decir cuántos boletos da algo (el carrito y la ficha) */
export interface SorteoParaCompra {
  regla: ReglaDeCompra;
  estrella: Pick<EstrellaPublica, 'productId' | 'nombre' | 'boletos' | 'hasta'> | null;
  /** "PS4" o el título, para "para la PS4" */
  premio: string;
  /** Lo último que cuenta (ISO) */
  hasta: string;
}

/** El producto estrella de ahora, publicado; null si no hay sorteo abierto, no hay estrella esta semana o no está a la venta */
export const estrellaPublica = cache(async (): Promise<EstrellaPublica | null> => {
  const ahora = await estrellaDeAhora();
  if (!ahora) return null;
  const producto = await prisma.product.findFirst({
    where: { id: ahora.estrella.productId, status: 'PUBLISHED', deletedAt: null },
    include: publicProductInclude,
  });
  if (!producto) return null;
  const [p] = await conOfertas([toPublicProduct(producto)]);
  return {
    productId: p.id,
    nombre: p.name,
    slug: p.slug,
    imagen: p.mainImage ?? p.images[0] ?? null,
    precioUSD: p.priceUSD,
    antesUSD: p.compareAtPriceUSD,
    agotado: p.productType !== 'DIGITAL' && p.stock <= 0,
    boletos: ahora.estrella.boletos,
    hasta: ahora.estrella.hasta.toISOString(),
    conUno: boletosPorMonto(p.priceUSD, reglaDe(ahora.sorteo)) + ahora.estrella.boletos,
  };
});

/** C-297: el sorteo abierto para el carrito y la ficha (la regla por monto y la estrella), o null si no hay */
export const sorteoParaCompra = cache(async (): Promise<SorteoParaCompra | null> => {
  const ahora = await estrellaDeAhora();
  const sorteo = ahora?.sorteo ?? (await getSorteoVigente());
  const hoy = new Date();
  if (!sorteo || sorteo.sorteadoAt || hoy < sorteo.desde || hoy > sorteo.hasta) return null;
  const estrella = ahora ? await estrellaPublica() : null;
  return {
    regla: reglaDe(sorteo),
    estrella: estrella ? { productId: estrella.productId, nombre: estrella.nombre, boletos: estrella.boletos, hasta: estrella.hasta } : null,
    premio: sorteo.nombreCorto?.trim() || sorteo.titulo,
    hasta: sorteo.hasta.toISOString(),
  };
});
