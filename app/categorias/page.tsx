import type { Metadata } from 'next';
import { compartirPagina } from '@/lib/og/datos';
import Link from 'next/link';
import { IconoCuadricula } from '@/components/iconos';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import PageHeader, { PageHeaderChip } from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import CategoriasClient from './CategoriasClient';

export const revalidate = 0;

// C-178: con su imagen para compartir; sin Open Graph propio heredaba el de la portada
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Categorías',
    description: 'Todas las categorías de Electro Shop: componentes, gaming, consolas, software y más, con envíos a toda Venezuela.',
    ...(await compartirPagina('categorias', '/categorias')),
  };
}

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
      // C-200: una categoría madre (el departamento Ferretería) muestra también lo de sus subcategorías
      children: { select: { _count: { select: { products: { where: { status: 'PUBLISHED' } } } } } },
      parent: { select: { isDepartment: true } },
    },
  });

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);
  // C-200: las categorías de un departamento aparte no van sueltas: están en la página del departamento
  const conSubcategorias = categories
    .filter((c) => !c.parent?.isDepartment)
    .map(({ children, parent, ...c }) => {
      void parent;
      return { ...c, _count: { products: c._count.products + children.reduce((suma, h) => suma + h._count.products, 0) } };
    });

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />

      <main>
        <PageHeader
          breadcrumbs={[{ label: 'Categorías' }]}
          icon={<IconoCuadricula />}
          eyebrow="Catálogo"
          title="Categorías"
          description="Elige una categoría para ver sus productos con filtros, precios y disponibilidad."
          meta={
            <>
              <PageHeaderChip>{categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}</PageHeaderChip>
              <PageHeaderChip>{totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}</PageHeaderChip>
            </>
          }
        />

        <Container className="py-6 lg:py-10">
          <CategoriasClient categories={conSubcategorias} />

          <section aria-labelledby="solicitar-title" className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white sm:flex-row sm:items-center lg:p-6">
            <div>
              <h2 id="solicitar-title" className="text-lg font-bold lg:text-xl">¿No encuentras lo que buscas?</h2>
              <p className="mt-1 text-sm text-white/90">Dinos qué producto necesitas y te lo conseguimos al mejor precio.</p>
            </div>
            <Link href="/solicitar-producto" className="inline-flex h-11 shrink-0 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Solicitar un producto
            </Link>
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
