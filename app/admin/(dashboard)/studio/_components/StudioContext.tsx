'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useStudio, type Studio } from './useStudio';

// C-116: el inicio (lista) y el editor comparten las historias, la marca y los datos de la tienda.
// Viven en el layout, así que pasar de uno a otro no vuelve a cargar nada.
const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const studio = useStudio();
  return <StudioContext.Provider value={studio}>{children}</StudioContext.Provider>;
}

export function useStudioContext(): Studio {
  const studio = useContext(StudioContext);
  if (!studio) throw new Error('useStudioContext va dentro de StudioProvider');
  return studio;
}
