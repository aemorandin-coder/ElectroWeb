'use client';

import Link from 'next/link';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import type { NavCategory } from '@/contexts/CatalogNavContext';

interface CategoriesMenuPanelProps {
  categories: NavCategory[];
  onNavigate: () => void;
}

/** Mega menú de categorías. Se carga solo al abrirlo (los íconos pesan). */
export default function CategoriesMenuPanel({ categories, onNavigate }: CategoriesMenuPanelProps) {
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <div className="p-4">
      {sorted.length > 0 ? (
        <ul className="grid grid-cols-3 gap-1 xl:grid-cols-4">
          {sorted.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categorias/${category.slug}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <CategoryIconRenderer iconName={category.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{category.name}</span>
                  <span className="block text-xs text-muted">{category.productCount} {category.productCount === 1 ? 'producto' : 'productos'}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-2 text-sm text-muted">Aún no hay categorías con productos.</p>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <Link href="/categorias" onClick={onNavigate} className="px-3 text-sm font-semibold text-brand-500 hover:text-brand-600">
          Ver todas las categorías <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
