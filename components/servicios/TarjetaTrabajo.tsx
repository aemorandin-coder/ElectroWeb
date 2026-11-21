'use client';

// La tarjeta de un trabajo en /servicios y lo que comparte con su ventana. C-249e: sale de ServiciosPortfolio para que el
// asistente del panel muestre la misma como vista previa.
import Image from 'next/image';
import { IconoEstrella, IconoPlay, IconoVideo } from '@/components/iconos';
import { formatRating } from '@/lib/currency';

export const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'CCTV', label: 'CCTV' },
  { value: 'REDES', label: 'Redes' },
  { value: 'POS', label: 'POS' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'CONSOLAS', label: 'Consolas' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
];

export const PLATFORM_BADGES: Record<string, { label: string; cls: string }> = {
  YOUTUBE: { label: 'YouTube', cls: 'bg-deal text-white' },
  TIKTOK: { label: 'TikTok', cls: 'bg-ink text-white' },
  KICK: { label: 'Kick', cls: 'bg-success-strong text-white' },
};

export type Video = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnail: string | null;
  platform: string | null;
  category: string | null;
  beforeImage: string | null;
  afterImage: string | null;
  customerName: string | null;
  testimonial: string | null;
  avgRating: number | null;
  reviewCount: number;
};

export function getYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function getThumbnailUrl(videoUrl: string, thumbnail: string | null): string | null {
  if (thumbnail && !getYoutubeVideoId(thumbnail)) {
    return thumbnail;
  }
  const ytId = getYoutubeVideoId(videoUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  return thumbnail;
}

export function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <IconoEstrella
          key={i}
          className={`${s} ${
            i <= Math.round(rating) ? 'text-warning fill-warning' : 'text-line fill-line'
          }`}
        />
      ))}
    </div>
  );
}

export default function TarjetaTrabajo({ v, onAbrir }: { v: Video; onAbrir?: () => void }) {
  const badge = v.platform ? PLATFORM_BADGES[v.platform] : null;
  const computedThumbnail = getThumbnailUrl(v.videoUrl, v.thumbnail);
  return (
    <div
      onClick={onAbrir}
      className="group bg-white rounded-2xl border border-line shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface overflow-hidden">
        {computedThumbnail ? (
          <Image
            src={computedThumbnail}
            alt={v.title}
            width={640}
            height={360}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <IconoVideo className="w-12 h-12 text-subtle" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-ink/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <IconoPlay lleno className="w-7 h-7 text-brand-500 ml-1" />
          </div>
        </div>
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {v.category && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-500 text-white">
              {CATEGORIES.find((c) => c.value === v.category)?.label || v.category}
            </span>
          )}
        </div>
        {/* Before/After indicator */}
        {(v.beforeImage || v.afterImage) && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {v.beforeImage && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-700 text-white">ANTES</span>
            )}
            {v.afterImage && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-500 text-white">DESPUÉS</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-ink mb-1.5 line-clamp-2 group-hover:text-brand-500 transition-colors">
          {v.title}
        </h3>
        {v.description && (
          <p className="text-sm text-muted line-clamp-2 mb-3">{v.description}</p>
        )}
        {v.avgRating !== null && (
          <div className="flex items-center gap-2 mb-2">
            <StarDisplay rating={v.avgRating} />
            <span className="text-xs font-bold text-ink">{formatRating(v.avgRating)}</span>
            <span className="text-xs text-muted">({v.reviewCount} reseñas)</span>
          </div>
        )}
        {v.testimonial && (
          <div className="mt-3 p-3 bg-brand-50 rounded-xl border border-brand-200">
            <p className="text-xs italic text-ink line-clamp-2">&ldquo;{v.testimonial}&rdquo;</p>
            {v.customerName && (
              <p className="text-xs font-bold text-brand-500 mt-1">— {v.customerName}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
