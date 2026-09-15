'use client';

import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { wizardInput, wizardLabel, wizardSectionTitle, wizardSectionHelp } from '../ui';
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
        <h2 className={wizardSectionTitle}>Información básica</h2>
        <p className={wizardSectionHelp}>Nombre, descripción y organización del producto.</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Name */}
        <div className="relative group">
          <label className={wizardLabel}>
            Nombre del producto <span className="text-deal">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej: Laptop ASUS VivoBook 15 i5-12ª Gen"
            className={wizardInput(Boolean(errors.name))}
          />
          <EpicTooltip message={errors.name || ''} visible={!!errors.name} position="right" />
        </div>

        {/* Description */}
        <div>
          <label className={wizardLabel}>Descripción</label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={5}
            placeholder="Describe las características principales del producto, qué lo hace especial..."
            className={`${wizardInput()} h-auto resize-y py-2.5`}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* SKU */}
          <div className="relative group">
            <label className={wizardLabel}>
              SKU <span className="text-deal">*</span>
            </label>
            <input
              type="text"
              value={data.sku}
              onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })}
              placeholder="Ej: LAPTOP-ASUS-001"
              className={`${wizardInput(Boolean(errors.sku))} font-mono`}
            />
            <EpicTooltip message={errors.sku || ''} visible={!!errors.sku} position="right" />
          </div>

          {/* Barcode */}
          <div>
            <label className={wizardLabel}>Código de barras</label>
            <input
              type="text"
              value={data.barcode}
              onChange={(e) => onChange({ barcode: e.target.value })}
              placeholder="ISBN, UPC, EAN..."
              className={wizardInput()}
            />
          </div>
        </div>

        {/* Category */}
        <div className="relative group">
          <label className={wizardLabel}>
            Categoría <span className="text-deal">*</span>
          </label>
          <div className="relative">
            <select
              value={data.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
              className={wizardInput(Boolean(errors.categoryId))}
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted fill-current" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
          <EpicTooltip message={errors.categoryId || ''} visible={!!errors.categoryId} position="right" />
        </div>

        {/* Tags */}
        <div>
          <label className={wizardLabel}>Etiquetas</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Escribe y presiona Enter para agregar..."
            className={wizardInput()}
            onKeyDown={handleAddTag}
          />
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface text-ink-soft text-xs font-medium rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onChange({ tags: data.tags.filter((t) => t !== tag) })}
                    className="text-muted hover:text-ink-soft leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured */}
        <label className="flex items-center gap-3 p-4 border border-line rounded-xl cursor-pointer hover:bg-surface transition-colors">
          <input
            type="checkbox"
            checked={data.isFeatured}
            onChange={(e) => onChange({ isFeatured: e.target.checked })}
            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
          />
          <div className="flex-1">
            <span className="block text-sm font-semibold text-ink">Producto Destacado</span>
            <span className="block text-xs text-muted">Aparecerá en la sección destacada de la tienda</span>
          </div>
          <FiStar className={`w-5 h-5 ${data.isFeatured ? 'text-warning fill-current' : 'text-muted'}`} />
        </label>
      </div>
    </div>
  );
}
