// Datos de navegación del header (C-20). Solo servidor.

import { cache } from 'react';
import type { NavCategory, NavDepartamento } from '@/contexts/CatalogNavContext';
import { getCategoriasSueltas, getDepartamentos } from '@/lib/queries/home';

const MAX_NAV_CATEGORIES = 40;

/**
 * Categorías con productos visibles, de mayor a menor cantidad. Si la BD falla, lista vacía.
 * C-200: sin las de los departamentos aparte, que van en `getNavDepartamentos` con su grupo propio.
 */
export const getNavCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    const categories = await getCategoriasSueltas(MAX_NAV_CATEGORIES);
    return categories.map(({ id, name, slug, icon, productCount }) => ({ id, name, slug, icon, productCount }));
  } catch (error) {
    console.error('Error loading navigation categories:', error);
    return [];
  }
});

/** C-200: los departamentos aparte (Ferretería) con productos, y sus subcategorías: acceso en la franja y en "Más". */
export const getNavDepartamentos = cache(async (): Promise<NavDepartamento[]> => {
  try {
    return (await getDepartamentos()).map(({ id, name, slug, icon, productCount, hijos }) => ({
      id, name, slug, icon, productCount,
      hijos: hijos.map((h) => ({ id: h.id, name: h.name, slug: h.slug, icon: h.icon, productCount: h.productCount })),
    }));
  } catch (error) {
    console.error('Error loading navigation departments:', error);
    return [];
  }
});
