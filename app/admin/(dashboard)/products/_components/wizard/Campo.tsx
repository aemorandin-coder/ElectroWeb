'use client';

import type { ReactNode } from 'react';
import { wizardError, wizardHint, wizardLabel } from './ui';

// C-134: piezas comunes de los pasos del asistente.
// - Campo: la etiqueta unida al control (antes los <label> no tenían htmlFor) y el error escrito debajo, no en un
//   globo flotante que en el teléfono tapaba el campo de al lado.
// - Seccion: bloques separados por una línea, sin tarjetas dentro de la tarjeta del paso (doble margen).

/** Atributos para el control de un Campo: id, aria-invalid y a qué texto de ayuda o error apunta. */
export function controlDe(id: string, error?: string, hint?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function Campo({
  id,
  label,
  required = false,
  hint,
  error,
  className = '',
  children,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={wizardLabel}>
        {label}
        {required && <span className="text-deal" aria-hidden="true"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={wizardError}>{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className={wizardHint}>{hint}</p>
      ) : null}
    </div>
  );
}

export function Seccion({ titulo, ayuda, children, id }: { titulo: string; ayuda?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 id={id} className="text-base font-semibold text-ink">{titulo}</h3>
        {ayuda && <p className="mt-0.5 text-sm text-muted">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}
