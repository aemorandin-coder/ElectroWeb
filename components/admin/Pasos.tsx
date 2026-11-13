'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { IconoCheck, IconoChevronAbajo } from '@/components/iconos';

// C-205: los pasos de un trabajo largo del panel (la Lista del proveedor, y lo que venga). Pedido de Andrés del 13/11:
// "¿qué hago?, ¿a dónde voy?". Se ve siempre dónde estás, lo que ya hiciste (con su resumen) y lo que sigue. Mismo
// vocabulario que el asistente de productos (WizardProgress): verde con visto lo hecho, azul lo de ahora, gris lo que
// falta. Regla en PLAN.md §1.6.

export interface Paso {
  titulo: string;
  /** Lo que se eligió en ese paso (o lo que falta), en una línea */
  resumen: string;
  hecho: boolean;
  /** Se puede ir a él (lo hecho y lo que ya tiene lo que necesita) */
  disponible: boolean;
}

export default function Pasos({ pasos, actual, onIr, etiqueta = 'Pasos' }: {
  pasos: Paso[];
  actual: number;
  onIr: (i: number) => void;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const idLista = useId();
  const caja = useRef<HTMLDivElement>(null);
  const siguiente = pasos[actual + 1];

  // En el teléfono, la lista de pasos se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);

  const ir = (i: number) => { setAbierto(false); if (i !== actual && pasos[i]?.disponible) onIr(i); };

  const item = (p: Paso, i: number, vertical: boolean) => {
    const esActual = i === actual;
    const clickeable = !esActual && p.disponible;
    return (
      <li key={p.titulo} className={vertical ? '' : 'min-w-0 flex-1'}>
        <button
          type="button"
          onClick={() => ir(i)}
          disabled={!clickeable && !esActual}
          aria-current={esActual ? 'step' : undefined}
          className={[
            'flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-500',
            esActual ? 'bg-brand-50' : clickeable ? 'cursor-pointer hover:bg-surface' : 'cursor-default',
          ].join(' ')}
        >
          <span
            className={[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              esActual ? 'bg-brand-500 text-white ring-4 ring-brand-100' : p.hecho ? 'bg-success-strong text-white' : 'bg-line text-ink-soft',
            ].join(' ')}
          >
            {p.hecho && !esActual ? <IconoCheck className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
          </span>
          <span className="min-w-0">
            <span className={`block truncate text-sm font-semibold ${esActual ? 'text-brand-700' : p.hecho || clickeable ? 'text-ink' : 'text-muted'}`}>{p.titulo}</span>
            <span className="block truncate text-xs text-muted" title={p.resumen}>{p.resumen}</span>
          </span>
          {p.hecho && !esActual && <span className="sr-only">(hecho)</span>}
        </button>
      </li>
    );
  };

  return (
    <div ref={caja} className="sticky top-16 z-[var(--z-sticky)] -mx-3 border-b border-line bg-white px-3 py-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:rounded-2xl lg:border lg:p-1.5">
      {/* Escritorio: todos los pasos en una fila */}
      <nav aria-label={etiqueta} className="hidden lg:block">
        <ol className="flex gap-1">{pasos.map((p, i) => item(p, i, false))}</ol>
      </nav>
      {/* Teléfono: el paso de ahora, lo que sigue y la lista a mano */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Paso {actual + 1} de {pasos.length} · {pasos[actual]?.titulo}</p>
            <p className="truncate text-xs text-muted">{siguiente ? `Después: ${siguiente.titulo.toLowerCase()}` : 'Es el último paso'}</p>
          </div>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            aria-controls={idLista}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface"
          >
            Ver pasos <IconoChevronAbajo className={`h-4 w-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-200" style={{ width: `${((actual + 1) / pasos.length) * 100}%` }} />
        </div>
        {abierto && (
          <nav aria-label={etiqueta} id={idLista} className="mt-2 border-t border-line pt-2">
            <ol className="grid gap-0.5">{pasos.map((p, i) => item(p, i, true))}</ol>
          </nav>
        )}
      </div>
    </div>
  );
}
