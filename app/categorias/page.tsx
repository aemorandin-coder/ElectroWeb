import type { Metadata } from 'next';
import Link from 'next/link';
import { FiGrid } from 'react-icons/fi';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import PageHeader, { PageHeaderChip } from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import CategoriasClient from './CategoriasClient';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Categorías',
  description: 'Todas las categorías de Electro Shop: componentes, gaming, consolas, software y más, con envíos a toda Venezuela.',
};

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
    },
  });

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />

      <main>
        <PageHeader
          breadcrumbs={[{ label: 'Categorías' }]}
          icon={<FiGrid />}
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
          <CategoriasClient categories={categories} />

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
