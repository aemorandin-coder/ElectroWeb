'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconoInfo } from '@/components/iconos';

/**
 * C-221 (PLAN.md §1.9): la ayuda que no cabe en una línea va detrás de un (i). Se abre al tocarlo, no solo al pasar el
 * ratón, y se cierra al tocar fuera o con Escape. No va dentro de un <label>: al lado.
 */
export default function Ayuda({ children, etiqueta = 'Más información' }: { children: ReactNode; etiqueta?: string }) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();
  const caja = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierta(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierta]);

  return (
    <span ref={caja} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierta}
        aria-controls={id}
        onClick={() => setAbierta((a) => !a)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <IconoInfo className="h-4 w-4" aria-hidden="true" />
      </button>
      {abierta && (
        <span
          id={id}
          role="note"
          className="absolute left-1/2 top-full z-[var(--z-dropdown)] mt-1 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl border border-line bg-white p-3 text-xs font-normal leading-relaxed text-ink-soft shadow-lg transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none"
        >
          {children}
        </span>
      )}
    </span>
  );
}
