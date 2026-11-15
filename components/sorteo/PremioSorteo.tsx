// C-221: el premio del sorteo en azul noche, la pieza fuerte de /sorteo (C-212). Lo usan la página y la vista previa del
// panel (`compacto`, dentro del teléfono), para que lo que se revisa antes de publicar sea lo mismo que ve el cliente.
// C-247 (el equipo, 15/11, eligió la A viendo la maqueta): la foto del premio, más grande (28 rem) y sin fondo blanco, para
// que una foto hecha sobre el azul de la franja quede parada en ella, sin un cuadro alrededor. Una foto de fondo blanco
// se sigue viendo como una tarjeta blanca.
// Sin hooks: sirve en Server y en Client Components.
import Image from 'next/image';
import { IconoCalendario, IconoImagen } from '@/components/iconos';
import Container from '@/components/ui/Container';

/** Los días que faltan para una fecha (0 si ya pasó) */
export function diasHasta(fecha: Date): number {
  return Math.max(0, Math.ceil((fecha.getTime() - Date.now()) / 86_400_000));
}

export const diaLargo = (fecha: Date) => new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(fecha);

/** La foto se muestra solo si es de la tienda (una ruta propia) */
export const fotoDelSorteo = (imagen: string | null | undefined) => (imagen && imagen.startsWith('/') && !imagen.startsWith('//') ? imagen : null);

export default function PremioSorteo({ titulo, premio, imagen, resultadoEl, sorteadoAt = null, compacto = false }: {
  titulo: string;
  premio: string;
  imagen: string | null;
  resultadoEl: Date;
  sorteadoAt?: Date | null;
  /** La vista previa del panel: el tamaño del teléfono y, sin foto, un hueco que avisa que falta */
  compacto?: boolean;
}) {
  const faltan = diasHasta(resultadoEl);
  const foto = fotoDelSorteo(imagen);
  const cuando = sorteadoAt
    ? `Se sorteó el ${diaLargo(sorteadoAt)}.`
    : `Resultado el ${diaLargo(resultadoEl)}${faltan > 0 ? ` · faltan ${faltan} ${faltan === 1 ? 'día' : 'días'}` : ''}.`;

  if (compacto) {
    return (
      <div className="rounded-2xl bg-brand-700 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">{titulo || 'Título del sorteo'}</p>
        <p className="mt-1.5 text-xl font-bold leading-tight text-balance">Gana una {premio || '…'}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-100">
          <IconoCalendario className="h-4 w-4 shrink-0" aria-hidden="true" /> {cuando}
        </p>
        <p className="mt-1 text-xs text-brand-200">Si ganas, te lo enviamos sin costo por ZOOM a cualquier estado.</p>
        {foto ? (
          <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-xl bg-white">
            <Image src={foto} alt={premio} fill sizes="240px" className="object-contain" />
          </div>
        ) : (
          <div className="mt-3 flex aspect-[2/1] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/30 text-xs text-brand-200">
            <IconoImagen className="h-6 w-6" aria-hidden="true" /> Sin foto del premio
          </div>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="sorteo-titulo" className="bg-brand-700 text-white">
      <Container className="grid items-center gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:py-14">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-200">{titulo}</p>
          <h1 id="sorteo-titulo" className="mt-2 text-3xl font-bold leading-tight text-balance lg:text-5xl">Gana una {premio}</h1>
          <p className="mt-4 flex items-center gap-2 text-base text-brand-100">
            <IconoCalendario className="h-5 w-5 shrink-0" aria-hidden="true" />
            {cuando}
          </p>
          <p className="mt-2 text-sm text-brand-200">Si ganas, te lo enviamos sin costo por ZOOM a cualquier estado.</p>
        </div>
        {foto && (
          <div className="relative aspect-square w-full max-w-[28rem] overflow-hidden rounded-2xl">
            <Image src={foto} alt={premio} fill sizes="(min-width: 1024px) 448px, 100vw" className="object-contain" priority />
          </div>
        )}
      </Container>
    </section>
  );
}
