// Base de los íconos propios de Electro Shop (C-188). Los dibujos están en ./index.tsx, generado desde el pack.
// Componentes puros (sin hooks): sirven igual en Server y en Client Components.
import type { CSSProperties, ReactNode, SVGAttributes } from 'react';

/** Lo mismo que reciben los íconos de react-icons (className, size, style, title, color y aria-*), más `lleno`. */
export interface IconoProps extends SVGAttributes<SVGElement> {
  /** Ancho y alto. Por defecto 1em: toma el tamaño del texto, o el de la clase (`h-4 w-4`). */
  size?: string | number;
  /** Texto para lectores de pantalla. Sin título ni aria-label el ícono es decorativo y lleva aria-hidden. */
  title?: string;
  color?: string;
  /** La superficie entera y del color del trazo: la estrella o el corazón marcados. */
  lleno?: boolean;
}

/** Tipo de un componente de ícono. Sirven los del pack y también los logos de marca de react-icons. */
export type IconType = (props: IconoProps) => ReactNode;

// Un solo color por defecto (currentColor): el acento y su superficie toman el color del texto, la superficie al 25 %.
// Donde se vea bien, un contenedor activa el azul de marca con la clase `iconos-marca` (app/globals.css).
const ACENTO = 'var(--es-acento, currentColor)';
/** Superficie con borde */
export const SUP: CSSProperties = { fill: ACENTO, fillOpacity: 'var(--es-acento-opacidad, .25)' };
/** Detalle sólido */
export const SOL: CSSProperties = { fill: ACENTO };
/** Detalle sólido con su borde */
export const SOL_LIN: CSSProperties = { fill: ACENTO, stroke: ACENTO };
/** Línea de acento */
export const LIN: CSSProperties = { stroke: ACENTO };
// `lleno`: la superficie con el color del trazo y entera, aunque el contenedor active el azul de marca
const LLENO = { '--es-acento': 'currentColor', '--es-acento-opacidad': 1 } as CSSProperties;

export function Icono({ size = '1em', title, color, lleno, style, children, ...props }: IconoProps) {
  const etiquetado = Boolean(title || props['aria-label'] || props['aria-labelledby']);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={etiquetado ? undefined : true}
      role={etiquetado ? 'img' : undefined}
      {...props}
      style={lleno || color ? { ...(lleno ? LLENO : null), ...(color ? { color } : null), ...style } : style}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
