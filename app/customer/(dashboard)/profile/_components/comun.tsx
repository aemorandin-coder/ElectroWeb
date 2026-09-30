'use client';

import { useId, type ReactNode } from 'react';

// Piezas de Mi perfil (C-138): tarjeta de sección e interruptor accesible.

export function Seccion({ titulo, descripcion, children, accion }: { titulo: string; descripcion?: ReactNode; children: ReactNode; accion?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-sm text-muted">{descripcion}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Interruptor({ titulo, descripcion, activo, onCambio, deshabilitado }: {
  titulo: string;
  descripcion?: string;
  activo: boolean;
  onCambio: (valor: boolean) => void;
  deshabilitado?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-ink">{titulo}</span>
        {descripcion && <span className="mt-0.5 block text-sm text-muted">{descripcion}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        disabled={deshabilitado}
        onClick={() => onCambio(!activo)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50 ${activo ? 'bg-brand-500' : 'bg-subtle'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${activo ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/** "sept. 2026" */
export function mesYAnio(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' });
}

/** "Hoy, 10:51", "Ayer, 18:02" o "16 sept., 09:15" */
export function fechaCorta(fecha: string | Date): string {
  const d = new Date(fecha);
  const hora = d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}, ${hora}`;
}
