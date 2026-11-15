// C-253: la bandera del sorteo en el inicio (el equipo, 15/11: "¿y si en home le colocamos una bandera con 'Gánate una
// PS4', animada?", con un dibujo de una pestaña al borde izquierdo). Eligió la A1 viendo las maquetas: la pestaña angosta con
// la foto del premio, "¡Gánate una" y el logo oficial de PS4 (pidió el logo en vez del texto), y el regalo.
// - En pantallas anchas (desde 1440 px), pegada al borde izquierdo a media altura, en el margen que dejan los productos.
//   Más angosto que eso, la pestaña taparía los productos: va la píldora de abajo a la izquierda, frente a WhatsApp.
// - Entra una sola vez: se desliza desde el borde, da dos destellos, el regalo se mueve y se queda quieta. La tienda no
//   tiene animaciones que se repitan sin parar, y con "reducir movimiento" no se anima.
// C-254 (la semana del ganador; el equipo eligió la B viendo las maquetas): la misma pieza cambia con el sorteo
// (lib/sorteo/entrega.ts decide la etapa y lib/dto/sorteo.ts lo que sale):
// - cerrado: "Resultado el 20 de diciembre" (el día, "¡Hoy!"), con el calendario que pasa la hoja;
// - sorteado: "¡Ya hay ganador!" con la foto del premio y la medalla que salta;
// - con la entrega publicada: la foto de la persona (con el play si hay video) y "¡Ganó una PS4!"; la píldora dice su nombre.
// Sin hooks: un Server Component.
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiPlaystation, SiPlaystation4, SiPlaystation5 } from 'react-icons/si';
import { IconoCalendario, IconoPlay, IconoPremio, IconoRegalo, type IconType } from '@/components/iconos';
import { diaLargo, fotoDelSorteo } from '@/components/sorteo/PremioSorteo';
import type { BanderaPublica } from '@/lib/dto/sorteo';
import type { EtapaBandera } from '@/lib/sorteo/entrega';
import { logoDelNombreCorto } from '@/lib/sorteo/premio';

/** El destello que cruza la bandera dos veces. Quieto e invisible si no se anima */
function Destello() {
  return <span aria-hidden="true" className="bandera-brillo pointer-events-none absolute -inset-y-4 left-0 w-1/2 bg-linear-to-r from-transparent via-white/35 to-transparent opacity-0" />;
}

/** "PS4" con el logo oficial (el símbolo de PlayStation y su logotipo), o el nombre corto escrito */
function NombreCorto({ nombre, tamano }: { nombre: string; tamano: 'tab' | 'chico' | 'pildora' }) {
  const logo = logoDelNombreCorto(nombre);
  if (!logo) return <span className={tamano === 'pildora' ? '' : tamano === 'tab' ? 'text-2xl font-bold leading-none' : 'text-lg font-bold leading-none'}>{nombre}</span>;
  const Letras = logo === 'ps4' ? SiPlaystation4 : SiPlaystation5;
  const texto = logo === 'ps4' ? 'PS4' : 'PS5';
  if (tamano === 'pildora') {
    // En la línea del texto: solo el logotipo, recortado a su alto
    return <Letras role="img" aria-label={texto} size={44} className="-my-4 inline-block align-middle" />;
  }
  // C-254: el chico va debajo de "¡Ya hay ganador!", que es lo que manda
  return (
    <span role="img" aria-label={texto} className={`flex flex-col items-center ${tamano === 'tab' ? 'gap-1' : 'gap-0.5'}`}>
      <SiPlaystation aria-hidden="true" className={tamano === 'tab' ? 'h-7 w-7' : 'h-5 w-5'} />
      <Letras aria-hidden="true" size={tamano === 'tab' ? 64 : 50} className={tamano === 'tab' ? '-my-6' : '-my-[1.2rem]'} />
    </span>
  );
}

