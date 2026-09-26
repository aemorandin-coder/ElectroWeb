'use client';

import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Carga datos al montar y cada vez que cambian `deps` (C-111).
 * Reemplaza `useEffect(() => { fetchX(); }, [])`, donde fetchX empezaba con setLoading(true): ese setState síncrono
 * dentro del efecto obligaba a React a repintar en cascada (regla react-hooks/set-state-in-effect).
 * Aquí la carga corre en una microtarea, después de que el efecto termina, y no arranca si el componente
 * ya se desmontó o si `deps` cambió antes. `cargar` siempre es la versión más reciente (no hace falta useCallback).
 */
export function useCargarAlMontar(cargar: () => unknown, deps: DependencyList = []): void {
  const ref = useRef(cargar);
  useEffect(() => {
    ref.current = cargar;
  });
  useEffect(() => {
    let vigente = true;
    queueMicrotask(() => {
      if (vigente) void ref.current();
    });
    return () => {
      vigente = false;
    };
    // Las dependencias las decide quien llama (como en useEffect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
