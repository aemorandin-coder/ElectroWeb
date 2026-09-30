'use client';

import { useEffect, useRef } from 'react';
import { FiCheck } from 'react-icons/fi';

interface Props {
  steps: string[];
  current: number;
  onStepClick: (index: number) => void;
  /** Al editar un producto existente se puede ir a cualquier paso. */
  freeNavigation?: boolean;
}

/** Pasos del asistente. Se puede volver a los ya completados (o ir a cualquiera al editar). */
export default function WizardProgress({ steps, current, onStepClick, freeNavigation = false }: Props) {
  // C-134: en el teléfono la barra se desliza; el paso actual se trae a la vista (el último quedaba fuera)
  const lista = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const activo = lista.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const barra = lista.current;
    if (activo && barra && barra.scrollWidth > barra.clientWidth) {
      const a = activo.getBoundingClientRect();
      const b = barra.getBoundingClientRect();
      barra.scrollTo({ left: barra.scrollLeft + (a.left - b.left) - (b.width - a.width) / 2, behavior: 'smooth' });
    }
  }, [current]);

  return (
    <ol ref={lista} className="flex items-center overflow-x-auto py-1 sm:justify-center" aria-label="Pasos">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = !active && (done || freeNavigation);
        return (
          <li key={label} className="flex items-center">
            <button
              type="button"
              onClick={() => { if (reachable) onStepClick(i); }}
              disabled={!reachable}
              aria-current={active ? 'step' : undefined}
              aria-label={label}
              className={[
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-500',
                active ? 'text-brand-700' : reachable ? 'cursor-pointer text-ink hover:bg-surface' : 'cursor-default text-muted',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  done ? 'bg-success-strong text-white' : active ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-line text-ink-soft',
                ].join(' ')}
              >
                {done ? <FiCheck className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              {/* En el teléfono, el nombre del paso en el que estás (antes solo números) */}
              <span className={active ? 'block' : 'hidden sm:block'}>{label}</span>
            </button>
            {i < steps.length - 1 && <span className={`mx-1 h-px w-5 shrink-0 ${done ? 'bg-success-strong' : 'bg-line'}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
