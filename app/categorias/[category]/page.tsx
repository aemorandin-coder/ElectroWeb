import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductosPage, { generateMetadata as productosMetadata } from '@/app/productos/page';
import { prisma } from '@/lib/prisma';

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Los filtros de la URL, con la categoría de la ruta fija. */
async function withCategory({ params, searchParams }: PageProps) {
  const [{ category }, raw] = await Promise.all([params, searchParams]);
  return { ...raw, category };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return productosMetadata({ searchParams: withCategory(props) });
}

/**
 * Categoría (C-32): el mismo catálogo de /productos filtrado por la categoría (búsqueda, filtros, orden y paginación en el servidor).
 * Antes era un hero con el color de cada categoría y todos los productos cargados en el navegador.
 * La URL /categorias/<slug> se mantiene para el menú del header; el canonical apunta a /productos?category=<slug>.
 */
export default async function CategoryDetailPage(props: PageProps) {
  const { category } = await props.params;
  if (!/^[a-z0-9-]{1,80}$/.test(category)) notFound();
  const exists = await prisma.category.findUnique({ where: { slug: category }, select: { id: true } });
  if (!exists) notFound();
  return ProductosPage({ searchParams: withCategory(props) });
}
