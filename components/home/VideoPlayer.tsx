'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  videoId?: string;
  videoUrl?: string;
}

export default function VideoPlayer({ videoId, videoUrl }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  function getYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const resolvedVideoId = videoUrl ? getYoutubeVideoId(videoUrl) : videoId;

  if (!resolvedVideoId) return null;

  if (isPlaying) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video relative mx-auto w-full max-w-4xl border border-white/20 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${resolvedVideoId}?autoplay=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${resolvedVideoId}/maxresdefault.jpg`;

  return (
    <div 
      className="rounded-2xl overflow-hidden border border-white/20 bg-black/50 backdrop-blur-sm shadow-2xl aspect-video relative mx-auto group cursor-pointer max-w-4xl"
      onClick={() => setIsPlaying(true)}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 group-hover:bg-black/25 z-10">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(220,38,38,0.6)] mb-3">
          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="text-white font-bold tracking-wide drop-shadow-md">Haz clic para reproducir</span>
      </div>
      <img
        src={thumbnailUrl}
        alt="Video thumbnail"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-70 group-hover:opacity-85 transition-opacity"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg`;
        }}
      />
    </div>
  );
}
