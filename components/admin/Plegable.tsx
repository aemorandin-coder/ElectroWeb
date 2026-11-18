'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { IconoChevronAbajo, type IconType } from '@/components/iconos';

/**
 * C-298 · Lo que se pliega y se despliega (el equipo, 18/11, en Ajustes → IA: "trabajar con items colapsables").
 * Cerrado dice lo esencial en su cabecera (el título, una línea de estado y un dato), así que se lee sin abrirlo.
 * Es un <details> de verdad: se abre con el teclado, lo anuncia el lector de pantalla y la búsqueda del navegador abre el que
 * tiene lo buscado.
 * - `nivel="bloque"`: la barra de una parte de una pantalla larga. Lo de adentro va debajo, sin marco: lleva sus tarjetas.
 * - `nivel="item"`: una tarjeta de una lista (un proveedor, un uso, las fallas) que se abre en sí misma.
 * - Con `id`, llegar con `#id` en la dirección lo abre y lo trae a la vista. Desde un enlace de la misma pantalla, `abrirPlegable`.
 * - Se mueve una vez y poco (la flecha); con "reducir movimiento", nada.
 */

type Nivel = 'bloque' | 'item';

interface Props {
  id?: string;
  icono: IconType;
  titulo: ReactNode;
  /** Una línea con el estado, debajo del título (se ve cerrado) */
  resumen?: ReactNode;
  /** Píldoras o una cifra: a la derecha si hay lugar, si no debajo del resumen */
  extra?: ReactNode;
  /** Cómo empieza */
  abierto?: boolean;
  nivel?: Nivel;
  /** La placa del ícono: fuerte (azul de la marca) o suave (azul claro). Por defecto, fuerte en el bloque y suave en el ítem */
  placa?: 'fuerte' | 'suave';
  children: ReactNode;
}

const reducido = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Abre un plegable (y los que lo contienen), lo trae a la vista y deja su dirección, sin cambiar de pantalla. */
export function abrirPlegable(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  for (let d: HTMLElement | null = el; d; d = d.parentElement?.closest('details') ?? null) {
    if (d instanceof HTMLDetailsElement) d.open = true;
  }
  window.history.replaceState(null, '', `#${id}`);
  // Después de abrir, para que cuente su alto
  requestAnimationFrame(() => el.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' }));
}

export default function Plegable({ id, icono: Icono, titulo, resumen, extra, abierto: inicial = false, nivel = 'item', placa, children }: Props) {
  const [abierto, setAbierto] = useState(inicial);
  const esBloque = nivel === 'bloque';
  const fuerte = (placa ?? (esBloque ? 'fuerte' : 'suave')) === 'fuerte';

  // Llegar con #id (al cargar o al cambiar la dirección): se abre por el DOM y el estado lo sigue con onToggle
  useEffect(() => {
    if (!id) return;
    const alLlegar = () => {
      if (window.location.hash === `#${id}`) abrirPlegable(id);
    };
    alLlegar();
    window.addEventListener('hashchange', alLlegar);
    return () => window.removeEventListener('hashchange', alLlegar);
  }, [id]);

  return (
    <details
      id={id}
      open={abierto}
      onToggle={(e) => setAbierto(e.currentTarget.open)}
      className={`@container/plegable scroll-mt-24 ${esBloque ? '' : `rounded-2xl border bg-white transition-colors ${abierto ? 'border-brand-200' : 'border-line'}`}`}
    >
      <summary
        className={[
          'grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-2xl px-4 py-3 [&::-webkit-details-marker]:hidden',
          '@xl/plegable:grid-cols-[auto_minmax(0,1fr)_auto_auto]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
          esBloque ? `min-h-16 border bg-white transition-colors hover:border-brand-200 ${abierto ? 'border-brand-200' : 'border-line'}` : 'min-h-14',
        ].join(' ')}
      >
        <span className={`col-start-1 row-start-1 flex shrink-0 items-center justify-center ${esBloque ? 'h-10 w-10 rounded-xl' : 'h-9 w-9 rounded-xl'} ${fuerte ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
          <Icono className={esBloque ? 'h-5 w-5' : 'h-[18px] w-[18px]'} aria-hidden="true" />
        </span>
        <span className="col-start-2 row-start-1 min-w-0">
          <span className={`block font-semibold text-ink ${esBloque ? 'text-base sm:text-lg' : 'text-[15px]'}`}>{titulo}</span>
          {resumen && <span className="line-clamp-2 block text-sm text-muted">{resumen}</span>}
        </span>
        {extra && (
          <span className="col-start-2 row-start-2 flex flex-wrap items-center gap-1.5 @xl/plegable:col-start-3 @xl/plegable:row-start-1 @xl/plegable:justify-end">
            {extra}
          </span>
        )}
        <IconoChevronAbajo
          className={`col-start-3 row-start-1 h-5 w-5 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none @xl/plegable:col-start-4 ${abierto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </summary>
      <div className={esBloque ? 'pt-4' : 'border-t border-line px-4 pb-4 pt-3'}>{children}</div>
    </details>
  );
}
