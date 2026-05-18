'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiSearch, FiArrowRight, FiGrid } from 'react-icons/fi';
import { getCategoryColor, getAutoIcon, getAutoColor } from '@/lib/category-icons';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  _count: { products: number };
}

export default function CategoriasClient({ categories }: { categories: Category[] }) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase().trim()))
    : categories;

  return (
    <>
      {/* Search bar */}
      <div className="mb-6 sm:mb-8">
        <div className="relative max-w-sm mx-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar categoría..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FiGrid className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No se encontraron categorías</p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {filtered.map((category, index) => {
            const resolvedIconName = category.icon || getAutoIcon(category.name);
            const cv = getCategoryColor(category.color || getAutoColor(index), index);
            const count = category._count.products;

            return (
              <Link
                key={category.id}
                href={`/categorias/${category.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                {/* Colored icon section */}
                <div
                  className="h-24 sm:h-28 lg:h-32 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${cv.from}, ${cv.to})` }}
                >
                  {/* Gloss overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                  {/* Product count badge */}
                  {count > 0 && (
                    <span className="absolute top-2.5 right-2.5 bg-black/20 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full leading-tight z-10">
                      {count}
                    </span>
                  )}
                  <CategoryIconRenderer
                    iconName={resolvedIconName}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform duration-300 relative z-10"
                  />
                </div>

                {/* Text content */}
                <div className="p-3 sm:p-4">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                    {category.name}
                  </h3>

                  {/* Mobile: show count below name */}
                  {count > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                      {count} producto{count !== 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Desktop: description */}
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 hidden sm:block leading-relaxed">
                      {category.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-2 sm:mt-3 text-xs font-semibold text-blue-600">
                    <span>Ver productos</span>
                    <FiArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
