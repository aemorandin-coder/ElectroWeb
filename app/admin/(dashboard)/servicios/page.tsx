'use client';

// Trabajos realizados (el portafolio de Servicios). C-249e: crear o cambiar uno va por pasos en su propia página
// (/admin/servicios/nuevo y /admin/servicios/<id>, PLAN.md §1.9), con las fotos que se suben; "Agregar trabajo" y "Editar"
// llevan ahí. Aquí quedan la lista, los filtros, activar o desactivar y eliminar.

import Link from 'next/link';
import {
  adminBadge, adminCardFlush, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import Plegable from '@/components/admin/Plegable';

import { useConfirm } from '@/contexts/ConfirmDialogContext';

import { useState } from 'react';
import {
  IconoEditar, IconoEliminar, IconoEstrella, IconoInterruptorApagado,
  IconoInterruptorEncendido, IconoMas, IconoVideo, IconoCamaraSeguridad, IconoRouter, IconoTarjeta, IconoPcGaming, IconoConsola, IconoCircuito,
  IconoServicioTecnico, type IconType,
} from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';

/** C-249: el ícono de cada categoría en su píldora de filtro (§1.7) */
const ICONO_CATEGORIA: Record<string, IconType> = {
  CCTV: IconoCamaraSeguridad, REDES: IconoRouter, POS: IconoTarjeta, GAMING: IconoPcGaming, CONSOLAS: IconoConsola, ELECTRONICA: IconoCircuito,
};
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { formatRating } from '@/lib/currency';

const CATEGORIES = [
  { value: 'CCTV', label: 'Sistemas CCTV' },
  { value: 'REDES', label: 'Diseño de Redes' },
  { value: 'POS', label: 'Puntos de Venta' },
  { value: 'GAMING', label: 'PCs Gaming' },
  { value: 'CONSOLAS', label: 'Consolas' },
  { value: 'ELECTRONICA', label: 'Electrónica General' },
];

const PLATFORMS = [
  { value: 'YOUTUBE', label: 'YouTube', color: 'bg-white text-ink-soft ring-1 ring-inset ring-line' },
  { value: 'TIKTOK', label: 'TikTok', color: 'bg-white text-ink-soft ring-1 ring-inset ring-line' },
  { value: 'KICK', label: 'Kick', color: 'bg-white text-ink-soft ring-1 ring-inset ring-line' },
];

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
  isActive: boolean;
  order: number;
  avgRating: number | null;
  reviewCount: number;
  createdAt: string;
};

function getYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getThumbnailUrl(videoUrl: string, thumbnail: string | null): string | null {
  if (thumbnail && !getYoutubeVideoId(thumbnail)) {
    return thumbnail;
  }
  const ytId = getYoutubeVideoId(videoUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  return thumbnail;
}

export default function AdminServiciosPage() {
  const { confirm } = useConfirm();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  const loadVideos = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/service-videos');
    const data = await res.json();
    setVideos(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useCargarAlMontar(loadVideos);

  const handleToggle = async (v: Video) => {
    await fetch(`/api/admin/service-videos/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    loadVideos();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: 'Eliminar trabajo', message: '¿Eliminar este trabajo? Esta acción no se puede deshacer.', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!confirmed) return;
    setDeletingId(id);
    await fetch(`/api/admin/service-videos/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    loadVideos();
  };

  const platformStyle = (p: string | null) =>
    PLATFORMS.find((x) => x.value === p)?.color || 'bg-surface text-muted';
  const platformLabel = (p: string | null) =>
    PLATFORMS.find((x) => x.value === p)?.label || p || '—';
  const categoryLabel = (c: string | null) =>
    CATEGORIES.find((x) => x.value === c)?.label || c || '—';

  const filtered = filterCategory
    ? videos.filter((v) => v.category === filterCategory)
    : videos;

  return (
    <div>
      {/* Header */}
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Trabajos Realizados</h1>
          <p className={adminPageSubtitle}>
            Portafolio de servicios — {videos.length} fichas
          </p>
        </div>
        <Link href="/admin/servicios/nuevo" className={adminPrimaryButton}>
          <IconoMas className="w-4 h-4" aria-hidden="true" />
          Agregar Trabajo
        </Link>
      </div>

      {/* Guía plegable compacta (Kit 2.0) */}
      <div className="mb-6">
        <Plegable
          icono={IconoVideo}
          titulo="¿Cómo funciona Trabajos Realizados?"
          resumen="Portafolio público en /servicios con videos, comparativa antes/después y reseñas."
        >
          <p className="mb-3 max-w-prose text-xs text-muted">
            Aquí gestionas el portafolio visual de la sección pública de <a href="/servicios" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">Servicios</a>:
          </p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-ink-soft md:grid-cols-2">
            <li><strong>Demostraciones en Video:</strong> Enlaces de YouTube o TikTok del trabajo técnico.</li>
            <li><strong>Comparativa Antes/Después:</strong> Fotos del estado inicial y resultado final.</li>
            <li><strong>Testimonios de Clientes:</strong> Opiniones reales que respaldan cada ficha.</li>
            <li><strong>Filtros por Categorías:</strong> CCTV, Redes, POS, Gaming o Consolas.</li>
          </ul>
        </Plegable>
      </div>

      {/* C-249: las categorías en píldoras con ícono, cuenta y lo que juntan (§1.7) */}
      <div className="mb-6">
        <Filtros
          etiqueta="Filtrar por categoría"
          valor={filterCategory}
          onCambiar={setFilterCategory}
          filtros={[
            { valor: '', etiqueta: 'Todos', ayuda: 'Todo el portafolio', Icono: IconoServicioTecnico, cuenta: videos.length },
            ...CATEGORIES.map((c) => ({
              valor: c.value, etiqueta: c.label, ayuda: `Trabajos de ${c.label.toLowerCase()}`, Icono: ICONO_CATEGORIA[c.value] ?? IconoServicioTecnico,
              cuenta: videos.filter((v) => v.category === c.value).length,
            })),
          ]}
        />
      </div>

      {/* Grid de trabajos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface py-16 text-center">
          <IconoVideo className="mx-auto mb-3 h-12 w-12 text-line-strong" aria-hidden="true" />
          <p className="font-medium text-muted">No hay trabajos en esta categoría</p>
          <Link href="/admin/servicios/nuevo" className={`${adminPrimaryButton} mt-4`}>
            <IconoMas className="h-4 w-4" aria-hidden="true" /> Agregar el primero
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              className={`${adminCardFlush} flex flex-col transition-colors hover:border-brand-300 ${
                v.isActive ? '' : 'opacity-70'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-surface">
                {getThumbnailUrl(v.videoUrl, v.thumbnail) ? (
                  <img src={getThumbnailUrl(v.videoUrl, v.thumbnail)!} alt={v.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconoVideo className="w-10 h-10 text-line-strong" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${platformStyle(v.platform)}`}>
                    {platformLabel(v.platform)}
                  </span>
                  {v.category && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-500/90 text-white">
                      {categoryLabel(v.category)}
                    </span>
                  )}
                </div>
                {/* Active toggle */}
                <button
                  onClick={() => handleToggle(v)}
                  className="absolute top-2 right-2 p-1 bg-white/90 rounded-lg shadow"
                  title={v.isActive ? 'Desactivar' : 'Activar'}
                >
                  {v.isActive ? (
                    <IconoInterruptorEncendido className="w-5 h-5 text-success" />
                  ) : (
                    <IconoInterruptorApagado className="w-5 h-5 text-subtle" />
                  )}
                </button>
                {/* Before/After indicator */}
                {(v.beforeImage || v.afterImage) && (
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {v.beforeImage && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-brand-700 text-white">ANTES</span>
                    )}
                    {v.afterImage && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-brand-500 text-white">DESPUÉS</span>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 line-clamp-2 text-sm font-bold text-ink">{v.title}</h3>
                {v.description && (
                  <p className="mb-2 line-clamp-2 text-xs text-muted">{v.description}</p>
                )}
                <div className="mb-3 flex items-center gap-2">
                  {v.avgRating !== null ? (
                    <div className="flex items-center gap-1">
                      <IconoEstrella lleno className="h-3 w-3 text-warning" aria-hidden="true" />
                      <span className="text-xs font-bold tabular-nums text-ink">{formatRating(v.avgRating)}</span>
                      <span className="text-xs tabular-nums text-muted">({v.reviewCount})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">Sin reseñas</span>
                  )}
                  <span className={`ml-auto ${adminBadge(v.isActive ? 'success' : 'neutral')}`}>
                    {v.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                  <Link href={`/admin/servicios/${v.id}`} className={`${adminSecondaryButton} flex-1`}>
                    <IconoEditar className="w-3.5 h-3.5" aria-hidden="true" />
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    aria-label="Eliminar este trabajo"
                    className={`${adminSecondaryButton} w-11 px-0! text-deal!`}
                  >
                    <IconoEliminar className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
