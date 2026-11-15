// C-253: la bandera del sorteo en el inicio (el equipo, 15/11: "¿y si en home le colocamos una bandera con 'Gánate una
// PS4', animada?", con un dibujo de una pestaña al borde izquierdo). Eligió la A1 viendo las maquetas: la pestaña angosta con
// la foto del premio, "¡Gánate una" y el logo oficial de PS4 (pidió el logo en vez del texto), y el regalo.
// - En pantallas anchas (desde 1440 px), pegada al borde izquierdo a media altura, en el margen que dejan los productos.
//   Más angosto que eso, la pestaña taparía los productos: va la píldora de abajo a la izquierda, frente a WhatsApp.
// - Entra una sola vez: se desliza desde el borde, da dos destellos, el regalo se mueve y se queda quieta. La tienda no
//   tiene animaciones que se repitan sin parar, y con "reducir movimiento" no se anima.
// - Sale solo mientras se puede participar (lo decide la página). Después del sorteo, la semana del ganador es C-254.
// Sin hooks: un Server Component.
import Image from 'next/image';
import Link from 'next/link';
import { SiPlaystation, SiPlaystation4, SiPlaystation5 } from 'react-icons/si';
import { IconoRegalo } from '@/components/iconos';
import { fotoDelSorteo } from '@/components/sorteo/PremioSorteo';
import { logoDelNombreCorto } from '@/lib/sorteo/premio';

/** El destello que cruza la bandera dos veces. Quieto e invisible si no se anima */
function Destello() {
  return <span aria-hidden="true" className="bandera-brillo pointer-events-none absolute -inset-y-4 left-0 w-1/2 bg-linear-to-r from-transparent via-white/35 to-transparent opacity-0" />;
}

/** "PS4" con el logo oficial (el símbolo de PlayStation y su logotipo), o el nombre corto escrito */
function NombreCorto({ nombre, tamano }: { nombre: string; tamano: 'tab' | 'pildora' }) {
  const logo = logoDelNombreCorto(nombre);
  if (!logo) return <span className={tamano === 'tab' ? 'text-2xl font-bold leading-none' : ''}>{nombre}</span>;
  const Letras = logo === 'ps4' ? SiPlaystation4 : SiPlaystation5;
  const texto = logo === 'ps4' ? 'PS4' : 'PS5';
  if (tamano === 'pildora') {
    // En la línea del texto: solo el logotipo, recortado a su alto
    return <Letras role="img" aria-label={texto} size={44} className="-my-4 inline-block align-middle" />;
  }
  return (
    <span role="img" aria-label={texto} className="flex flex-col items-center gap-1">
      <SiPlaystation aria-hidden="true" className="h-7 w-7" />
      <Letras aria-hidden="true" size={64} className="-my-6" />
    </span>
  );
}

/** Lo de adentro de la pestaña: la foto, "¡Gánate una" con el nombre corto (o "Sorteo") y el regalo. También en el panel */
export function CuerpoPestana({ foto, corto }: { foto: string | null; corto: string | null }) {
  return (
    <>
      {foto && (
        <span className="relative size-18 overflow-hidden rounded-xl">
          <Image src={foto} alt="" fill sizes="72px" className="scale-125 object-cover" />
        </span>
      )}
      <span className="flex flex-col items-center gap-1.5">
        <span className="text-xs font-semibold leading-tight text-brand-200">{corto ? <>¡Gánate<br />una</> : 'Sorteo'}</span>
        {corto && <NombreCorto nombre={corto} tamano="tab" />}
      </span>
      <span className="bandera-regalo flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
        <IconoRegalo className="h-5 w-5" aria-hidden="true" />
      </span>
    </>
  );
}

export default function BanderaSorteo({ titulo, premio, imagen, nombreCorto }: {
  titulo: string;
  premio: string;
  imagen: string | null;
  nombreCorto: string | null;
}) {
  const foto = fotoDelSorteo(imagen);
  const corto = nombreCorto?.trim() || null;
  const etiqueta = `${titulo}: gánate una ${premio}. Ver el sorteo`;

  return (
    <>
      {/* Pantallas anchas: la pestaña al borde izquierdo */}
      <div className="fixed left-0 top-1/2 z-[var(--z-sticky)] hidden -translate-y-1/2 min-[90rem]:block">
        <Link
          href="/sorteo"
          aria-label={etiqueta}
          className="bandera-entra relative flex w-24 flex-col items-center gap-2.5 overflow-hidden rounded-r-2xl bg-brand-700 pb-3.5 pl-2 pr-2.5 pt-2.5 text-center text-white shadow-xl ring-1 ring-white/15 transition-[padding] hover:pl-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none"
        >
          <Destello />
          <CuerpoPestana foto={foto} corto={corto} />
        </Link>
      </div>

      {/* Más angosto: la píldora de abajo a la izquierda, a la altura de WhatsApp (que va a la derecha) */}
      <Link
        href="/sorteo"
        aria-label={etiqueta}
        className="bandera-sube fixed bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] left-4 z-[var(--z-sticky)] flex max-w-[calc(100vw-6.5rem)] items-center gap-2.5 overflow-hidden rounded-full bg-brand-700 py-1.5 pl-1.5 pr-4 text-white shadow-lg ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 lg:bottom-6 lg:left-6 min-[90rem]:hidden"
      >
        <Destello />
        <span className="bandera-regalo flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500">
          <IconoRegalo className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-bold">{corto ? <>¡Gánate una <NombreCorto nombre={corto} tamano="pildora" />!</> : '¡Participa en el sorteo!'}</span>
          <span className="block truncate text-xs text-brand-200">{titulo}</span>
        </span>
      </Link>
    </>
  );
}
