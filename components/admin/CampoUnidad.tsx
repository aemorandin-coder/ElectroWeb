'use client';

import type { InputHTMLAttributes } from 'react';

// C-205: un número corto con su unidad al lado (%, und., kg). Del ancho de su dato (8 rem), no de la columna: la regla
// de anchos de PLAN.md §1.5 (un "30" ocupaba 380 px en la Lista del proveedor).

export default function CampoUnidad({ unidad, invalido = false, className = '', ...input }: InputHTMLAttributes<HTMLInputElement> & {
  unidad: string;
  invalido?: boolean;
}) {
  return (
    <div
      className={[
        'flex h-11 w-32 overflow-hidden rounded-lg border bg-white focus-within:ring-2 focus-within:ring-brand-500/20',
        invalido ? 'border-deal' : 'border-line focus-within:border-brand-500',
        className,
      ].join(' ')}
    >
      <input
        {...input}
        aria-invalid={invalido || undefined}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums text-ink focus:outline-none"
      />
      <span className="flex items-center border-l border-line bg-surface px-3 text-sm text-muted" aria-hidden="true">{unidad}</span>
    </div>
  );
}
