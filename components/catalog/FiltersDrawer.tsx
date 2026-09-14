'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FiSliders, FiX } from 'react-icons/fi';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface FiltersDrawerProps {
  /** Filtros aplicados (se muestran en el botón) */
  activeCount: number;
  /** Filtros ya renderizados en el servidor */
  children: ReactNode;
}

/**
 * Panel de filtros en móvil (< lg). Capa --z-drawer, encima de la barra inferior.
 * Se cierra con Esc, la X, el fondo, al tocar un enlace o al aplicar el formulario.
 */
export default function FiltersDrawer({ activeCount, children }: FiltersDrawerProps) {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = openButtonRef.current;
    panel?.querySelector<HTMLElement>('button, a[href], input')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select'));
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl?.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="catalog-filters"
        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <FiSliders className="h-4 w-4" aria-hidden="true" />
        Filtros
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">{activeCount}</span>
        )}
      </button>

      <div className={`fixed inset-0 z-[var(--z-drawer)] lg:hidden ${open ? '' : 'hidden'}`}>
        <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} aria-hidden="true" />
        <div
          ref={panelRef}
          id="catalog-filters"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-filters-title"
          // Cualquier enlace o envío dentro del panel navega: se cierra para mostrar los resultados
          onClickCapture={(event) => {
            if ((event.target as Element).closest('a[href]')) setOpen(false);
          }}
          onSubmitCapture={() => setOpen(false)}
          className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-lg"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
            <h2 id="catalog-filters-title" className="text-base font-semibold text-ink">Filtros</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar filtros"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </div>
    </>
  );
}
