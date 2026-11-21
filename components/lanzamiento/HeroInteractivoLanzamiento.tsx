'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconoCarrito, IconoCerrar, IconoCheck, IconoPlay } from '@/components/iconos';
import { avisarAgregado } from '@/components/onboarding/AvisoAgregado';
import { needsProductPage, type ProductCardData } from '@/components/ui/productCardData';
import { useCart } from '@/contexts/CartContext';
import { formatUSD, formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { EdicionLanzamiento } from '@/lib/queries/home';

interface HeroInteractivoLanzamientoProps {
  eyebrow: string;
  titulo: string;
  subtitulo: string;
  logo: string | null;
  trailerYoutubeId: string | null;
  principal: ProductCardData | null;
  ediciones: EdicionLanzamiento[];
  exchangeRateVES?: number | null;
}

export default function HeroInteractivoLanzamiento({
  eyebrow,
  titulo,
  subtitulo,
  logo,
  trailerYoutubeId,
  principal,
  ediciones,
  exchangeRateVES,
}: HeroInteractivoLanzamientoProps) {
  const { addItem } = useCart();
  const [edicionIdx, setEdicionIdx] = useState(0);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [thumbFallback, setThumbFallback] = useState(false);

  useBodyScrollLock(trailerOpen);

  useEffect(() => {
    if (!trailerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTrailerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trailerOpen]);

  const activo = ediciones[edicionIdx]?.producto ?? principal;
  const imagenProducto = activo?.mainImage || activo?.images?.[0] || null;
  const isDigital = activo?.productType === 'DIGITAL';
  const agotado = activo ? !isDigital && activo.stock <= 0 : false;
  const conVariantes = activo ? needsProductPage(activo) : false;

  const agregarActivo = () => {
    if (!activo || conVariantes || agotado) return;
    addItem({
      id: activo.id,
      name: activo.name,
      price: activo.priceUSD,
      listPrice: activo.compareAtPriceUSD && activo.compareAtPriceUSD > activo.priceUSD ? activo.compareAtPriceUSD : undefined,
      imageUrl: imagenProducto || undefined,
      stock: isDigital ? 999 : activo.stock,
      productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
      weightKg: activo.weightKg ?? undefined,
      dimensions: activo.dimensions ?? undefined,
      isConsolidable: activo.isConsolidable !== false,
      shippingCost: activo.shippingCost ?? undefined,
      freeShipping: !isDigital && activo.freeShipping === true,
      origen: activo.despacho?.codigo,
      origenNombre: activo.despacho?.ciudad,
      origenEstado: activo.despacho?.estado,
      conditionBadge: activo.condition?.badge,
    });
    avisarAgregado(activo.name);
  };

  const thumbUrl = trailerYoutubeId
    ? `https://img.youtube.com/vi/${trailerYoutubeId}/${thumbFallback ? 'hqdefault' : 'maxresdefault'}.jpg`
    : null;

  return (
    <>
      <div className="grid items-center gap-5 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-6">
          <span className="tema-lanzamiento-eyebrow inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            {eyebrow}
          </span>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {logo && (
              <div className="relative h-20 w-28 shrink-0 sm:h-24 sm:w-32">
                <Image src={logo} alt={titulo} fill sizes="128px" className="object-contain drop-shadow-md" priority />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="lanzamiento-title" className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                {titulo}
              </h2>
              {subtitulo && (
                <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-white/95 sm:text-[15px]">
                  {subtitulo}
                </p>
              )}
            </div>
          </div>

          {activo && (
            <div className="tema-lanzamiento-caja mt-4 max-w-xl rounded-2xl p-4 sm:p-5">
              {ediciones.length > 1 && (
                <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Elegir plataforma">
                  <span className="text-xs font-semibold text-white/80">Plataforma:</span>
                  {ediciones.map((ed, idx) => (
                    <button
                      key={ed.producto.id}
                      type="button"
                      aria-pressed={idx === edicionIdx}
                      onClick={() => setEdicionIdx(idx)}
                      className="tema-edicion-btn rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      {ed.plataforma} · {formatUSD(ed.producto.priceUSD)}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {formatUSD(activo.priceUSD)}
                    </span>
                    {activo.compareAtPriceUSD && activo.compareAtPriceUSD > activo.priceUSD && (
                      <span className="text-sm text-white/75 line-through">{formatUSD(activo.compareAtPriceUSD)}</span>
                    )}
                  </div>
                  {exchangeRateVES ? (
                    <p className="mt-0.5 text-xs font-medium text-white/90 sm:text-sm">
                      {formatVES(activo.priceUSD * exchangeRateVES)} a tasa BCV
                    </p>
                  ) : null}
                  <p className="tema-lanzamiento-stock mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold">
                    <IconoCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {isDigital ? 'Código digital · Entrega rápida al confirmar' : agotado ? 'Agotado temporalmente' : 'Disponible para envío o retiro'}
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
                  {conVariantes ? (
                    <Link
                      href={`/productos/${activo.slug}`}
                      className="tema-lanzamiento-cta inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                    >
                      Elegir edición
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={agotado}
                      onClick={agregarActivo}
                      className="tema-lanzamiento-cta inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                    >
                      <IconoCarrito className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {agotado ? 'Agotado' : 'Comprar ahora'}
                    </button>
                  )}

                  {trailerYoutubeId && (
                    <button
                      type="button"
                      onClick={() => setTrailerOpen(true)}
                      className="tema-lanzamiento-sec inline-flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition sm:flex-initial lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <IconoPlay lleno className="h-3.5 w-3.5" aria-hidden="true" />
                      Ver tráiler
                    </button>
                  )}

                  <Link
                    href={`/productos/${activo.slug}`}
                    className="tema-lanzamiento-sec inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition sm:flex-initial focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Ver ficha
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 lg:col-span-6">
          {trailerYoutubeId && thumbUrl ? (
            <div className="relative mx-auto max-w-lg pb-3 sm:pl-4">
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                aria-label={`Reproducir tráiler de ${titulo}`}
                className="group relative block aspect-video w-full overflow-hidden rounded-2xl border-2 border-white/40 bg-ink shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={`Tráiler oficial de ${titulo}`}
                  onError={() => !thumbFallback && setThumbFallback(true)}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/30" aria-hidden="true" />
                <span className="pointer-events-none absolute left-3 right-3 top-3 flex items-center justify-between gap-2 text-xs font-semibold text-white">
                  <span className="rounded-full border border-white/25 bg-black/65 px-3 py-1">Tráiler oficial</span>
                  <span className="rounded-full border border-white/35 bg-brand-500 px-3 py-1 font-bold">Ver video</span>
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/80 text-white shadow-xl transition-transform duration-200 group-hover:scale-110 group-hover:bg-brand-500 sm:h-16 sm:w-16 motion-reduce:transition-none"
                >
                  <IconoPlay lleno className="ml-0.5 h-6 w-6 sm:h-7 sm:w-7" />
                </span>
              </button>
              {imagenProducto && (
                <div className="pointer-events-none absolute bottom-0 left-2 h-18 w-18 overflow-hidden rounded-xl border-2 border-white bg-white p-1 shadow-xl sm:left-0 sm:h-24 sm:w-24">
                  <Image src={imagenProducto} alt="" fill sizes="96px" className="rounded-lg object-contain" />
                </div>
              )}
            </div>
          ) : imagenProducto ? (
            <div className="relative mx-auto aspect-square w-60 overflow-hidden rounded-2xl border-2 border-white/40 bg-white p-4 shadow-2xl sm:w-72">
              <Image src={imagenProducto} alt={activo?.name || titulo} fill sizes="288px" className="object-contain p-3" priority />
            </div>
          ) : null}
        </div>
      </div>

      {trailerOpen && trailerYoutubeId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trailer-lanzamiento-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTrailerOpen(false);
          }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-ink text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 sm:px-5">
              <h3 id="trailer-lanzamiento-titulo" className="truncate text-sm font-bold sm:text-base">
                Tráiler oficial — {titulo}
              </h3>
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                aria-label="Cerrar tráiler"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                <IconoCerrar className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerYoutubeId}?autoplay=1&rel=0`}
                title={`Tráiler oficial de ${titulo}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
