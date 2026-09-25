'use client';

import { useId, useState } from 'react';
import { FiCheck, FiScissors, FiX } from 'react-icons/fi';

export interface CouponStatus {
  applied: boolean;
  message: string;
}

interface CouponBoxProps {
  code: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  /** Respuesta del servidor para el código guardado; null mientras no hay cotización (invitado o cargando) */
  status: CouponStatus | null;
  /** Texto cuando todavía no se puede verificar (por ejemplo, sin sesión) */
  pendingText?: string;
}

/**
 * Cupón del carrito y del checkout (C-102). Cerrado por defecto ("¿Tienes un cupón?"), como Amazon y Best Buy:
 * quien no tiene cupón no ve un campo vacío que lo haga dudar de si paga de más.
 */
export default function CouponBox({ code, onApply, onRemove, status, pendingText = 'Se verifica al pagar.' }: CouponBoxProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (code) {
    const tone = status === null ? 'border-line bg-surface' : status.applied ? 'border-success-strong/40 bg-success/5' : 'border-warning/40 bg-warning/10';
    return (
      <div className={`rounded-lg border px-3 py-2 ${tone}`}>
        <div className="flex items-center gap-2">
          {status?.applied ? <FiCheck className="h-4 w-4 shrink-0 text-success-strong" aria-hidden="true" /> : <FiScissors className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">Cupón {code}</span>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted hover:text-deal focus-visible:outline-2 focus-visible:outline-brand-500"
            aria-label={`Quitar el cupón ${code}`}
          >
            <FiX className="h-4 w-4" aria-hidden="true" /> Quitar
          </button>
        </div>
        <p className={`text-xs ${status?.applied ? 'text-success-strong' : status ? 'text-warning-strong' : 'text-muted'}`} role="status">
          {status ? status.message : pendingText}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <FiScissors className="h-4 w-4" aria-hidden="true" /> ¿Tienes un cupón?
      </button>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onApply(value);
      }}
    >
      <label htmlFor={inputId} className="sr-only">Código del cupón</label>
      <input
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Código"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={30}
        autoFocus
        className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm uppercase text-ink placeholder:normal-case placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-brand-500"
      />
      <button type="submit" disabled={!value.trim()} className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
        Aplicar
      </button>
    </form>
  );
}
