import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconoCheck, type IconType } from '@/components/iconos';

/**
 * C-242: la tarjeta para elegir una cosa entre varias, con todo adentro: el ícono en su placa, el título, una línea y el
 * círculo de elegida. El equipo, el 14/11, mirando el asistente de factura: "los grids se ven perdidos, íconos
 * amontonados". La causa era `adminChoice`, que solo da el borde y el color: el relleno y la disposición los tenía que
 * poner cada pantalla, y una los olvidó. Esta pieza no se puede usar a medias (PLAN.md §1.10).
 * - `tamano="chica"`: una palabra o dos, centradas, con el círculo delante (Contado / Crédito).
 * - Como botón: quien la usa dice si es `aria-pressed` o `role="radio"` con `aria-checked`.
 * - Con un radio de verdad (una lista para elegir una), `OpcionRadio`.
 */

type Tamano = 'normal' | 'chica';

interface Contenido {
  elegida: boolean;
  titulo: ReactNode;
  /** Una línea debajo del título */
  detalle?: ReactNode;
  icono?: IconType;
  /** A la derecha, antes del círculo: un monto, un dato */
  extra?: ReactNode;
  tamano?: Tamano;
}

export function claseOpcion(elegida: boolean, tamano: Tamano = 'normal'): string {
  return [
    'flex items-center rounded-xl border-2 text-left text-ink transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500',
    'disabled:cursor-not-allowed disabled:opacity-60',
    // La chica toma el ancho que le dé quien la usa (flex-1, una celda); la normal, todo el ancho
    tamano === 'chica' ? 'min-h-11 justify-center gap-2 px-3 py-2 text-sm font-semibold' : 'w-full min-h-16 gap-3 px-4 py-3',
    elegida ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200',
  ].join(' ');
}

function Circulo({ elegida, chico }: { elegida: boolean; chico: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 transition-colors ${chico ? 'h-4 w-4' : 'h-5 w-5'} ${elegida ? 'border-brand-500 bg-brand-500 text-white' : 'border-line-strong bg-white'}`}
    >
      {elegida && <IconoCheck className={`${chico ? 'h-2.5 w-2.5' : 'h-3 w-3'} transition-transform duration-200 starting:scale-50 motion-reduce:transition-none`} />}
    </span>
  );
}

function Adentro({ elegida, titulo, detalle, icono: Icono, extra, tamano = 'normal' }: Contenido) {
  if (tamano === 'chica') {
    return <><Circulo elegida={elegida} chico />{titulo}</>;
  }
  return (
    <>
      {Icono && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${elegida ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
          <Icono className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{titulo}</span>
        {detalle && <span className="block text-xs text-muted">{detalle}</span>}
      </span>
      {extra}
      <Circulo elegida={elegida} chico={false} />
    </>
  );
}

export default function Opcion({ elegida, titulo, detalle, icono, extra, tamano, className = '', ...boton }: Contenido & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'>) {
  return (
    <button type="button" {...boton} className={`${claseOpcion(elegida, tamano)} ${className}`}>
      <Adentro elegida={elegida} titulo={titulo} detalle={detalle} icono={icono} extra={extra} tamano={tamano} />
    </button>
  );
}

/** Una de una lista con un radio de verdad (el teclado la recorre con las flechas). */
export function OpcionRadio({ elegida, titulo, detalle, icono, extra, tamano, name, onElegir, className = '' }: Contenido & { name: string; onElegir: () => void; className?: string }) {
  return (
    <label className={`${claseOpcion(elegida, tamano)} cursor-pointer ${className}`}>
      <input type="radio" name={name} className="sr-only" checked={elegida} onChange={onElegir} />
      <Adentro elegida={elegida} titulo={titulo} detalle={detalle} icono={icono} extra={extra} tamano={tamano} />
    </label>
  );
}
