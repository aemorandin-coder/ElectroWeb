'use client';

import { useEffect, type RefObject } from 'react';

/**
 * C-265: una ventana que se abre lleva el foco adentro, y al cerrarse lo devuelve a donde estaba (el botón que la abrió,
 * o la ventana de atrás si esta se abrió encima de otra). Así el teclado y el lector de pantalla no quedan en la página
 * de abajo. El contenedor necesita `tabIndex={-1}`.
 */
export function useFocoDeVuelta(abierta: boolean, contenedor: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!abierta) return;
    const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const cuadro = requestAnimationFrame(() => {
      const caja = contenedor.current;
      if (caja && !caja.contains(document.activeElement)) caja.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(cuadro);
      if (origen?.isConnected) origen.focus({ preventScroll: true });
    };
  }, [abierta, contenedor]);
}
