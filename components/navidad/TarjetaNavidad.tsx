// Tarjeta navideña del popup (C-186; C-194: con el diseño de la felicitación de ElectroStudio que eligió Andrés el 06/11).
// Fondo azul de la marca con copos quietos y nieve abajo, el sello con el gorro y el nombre arriba, el saludo en una
// tarjeta blanca (la última palabra del título en el rojo navideño) con el botón, y Chispa saludando con el gorro, asomado
// abajo a la derecha. El sello se enciende y el gorro se acomoda una vez (SelloNavidad); Chispa sube una vez
// (app/globals.css). Con "reducir movimiento", todo quieto.
// Sin estado: el inicio la arma en el servidor y se la pasa al popup (components/HotAdOverlay.tsx), y el panel la usa de
// vista previa. El botón no cierra el popup por sí solo: el popup escucha los toques en sus enlaces.

import Image from 'next/image';
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
  'mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-2 text-center text-base font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

/** Copos quietos con el trazo redondo de la marca, como el fondo "Nieve" de ElectroStudio: [izquierda %, arriba %, tamaño en px] */
const COPOS: [number, number, number][] = [
  [8, 6, 16], [28, 3, 11], [84, 5, 18], [68, 11, 11], [92, 30, 13], [3, 33, 11], [10, 63, 14], [90, 58, 11], [46, 2, 9],
];

function Copos() {
  return (
    <>
      {COPOS.map(([x, y, s]) => (
        <svg
          key={`${x}-${y}`}
          viewBox="-12 -12 24 24"
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute stroke-white/50"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s }}
          strokeWidth={2.5}
          strokeLinecap="round"
        >
          {[0, 60, 120].map((a) => (
            <line key={a} x1={-10} y1={0} x2={10} y2={0} transform={`rotate(${a})`} />
          ))}
        </svg>
      ))}
    </>
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
  // Como en la felicitación de ElectroStudio: la última palabra del título en el rojo navideño ("Feliz Navidad")
  const limpio = titulo.trim();
  const corte = limpio.lastIndexOf(' ');
  const inicio = corte > 0 ? limpio.slice(0, corte + 1) : limpio;
  const final = corte > 0 ? limpio.slice(corte + 1) : '';
  // "Electro Shop te desea" solo cuando el título es un deseo: con otro título (un aviso) diría algo raro
  const deseo = /^¡?\s*feliz/i.test(limpio);
  const contenidoBoton = (
    <>
      {boton}
      <IconoFlechaDerecha className="h-5 w-5 shrink-0" aria-hidden="true" />
    </>
  );

  return (
    <div className={`relative isolate overflow-hidden rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 text-left shadow-xl ${className}`}>
      <Copos />

      <div className="relative flex items-center gap-2 px-5 pt-4">
        <SelloNavidad gorro={gorro} animado={animado} className="h-14 w-14 shrink-0" />
        <span className="font-brand text-xl text-white">Electro Shop</span>
      </div>

      <div className="relative mx-4 mt-2 rounded-2xl bg-white px-5 pb-5 pt-4 shadow-lg">
        {deseo && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Electro Shop te desea</p>}
        <h2 className="mt-1.5 text-4xl font-bold leading-none tracking-tight text-brand-950 lg:text-[2.75rem]">
          {inicio}
          {final && <span className="text-navidad">{final}</span>}
        </h2>
        <p className="mt-3 text-sm text-ink-soft">{mensaje}</p>
        {enlace?.external ? (
          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className={BOTON}>{contenidoBoton}</a>
        ) : enlace ? (
          <Link href={enlace.href} className={BOTON}>{contenidoBoton}</Link>
        ) : null}
      </div>

      {/* Abajo: la nieve, "De parte de todo el equipo" y Chispa saludando con el gorro, asomado desde el borde */}
      <div className="relative h-44">
        <svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true" focusable="false" className="absolute inset-x-0 bottom-0 h-20 w-full">
          <path className="fill-brand-50" d="M0 34C110 2 230 52 400 14V90H0Z" />
          <path className="fill-white" d="M0 58C120 26 250 76 400 40V90H0Z" />
        </svg>
        <p className="absolute bottom-4 left-5 max-w-[48%] text-sm font-bold italic leading-snug text-brand-950">De parte de todo el equipo</p>
        <Image
          src="/images/studio/chispa/saluda-gorro.png"
          alt=""
          width={600}
          height={735}
          sizes="160px"
          className={`pointer-events-none absolute -bottom-1 right-2 h-44 w-auto [filter:drop-shadow(2px_0_0_#fff)_drop-shadow(-2px_0_0_#fff)_drop-shadow(0_2px_0_#fff)_drop-shadow(0_-2px_0_#fff)] ${animado ? 'navidad-asoma' : ''}`}
        />
      </div>
    </div>
  );
}
