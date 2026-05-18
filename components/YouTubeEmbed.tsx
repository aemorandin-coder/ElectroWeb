'use client';

import { useState } from 'react';
import Image from 'next/image';

interface YouTubeEmbedProps {
  /** URL completa de YouTube (watch?v=, youtu.be/, o embed/) */
  videoUrl: string;
  /** Título descriptivo del video — requerido para accesibilidad */
  title?: string;
  className?: string;
}

/** Extrae el videoId de cualquier formato de URL de YouTube */
function extractVideoId(url: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com/watch?v=')) return url.split('v=')[1]?.split('&')[0] ?? null;
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0] ?? null;
  if (url.includes('youtube.com/embed/')) return url.split('/embed/')[1]?.split('?')[0] ?? null;
  return null;
}

/**
 * YouTubeEmbed — Lazy-loaded con poster thumbnail.
 *
 * Issue #15 fix: El iframe de YouTube carga ~500KB de JS en el primer render,
 * bloqueando el LCP. Esta versión muestra el thumbnail como imagen estática
 * y solo carga el iframe cuando el usuario hace click en el botón play.
 */
export default function YouTubeEmbed({ videoUrl, title = 'Video', className = '' }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  const videoId = extractVideoId(videoUrl);

  // Si no hay videoId válido, mostrar placeholder degradado
  if (!videoId) {
    return (
      <div
        className={`bg-gradient-to-br from-[#1a3b7e] to-[#2a63cd] ${className}`}
        aria-hidden="true"
      />
    );
  }

  const posterUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&showinfo=0&rel=0`;

  if (!loaded) {
    return (
      <div
        className={`relative overflow-hidden cursor-pointer group ${className}`}
        onClick={() => setLoaded(true)}
        role="button"
        aria-label={`Reproducir: ${title}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setLoaded(true)}
      >
        {/* Thumbnail como poster — zero iframe overhead */}
        <Image
          src={posterUrl}
          alt={title}
          fill
          className="object-cover"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 800px"
        />

        {/* Overlay oscuro en hover */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors duration-300" />

        {/* Botón play estilo YouTube */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600/90 group-hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <iframe
        className="w-full h-full"
        src={embedUrl}
        allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
        style={{ border: 'none' }}
      />
    </div>
  );
}
