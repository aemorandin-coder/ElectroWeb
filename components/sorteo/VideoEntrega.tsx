'use client';

// C-254: la foto de la entrega, que es también la portada del video (el equipo eligió que el video se abra en la misma
// página). Hasta que alguien toca el play, la página no le pide nada a YouTube: va la foto de la tienda. Al tocarlo, el
// reproductor sin cookies (youtube-nocookie, que el CSP ya permite) ocupa su lugar. Un Short se ve vertical; un video
// normal, apaisado.
import Image from 'next/image';
import { useState } from 'react';
import { IconoPlay, IconoVideo } from '@/components/iconos';
import { reproductorYoutube, type VideoYoutube } from '@/lib/youtube';

export default function VideoEntrega({ foto, nombre, video, compacto = false }: {
  foto: string;
  nombre: string;
  video: VideoYoutube | null;
  /** La vista previa del panel: más chica y sin abrir el video */
  compacto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (abierto && video) {
    return (
      <div className={`relative w-full overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/20 ${video.vertical ? 'aspect-[4/5]' : 'aspect-video'}`}>
        <iframe
          src={reproductorYoutube(video.id)}
          title={`El video de la entrega a ${nombre}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className={`relative aspect-[4/5] w-full overflow-hidden bg-brand-700 ring-1 ring-white/20 ${compacto ? 'rounded-xl' : 'rounded-3xl shadow-2xl'}`}>
      <Image src={foto} alt={`${nombre} con su premio`} fill sizes={compacto ? '240px' : '(min-width: 1024px) 416px, 100vw'} className="object-cover" priority={!compacto} />
      {video && compacto && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-xl ring-4 ring-white/25">
            <IconoPlay lleno className="h-5 w-5 translate-x-0.5" />
          </span>
        </span>
      )}
      {video && !compacto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label={`Ver el video de la entrega a ${nombre}`}
          className="group absolute inset-0 flex items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-700 shadow-xl ring-8 ring-white/25 transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none lg:h-20 lg:w-20">
            <IconoPlay lleno aria-hidden="true" className="h-7 w-7 translate-x-0.5 lg:h-8 lg:w-8" />
          </span>
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
            <IconoVideo className="h-4 w-4" aria-hidden="true" /> Mira su video
          </span>
        </button>
      )}
    </div>
  );
}
