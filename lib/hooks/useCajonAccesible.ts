'use client';

import { useEffect } from 'react';

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Cajón del menú accesible con teclado (C-111): al abrirse, el foco entra al primer enlace; Tab y Shift+Tab
 * quedan dentro mientras está abierto; Escape lo cierra y devuelve el foco al botón que lo abrió.
 * Antes el foco se quedaba en el botón del encabezado y Tab recorría la página de atrás.
 */
export function useCajonAccesible(abierto: boolean, idCajon: string, cerrar: () => void): void {
  useEffect(() => {
    if (!abierto) return;
    const cajon = document.getElementById(idCajon);
    if (!cajon) return;
    const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const enfocables = () => [...cajon.querySelectorAll<HTMLElement>(ENFOCABLES)].filter((el) => el.offsetParent !== null);
    const inicio = requestAnimationFrame(() => enfocables()[0]?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cerrar();
        origen?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const lista = enfocables();
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const dentro = cajon.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === primero || !dentro)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || !dentro)) {
        event.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(inicio);
      window.removeEventListener('keydown', onKey);
    };
  }, [abierto, idCajon, cerrar]);
}
