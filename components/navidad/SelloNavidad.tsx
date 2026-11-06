// El sello de Electro Shop dibujado con el pack de íconos (la pantalla con las letras ES, la V y la base) y con el gorro de
// Santa: la ilustración de la tarjeta navideña del popup (C-186). Mismas coordenadas que el gorro (caja de 100 × 100).
// Animado: la pantalla se enciende como un televisor (una línea que se abre de lado a lado y después hacia arriba y
// abajo) y el gorro cae en el sello y se balancea hasta quedar quieto. Una sola vez, al aparecer; con "reducir
// movimiento" el sistema la muestra quieta (app/globals.css).

import type { VarianteGorro } from '@/lib/navidad';
import { DibujoGorro } from './GorroSanta';

/** La pantalla del sello. Las letras van a la mitad de su alto */
const PANTALLA = { x: 22, y: 32, width: 56, height: 31, rx: 7 };

interface SelloNavidadProps {
  gorro: VarianteGorro;
  animado?: boolean;
  className?: string;
}

export default function SelloNavidad({ gorro, animado = true, className = '' }: SelloNavidadProps) {
  return (
    <svg viewBox="-14 -34 128 134" aria-hidden="true" focusable="false" className={`overflow-visible ${className}`}>
      <g className="stroke-brand-900" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <circle className="fill-white" cx="50" cy="50" r="44" />
        {/* Apagada: azul marino. Encendida: azul de la marca con las letras en blanco */}
        <rect className="fill-brand-900" stroke="none" {...PANTALLA} />
        <g className={animado ? 'navidad-enciende' : undefined}>
          <rect className="fill-brand-500" stroke="none" {...PANTALLA} />
          <g className="stroke-white" strokeWidth={4.5}>
            <path d="M44 40H34v15h10M34 47.5h7.5" />
            <path d="M66 40H56a3.75 3.75 0 0 0 0 7.5h6.5a3.75 3.75 0 0 1 0 7.5H52" />
          </g>
        </g>
        <rect {...PANTALLA} />
        <path className="fill-brand-900" d="M43 63h14l-7 5.5z" strokeWidth={3} />
        <path d="M33 74.5h34" />
      </g>
      <DibujoGorro variante={gorro} animado={animado} />
    </svg>
  );
}
