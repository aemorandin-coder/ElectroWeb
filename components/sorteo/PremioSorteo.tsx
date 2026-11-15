// C-221: el premio del sorteo, la pieza fuerte de /sorteo (C-212). Lo usan la página y la vista previa del panel
// (`compacto`, dentro del teléfono), para que lo que se revisa antes de publicar sea lo mismo que ve el cliente.
// C-247 (el equipo, 15/11, eligió la A viendo la maqueta): la foto del premio, más grande y sin fondo blanco, para que una
// foto hecha sobre el azul de la franja quede parada en ella.
// C-253 (el equipo, 15/11, eligió la C2 viendo las maquetas: "más atractivo, muy organizado"):
// - arriba, el nombre grande con "Gana una" encima, el sello ("¡Lista para jugar!") y la etiqueta (lo que va entre paréntesis
//   en el premio, "Remanufacturada");
// - los días que faltan junto al envío gratis, y "Quiero mi boleto", que baja a Cómo participar;
// - la foto a la derecha, limpia: sus bordes se funden con la franja (ya no se ve el cuadro);
// - abajo, de lado a lado, "Lo que trae" con su ícono, separado por líneas. Nada encima de la foto ("sin ensuciarla").
// Sin hooks: sirve en Server y en Client Components.
import Image from 'next/image';
import { IconoCalendario, IconoEnvio, IconoFlechaAbajo, IconoImagen, IconoPlay, IconoPremio, IconoRegalo } from '@/components/iconos';
import Container from '@/components/ui/Container';
import { iconoDeCosa } from '@/components/sorteo/iconosQueTrae';
import { partesDelPremio, type CosaQueTrae } from '@/lib/sorteo/premio';

/** Los días que faltan para una fecha (0 si ya pasó) */
export function diasHasta(fecha: Date): number {
  return Math.max(0, Math.ceil((fecha.getTime() - Date.now()) / 86_400_000));
}

export const diaLargo = (fecha: Date) => new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(fecha);

/** La foto se muestra solo si es de la tienda (una ruta propia) */
export const fotoDelSorteo = (imagen: string | null | undefined) => (imagen && imagen.startsWith('/') && !imagen.startsWith('//') ? imagen : null);

/** Los bordes de la foto se funden con la franja: una foto hecha sobre su azul no deja ver el cuadro */
const FUNDIDO = '[mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent),linear-gradient(to_bottom,transparent,black_9%,black_91%,transparent)] [mask-composite:intersect]';

