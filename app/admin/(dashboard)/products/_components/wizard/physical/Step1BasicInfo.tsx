'use client';

import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import EpicTooltip from '@/components/EpicTooltip';
import { StepProps } from '../types';

export default function PhysicalStep1BasicInfo({ data, onChange, errors, categories }: StepProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = tagInput.trim();
    if (!val || data.tags.includes(val)) return;
    onChange({ tags: [...data.tags, val] });
    setTagInput('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Información básica</h2>
        <p className="text-sm text-gray-500 mt-1">Nombre, descripción y organización del producto.</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Name */}
        <div className="relative group">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Nombre del producto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej: Laptop ASUS VivoBook 15 i5-12ª Gen"
            className={[
              'w-full px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
              errors.name ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
            ].join(' ')}
          />
          <EpicTooltip message={errors.name || ''} visible={!!errors.name} position="right" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={5}
            placeholder="Describe las características principales del producto, qué lo hace especial..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* SKU */}
          <div className="relative group">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.sku}
              onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })}
              placeholder="Ej: LAPTOP-ASUS-001"
              className={[
                'w-full px-4 py-2.5 border rounded-xl text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
                errors.sku ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
              ].join(' ')}
            />
            <EpicTooltip message={errors.sku || ''} visible={!!errors.sku} position="right" />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código de barras</label>
            <input
              type="text"
              value={data.barcode}
              onChange={(e) => onChange({ barcode: e.target.value })}
              placeholder="ISBN, UPC, EAN..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
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
                'w-full appearance-none px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
                errors.categoryId ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
              ].join(' ')}
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
          <EpicTooltip message={errors.categoryId || ''} visible={!!errors.categoryId} position="right" />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Etiquetas</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Escribe y presiona Enter para agregar..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            onKeyDown={handleAddTag}
          />
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onChange({ tags: data.tags.filter((t) => t !== tag) })}
                    className="text-gray-400 hover:text-gray-700 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured */}
        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={data.isFeatured}
            onChange={(e) => onChange({ isFeatured: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Producto Destacado</span>
            <span className="block text-xs text-gray-500">Aparecerá en la sección destacada de la tienda</span>
          </div>
          <FiStar className={`w-5 h-5 ${data.isFeatured ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
        </label>
      </div>
    </div>
  );
}
