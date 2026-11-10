'use client';

import Link from 'next/link';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import type { NavCategory, NavDepartamento } from '@/contexts/CatalogNavContext';

interface CategoriesMenuPanelProps {
  categories: NavCategory[];
  /** C-200: los departamentos aparte, cada uno en su grupo con sus subcategorías */
  departamentos?: NavDepartamento[];
  onNavigate: () => void;
}

const contar = (n: number) => `${n} ${n === 1 ? 'producto' : 'productos'}`;

/** Mega menú de categorías. Se carga solo al abrirlo (los íconos pesan). */
export default function CategoriesMenuPanel({ categories, departamentos = [], onNavigate }: CategoriesMenuPanelProps) {
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const enGrupos = departamentos.length > 0;

  return (
    <div className="p-4">
      {enGrupos && sorted.length > 0 && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted">Tecnología</p>}
      {sorted.length > 0 ? (
        <CategoryGrid categories={sorted} onNavigate={onNavigate} />
      ) : (
        !enGrupos && <p className="px-3 py-2 text-sm text-muted">Aún no hay categorías con productos.</p>
      )}
      {departamentos.map((d) => (
        <div key={d.id} className="mt-3 border-t border-line pt-3">
          <div className="mb-1 flex items-baseline justify-between gap-3 px-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{d.name} · {contar(d.productCount)}</p>
            <Link href={`/categorias/${d.slug}`} onClick={onNavigate} className="text-sm font-semibold text-brand-500 hover:text-brand-600">
              Ver {d.name.toLocaleLowerCase('es')} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <CategoryGrid categories={d.hijos} onNavigate={onNavigate} />
        </div>
      ))}
      <div className="mt-3 border-t border-line pt-3">
        <Link href="/categorias" onClick={onNavigate} className="px-3 text-sm font-semibold text-brand-500 hover:text-brand-600">
          Ver todas las categorías <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function CategoryGrid({ categories, onNavigate }: { categories: NavCategory[]; onNavigate: () => void }) {
  return (
        <ul className="grid grid-cols-3 gap-1 xl:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categorias/${category.slug}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <span className="iconos-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-950">
                  <CategoryIconRenderer iconName={category.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{category.name}</span>
                  <span className="block text-xs text-muted">{contar(category.productCount)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
  );
}
