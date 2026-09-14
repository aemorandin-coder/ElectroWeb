'use client';

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ITEM_WIDTHS = {
  // Vitrina móvil: una tarjeta grande y se asoma la siguiente
  featured: 'w-[78vw] sm:w-[45vw] lg:w-[calc((100%-2rem)/3)]',
  // Shelves: dos visibles y se asoma la tercera en móvil; cuatro en desktop
  default: 'w-[44vw] sm:w-[30vw] lg:w-[calc((100%-3rem)/4)]',
};

interface ProductShelfProps {
  children: ReactNode;
  /** Nombre accesible de la lista, p. ej. "Ofertas" */
  label: string;
  variant?: keyof typeof ITEM_WIDTHS;
}

/** Fila horizontal con scroll-snap (CSS). Las flechas solo existen desde lg; en móvil se desliza con el dedo. */
export default function ProductShelf({ children, label, variant = 'default' }: ProductShelfProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateArrows]);

  const scrollBy = (direction: 1 | -1) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrowClass =
    'absolute top-1/3 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm ' +
    'hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-0 lg:flex focus-visible:outline-2 focus-visible:outline-brand-500';

  return (
    <div className="relative">
      <button type="button" onClick={() => scrollBy(-1)} disabled={!canPrev} aria-label={`Anteriores en ${label}`} className={`${arrowClass} -left-5`}>
        <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <ul
        ref={listRef}
        onScroll={updateArrows}
        aria-label={label}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:gap-4 lg:scroll-px-0 lg:px-0"
      >
        {Children.map(children, (child) => (
          <li className={`shrink-0 snap-start ${ITEM_WIDTHS[variant]}`}>{child}</li>
        ))}
      </ul>
      <button type="button" onClick={() => scrollBy(1)} disabled={!canNext} aria-label={`Siguientes en ${label}`} className={`${arrowClass} -right-5`}>
        <FiChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
