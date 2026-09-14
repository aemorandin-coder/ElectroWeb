'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: string[];
  name: string;
  /** Etiquetas (descuento, digital) arriba a la izquierda */
  badges?: ReactNode;
  /** Botones (favorito, compartir) arriba a la derecha */
  actions?: ReactNode;
}

/**
 * Galería del producto. Las fotos van en una fila con scroll-snap: en el teléfono se desliza con el dedo
 * y en escritorio se cambia con las miniaturas. Sin dependencias ni efectos de zoom.
 */
export default function ProductGallery({ images, name, badges, actions }: ProductGalleryProps) {
  const list = images.length > 0 ? images : ['/images/no-image.png'];
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
    setActive(index);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-white">
        <ul
          ref={trackRef}
          aria-label={`Fotos de ${name}`}
          onScroll={(event) => {
            const track = event.currentTarget;
            const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
            if (index !== active) setActive(index);
          }}
          className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto"
        >
          {list.map((src, index) => (
            <li key={`${src}-${index}`} className="relative aspect-[4/3] w-full shrink-0 snap-center lg:aspect-square">
              <Image
                src={src}
                alt={list.length > 1 ? `${name}, foto ${index + 1} de ${list.length}` : name}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-3 lg:p-8"
              />
            </li>
          ))}
        </ul>
        {badges && <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1">{badges}</div>}
        {actions && <div className="absolute right-3 top-3 flex flex-col gap-2">{actions}</div>}
        {list.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {list.map((_, index) => (
              <span key={index} className={`h-1.5 rounded-full transition-all ${index === active ? 'w-5 bg-brand-500' : 'w-1.5 bg-ink/25'}`} />
            ))}
          </div>
        )}
      </div>

      {list.length > 1 && (
        <ul className="mt-3 hidden gap-2 lg:flex" aria-label="Elegir foto">
          {list.slice(0, 8).map((src, index) => (
            <li key={`thumb-${src}-${index}`}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ver foto ${index + 1}`}
                aria-pressed={index === active}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                  index === active ? 'border-brand-500' : 'border-line hover:border-brand-200'
                }`}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
