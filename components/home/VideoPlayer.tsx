'use client';

import { useState } from 'react';
import { IconoPlay } from '@/components/iconos';
import { extraerYoutubeIdPortada } from '@/lib/portada';

interface VideoPlayerProps {
  videoId?: string;
  videoUrl?: string;
}

/** Reproductor de portada alineado al Kit 2.0 (miniatura + disparo accesible en YouTube nocookie). */
export default function VideoPlayer({ videoId, videoUrl }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fallbackThumb, setFallbackThumb] = useState(false);

  const resolvedVideoId = videoUrl ? extraerYoutubeIdPortada(videoUrl) : (videoId ?? null);

  if (!resolvedVideoId) return null;

  if (isPlaying) {
    return (
      <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-line-strong bg-brand-700">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${resolvedVideoId}?autoplay=1`}
          title="Reproductor de video de Electro Shop"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  const thumbnailUrl = fallbackThumb
    ? `https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg`
    : `https://img.youtube.com/vi/${resolvedVideoId}/maxresdefault.jpg`;

  return (
    <button
      type="button"
      onClick={() => setIsPlaying(true)}
      aria-label="Reproducir video"
      className="group relative mx-auto block aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-line-strong bg-brand-700 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura dinámica de YouTube por ID */}
      <img
        src={thumbnailUrl}
        alt="Miniatura del video"
        onError={() => {
          if (!fallbackThumb) setFallbackThumb(true);
        }}
        className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-brand-700/30 transition-colors group-hover:bg-brand-700/15" />
      <span className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-2.5 p-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white ring-4 ring-white/30 transition duration-200 group-hover:scale-105 group-hover:bg-brand-600 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <IconoPlay lleno className="ml-1 h-7 w-7" aria-hidden="true" />
        </span>
        <span className="rounded-full border border-white/25 bg-brand-700/85 px-3.5 py-1 text-xs font-semibold text-white">
          Reproducir video
        </span>
      </span>
    </button>
  );
}
