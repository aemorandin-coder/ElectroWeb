// Tarjeta navideña del popup (C-186), con el estilo de las piezas de ElectroStudio: fondo claro, tinta azul marino, la
// última palabra del título en azul y abajo la franja azul con el botón blanco. La ilustración es el sello de la tienda
// con el gorro de Santa, que se enciende al aparecer (SelloNavidad).
// Sin estado: el inicio la arma en el servidor y se la pasa al popup (components/HotAdOverlay.tsx), y el panel la usa de
// vista previa. El botón no cierra el popup por sí solo: el popup escucha los toques en sus enlaces.

import Link from 'next/link';
import { IconoFlechaDerecha } from '@/components/iconos';
import type { VarianteGorro } from '@/lib/navidad';
import SelloNavidad from './SelloNavidad';

interface TarjetaNavidadProps {
  titulo: string;
  mensaje: string;
  boton: string;
  /** Ya revisado con safeHotAdLink. null: sin botón */
  enlace: { href: string; external: boolean } | null;
  gorro: VarianteGorro;
  animado?: boolean;
  /** Ancho. Por defecto, el del popup; la vista previa del panel le pasa el de su columna */
  className?: string;
}

const BOTON =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-2 text-center text-base font-semibold text-brand-600 shadow-sm transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** La trama de puntos de las piezas de ElectroStudio, en las esquinas de arriba */
function Puntos({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 44 24" aria-hidden="true" focusable="false" className={`pointer-events-none absolute top-5 h-6 w-11 fill-brand-300 ${className}`}>
      {[2, 12, 22].map((y) => [2, 12, 22, 32, 42].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
    </svg>
  );
}

export default function TarjetaNavidad({
  titulo,
  mensaje,
  boton,
  enlace,
  gorro,
  animado = true,
  className = 'w-[min(25rem,calc(100vw-2rem))]',
}: TarjetaNavidadProps) {
  // Como en las piezas de ElectroStudio: la última palabra del título en azul ("Feliz Navidad")
  const limpio = titulo.trim();
  const corte = limpio.lastIndexOf(' ');
  const inicio = corte > 0 ? limpio.slice(0, corte + 1) : limpio;
  const final = corte > 0 ? limpio.slice(corte + 1) : '';
  const contenidoBoton = (
    <>
      {boton}
      <IconoFlechaDerecha className="h-5 w-5 shrink-0" aria-hidden="true" />
    </>
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-brand-50 text-center shadow-xl ${className}`}>
      <Puntos className="left-5" />
      <Puntos className="right-5" />

      <div className="relative px-6 pb-7 pt-8">
        <SelloNavidad gorro={gorro} animado={animado} className="mx-auto block h-32 w-32 lg:h-36 lg:w-36" />
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-900 lg:text-4xl">
          {inicio}
          {final && <span className="text-brand-500">{final}</span>}
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-base text-ink-soft">{mensaje}</p>
      </div>

      <div className={`bg-brand-600 px-6 ${enlace ? 'pb-6 pt-5' : 'h-3'}`}>
        {enlace?.external ? (
          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className={BOTON}>{contenidoBoton}</a>
        ) : enlace ? (
          <Link href={enlace.href} className={BOTON}>{contenidoBoton}</Link>
        ) : null}
      </div>
    </div>
  );
}
