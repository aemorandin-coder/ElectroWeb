'use client';

import type { ComponentType, SVGProps } from 'react';

// C-205: los filtros de una lista como píldoras con ícono, cuenta y un subtítulo corto que dice qué juntan (pedido de
// Andrés del 13/11: "usas píldoras, perfecto: coloca íconos con subtítulos pequeños"). Botones con aria-pressed: filtran
// la misma tabla, no son pestañas. En el teléfono se deslizan de lado. Regla en PLAN.md §1.7.

export interface Filtro<T extends string> {
  valor: T;
  etiqueta: string;
  /** Qué junta, en pocas palabras */
  ayuda: string;
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  cuenta?: number | null;
  /** "aviso": junta lo que alguien tiene que revisar (ámbar, §1.1) */
  tono?: 'aviso';
}

export default function Filtros<T extends string>({ filtros, valor, onCambiar, etiqueta }: {
  filtros: ReadonlyArray<Filtro<T>>;
  valor: T;
  onCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {filtros.map(({ valor: v, etiqueta: texto, ayuda, Icono, cuenta, tono }) => {
        const activo = v === valor;
        const vacio = cuenta === 0 && !activo;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(v)}
            className={[
              'flex min-h-[3.25rem] shrink-0 snap-start items-center gap-2.5 rounded-xl border py-2 pl-2.5 pr-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
              activo ? 'border-brand-500 bg-brand-50 shadow-[inset_0_0_0_1px_var(--color-brand-500)]' : 'border-line-strong bg-white hover:border-brand-200 hover:bg-brand-50',
              vacio ? 'opacity-60' : '',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                activo ? 'bg-brand-500 text-white' : tono === 'aviso' ? 'bg-warning/10 text-warning-strong' : 'bg-surface text-ink-soft',
              ].join(' ')}
            >
              <Icono className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={`flex items-baseline gap-1.5 text-sm font-semibold leading-tight ${activo ? 'text-brand-700' : 'text-ink'}`}>
                {texto}
                {cuenta !== undefined && cuenta !== null && <span className={`text-xs font-bold tabular-nums ${activo ? 'text-brand-700' : 'text-ink-soft'}`}>{cuenta.toLocaleString('es-VE')}</span>}
              </span>
              <span className="block text-xs leading-tight text-muted">{ayuda}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
