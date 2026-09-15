'use client';

import { useEffect } from 'react';

// Contador global: si hay varios modales/drawers abiertos, el scroll se libera solo
// cuando se cierra el último (antes, cerrar uno desbloqueaba aunque otro siguiera abierto).
let lockCount = 0;
let previous = { overflow: '', paddingRight: '' };

/**
 * Bloquea el scroll de la página mientras `locked` sea true.
 * Se bloquea en <html> y no en <body> (C-33): globals.css tiene `html, body { overflow-x: clip }`, así que
 * `body { overflow: hidden }` convertía al body en su propio contenedor de scroll y los headers `sticky`
 * (tienda y admin) se iban hacia arriba con la página cuando se abría un modal con la página ya desplazada.
 * El ancho de la barra de scroll se compensa para que el contenido no salte al abrir y cerrar.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;

    if (lockCount === 0) {
      previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
      const scrollbarWidth = window.innerWidth - root.clientWidth;
      root.style.overflow = 'hidden';
      if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        root.style.overflow = previous.overflow;
        root.style.paddingRight = previous.paddingRight;
      }
    };
  }, [locked]);
}
