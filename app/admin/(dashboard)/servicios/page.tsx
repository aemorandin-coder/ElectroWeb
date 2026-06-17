'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiVideo, FiToggleLeft, FiToggleRight, FiStar, FiYoutube, FiX, FiSave, FiImage } from 'react-icons/fi';
import { SiTiktok, SiKick } from 'react-icons/si';

const CATEGORIES = [
  { value: 'CCTV', label: 'Sistemas CCTV' },
  { value: 'REDES', label: 'Diseño de Redes' },
  { value: 'POS', label: 'Puntos de Venta' },
  { value: 'GAMING', label: 'PCs Gaming' },
  { value: 'CONSOLAS', label: 'Consolas' },
  { value: 'ELECTRONICA', label: 'Electrónica General' },
];

const PLATFORMS = [
  { value: 'YOUTUBE', label: 'YouTube', color: 'bg-red-100 text-red-700' },
  { value: 'TIKTOK', label: 'TikTok', color: 'bg-gray-900 text-white' },
  { value: 'KICK', label: 'Kick', color: 'bg-green-100 text-green-700' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  videoUrl: '',
  thumbnail: '',
  platform: 'YOUTUBE',
  category: '',
  beforeImage: '',
  afterImage: '',
  customerName: '',
  testimonial: '',
  isActive: true,
  order: 0,
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  const loadVideos = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/service-videos');
    const data = await res.json();
    setVideos(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadVideos(); }, []);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (v: Video) => {
    setForm({
      title: v.title,
      description: v.description || '',
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail || '',
      platform: v.platform || 'YOUTUBE',
      category: v.category || '',
      beforeImage: v.beforeImage || '',
      afterImage: v.afterImage || '',
      customerName: v.customerName || '',
      testimonial: v.testimonial || '',
      isActive: v.isActive,
      order: v.order,
    });
    setEditingId(v.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.videoUrl) return;
    setSaving(true);
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId
      ? `/api/admin/service-videos/${editingId}`
      : '/api/admin/service-videos';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowModal(false);
      loadVideos();
    }
    setSaving(false);
  };

  const handleToggle = async (v: Video) => {
    await fetch(`/api/admin/service-videos/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    loadVideos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este trabajo? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    await fetch(`/api/admin/service-videos/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    loadVideos();
  };

  const platformStyle = (p: string | null) =>
    PLATFORMS.find((x) => x.value === p)?.color || 'bg-gray-100 text-gray-600';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#212529]">Trabajos Realizados</h1>
          <p className="text-sm text-[#6a6c6b] mt-0.5">
            Portafolio de servicios — {videos.length} fichas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2a63cd] text-white rounded-xl font-semibold text-sm hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg hover:scale-105"
        >
          <FiPlus className="w-4 h-4" />
          Agregar Trabajo
        </button>
      </div>

      {/* Tarjeta Informativa de Uso */}
      <div className="bg-gradient-to-r from-blue-50 to-[#2a63cd]/5 rounded-2xl border border-blue-100 p-5 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-start relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#2a63cd]/5 rounded-full blur-xl pointer-events-none transition-transform duration-500 group-hover:scale-150"></div>
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center text-[#2a63cd] flex-shrink-0">
          <FiVideo className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <h2 className="font-black text-[#212529] text-base">¿Cómo funciona y para qué sirve esta sección?</h2>
          <p className="text-xs text-[#6a6c6b] leading-relaxed">
            Aquí gestionas el portafolio visual que los clientes verán en la sección pública de <a href="/servicios" target="_blank" className="text-[#2a63cd] font-bold hover:underline">Servicios</a>. Cada "Trabajo Realizado" publicado ayuda a demostrar la experiencia de la empresa y convencer a nuevos clientes mediante:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-2">
            <div className="flex gap-2 text-xs text-[#6a6c6b] items-start">
              <span className="w-1.5 h-1.5 bg-[#2a63cd] rounded-full mt-1.5 flex-shrink-0"></span>
              <span><strong>Demostraciones en Video:</strong> Agrega enlaces de YouTube o TikTok para mostrar el trabajo técnico en acción.</span>
            </div>
            <div className="flex gap-2 text-xs text-[#6a6c6b] items-start">
              <span className="w-1.5 h-1.5 bg-[#2a63cd] rounded-full mt-1.5 flex-shrink-0"></span>
              <span><strong>Comparativa Antes/Después:</strong> Sube URLs de imágenes del estado inicial y del resultado final.</span>
            </div>
            <div className="flex gap-2 text-xs text-[#6a6c6b] items-start">
              <span className="w-1.5 h-1.5 bg-[#2a63cd] rounded-full mt-1.5 flex-shrink-0"></span>
              <span><strong>Testimonios de Clientes:</strong> Registra opiniones del cliente que acompañen cada trabajo y le den credibilidad.</span>
            </div>
            <div className="flex gap-2 text-xs text-[#6a6c6b] items-start">
              <span className="w-1.5 h-1.5 bg-[#2a63cd] rounded-full mt-1.5 flex-shrink-0"></span>
              <span><strong>Filtros por Categorías:</strong> Asigna CCTV, Redes, POS, Gaming o Consolas para facilitar la búsqueda en la web.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterCategory === ''
              ? 'bg-[#2a63cd] text-white shadow'
              : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
          }`}
        >
          Todos ({videos.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = videos.filter((v) => v.category === c.value).length;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterCategory === c.value
                  ? 'bg-[#2a63cd] text-white shadow'
                  : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
              }`}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid de trabajos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#f8f9fa] rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#f8f9fa] rounded-xl border-2 border-dashed border-[#e9ecef]">
          <FiVideo className="w-12 h-12 text-[#dee2e6] mx-auto mb-3" />
          <p className="text-[#6a6c6b] font-medium">No hay trabajos en esta categoría</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#2a63cd] text-white rounded-lg text-sm font-semibold">
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                v.isActive ? 'border-[#e9ecef]' : 'border-orange-200 opacity-70'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef]">
                {getThumbnailUrl(v.videoUrl, v.thumbnail) ? (
                  <img src={getThumbnailUrl(v.videoUrl, v.thumbnail)!} alt={v.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FiVideo className="w-10 h-10 text-[#dee2e6]" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${platformStyle(v.platform)}`}>
                    {platformLabel(v.platform)}
                  </span>
                  {v.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2a63cd]/90 text-white">
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
                    <FiToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <FiToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {/* Before/After indicator */}
                {(v.beforeImage || v.afterImage) && (
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {v.beforeImage && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">ANTES</span>
                    )}
                    {v.afterImage && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500 text-white">DESPUÉS</span>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-sm text-[#212529] line-clamp-2 mb-1">{v.title}</h3>
                {v.description && (
                  <p className="text-xs text-[#6a6c6b] line-clamp-2 mb-2">{v.description}</p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {v.avgRating !== null ? (
                    <div className="flex items-center gap-1">
                      <FiStar className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-[#212529]">{v.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-[#6a6c6b]">({v.reviewCount})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#dee2e6]">Sin reseñas</span>
                  )}
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.isActive ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {v.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(v)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-lg text-xs font-semibold transition-all"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-all"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#e9ecef]">
              <h2 className="text-lg font-black text-[#212529]">
                {editingId ? 'Editar Trabajo' : 'Nuevo Trabajo'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-[#6a6c6b]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Título */}
              <div>
                <label className="block text-sm font-semibold text-[#212529] mb-1.5">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="¿Cómo arreglar un drift de mando PS5?"
                  className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm transition-colors"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-[#212529] mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Breve descripción del trabajo realizado..."
                  className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm transition-colors resize-none"
                />
              </div>

              {/* Plataforma + Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#212529] mb-1.5">Plataforma</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm bg-white"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#212529] mb-1.5">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm bg-white"
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-semibold text-[#212529] mb-1.5">
                  URL del Video <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiVideo className="absolute left-3 top-3 text-[#6a6c6b] w-4 h-4" />
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-semibold text-[#212529] mb-1.5">URL de Miniatura</label>
                <div className="relative">
                  <FiImage className="absolute left-3 top-3 text-[#6a6c6b] w-4 h-4" />
                  <input
                    type="url"
                    value={form.thumbnail}
                    onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                    placeholder="https://..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Antes / Después */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#212529] mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white mr-1">ANTES</span>
                    URL imagen
                  </label>
                  <input
                    type="url"
                    value={form.beforeImage}
                    onChange={(e) => setForm({ ...form, beforeImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#212529] mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500 text-white mr-1">DESPUÉS</span>
                    URL imagen
                  </label>
                  <input
                    type="url"
                    value={form.afterImage}
                    onChange={(e) => setForm({ ...form, afterImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Testimonio */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-[#2a63cd] mb-3">Testimonio del cliente (anónimo)</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder='Ej: "Cliente en Barquisimeto"'
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#2a63cd]"
                  />
                  <textarea
                    value={form.testimonial}
                    onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
                    rows={2}
                    placeholder="Testimonio del cliente..."
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#2a63cd] resize-none"
                  />
                </div>
              </div>

              {/* Orden + Estado */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-[#212529] mb-1.5">Orden de aparición</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:border-[#2a63cd] text-sm"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer pb-2.5">
                  <div
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      form.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      form.isActive ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="text-sm font-semibold text-[#212529]">
                    {form.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-[#e9ecef]">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-xl font-semibold text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.videoUrl}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2a63cd] hover:bg-[#1e4ba3] disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiSave className="w-4 h-4" />
                )}
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Trabajo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
