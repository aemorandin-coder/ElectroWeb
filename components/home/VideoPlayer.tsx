'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  videoId: string;
}

export default function VideoPlayer({ videoId }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video relative mx-auto w-full max-w-4xl border border-white/20 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl overflow-hidden border border-white/20 bg-black/50 backdrop-blur-sm shadow-2xl aspect-video relative mx-auto group cursor-pointer max-w-4xl"
      onClick={() => setIsPlaying(true)}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 group-hover:bg-black/20 z-10">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(220,38,38,0.6)] mb-3">
          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="text-white font-bold tracking-wide drop-shadow-md">Haz clic para reproducir</span>
      </div>
      {/* Fallback image background before playing */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1a3b7e] to-[#2a63cd]" />
    </div>
  );
}
