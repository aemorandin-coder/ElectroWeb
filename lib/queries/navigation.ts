// Datos de navegación del header (C-20). Solo servidor.

import { cache } from 'react';
import type { NavCategory } from '@/contexts/CatalogNavContext';
import { getCategoriesRail } from '@/lib/queries/home';

const MAX_NAV_CATEGORIES = 40;

/** Categorías con productos visibles, de mayor a menor cantidad. Si la BD falla, lista vacía. */
export const getNavCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    const categories = await getCategoriesRail(MAX_NAV_CATEGORIES);
    return categories.map(({ id, name, slug, icon, productCount }) => ({ id, name, slug, icon, productCount }));
  } catch (error) {
    console.error('Error loading navigation categories:', error);
    return [];
  }
});
