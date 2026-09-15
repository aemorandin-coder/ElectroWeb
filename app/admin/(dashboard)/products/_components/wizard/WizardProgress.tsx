'use client';

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
  return (
    <ol className="flex items-center overflow-x-auto py-1 sm:justify-center" aria-label="Pasos">
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
              <span className="hidden sm:block">{label}</span>
            </button>
            {i < steps.length - 1 && <span className={`mx-1 h-px w-5 shrink-0 ${done ? 'bg-success-strong' : 'bg-line'}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
