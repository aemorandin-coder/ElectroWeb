// C-254: el banner de /sorteo cuando ya hay ganador (el equipo eligió la B viendo las maquetas: "el banner cuenta quién
// ganó"). Quien toca la bandera del inicio cae justo en la persona, y en el teléfono la ve en la primera pantalla.
// - Con la entrega publicada (su permiso, su foto y su nombre): "¡Ya hay ganador!", su nombre en grande, de dónde es y
//   "Se llevó la PlayStation 4"; a la derecha su foto, que es la portada del video (VideoEntrega).
// - Sin la entrega (antes de publicarla o sin permiso): el correo tapado, la foto del premio y "Le escribimos al correo de
//   su cuenta para coordinar la entrega", como antes. Nada personal.
// - "Lo que trae" sigue abajo. Ya no dice "Gana una" ni "Si ganas…".
// Sin hooks: lo usan la página y la vista previa del panel (`compacto`).
// C-263 (el equipo, 15/11): "Ganó el boleto F3E-XEP de an***@gmail.com": el código del boleto que ganó, el mismo de los
// boletos épicos, para que cada participante lo compare con los suyos. Con la entrega publicada, sin el correo.
import Image from 'next/image';
import { IconoCalendario, IconoCupon, IconoPremio, IconoRegalo } from '@/components/iconos';
import { diaLargo, FranjaQueTrae, FUNDIDO, fotoDelSorteo, nombreConLogo } from '@/components/sorteo/PremioSorteo';
import VideoEntrega from '@/components/sorteo/VideoEntrega';
import Container from '@/components/ui/Container';
import type { GanadorPublico } from '@/lib/dto/sorteo';
import { partesDelPremio, type CosaQueTrae } from '@/lib/sorteo/premio';

export default function GanadorSorteo({ titulo, premio, imagen, nombreCorto = null, incluye = [], ganador, compacto = false }: {
  titulo: string;
  premio: string;
  imagen: string | null;
  nombreCorto?: string | null;
  incluye?: CosaQueTrae[];
  ganador: GanadorPublico;
  compacto?: boolean;
}) {
  const { nombre } = partesDelPremio(premio);
  const entrega = ganador.entrega;
  const fotoPremio = fotoDelSorteo(imagen);
  const quien = entrega?.nombre ?? ganador.correo;
  const sorteo = `Se sorteó el ${diaLargo(ganador.sorteadoAt)}`;
  const detalle = `Al azar${ganador.boletos ? `, entre ${ganador.boletos} boletos` : ''}. ${entrega ? 'Ya recibió su premio.' : 'Le escribimos al correo de su cuenta para coordinar la entrega.'}`;
  const llevo = <>{entrega?.ciudad ? `De ${entrega.ciudad}. ` : ''}Se llevó la <span className="font-semibold text-white">{nombreConLogo(nombre, nombreCorto)}</span></>;
  const boleto = ganador.codigo
    ? <>Ganó el boleto <span className="tracking-wider text-white">{ganador.codigo}</span>{!entrega && ganador.correo ? ` de ${ganador.correo}` : ''}</>
    : null;

  if (compacto) {
    return (
      <div className="overflow-hidden rounded-2xl bg-brand-700 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">{titulo}</p>
        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-200"><IconoPremio className="h-3.5 w-3.5 text-white" aria-hidden="true" /> ¡Ya hay ganador!</p>
        {quien && <p className={`font-bold leading-tight ${entrega ? 'text-2xl' : 'text-lg [overflow-wrap:anywhere]'}`}>{quien}</p>}
        <p className="mt-0.5 text-xs text-brand-100">{llevo}</p>
        {boleto && <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-100"><IconoCupon className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" /> <span className="[overflow-wrap:anywhere]">{boleto}</span></p>}
        <div className="mt-3">
          {entrega ? <VideoEntrega foto={entrega.foto} nombre={entrega.nombre} video={entrega.video} compacto />
            : fotoPremio && <div className="relative aspect-square w-full"><Image src={fotoPremio} alt="" fill sizes="240px" className={`object-contain ${FUNDIDO}`} /></div>}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-100"><IconoCalendario className="h-4 w-4 shrink-0" aria-hidden="true" /> {sorteo}.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="sorteo-titulo" className="bg-brand-700 text-white">
      <Container className={`grid items-center gap-x-10 gap-y-6 py-10 lg:py-12 ${entrega ? 'lg:grid-cols-[minmax(0,1fr)_26rem]' : 'lg:grid-cols-[minmax(0,1fr)_30rem]'}`}>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2.5 pr-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-100 ring-1 ring-inset ring-white/20">
            <IconoRegalo className="h-4 w-4 text-white" aria-hidden="true" /> {titulo}
          </p>
          <h1 id="sorteo-titulo" className="mt-4 font-bold leading-[1.05] tracking-tight">
            <span className={`flex items-center gap-2 font-semibold tracking-normal ${quien ? 'mb-2 text-xl text-brand-200 lg:text-3xl' : 'text-4xl lg:text-6xl'}`}>
              <IconoPremio className={quien ? 'h-6 w-6 shrink-0 text-white lg:h-8 lg:w-8' : 'h-9 w-9 shrink-0 lg:h-12 lg:w-12'} aria-hidden="true" /> ¡Ya hay ganador!
            </span>
            {quien && <span className={`block ${entrega ? 'text-5xl lg:text-7xl' : 'text-4xl [overflow-wrap:anywhere] lg:text-6xl'}`}>{quien}</span>}
          </h1>
          <p className="mt-4 text-lg leading-snug text-brand-100 lg:text-2xl">{llevo}</p>
          {boleto && (
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/10 py-1.5 pl-3 pr-4 text-sm font-semibold text-brand-100 ring-1 ring-inset ring-white/20 lg:rounded-full lg:text-base">
              <IconoCupon className="h-5 w-5 shrink-0 text-white" aria-hidden="true" /> <span className="[overflow-wrap:anywhere]">{boleto}</span>
            </p>
          )}
        </div>

        {entrega ? (
          <div className="mx-auto w-full max-w-[26rem] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <VideoEntrega foto={entrega.foto} nombre={entrega.nombre} video={entrega.video} />
          </div>
        ) : fotoPremio && (
          <div className="relative mx-auto aspect-square w-full max-w-[30rem] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Image src={fotoPremio} alt={premio} fill sizes="(min-width: 1024px) 480px, 100vw" className={`object-contain ${FUNDIDO}`} priority />
          </div>
        )}

        <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="flex max-w-xl items-center gap-3.5 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-inset ring-white/15">
            <IconoCalendario className="h-9 w-9 shrink-0" aria-hidden="true" />
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">{sorteo}</span>
              <span className="block text-sm text-brand-100">{detalle}</span>
            </span>
          </div>
        </div>
      </Container>
      <FranjaQueTrae incluye={incluye} />
    </section>
  );
}
