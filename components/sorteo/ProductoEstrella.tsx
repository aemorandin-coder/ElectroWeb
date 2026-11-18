// C-297: "Descubre el producto estrella" en /sorteo (Andrés, 18/11: "Producto estrella con pack de boletos; seleccionamos
// uno a la semana"). El producto que eligió el equipo para esta semana, con su foto, su precio, cuántos boletos da cada uno
// (además de los de la compra), cuántos da una compra con uno solo y hasta cuándo. Toda la tarjeta lleva a su ficha.
// Va en blanco con el borde azul: la pieza fuerte de la página es el premio (PLAN.md §1.1, una por pantalla).
// El equipo, 18/11 ("mucho scroll"): horizontal y compacta, la foto al lado, también en el teléfono.
import Image from 'next/image';
import Link from 'next/link';
import { IconoChevronDerecha, IconoCupon, IconoEstrella, IconoReloj } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';
import type { EstrellaPublica } from '@/lib/sorteo/estrella';

const ZONA = 'America/Caracas';
/** "el domingo 22 de noviembre" */
const hastaEl = (iso: string) => new Intl.DateTimeFormat('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA }).format(new Date(iso));

export default function ProductoEstrella({ estrella }: { estrella: EstrellaPublica }) {
  const href = `/productos/${estrella.slug}`;
  const antes = estrella.antesUSD && estrella.antesUSD > estrella.precioUSD ? estrella.antesUSD : null;
  return (
    <section aria-labelledby="producto-estrella" id="estrella" className="scroll-mt-40">
      <h2 id="producto-estrella" className="text-xl font-bold text-ink lg:text-2xl">Descubre el producto estrella</h2>
      <article className="group relative mt-3 flex items-center gap-4 rounded-2xl border border-brand-200 bg-white p-3 transition-colors hover:border-brand-300 sm:p-4 lg:gap-6">
        <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36 lg:h-40 lg:w-40">
          {estrella.imagen && (
            <Image src={estrella.imagen} alt={estrella.nombre} fill sizes="(min-width: 1024px) 10rem, (min-width: 640px) 9rem, 7rem" className="rounded-xl object-contain" />
          )}
          <span className="absolute -left-1 -top-1 inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm ring-2 ring-white">
            <IconoCupon className="h-3.5 w-3.5" aria-hidden="true" /> +{estrella.boletos}
          </span>
        </div>
        <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-8">
          <div className="min-w-0 lg:flex-1">
            <p className="iconos-marca flex items-center gap-1.5 text-xs font-semibold text-brand-700">
              <IconoEstrella className="h-4 w-4" aria-hidden="true" /> Producto estrella de la semana
            </p>
            <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-ink lg:text-xl">
              <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-2 focus-visible:outline-brand-500">
                {estrella.nombre}
              </Link>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-bold text-ink">{formatUSD(estrella.precioUSD)}</span>
              {antes && <s className="text-sm text-muted">{formatUSD(antes)}</s>}
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-soft">
              <IconoReloj className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
              {estrella.agotado ? 'Se agotó: atento al de la próxima semana.' : <>Hasta el {hastaEl(estrella.hasta)}</>}
            </p>
          </div>
          {/* Lo que da, dicho con números: el del producto y el de una compra con uno solo */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink lg:mt-0 lg:shrink-0 lg:flex-col lg:items-start lg:gap-2">
            <p><span className="text-xl font-bold text-brand-700">+{estrella.boletos}</span> boletos por cada uno</p>
            <p><span className="text-xl font-bold text-brand-700">{estrella.conUno}</span> en una compra con uno</p>
            <span className="hidden items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700 sm:inline-flex" aria-hidden="true">
              Ver el producto <IconoChevronDerecha className="h-4 w-4" />
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}
