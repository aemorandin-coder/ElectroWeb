'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { IconoCheck, IconoChevronAbajo, type IconType } from '@/components/iconos';

// C-205: los pasos de un trabajo largo del panel (la Lista del proveedor, y lo que venga). Pedido de Andrés del 13/11:
// "¿qué hago?, ¿a dónde voy?". Se ve siempre dónde estás, lo que ya hiciste (con su resumen) y lo que sigue. Mismo
// vocabulario que el asistente de productos (WizardProgress): verde con visto lo hecho, azul lo de ahora, gris lo que
// falta. Regla en PLAN.md §1.6.
// C-221 (la A que eligió el equipo el 14/11, PLAN.md §1.9): en la computadora, los pasos en fila con su ícono y una línea
// que los une; al terminar un paso la línea se llena y aparece el visto, una sola vez (con "reducir movimiento", nada se
// mueve). En el teléfono, una barra con un tramo por paso.

export interface Paso {
  titulo: string;
  /** Lo que se eligió en ese paso (o lo que falta), en una línea */
  resumen: string;
  hecho: boolean;
  /** Se puede ir a él (lo hecho y lo que ya tiene lo que necesita) */
  disponible: boolean;
  /** C-221: el ícono del paso (del pack). Sin ícono, el número */
  icono?: IconType;
}

export default function Pasos({ pasos, actual, onIr, onAltura, etiqueta = 'Pasos' }: {
  pasos: Paso[];
  actual: number;
  onIr: (i: number) => void;
  onAltura?: (px: number) => void;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const idLista = useId();
  const caja = useRef<HTMLDivElement>(null);
  const siguiente = pasos[actual + 1];

  useEffect(() => {
    const el = caja.current;
    if (!el || !onAltura) return;
    const medir = () => onAltura(Math.round(el.offsetHeight));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onAltura]);

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

  /** El círculo del paso: el visto si ya se hizo, si no su ícono o su número */
  const nodo = (p: Paso, i: number, chico: boolean) => {
    const esActual = i === actual;
    const Icono = p.icono;
    const tam = chico ? 'h-7 w-7' : 'h-10 w-10';
    const icono = chico ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
    return (
      <span
        className={[
          'flex shrink-0 items-center justify-center rounded-full text-xs font-bold',
          tam,
          esActual
            ? 'border-2 border-brand-500 bg-white text-brand-500 ring-4 ring-brand-100 transition-[box-shadow] duration-500 starting:ring-0 motion-reduce:transition-none'
            : p.hecho ? 'bg-success-strong text-white' : 'border border-line-strong bg-surface text-muted',
        ].join(' ')}
      >
        {p.hecho && !esActual
          ? <IconoCheck className={`${icono} transition-transform duration-300 starting:scale-50 motion-reduce:transition-none`} aria-hidden="true" />
          : Icono ? <Icono className={icono} aria-hidden="true" /> : i + 1}
      </span>
    );
  };

  // Computadora: el nodo arriba, el nombre y el resumen debajo, y la línea hasta el siguiente
  const enFila = (p: Paso, i: number) => {
    const esActual = i === actual;
    const clickeable = !esActual && p.disponible;
    return (
      <li key={p.titulo} className="relative min-w-0">
        {i < pasos.length - 1 && (
          <span aria-hidden="true" className="absolute left-[calc(50%+1.75rem)] right-[calc(-50%+1.75rem)] top-[1.625rem] h-0.5 overflow-hidden rounded-full bg-line-strong">
            <span
              className={[
                'block h-full origin-left rounded-full bg-success-strong transition-transform duration-500 motion-reduce:transition-none',
                // Llena hasta el siguiente si este está hecho y el siguiente también, o es donde estás
                p.hecho && (pasos[i + 1]?.hecho || i + 1 === actual) ? 'scale-x-100 starting:scale-x-0' : 'scale-x-0',
              ].join(' ')}
            />
          </span>
        )}
        <button
          type="button"
          onClick={() => ir(i)}
          disabled={!clickeable && !esActual}
          aria-current={esActual ? 'step' : undefined}
          className={[
            'relative flex w-full min-w-0 flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 text-center focus-visible:outline-2 focus-visible:outline-brand-500',
            clickeable ? 'cursor-pointer hover:bg-surface' : 'cursor-default',
          ].join(' ')}
        >
          {nodo(p, i, false)}
          <span className="w-full min-w-0">
            <span className={`block truncate text-sm font-semibold ${esActual ? 'text-brand-700' : p.hecho || clickeable ? 'text-ink' : 'text-muted'}`}>{p.titulo}</span>
            <span className="block truncate text-xs text-muted" title={p.resumen}>{p.resumen}</span>
          </span>
          {p.hecho && !esActual && <span className="sr-only">(hecho)</span>}
        </button>
      </li>
    );
  };

  // Teléfono, la lista abierta: un paso por renglón
  const enLista = (p: Paso, i: number) => {
    const esActual = i === actual;
    const clickeable = !esActual && p.disponible;
    return (
      <li key={p.titulo}>
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
          {nodo(p, i, true)}
          <span className="min-w-0">
            <span className={`block truncate text-sm font-semibold ${esActual ? 'text-brand-700' : p.hecho || clickeable ? 'text-ink' : 'text-muted'}`}>{p.titulo}</span>
            <span className="block truncate text-xs text-muted" title={p.resumen}>{p.resumen}</span>
          </span>
          {p.hecho && !esActual && <span className="sr-only">(hecho)</span>}
        </button>
      </li>
    );
  };

  const Actual = pasos[actual]?.icono;

  return (
    <div ref={caja} className="sticky top-16 z-[var(--z-sticky)] -mx-3 border-b border-line bg-white px-3 py-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:rounded-2xl lg:border lg:px-2 lg:py-2.5">
      {/* Escritorio: todos los pasos en una fila */}
      <nav aria-label={etiqueta} className="hidden lg:block">
        <ol className="grid" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>{pasos.map(enFila)}</ol>
      </nav>
      {/* Teléfono: el paso de ahora, lo que sigue, una barra por tramos y la lista como popover flotante */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {Actual && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 text-brand-500">
                <Actual className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs text-muted">
                Paso {actual + 1} de {pasos.length} · {siguiente ? `Después: ${siguiente.titulo}` : 'Último paso'}
              </p>
              <p className="truncate text-sm font-semibold text-ink">{pasos[actual]?.titulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            aria-controls={idLista}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            Pasos <IconoChevronAbajo className={`h-4 w-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }} aria-hidden="true">
          {pasos.map((p, i) => (
            <span
              key={p.titulo}
              className={`h-1 rounded-full transition-colors duration-300 ${i === actual ? 'bg-brand-500' : p.hecho ? 'bg-success-strong' : 'bg-line'}`}
            />
          ))}
        </div>
        {abierto && (
          <nav aria-label={etiqueta} id={idLista} className="absolute inset-x-0 top-full z-20 border-b border-line bg-white px-3 pb-3 pt-2 shadow-lg sm:px-4">
            <ol className="grid gap-0.5">{pasos.map(enLista)}</ol>
          </nav>
        )}
      </div>
    </div>
  );
}
