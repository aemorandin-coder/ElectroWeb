'use client';

import { useSyncExternalStore } from 'react';

const suscribir = () => () => {};

/**
 * true en el navegador, false en el HTML del servidor (C-111). Reemplaza el patrón
 * `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`, que hacía un render extra
 * y que la regla react-hooks/set-state-in-effect marca. Sirve para los createPortal(document.body).
 */
export function useMontado(): boolean {
  return useSyncExternalStore(suscribir, () => true, () => false);
}

/**
 * Un valor que solo existe en el navegador (window.location.origin, la hora local): `leer()` en el cliente y
 * `respaldo` en el HTML del servidor (C-111). Reemplaza `useEffect(() => setX(window…), [])`.
 * `leer` debe devolver un valor primitivo estable entre llamadas (texto o número).
 */
export function useDelNavegador<T extends string | number | boolean>(leer: () => T, respaldo: T): T {
  return useSyncExternalStore(suscribir, leer, () => respaldo);
}
