'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface HeaderDropdownProps {
  label: ReactNode;
  /** Contenido del panel; recibe `close` para cerrarlo al navegar */
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
}

/**
 * Menú desplegable de la franja azul: se abre con clic o teclado (no depende del hover),
 * se cierra con Esc (devuelve el foco al botón), con clic afuera o al elegir un enlace.
 */
export default function HeaderDropdown({ label, children, panelClassName = '' }: HeaderDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${open ? 'bg-brand-700' : ''}`}
      >
        {label}
        <FiChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          className={`absolute left-0 top-full z-[var(--z-dropdown)] rounded-b-xl border border-t-0 border-line bg-white text-ink shadow-lg ${panelClassName}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