/** La placa de abajo: el regalo (abierto), el calendario (cerrado) o la medalla (ya hay ganador), cada uno con su gesto */
function Placa({ icono: Icono, gesto, redonda = false }: { icono: IconType; gesto: string; redonda?: boolean }) {
  return (
    <span className={`${gesto} flex h-9 w-9 shrink-0 items-center justify-center bg-brand-500 ${redonda ? 'rounded-full' : 'rounded-xl'}`}>
      <Icono className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

const PLACA: Record<EtapaBandera, { icono: IconType; gesto: string }> = {
  abierto: { icono: IconoRegalo, gesto: 'bandera-regalo' },
  espera: { icono: IconoCalendario, gesto: 'bandera-hoja' },
  hoy: { icono: IconoCalendario, gesto: 'bandera-hoja' },
  pronto: { icono: IconoCalendario, gesto: 'bandera-hoja' },
  ganador: { icono: IconoPremio, gesto: 'bandera-medalla' },
};

/** El play chico en la esquina de la foto de la persona: hay video */
function PlayChico({ grande }: { grande: boolean }) {
  return (
    <span aria-hidden="true" className={`absolute flex items-center justify-center rounded-full bg-white text-brand-700 ring-2 ring-brand-700 ${grande ? '-bottom-1.5 -right-1.5 h-6 w-6' : '-bottom-1 -right-1 h-4 w-4'}`}>
      <IconoPlay lleno className={grande ? 'h-3 w-3 translate-x-px' : 'h-2.5 w-2.5'} />
    </span>
  );
}

/** Dos líneas: la chica arriba (en el azul claro) y la grande abajo */
function Palabras({ arriba, abajo, grande = false }: { arriba: ReactNode; abajo: ReactNode; grande?: boolean }) {
  return (
    <span className="flex flex-col items-center">
      <span className="text-xs font-semibold leading-tight text-brand-200">{arriba}</span>
      <span className={grande ? 'mt-0.5 text-[2rem] font-bold leading-none tabular-nums' : 'text-[0.9375rem] font-bold leading-tight'}>{abajo}</span>
    </span>
  );
}

/**
 * Lo de adentro de la pestaña: la foto (del premio o, con la entrega, de la persona), lo que dice la etapa y su placa.
 * También en el panel (el paso "Lo que trae" del sorteo y la vista previa de la entrega).
 */
export function CuerpoPestana({ foto, corto, etapa = 'abierto', resultadoEl = null, persona = null }: {
  foto: string | null;
  corto: string | null;
  etapa?: EtapaBandera;
  resultadoEl?: Date | null;
  /** C-254: la persona, con la entrega publicada */
  persona?: { foto: string; video: boolean } | null;
}) {
  const placa = PLACA[etapa];
  let texto: ReactNode;
  if (etapa === 'abierto' || (etapa === 'ganador' && persona && corto)) {
    // "¡Gánate una PS4!" o, con la persona, "¡Ganó una PS4!" (la misma pieza, otro verbo)
    const verbo = etapa === 'abierto' ? '¡Gánate' : '¡Ganó';
    texto = (
      <span className="flex flex-col items-center gap-1.5">
        <span className="text-xs font-semibold leading-tight text-brand-200">{corto ? <>{verbo}<br />una</> : 'Sorteo'}</span>
        {corto && <NombreCorto nombre={corto} tamano="tab" />}
      </span>
    );
  } else if (etapa === 'ganador') {
    texto = (
      <>
        <Palabras arriba="¡Ya hay" abajo="ganador!" />
        {corto && <NombreCorto nombre={corto} tamano="chico" />}
      </>
    );
  } else if (etapa === 'espera' && resultadoEl) {
    const dia = new Intl.DateTimeFormat('es-VE', { day: 'numeric', timeZone: 'America/Caracas' }).format(resultadoEl);
    const mes = new Intl.DateTimeFormat('es-VE', { month: 'short', timeZone: 'America/Caracas' }).format(resultadoEl);
    texto = <Palabras arriba="Resultado" abajo={<>{dia}<span className="block text-xs font-semibold text-brand-200">de {mes}</span></>} grande />;
  } else {
    texto = <Palabras arriba={etapa === 'pronto' ? 'El ganador' : 'Resultado'} abajo={etapa === 'pronto' ? '¡Pronto!' : '¡Hoy!'} />;
  }

  return (
    <>
      {persona ? (
        <span className="bandera-foto relative size-18 shrink-0">
          <span className="absolute inset-0 overflow-hidden rounded-xl ring-1 ring-white/30">
            <Image src={persona.foto} alt="" fill sizes="72px" className="object-cover" />
          </span>
          {persona.video && <PlayChico grande />}
        </span>
      ) : foto && (
        <span className="relative size-18 overflow-hidden rounded-xl">
          <Image src={foto} alt="" fill sizes="72px" className="scale-125 object-cover" />
        </span>
      )}
      {texto}
      <Placa icono={placa.icono} gesto={placa.gesto} />
    </>
  );
}

/** Lo que dicen la píldora (dos líneas) y el lector de pantalla, según la etapa */
function textos(b: BanderaPublica, corto: string | null): { linea1: ReactNode; linea2: string; etiqueta: string } {
  const dia = diaLargo(b.resultadoEl);
  switch (b.etapa) {
    case 'abierto':
      return { linea1: corto ? <>¡Gánate una <NombreCorto nombre={corto} tamano="pildora" />!</> : '¡Participa en el sorteo!', linea2: b.titulo, etiqueta: `${b.titulo}: gánate una ${b.premio}. Ver el sorteo` };
    case 'espera':
      return { linea1: `Resultado el ${dia}`, linea2: `${b.titulo} · ya cerró`, etiqueta: `${b.titulo}: el resultado es el ${dia}. Ver el sorteo` };
    case 'hoy':
      return { linea1: 'Hoy sale el ganador', linea2: b.titulo, etiqueta: `${b.titulo}: hoy sale el ganador. Ver el sorteo` };
    case 'pronto':
      return { linea1: 'El ganador, muy pronto', linea2: b.titulo, etiqueta: `${b.titulo}: el ganador sale muy pronto. Ver el sorteo` };
    default:
      if (b.persona) {
        const nombre = b.persona.nombre;
        return {
          linea1: corto ? <>¡{nombre} ganó una <NombreCorto nombre={corto} tamano="pildora" />!</> : `¡${nombre} ganó!`,
          linea2: b.persona.video ? `${b.titulo} · mira su video` : b.titulo,
          etiqueta: `${b.titulo}: ${nombre} ganó la ${b.premio}. Ver la entrega`,
        };
      }
      return { linea1: '¡Ya hay ganador!', linea2: `${b.titulo} · mira quién ganó`, etiqueta: `${b.titulo}: ya hay ganador. Ver quién ganó` };
  }
}

export default function BanderaSorteo({ bandera }: { bandera: BanderaPublica }) {
  const foto = fotoDelSorteo(bandera.imagen);
  const corto = bandera.nombreCorto;
  const { linea1, linea2, etiqueta } = textos(bandera, corto);
  const placa = PLACA[bandera.etapa];

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
          <CuerpoPestana foto={foto} corto={corto} etapa={bandera.etapa} resultadoEl={bandera.resultadoEl} persona={bandera.persona} />
        </Link>
      </div>

      {/* Más angosto: la píldora de abajo a la izquierda, a la altura de WhatsApp (que va a la derecha) */}
      <Link
        href="/sorteo"
        aria-label={etiqueta}
        className="bandera-sube fixed bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] left-4 z-[var(--z-sticky)] flex max-w-[calc(100vw-6.5rem)] items-center gap-2.5 overflow-hidden rounded-full bg-brand-700 py-1.5 pl-1.5 pr-4 text-white shadow-lg ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 lg:bottom-6 lg:left-6 min-[90rem]:hidden"
      >
        <Destello />
        {bandera.persona ? (
          <span className="relative h-9 w-9 shrink-0">
            <span className="absolute inset-0 overflow-hidden rounded-full ring-1 ring-white/30">
              <Image src={bandera.persona.foto} alt="" fill sizes="36px" className="object-cover" />
            </span>
            {bandera.persona.video && <PlayChico grande={false} />}
          </span>
        ) : (
          <Placa icono={placa.icono} gesto={placa.gesto} redonda />
        )}
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-bold">{linea1}</span>
          <span className="block truncate text-xs text-brand-200">{linea2}</span>
        </span>
      </Link>
    </>
  );
}
