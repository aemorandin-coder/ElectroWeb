'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Categorías para la navegación del header (mega menú y accesos directos).
// Las lee el layout en el servidor (lib/queries/navigation.ts): el header no hace fetch.
export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
}

const CatalogNavContext = createContext<NavCategory[]>([]);

export function CatalogNavProvider({ categories, children }: { categories: NavCategory[]; children: ReactNode }) {
  return <CatalogNavContext.Provider value={categories}>{children}</CatalogNavContext.Provider>;
}

/** Categorías con productos, de mayor a menor cantidad. Vacío si no hay provider. */
export function useNavCategories(): NavCategory[] {
  return useContext(CatalogNavContext);
}
