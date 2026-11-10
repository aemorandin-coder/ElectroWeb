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

/** C-200: un departamento aparte (Ferretería) con sus subcategorías */
export interface NavDepartamento extends NavCategory {
  hijos: NavCategory[];
}

const CatalogNavContext = createContext<NavCategory[]>([]);
const DepartamentosContext = createContext<NavDepartamento[]>([]);

export function CatalogNavProvider({ categories, departamentos = [], children }: { categories: NavCategory[]; departamentos?: NavDepartamento[]; children: ReactNode }) {
  return (
    <CatalogNavContext.Provider value={categories}>
      <DepartamentosContext.Provider value={departamentos}>{children}</DepartamentosContext.Provider>
    </CatalogNavContext.Provider>
  );
}

/** Categorías con productos, de mayor a menor cantidad (sin las de los departamentos aparte). Vacío si no hay provider. */
export function useNavCategories(): NavCategory[] {
  return useContext(CatalogNavContext);
}

/** C-200: los departamentos aparte con productos (la franja y "Más" los muestran). Vacío si no hay ninguno. */
export function useNavDepartamentos(): NavDepartamento[] {
  return useContext(DepartamentosContext);
}
