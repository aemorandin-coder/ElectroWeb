import Link from 'next/link';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import Container from '@/components/ui/Container';
import SectionHeader from '@/components/ui/SectionHeader';
import type { HomeCategory } from '@/lib/queries/home';

/** Rail de categorías con íconos (desktop). En móvil se usan los chips de arriba. */
export default function CategoryRail({ categories }: { categories: HomeCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categorias-title" className="hidden bg-white py-8 lg:block">
      <Container>
        <SectionHeader id="categorias-title" title="Compra por categoría" href="/categorias" linkLabel="Ver todas" />
        <ul className="grid grid-cols-6 gap-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categorias/${category.slug}`}
                className="flex h-full flex-col items-center gap-2 rounded-xl border border-line bg-white p-4 text-center hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <CategoryIconRenderer iconName={category.icon} className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold text-ink">{category.name}</span>
                <span className="text-xs text-muted">{category.productCount} {category.productCount === 1 ? 'producto' : 'productos'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
