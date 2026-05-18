'use client';

import { useState } from 'react';
import { FiGift, FiKey, FiPackage, FiStar } from 'react-icons/fi';
import { FaGlobeAmericas, FaFlagUsa } from 'react-icons/fa';
import {
  SiRoblox, SiSteam, SiPlaystation, SiNintendoswitch,
  SiNetflix, SiSpotify, SiApple, SiGooglepay, SiAmazon,
} from 'react-icons/si';
import { MdSportsEsports, MdGamepad } from 'react-icons/md';
import EpicTooltip from '@/components/EpicTooltip';
import { StepProps } from '../types';

interface Platform {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const PLATFORMS: Platform[] = [
  { value: 'ROBLOX',      label: 'Roblox',         icon: <SiRoblox />,          color: 'text-red-500' },
  { value: 'STEAM',       label: 'Steam',          icon: <SiSteam />,           color: 'text-gray-700' },
  { value: 'PLAYSTATION', label: 'PlayStation',    icon: <SiPlaystation />,     color: 'text-blue-600' },
  { value: 'XBOX',        label: 'Xbox',           icon: <MdGamepad />,         color: 'text-green-600' },
  { value: 'NINTENDO',    label: 'Nintendo',       icon: <SiNintendoswitch />,  color: 'text-red-600' },
  { value: 'FREEFIRE',    label: 'Free Fire',      icon: <MdSportsEsports />,   color: 'text-orange-500' },
  { value: 'VALORANT',    label: 'Valorant',       icon: <MdSportsEsports />,   color: 'text-rose-600' },
  { value: 'FORTNITE',    label: 'Fortnite',       icon: <MdSportsEsports />,   color: 'text-blue-500' },
  { value: 'PUBG',        label: 'PUBG Mobile',    icon: <MdSportsEsports />,   color: 'text-yellow-600' },
  { value: 'NETFLIX',     label: 'Netflix',        icon: <SiNetflix />,         color: 'text-red-600' },
  { value: 'SPOTIFY',     label: 'Spotify',        icon: <SiSpotify />,         color: 'text-green-500' },
  { value: 'APPLE',       label: 'Apple / iTunes', icon: <SiApple />,           color: 'text-gray-800' },
  { value: 'GOOGLE_PLAY', label: 'Google Play',    icon: <SiGooglepay />,       color: 'text-blue-500' },
  { value: 'AMAZON',      label: 'Amazon',         icon: <SiAmazon />,          color: 'text-orange-500' },
  { value: 'DISNEY',      label: 'Disney+',        icon: <MdSportsEsports />,   color: 'text-blue-700' },
  { value: 'GIFT_CARD',   label: 'Gift Card',      icon: <FiGift />,            color: 'text-purple-500' },
  { value: 'SOFTWARE',    label: 'Software/Licencia', icon: <FiKey />,          color: 'text-indigo-500' },
  { value: 'OTHER',       label: 'Otro',           icon: <FiPackage />,         color: 'text-gray-500' },
];

const REGIONS = [
  { value: 'GLOBAL', label: 'Global', icon: <FaGlobeAmericas /> },
  { value: 'USA',    label: 'Estados Unidos', icon: <FaFlagUsa /> },
  { value: 'LATAM',  label: 'Latinoamérica', icon: <FaGlobeAmericas /> },
  { value: 'EU',     label: 'Europa', icon: <FaGlobeAmericas /> },
  { value: 'ASIA',   label: 'Asia', icon: <FaGlobeAmericas /> },
];

export default function DigitalStep1Platform({ data, onChange, errors, categories }: StepProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = tagInput.trim();
    if (!val || data.tags.includes(val)) return;
    onChange({ tags: [...data.tags, val] });
    setTagInput('');
  };

  const selected = PLATFORMS.find(p => p.value === data.digitalPlatform);

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Plataforma y configuración</h2>
        <p className="text-sm text-gray-500 mt-1">Elige la plataforma, región y los datos básicos del producto digital.</p>
      </div>

      {/* Platform picker */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Plataforma <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ digitalPlatform: p.value })}
              className={[
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center',
                data.digitalPlatform === p.value
                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30',
              ].join(' ')}
            >
              <span className={`text-xl ${data.digitalPlatform === p.value ? 'text-purple-600' : p.color}`}>
                {p.icon}
              </span>
              <span className={`text-xs font-medium leading-tight ${data.digitalPlatform === p.value ? 'text-purple-700' : 'text-gray-600'}`}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
        {errors.digitalPlatform && (
          <p className="text-xs text-red-600 mt-2 font-medium">{errors.digitalPlatform}</p>
        )}
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Región de cuenta</label>
        <div className="flex gap-2 flex-wrap">
          {REGIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChange({ digitalRegion: r.value })}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition-all',
                data.digitalRegion === r.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300',
              ].join(' ')}
            >
              <span>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Información del producto</p>

        {/* Name */}
        <div className="relative group">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={selected ? `Ej: ${selected.label} Gift Card $25` : 'Nombre del producto digital'}
            className={[
              'w-full px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all',
              errors.name ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
            ].join(' ')}
          />
          <EpicTooltip message={errors.name || ''} visible={!!errors.name} position="right" />
        </div>

        {/* SKU */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative group">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.sku}
              onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })}
              placeholder="Ej: GC-ROBLOX-001"
              className={[
                'w-full px-4 py-2.5 border rounded-xl text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all',
                errors.sku ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
              ].join(' ')}
            />
            <EpicTooltip message={errors.sku || ''} visible={!!errors.sku} position="right" />
          </div>

          {/* Category */}
          <div className="relative group">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Categoría <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={data.categoryId}
                onChange={(e) => onChange({ categoryId: e.target.value })}
                className={[
                  'w-full appearance-none px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all',
                  errors.categoryId ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
                ].join(' ')}
              >
                <option value="">Seleccionar...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
            <EpicTooltip message={errors.categoryId || ''} visible={!!errors.categoryId} position="right" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            placeholder="¿Qué puede hacer el cliente con esta gift card o recarga?"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Etiquetas</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Escribe y presiona Enter..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-purple-500"
          />
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  {tag}
                  <button type="button" onClick={() => onChange({ tags: data.tags.filter(t => t !== tag) })} className="hover:text-purple-900">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured */}
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={data.isFeatured}
            onChange={(e) => onChange({ isFeatured: e.target.checked })}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <div className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Producto Destacado</span>
            <span className="block text-xs text-gray-500">Aparece en la sección principal de la tienda</span>
          </div>
          <FiStar className={`w-5 h-5 ${data.isFeatured ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
        </label>
      </div>
    </div>
  );
}
