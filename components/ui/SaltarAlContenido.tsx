'use client';

import type { MouseEvent } from 'react';

// C-282 (G-03): el primer Tab de cada página ofrece saltar el encabezado, el buscador y el menú, y llevar el foco a lo que
// importa (la guía web de Chrome y WCAG 2.4.1). Va al <main> de la página o, si no tiene, a lo que sigue al encabezado:
// así sirve en todas sin tocar cada una. Solo se ve al llegar con el teclado.
function saltar(e: MouseEvent<HTMLAnchorElement>) {
  const destino = document.querySelector<HTMLElement>('main')
    ?? (document.querySelector('header')?.nextElementSibling as HTMLElement | null);
  if (!destino) return;
  e.preventDefault();
  if (!destino.hasAttribute('tabindex')) {
    destino.setAttribute('tabindex', '-1');
    // El anillo del foco es para los controles; el contenido no lo lleva
    destino.classList.add('outline-none');
  }
  destino.focus({ preventScroll: true });
  destino.scrollIntoView({ block: 'start' });
}

export default function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      onClick={saltar}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[var(--z-popup)] focus:rounded-xl focus:bg-brand-700 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
    >
      Saltar al contenido
    </a>
  );
}
