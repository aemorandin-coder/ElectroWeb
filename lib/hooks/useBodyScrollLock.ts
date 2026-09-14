'use client';

import { useEffect } from 'react';

// Contador global: si hay varios modales/drawers abiertos, el scroll se libera solo
// cuando se cierra el último (antes, cerrar uno desbloqueaba aunque otro siguiera abierto).
let lockCount = 0;
let previousOverflow = '';

/** Bloquea el scroll del body mientras `locked` sea true. */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [locked]);
}
