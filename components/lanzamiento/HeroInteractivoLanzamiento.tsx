'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconoCarrito, IconoCerrar, IconoCheck, IconoDigital, IconoGarantia, IconoPagoMovil, IconoPlay, IconoVerificado,
} from '@/components/iconos';
import { avisarAgregado } from '@/components/onboarding/AvisoAgregado';
import { needsProductPage, type ProductCardData } from '@/components/ui/productCardData';
import { useCart } from '@/contexts/CartContext';
import { formatUSD, formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { EdicionLanzamiento } from '@/lib/queries/home';

const WORDMARK_BLANCO = '/images/brand/wordmark-blanco.png';

function logoPlataforma(plataforma: string): string | null {
  if (/ps5|playstation/i.test(plataforma)) return '/images/lanzamiento/logo-ps5.png';
  if (/xbox/i.test(plataforma)) return '/images/lanzamiento/logo-xbox.svg';
  return null;
}

function dividirMarcaTitulo(texto: string): { antes: string; tieneMarca: boolean; despues: string } {
  const match = /electro\s*shop/i.exec(texto);
  if (!match || match.index === undefined) return { antes: texto, tieneMarca: false, despues: '' };
  return {
    antes: texto.slice(0, match.index).trim(),
    tieneMarca: true,
    despues: texto.slice(match.index + match[0].length).trim(),
  };
}

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
  const partesTitulo = dividirMarcaTitulo(titulo);
  const etiquetaEdicion = ediciones[edicionIdx]?.plataforma;

  return (
    <>
      <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-6">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="tema-lanzamiento-eyebrow inline-flex items-center rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider">
              {eyebrow}
            </span>

            <div className="mt-2.5 flex flex-col items-center justify-center gap-2 sm:mt-3.5 sm:flex-row sm:items-center sm:gap-4 lg:justify-start">
              {logo && (
                <div className="relative h-16 w-24 shrink-0 sm:h-20 sm:w-28">
                  <Image src={logo} alt={titulo} fill sizes="112px" className="object-contain drop-shadow-md" priority />
                </div>
              )}
              {logo && <span className="hidden h-12 w-px shrink-0 bg-white/25 sm:block" aria-hidden="true" />}
              <div className="min-w-0">
                {partesTitulo.tieneMarca ? (
                  <h2
                    id="lanzamiento-title"
                    className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 tracking-tight text-white sm:gap-2 lg:justify-start"
                  >
                    {partesTitulo.antes && (
                      <span className="text-[17px] font-bold leading-none text-white sm:text-xl lg:text-[20px] xl:text-2xl">
                        {partesTitulo.antes}
                      </span>
                    )}
                    <Image
                      src={WORDMARK_BLANCO}
                      alt="Electro Shop"
                      width={262}
                      height={28}
                      className="h-[18px] w-auto translate-y-[1px] drop-shadow-sm sm:h-[21px] lg:h-[20px] xl:h-[25px]"
                      priority
                    />
                    {partesTitulo.despues && (
                      <span className="text-[17px] font-bold leading-none text-white sm:text-xl lg:text-[20px] xl:text-2xl">
                        {partesTitulo.despues}
                      </span>
                    )}
                  </h2>
                ) : (
                  <h2 id="lanzamiento-title" className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                    {titulo}
                  </h2>
                )}
              </div>
            </div>

            {subtitulo && (
              <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-snug text-white/95 sm:mt-3 sm:text-[15px] sm:leading-relaxed lg:mx-0">
                {subtitulo}
              </p>
            )}
          </div>

          {activo && (
            <div className="tema-lanzamiento-caja mx-auto mt-3.5 w-full max-w-xl rounded-2xl p-3.5 sm:mt-5 sm:p-5 lg:mx-0">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                  {ediciones.length > 1 && etiquetaEdicion
                    ? `Edición seleccionada · ${etiquetaEdicion}`
                    : isDigital
                      ? 'Edición digital oficial'
                      : 'Disponible en Electro Shop'}
                </p>

                <div className="mt-0.5 flex items-baseline justify-center gap-2.5 sm:mt-1">
                  <span className="text-3xl font-bold tracking-tight text-white tabular-nums sm:text-4xl">
                    {formatUSD(activo.priceUSD)}
                  </span>
                  {activo.compareAtPriceUSD && activo.compareAtPriceUSD > activo.priceUSD && (
                    <span className="text-sm text-white/75 line-through">{formatUSD(activo.compareAtPriceUSD)}</span>
                  )}
                </div>

                {exchangeRateVES ? (
                  <div className="mt-1.5 flex justify-center sm:mt-2">
                    <span className="tema-lanzamiento-bcv inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-medium">
                      {formatVES(activo.priceUSD * exchangeRateVES)} · Tasa BCV
                    </span>
                  </div>
                ) : null}

                <p className="tema-lanzamiento-stock mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold sm:mt-2.5">
                  <IconoCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{isDigital ? 'Código digital · Entrega rápida al confirmar' : agotado ? 'Agotado temporalmente' : 'Disponible para envío o retiro'}</span>
                </p>
              </div>

              {ediciones.length > 1 && (
                <div
                  role="group"
                  aria-label="Elegir plataforma"
                  className={`tema-edicion-track mt-3.5 rounded-xl p-1 ${ediciones.length === 2 ? 'grid grid-cols-2 gap-1' : 'flex flex-wrap justify-center gap-1'}`}
                >
                  {ediciones.map((ed, idx) => {
                    const platLogo = logoPlataforma(ed.plataforma);
                    return (
                      <button
                        key={ed.producto.id}
                        type="button"
                        aria-pressed={idx === edicionIdx}
                        onClick={() => setEdicionIdx(idx)}
                        className="tema-edicion-btn flex min-h-11 items-center justify-center rounded-lg px-3 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        {platLogo ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={platLogo}
                              alt=""
                              aria-hidden="true"
                              className="tema-plat-logo h-5 w-auto max-w-[130px] object-contain sm:h-[22px]"
                            />
                            <span className="sr-only">{ed.plataforma}</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold">{ed.plataforma}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className={`mt-3 grid gap-2.5 sm:mt-4 ${trailerYoutubeId ? 'grid-cols-2 lg:grid-cols-12' : 'grid-cols-1 sm:grid-cols-12'}`}>
                {conVariantes ? (
                  <Link
                    href={`/productos/${activo.slug}`}
                    className={`tema-lanzamiento-cta inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${trailerYoutubeId ? 'col-span-2 lg:col-span-7' : 'sm:col-span-7'}`}
                  >
                    Elegir edición
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={agotado}
                    onClick={agregarActivo}
                    className={`tema-lanzamiento-cta inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${trailerYoutubeId ? 'col-span-2 lg:col-span-7' : 'sm:col-span-7'}`}
                  >
                    <IconoCarrito className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {agotado ? 'Agotado' : 'Comprar ahora'}
                  </button>
                )}

                {trailerYoutubeId && (
                  <button
                    type="button"
                    onClick={() => setTrailerOpen(true)}
                    className="tema-lanzamiento-sec col-span-1 inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <IconoPlay lleno className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Ver tráiler
                  </button>
                )}

                <Link
                  href={`/productos/${activo.slug}`}
                  className={`tema-lanzamiento-sec inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${trailerYoutubeId ? 'col-span-1 h-11 lg:col-span-5 lg:h-12' : 'h-12 sm:col-span-5'}`}
                >
                  Ver ficha
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3.5 text-center text-[11px] font-medium leading-tight text-white/90">
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-1.5">
                  {isDigital ? (
                    <IconoDigital className="h-3.5 w-3.5 shrink-0 text-white/85" aria-hidden="true" />
                  ) : (
                    <IconoGarantia className="h-3.5 w-3.5 shrink-0 text-white/85" aria-hidden="true" />
                  )}
                  <span>{isDigital ? 'Código original' : 'Garantía real'}</span>
                </div>
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-1.5">
                  <IconoPagoMovil className="h-3.5 w-3.5 shrink-0 text-white/85" aria-hidden="true" />
                  <span>Pago Móvil · BCV</span>
                </div>
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-1.5">
                  <IconoVerificado className="h-3.5 w-3.5 shrink-0 text-white/85" aria-hidden="true" />
                  <span>Soporte en VE</span>
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
