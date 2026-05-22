'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FiStar, FiVideo, FiX, FiExternalLink } from 'react-icons/fi';

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'CCTV', label: 'CCTV' },
  { value: 'REDES', label: 'Redes' },
  { value: 'POS', label: 'POS' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'CONSOLAS', label: 'Consolas' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
];

const PLATFORM_BADGES: Record<string, { label: string; cls: string }> = {
  YOUTUBE: { label: 'YouTube', cls: 'bg-red-600 text-white' },
  TIKTOK: { label: 'TikTok', cls: 'bg-gray-900 text-white' },
  KICK: { label: 'Kick', cls: 'bg-green-500 text-white' },
};

type Video = {
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

function getEmbedUrl(url: string, platform: string | null): string | null {
  if (platform === 'YOUTUBE') {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`;
  }
  if (platform === 'TIKTOK') {
    const m = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
    if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
  }
  return null;
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          className={`${s} ${
            i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <FiStar
            className={`w-6 h-6 transition-colors ${
              i <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ServiciosPortfolio({ videos }: { videos: Video[] }) {
  const { data: session } = useSession();
  const [filter, setFilter] = useState('');
  const [activeModal, setActiveModal] = useState<Video | null>(null);
  const [beforeAfterView, setBeforeAfterView] = useState<'before' | 'after'>('after');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filtered = filter ? videos.filter((v) => v.category === filter) : videos;

  const openModal = async (v: Video) => {
    setActiveModal(v);
    setBeforeAfterView('after');
    setRatingValue(0);
    setRatingComment('');
    setSubmitted(false);
    setLoadingReviews(true);
    const res = await fetch(`/api/service-reviews?videoId=${v.id}`);
    const data = await res.json();
    setReviews(Array.isArray(data) ? data : []);
    setLoadingReviews(false);
  };

  const closeModal = () => setActiveModal(null);

  const submitReview = async () => {
    if (!ratingValue || !activeModal) return;
    setSubmitting(true);
    const res = await fetch('/api/service-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceVideoId: activeModal.id,
        rating: ratingValue,
        comment: ratingComment || undefined,
      }),
    });
    if (res.ok) {
      setSubmitted(true);
      const updated = await fetch(`/api/service-reviews?videoId=${activeModal.id}`);
      setReviews(await updated.json());
    }
    setSubmitting(false);
  };

  const embedUrl = activeModal ? getEmbedUrl(activeModal.videoUrl, activeModal.platform) : null;
  const platformBadge = activeModal?.platform ? PLATFORM_BADGES[activeModal.platform] : null;

  return (
    <>
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap justify-center mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === c.value
                ? 'bg-[#2a63cd] text-white shadow-md shadow-[#2a63cd]/30'
                : 'bg-white text-[#6a6c6b] border border-[#e9ecef] hover:border-[#2a63cd]/30 hover:text-[#2a63cd]'
            }`}
          >
            {c.label}
            {c.value === '' && ` (${videos.length})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FiVideo className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No hay trabajos en esta categoría todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((v) => {
            const badge = v.platform ? PLATFORM_BADGES[v.platform] : null;
            return (
              <div
                key={v.id}
                onClick={() => openModal(v)}
                className="group bg-white rounded-2xl border border-[#e9ecef] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] overflow-hidden">
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FiVideo className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-[#2a63cd] ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
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
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#2a63cd] text-white">
                        {CATEGORIES.find((c) => c.value === v.category)?.label || v.category}
                      </span>
                    )}
                  </div>
                  {/* Before/After indicator */}
                  {(v.beforeImage || v.afterImage) && (
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      {v.beforeImage && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">ANTES</span>
                      )}
                      {v.afterImage && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">DESPUÉS</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-[#212529] mb-1.5 line-clamp-2 group-hover:text-[#2a63cd] transition-colors">
                    {v.title}
                  </h3>
                  {v.description && (
                    <p className="text-sm text-[#6a6c6b] line-clamp-2 mb-3">{v.description}</p>
                  )}
                  {v.avgRating !== null && (
                    <div className="flex items-center gap-2 mb-2">
                      <StarDisplay rating={v.avgRating} />
                      <span className="text-xs font-bold text-[#212529]">{v.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-[#6a6c6b]">({v.reviewCount} reseñas)</span>
                    </div>
                  )}
                  {v.testimonial && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                      <p className="text-xs italic text-[#212529] line-clamp-2">"{v.testimonial}"</p>
                      {v.customerName && (
                        <p className="text-xs font-bold text-[#2a63cd] mt-1">— {v.customerName}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-[#e9ecef]">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  {platformBadge && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${platformBadge.cls}`}>
                      {platformBadge.label}
                    </span>
                  )}
                  {activeModal.category && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#2a63cd] text-white">
                      {CATEGORIES.find((c) => c.value === activeModal.category)?.label}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-[#212529]">{activeModal.title}</h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-[#f8f9fa] rounded-xl transition-colors flex-shrink-0"
              >
                <FiX className="w-5 h-5 text-[#6a6c6b]" />
              </button>
            </div>

            {/* Video Embed */}
            <div className="bg-black aspect-video">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <FiVideo className="w-12 h-12 text-white/40" />
                  <a
                    href={activeModal.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-[#2a63cd] rounded-lg font-semibold text-sm"
                  >
                    <FiExternalLink className="w-4 h-4" />
                    Ver en {platformBadge?.label || 'plataforma'}
                  </a>
                </div>
              )}
            </div>

            {/* Before / After */}
            {(activeModal.beforeImage || activeModal.afterImage) && (
              <div className="p-5 border-b border-[#e9ecef]">
                <div className="flex gap-2 mb-3">
                  {activeModal.beforeImage && (
                    <button
                      onClick={() => setBeforeAfterView('before')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        beforeAfterView === 'before'
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Antes
                    </button>
                  )}
                  {activeModal.afterImage && (
                    <button
                      onClick={() => setBeforeAfterView('after')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        beforeAfterView === 'after'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Después
                    </button>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden border border-[#e9ecef]">
                  <img
                    src={
                      beforeAfterView === 'before'
                        ? activeModal.beforeImage!
                        : activeModal.afterImage!
                    }
                    alt={beforeAfterView === 'before' ? 'Antes' : 'Después'}
                    className="w-full object-cover max-h-64"
                  />
                </div>
              </div>
            )}

            {/* Description & Testimonial */}
            <div className="p-5 border-b border-[#e9ecef]">
              {activeModal.description && (
                <p className="text-sm text-[#6a6c6b] mb-4 leading-relaxed">{activeModal.description}</p>
              )}
              {activeModal.testimonial && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                  <p className="text-sm italic text-[#212529]">"{activeModal.testimonial}"</p>
                  {activeModal.customerName && (
                    <p className="text-sm font-bold text-[#2a63cd] mt-1.5">— {activeModal.customerName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="p-5">
              <h3 className="font-bold text-[#212529] mb-4 flex items-center gap-2">
                <FiStar className="w-4 h-4 text-amber-400" />
                Reseñas
                {reviews.length > 0 && (
                  <span className="text-xs text-[#6a6c6b] font-normal">({reviews.length})</span>
                )}
              </h3>

              {loadingReviews ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-[#2a63cd]/30 border-t-[#2a63cd] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  {reviews.length === 0 && (
                    <p className="text-sm text-[#6a6c6b] text-center py-4">
                      Sé el primero en dejar una reseña.
                    </p>
                  )}
                  {reviews.map((r: any) => (
                    <div key={r.id} className="p-3 bg-[#f8f9fa] rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <StarDisplay rating={r.rating} />
                        <span className="text-xs font-semibold text-[#212529]">{r.user?.name || 'Usuario'}</span>
                      </div>
                      {r.comment && <p className="text-xs text-[#6a6c6b]">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Rating Form */}
              {session?.user ? (
                submitted ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-sm font-semibold text-green-700">¡Gracias por tu reseña!</p>
                  </div>
                ) : (
                  <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e9ecef]">
                    <p className="text-sm font-semibold text-[#212529] mb-3">Deja tu calificación</p>
                    <StarPicker value={ratingValue} onChange={setRatingValue} />
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      rows={2}
                      placeholder="Comentario opcional..."
                      className="w-full mt-3 px-3 py-2 border border-[#e9ecef] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd] resize-none bg-white"
                    />
                    <button
                      onClick={submitReview}
                      disabled={!ratingValue || submitting}
                      className="mt-3 w-full py-2 bg-[#2a63cd] disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all hover:bg-[#1e4ba3]"
                    >
                      {submitting ? 'Enviando...' : 'Enviar Reseña'}
                    </button>
                  </div>
                )
              ) : (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p className="text-sm text-[#2a63cd] font-medium">
                    Inicia sesión para dejar una reseña
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
