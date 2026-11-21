import Link from 'next/link';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import type { HomeCategory } from '@/lib/queries/home';
import type { PildoraLanzamientoPublica } from '@/lib/site-settings';

/** Chips de categorías con scroll horizontal (móvil, arriba de la vitrina). */
export default function CategoryChips({ categories, lanzamiento }: { categories: HomeCategory[]; lanzamiento?: PildoraLanzamientoPublica | null }) {
  if (categories.length === 0 && !lanzamiento) return null;

  return (
    <nav aria-label="Categorías" className={`${lanzamiento ? 'bg-white py-2.5 border-b border-line' : 'bg-brand-100 pt-3'} lg:hidden`}>
      <ul className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-0.5">
        {lanzamiento && (
          <li className="shrink-0">
            <Link
              href={lanzamiento.href}
              className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-brand-500 ${
                lanzamiento.paleta === 'vice' ? 'tema-vice-pildora' : 'tema-brand-pildora'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${lanzamiento.paleta === 'vice' ? 'tema-vice-punto' : 'tema-brand-punto'}`} aria-hidden="true" />
              {lanzamiento.texto}
            </Link>
          </li>
        )}
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={`/categorias/${category.slug}`}
              className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-brand-500 ${
                category.esDepartamento ? 'border-brand-200 font-semibold text-brand-600' : 'border-line font-medium text-ink-soft'
              }`}
            >
              {/* C-200: un departamento aparte (Ferretería) va primero y con su ícono */}
              {category.esDepartamento && <CategoryIconRenderer iconName={category.icon} className="h-4 w-4" />}
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
