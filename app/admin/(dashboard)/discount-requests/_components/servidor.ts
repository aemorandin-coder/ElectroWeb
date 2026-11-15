// C-249b: lo que leen del servidor las páginas del asistente de ofertas y cupones (nuevo y cambiar). Solo servidor.
import { prisma } from '@/lib/prisma';
import { fichaDe, type Categoria, type Ficha } from './promocion';

const CAMPOS_FICHA = {
  id: true, name: true, slug: true, priceUSD: true, compareAtPriceUSD: true, stock: true, mainImage: true, images: true,
  productType: true, categoryId: true, category: { select: { name: true } }, brand: { select: { name: true } },
} as const;

type FilaFicha = { priceUSD: unknown; compareAtPriceUSD: unknown } & Record<string, unknown>;
const aFicha = (p: FilaFicha) => fichaDe({ ...p, priceUSD: Number(p.priceUSD), compareAtPriceUSD: p.compareAtPriceUSD === null ? null : Number(p.compareAtPriceUSD) });

export async function categoriasDelPanel(): Promise<Categoria[]> {
  return prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

/** Un producto físico publicado para mostrar la oferta, mejor uno con foto */
export async function muestraGeneral(): Promise<Ficha | null> {
  const filas = await prisma.product.findMany({
    where: { status: 'PUBLISHED', productType: 'PHYSICAL', deletedAt: null, stock: { gt: 0 } },
    select: CAMPOS_FICHA, orderBy: { updatedAt: 'desc' }, take: 20,
  });
  const fichas = filas.map(aFicha).filter((f): f is Ficha => f !== null);
  return fichas.find((f) => f.mainImage && !f.mainImage.includes('no-image')) ?? fichas[0] ?? null;
}

/** Los productos elegidos de una promoción: su nombre y precio para la lista, y su ficha para la vista previa */
export async function productosElegidos(ids: string[]) {
  if (ids.length === 0) return { refs: [], fichas: [] };
  const filas = await prisma.product.findMany({ where: { id: { in: ids } }, select: CAMPOS_FICHA });
  return {
    refs: filas.map((p) => ({ id: p.id, name: p.name, priceUSD: Number(p.priceUSD) })),
    fichas: filas.map(aFicha).filter((f): f is Ficha => f !== null),
  };
}
