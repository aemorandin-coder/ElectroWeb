// El saludo navideño del inicio (C-207). Antes era la tarjeta del popup (C-186 y C-194), que oscurecía la tienda a los
// 2,5 segundos de entrar; Andrés, el 13/11: "déjala como franja". Va dentro de la página, después de los destacados: se
// ve sin tapar nada. Andrés va a mejorar su diseño.
// El sello con el gorro, el saludo (la última palabra del título en el rojo navideño), el mensaje y el botón. Angosta (el
// teléfono, la vista previa del panel), el mensaje no va y el botón es un enlace bajo el saludo; toda la franja se toca.
// Se acomoda a su propio ancho (consulta de contenedor), no al de la pantalla. Sin estado: el inicio la arma en el
// servidor y el panel la usa de vista previa (Marketing → Navidad).

import Link from 'next/link';
import { IconoFlechaDerecha } from '@/components/iconos';
import type { VarianteGorro } from '@/lib/navidad';
import SelloNavidad from './SelloNavidad';

interface SaludoNavidadProps {
  titulo: string;
  mensaje: string;
  boton: string;
  /** Ya revisado con safeHotAdLink. null: sin botón */
  enlace: { href: string; external: boolean } | null;
  gorro: VarianteGorro;
  /** El sello se enciende y el gorro cae una vez, al aparecer (con "reducir movimiento", quieto) */
  animado?: boolean;
  className?: string;
}

// Angosta, un enlace bajo el saludo; desde 36rem de ancho, el botón a la derecha. El ::after cubre la franja (enlace estirado)
const ENLACE =
  'mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 after:absolute after:inset-0 after:rounded-2xl ' +
  'focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-500 ' +
  '@xl:mt-0 @xl:min-h-11 @xl:shrink-0 @xl:rounded-full @xl:bg-brand-500 @xl:px-5 @xl:text-white @xl:transition-colors @xl:hover:bg-brand-600';

export default function SaludoNavidad({ titulo, mensaje, boton, enlace, gorro, animado = true, className = '' }: SaludoNavidadProps) {
  // Como en la felicitación de ElectroStudio: la última palabra del título en el rojo navideño ("Feliz Navidad")
  const limpio = titulo.trim();
  const corte = limpio.lastIndexOf(' ');
  const inicio = corte > 0 ? limpio.slice(0, corte + 1) : limpio;
  const final = corte > 0 ? limpio.slice(corte + 1) : '';
  const contenidoEnlace = (
    <>
      {boton}
      <IconoFlechaDerecha className="h-4 w-4 shrink-0" aria-hidden="true" />
    </>
  );

  return (
    <div className={`@container relative flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-3 py-2.5 ${className}`}>
      <SelloNavidad gorro={gorro} animado={animado} className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1 @xl:flex @xl:items-center @xl:gap-4">
        <div className="min-w-0 @xl:flex-1">
          {/* 20 px en negrita: el rojo navideño sobre el azul claro (4,3:1) pide texto grande */}
          <p className="text-xl font-bold leading-tight tracking-tight text-brand-950">
            {inicio}
            {final && <span className="text-navidad">{final}</span>}
          </p>
          {mensaje && <p className="mt-0.5 hidden text-sm text-ink-soft @xl:line-clamp-2">{mensaje}</p>}
        </div>
        {enlace?.external ? (
          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className={ENLACE}>{contenidoEnlace}</a>
        ) : enlace ? (
          <Link href={enlace.href} className={ENLACE}>{contenidoEnlace}</Link>
        ) : null}
      </div>
    </div>
  );
}
