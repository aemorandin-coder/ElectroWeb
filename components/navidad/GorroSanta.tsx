// Gorro de Santa del tema navideño (C-186), dibujado con el lenguaje del pack de íconos de Electro Shop: contorno azul
// marino redondeado (brand-900), rellenos planos y un solo acento, el rojo navideño (token `navidad`). La piel y la borla
// son blancas, también con contorno.
// Dos versiones (lib/navidad.ts, GORROS), las dos medidas sobre el sello del logo (círculo azul con aro blanco):
// - ajustado: se calza en el sello; el aro blanco de arriba se vuelve la piel del gorro y la punta cae hacia atrás.
// - clasico: un gorro puesto encima del sello, inclinado hacia atrás.
// Coordenadas: la caja del logo mide 100 × 100 (el círculo del sello, centro 50,49 y radio 46). El gorro sale de la caja
// hacia arriba y hacia la izquierda, nunca hacia la derecha, donde va el nombre de la tienda.
// Sin estado ni efectos: sirve en el servidor (la tarjeta del popup) y en componentes cliente (encabezado y pie).

import type { VarianteGorro } from '@/lib/navidad';

/** El trazo del pack: 2 en la cuadrícula de 24, que sobre la caja de 100 del logo es 5,5 */
const TRAZO = 5.5;

interface DibujoGorroProps {
  variante: VarianteGorro;
  /** En la tarjeta del popup: cae en el sello y se balancea hasta quedar quieto, una vez (app/globals.css, C-186) */
  animado?: boolean;
}

/** El gorro como grupo SVG en las coordenadas de la caja del logo. Lo usan el encabezado, el pie y el sello de la tarjeta. */
export function DibujoGorro({ variante, animado = false }: DibujoGorroProps) {
  const acomoda = animado ? 'navidad-acomoda' : undefined;

  if (variante === 'clasico') {
    // Dibujado en la cuadrícula de 24 del pack (trazo 2) y llevado a la caja del logo: 2,75 veces más grande, sobre el
    // borde de arriba a la izquierda e inclinado 14 grados hacia atrás
    return (
      <g className={acomoda}>
        <g
          transform="translate(19 2) rotate(-14) translate(-33 -33) scale(2.75)"
          className="stroke-brand-900"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="fill-navidad" d="M4.2 16.5C4.6 10.3 7.7 5.6 12.4 4.7c4.2-.8 7.6 1.5 8.3 5.8l-3.5.5c-.5 1.7-.7 3.6-.7 5.5z" />
          <rect className="fill-white" x="2" y="16" width="17" height="4.5" rx="2.25" />
          <circle className="fill-white" cx="20.2" cy="11.1" r="2.4" />
        </g>
      </g>
    );
  }

  return (
    <g className={`stroke-brand-900 ${acomoda ?? ''}`} fill="none" strokeWidth={TRAZO} strokeLinecap="round" strokeLinejoin="round">
      {/* La copa: sube desde la piel y la punta cae hacia atrás, fuera del sello */}
      <path className="fill-navidad" d="M82.5 28C84 4 70-17 46-21 29-23.5 12-17 1-6l7 6.5c3-2 6-3.5 9-3.5 1.5 9 1.5 21 .5 31z" />
      {/* La piel: el arco del aro blanco del sello, con su contorno (un trazo ancho azul marino y uno blanco encima) */}
      <path d="M19.9 30.6A35.5 35.5 0 0 1 80.1 30.6" strokeWidth={10 + TRAZO * 2} />
      <path className="stroke-white" d="M19.9 30.6A35.5 35.5 0 0 1 80.1 30.6" strokeWidth={10} />
      <circle className="fill-white" cx="0" cy="-3" r="8" />
    </g>
  );
}

interface GorroSantaProps {
  variante: VarianteGorro;
  className?: string;
}

/**
 * El gorro sobre el logo de la tienda. El padre es la caja del logo (`relative`, cuadrada). Decorativo: el lector de
 * pantalla no lo anuncia y no recibe toques (el enlace del logo se sigue tocando).
 */
export default function GorroSanta({ variante, className = '' }: GorroSantaProps) {
  return (
    <svg
      viewBox="-14 -34 128 96"
      aria-hidden="true"
      focusable="false"
      data-gorro={variante}
      className={`pointer-events-none absolute left-[-14%] top-[-34%] h-[96%] w-[128%] overflow-visible ${className}`}
    >
      <DibujoGorro variante={variante} />
    </svg>
  );
}

/**
 * El gorro como ícono del menú del panel (Marketing → Navidad), en la versión de un color del pack: el trazo toma el
 * color del texto (cambia con la pestaña activa) y la copa, que en color va en rojo, queda con el mismo color al 25 %.
 * Dibujado para 16 px: la copa más alta y la borla aparte de la punta, para que no se lea como un casco.
 */
export function IconoGorro({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 16.5C5 9 9.5 3.5 15 3.5c2.6 0 4.5 1.6 5.2 4.2L17 9c-.6 2.4-.9 4.9-1 7.5z" fill="currentColor" fillOpacity={0.25} />
      <rect x="2" y="16" width="16.5" height="4.5" rx="2.25" />
      <circle cx="20" cy="8.7" r="2.2" />
    </svg>
  );
}
