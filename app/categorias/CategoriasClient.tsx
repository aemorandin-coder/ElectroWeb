'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiGrid, FiSearch } from 'react-icons/fi';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import { getAutoIcon } from '@/lib/category-icons';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  _count: { products: number };
}

/** Rejilla de categorías (C-32): tarjetas blancas con ícono de la marca, como el carril del home. */
export default function CategoriasClient({ categories }: { categories: Category[] }) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const filtered = term ? categories.filter((c) => c.name.toLowerCase().includes(term)) : categories;

  return (
    <>
      <div className="mb-6 max-w-sm">
        <label htmlFor="category-search" className="sr-only">Buscar categoría</label>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input
            id="category-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría"
            className="h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <FiGrid className="mb-3 h-10 w-10 text-subtle" aria-hidden="true" />
          <p className="font-semibold text-ink">No hay categorías con ese nombre</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {filtered.map((category) => {
            const count = category._count.products;
            return (
              <li key={category.id}>
                <Link
                  href={`/categorias/${category.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-4 hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 lg:p-5"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-white">
                    <CategoryIconRenderer iconName={category.icon || getAutoIcon(category.name)} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink lg:text-base">{category.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{count} {count === 1 ? 'producto' : 'productos'}</span>
                    {category.description && <span className="mt-2 hidden text-xs leading-relaxed text-ink-soft line-clamp-2 sm:block">{category.description}</span>}
                  </span>
                  <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-brand-600">
                    Ver productos <FiArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