export default function PremioSorteo({ titulo, premio, imagen, resultadoEl, sorteadoAt = null, incluye = [], lema = null, participar = false, compacto = false }: {
  titulo: string;
  premio: string;
  imagen: string | null;
  resultadoEl: Date;
  sorteadoAt?: Date | null;
  /** Lo que trae el premio: la franja de abajo */
  incluye?: CosaQueTrae[];
  /** El sello ("¡Lista para jugar!") */
  lema?: string | null;
  /** Mientras se puede participar: "Quiero mi boleto" baja a Cómo participar (#como-participar) */
  participar?: boolean;
  /** La vista previa del panel: el tamaño del teléfono y, sin foto, un hueco que avisa que falta */
  compacto?: boolean;
}) {
  const faltan = diasHasta(resultadoEl);
  const foto = fotoDelSorteo(imagen);
  const { nombre, etiqueta } = partesDelPremio(premio);
  const sello = lema?.trim() || null;

  if (compacto) {
    const cuando = sorteadoAt
      ? `Se sorteó el ${diaLargo(sorteadoAt)}.`
      : `Resultado el ${diaLargo(resultadoEl)}${faltan > 0 ? ` · faltan ${faltan} ${faltan === 1 ? 'día' : 'días'}` : ''}.`;
    return (
      <div className="overflow-hidden rounded-2xl bg-brand-700 text-white">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">{titulo || 'Título del sorteo'}</p>
          <p className="mt-1.5 text-xs font-semibold text-brand-200">Gana una</p>
          <p className="text-xl font-bold leading-tight text-balance">{nombre || '…'}</p>
          {(sello || etiqueta) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-100">
              {sello && <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 font-bold text-white"><IconoPlay className="h-3 w-3" aria-hidden="true" /> {sello}</span>}
              {etiqueta && <span>{etiqueta}</span>}
            </p>
          )}
          {foto ? (
            <div className="relative mt-3 aspect-square w-full">
              <Image src={foto} alt={premio} fill sizes="240px" className={`object-contain ${FUNDIDO}`} />
            </div>
          ) : (
            <div className="mt-3 flex aspect-[2/1] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/30 text-xs text-brand-200">
              <IconoImagen className="h-6 w-6" aria-hidden="true" /> Sin foto del premio
            </div>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-100">
            <IconoCalendario className="h-4 w-4 shrink-0" aria-hidden="true" /> {cuando}
          </p>
          <p className="mt-1 text-xs text-brand-200">Envío gratis: si ganas, por ZOOM a cualquier estado.</p>
        </div>
        {incluye.length > 0 && (
          <ul className="divide-y divide-white/10 border-t border-white/10 bg-white/5 px-4 py-1">
            {incluye.map((c, i) => {
              const Icono = iconoDeCosa(c.texto);
              return (
                <li key={`${i}-${c.texto}`} className="flex items-center gap-2 py-1.5 text-xs font-semibold">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500"><Icono className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  <span className="min-w-0">{c.texto}{c.detalle && <span className="block font-normal text-brand-200">{c.detalle}</span>}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="sorteo-titulo" className="bg-brand-700 text-white">
      <Container className="grid items-center gap-x-10 gap-y-6 py-10 lg:grid-cols-[minmax(0,1fr)_30rem] lg:py-12">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2.5 pr-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-100 ring-1 ring-inset ring-white/20">
            <IconoRegalo className="h-4 w-4 text-white" aria-hidden="true" /> {titulo}
          </p>
          <h1 id="sorteo-titulo" className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-balance lg:text-6xl">
            <span className="mb-1.5 block text-xl font-semibold tracking-normal text-brand-200 lg:text-3xl">Gana una</span>
            {nombre}
          </h1>
          {(sello || etiqueta) && (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-brand-100">
              {sello && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-1.5 text-sm font-bold text-white">
                  <IconoPlay className="h-4 w-4" aria-hidden="true" /> {sello}
                </span>
              )}
              {etiqueta && <span>{etiqueta}</span>}
            </p>
          )}
        </div>

        {foto && (
          <div className="relative mx-auto aspect-square w-full max-w-[30rem] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Image src={foto} alt={premio} fill sizes="(min-width: 1024px) 480px, 100vw" className={`object-contain ${FUNDIDO}`} priority />
          </div>
        )}

        <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="flex max-w-xl flex-col overflow-hidden rounded-2xl ring-1 ring-inset ring-white/15 sm:flex-row">
            <div className="flex items-center gap-3.5 bg-white/10 px-5 py-4">
              {sorteadoAt ? (
                <>
                  <IconoPremio className="h-9 w-9 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">Ya se sorteó</span>
                    <span className="block text-sm text-brand-100">El {diaLargo(sorteadoAt)}</span>
                  </span>
                </>
              ) : faltan > 0 ? (
                <>
                  <span className="text-5xl font-bold leading-none tabular-nums">{faltan}</span>
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">{faltan === 1 ? 'día' : 'días'}</span>
                    <span className="block text-sm text-brand-100">Resultado el {diaLargo(resultadoEl)}</span>
                  </span>
                </>
              ) : (
                <>
                  <IconoCalendario className="h-9 w-9 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">Resultado</span>
                    <span className="block text-sm text-brand-100">El {diaLargo(resultadoEl)}</span>
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-col justify-center gap-0.5 px-5 py-4 text-sm text-brand-100">
              <span className="flex items-center gap-2 text-base font-semibold text-white"><IconoEnvio className="h-5 w-5" aria-hidden="true" /> Envío gratis</span>
              <span>Si ganas, por ZOOM a cualquier estado.</span>
            </div>
          </div>
          {participar && (
            <a
              href="#como-participar"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-brand-700 transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:w-auto"
            >
              Quiero mi boleto <IconoFlechaAbajo className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
        </div>
      </Container>

      {incluye.length > 0 && (
        <div className="border-t border-white/10 bg-white/5">
          <Container className="py-4 lg:flex lg:items-center lg:py-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300 lg:w-28 lg:shrink-0">Lo que trae</h2>
            <ul className="mt-2 divide-y divide-white/10 lg:mt-0 lg:flex lg:flex-1 lg:divide-x lg:divide-y-0">
              {incluye.map((c, i) => {
                const Icono = iconoDeCosa(c.texto);
                return (
                  <li key={`${i}-${c.texto}`} className="flex min-w-0 items-center gap-3 py-2.5 lg:flex-1 lg:px-5 lg:py-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500"><Icono className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="min-w-0 text-sm font-semibold leading-snug lg:text-base">
                      {c.texto}
                      {c.detalle && <span className="block text-sm font-normal text-brand-200">{c.detalle}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Container>
        </div>
      )}
    </section>
  );
}
