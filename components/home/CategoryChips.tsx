import Link from 'next/link';
import type { HomeCategory } from '@/lib/queries/home';

/** Chips de categorías con scroll horizontal (móvil, arriba de la vitrina). */
export default function CategoryChips({ categories }: { categories: HomeCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categorías" className="bg-brand-100 pt-3 lg:hidden">
      <ul className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={`/categorias/${category.slug}`}
              className="flex h-9 items-center whitespace-nowrap rounded-full border border-line bg-white px-4 text-sm font-medium text-ink-soft focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              {category.name}
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link href="/categorias" className="flex h-9 items-center whitespace-nowrap rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-600">
            Todas
          </Link>
        </li>
      </ul>
    </nav>
  );
}
