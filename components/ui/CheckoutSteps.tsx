'use client';

import Link from 'next/link';
import { IconoCarrito, IconoCheck, IconoEnvio, IconoPagoMovil, IconoVer, type IconType } from '@/components/iconos';

// C-32: los pasos de la compra en el carrito y en el checkout.
// C-241 (el equipo, 14/11: "en el checkout necesitamos, como te comenté, las reglas: crear un breadcrumb"; eligió la A,
// un paso a la vez, y pagar al final): Carrito, Entrega, Revisar y Pagar, con su ícono, la línea que se llena y el visto
// al terminar, como los pasos del panel (PLAN.md §1.6 y §1.9). Lo hecho se puede tocar para volver.

const PASOS: { titulo: string; icono: IconType; resumen: string }[] = [
  { titulo: 'Carrito', icono: IconoCarrito, resumen: 'Tus productos' },
  { titulo: 'Entrega', icono: IconoEnvio, resumen: 'Cómo y adónde' },
  { titulo: 'Revisar', icono: IconoVer, resumen: 'Notas y términos' },
  { titulo: 'Pagar', icono: IconoPagoMovil, resumen: 'Y listo' },
];

export type PasoCompra = 0 | 1 | 2 | 3;

export default function CheckoutSteps({ current, onIr, disponibles = [false, false, false], resumenes = [] }: {
  /** 0 carrito, 1 entrega, 2 revisar, 3 pagar */
  current: PasoCompra;
  /** Dentro del checkout: ir a Entrega (1), Revisar (2) o Pagar (3) */
  onIr?: (paso: 1 | 2 | 3) => void;
  /** Se puede ir a Entrega, Revisar y Pagar (en ese orden) */
  disponibles?: [boolean, boolean, boolean];
  /** Lo elegido en cada paso, en una línea (si falta, el texto de siempre) */
  resumenes?: Array<string | null | undefined>;
}) {
  return (
    <nav aria-label="Pasos de la compra" className="w-full">
      <ol className="grid grid-cols-4 rounded-2xl border border-line bg-white px-1 py-2.5 sm:px-2">
        {PASOS.map((p, i) => {
          const hecho = i < current;
          const actual = i === current;
          const Icono = p.icono;
          // El carrito se toca para volver; los demás, si ya tienen lo que necesitan
          const puede = !actual && (i === 0 ? current > 0 : Boolean(onIr) && disponibles[i - 1]);
          const nodo = (
            <span
              className={[
                'flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10',
                actual
                  ? 'border-2 border-brand-500 bg-white text-brand-500 ring-4 ring-brand-100 transition-[box-shadow] duration-500 starting:ring-0 motion-reduce:transition-none'
                  : hecho ? 'bg-success-strong text-white' : 'border border-line-strong bg-surface text-muted',
              ].join(' ')}
            >
              {hecho
                ? <IconoCheck className="h-4 w-4 transition-transform duration-300 starting:scale-50 motion-reduce:transition-none" aria-hidden="true" />
                : <Icono className="h-4 w-4" aria-hidden="true" />}
            </span>
          );
          const texto = (
            <span className="w-full min-w-0">
              <span className={`block truncate text-xs font-semibold sm:text-sm ${actual ? 'text-brand-700' : hecho || puede ? 'text-ink' : 'text-muted'}`}>{p.titulo}</span>
              <span className="hidden truncate text-xs text-muted sm:block">{actual ? 'Estás aquí' : resumenes[i] || p.resumen}</span>
            </span>
          );
          const clases = `relative flex w-full min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 text-center focus-visible:outline-2 focus-visible:outline-brand-500 ${puede ? 'cursor-pointer hover:bg-surface' : 'cursor-default'}`;
          return (
            <li key={p.titulo} className="relative min-w-0" aria-current={actual ? 'step' : undefined}>
              {i < PASOS.length - 1 && (
                <span aria-hidden="true" className="absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-[1.4rem] h-0.5 overflow-hidden rounded-full bg-line-strong sm:top-[1.5rem]">
                  <span className={`block h-full origin-left rounded-full bg-success-strong transition-transform duration-500 motion-reduce:transition-none ${hecho ? 'scale-x-100 starting:scale-x-0' : 'scale-x-0'}`} />
                </span>
              )}
              {i === 0 && puede ? (
                <Link href="/carrito" className={clases}>{nodo}{texto}</Link>
              ) : puede ? (
                <button type="button" onClick={() => onIr?.(i as 1 | 2 | 3)} className={clases}>{nodo}{texto}</button>
              ) : (
                <span className={clases}>{nodo}{texto}</span>
              )}
              {hecho && <span className="sr-only">(hecho)</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
