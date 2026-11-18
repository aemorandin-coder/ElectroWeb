'use client';

import { useCallback, useState } from 'react';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { llamar, type DatosIa } from './tipos';

/** Los datos de Ajustes → IA: se piden al abrir y otra vez después de cada guardado */
export function useIa() {
  const [datos, setDatos] = useState<DatosIa | null>(null);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    try {
      const r = await llamar<DatosIa>('/api/admin/ia', 'GET');
      if (!r.ok) {
        setError(r.datos.error ?? 'No se pudieron leer los ajustes de la IA.');
        return;
      }
      setError('');
      setDatos(r.datos);
    } catch {
      setError('Sin conexión. Revisa tu internet e inténtalo otra vez.');
    }
  }, []);

  useCargarAlMontar(recargar);
  return { datos, error, recargar };
}
