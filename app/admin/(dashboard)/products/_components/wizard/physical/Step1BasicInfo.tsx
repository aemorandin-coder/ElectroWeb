'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiStar, FiX } from 'react-icons/fi';
import { wizardInput, wizardSectionTitle, wizardSectionHelp } from '../ui';
import { StepProps } from '../types';
import { Campo, controlDe } from '../Campo';
import ConditionSection from './ConditionSection';
import BusquedaWeb from '../BusquedaWeb';

// C-134: una columna en el teléfono, errores debajo de cada campo y etiquetas que se agregan también con un botón
// (en el teclado del teléfono "Enter" no siempre agrega).
export default function PhysicalStep1BasicInfo({ data, onChange, errors, categories }: StepProps) {
  const [tagInput, setTagInput] = useState('');
  // C-155: las marcas que ya existen, para escribirlas siempre igual
  const [marcas, setMarcas] = useState<string[]>([]);
  useEffect(() => {
    const control = new AbortController();
    fetch('/api/admin/products/marcas', { signal: control.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: { marcas?: string[] } | null) => { if (datos?.marcas) setMarcas(datos.marcas); })
      .catch(() => {});
    return () => control.abort();
  }, []);

  const agregarEtiqueta = () => {
    const val = tagInput.trim();
    if (!val || data.tags.includes(val)) return;
    onChange({ tags: [...data.tags, val] });
    setTagInput('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className={wizardSectionTitle}>Información básica</h2>
        <p className={wizardSectionHelp}>Nombre, descripción y organización del producto.</p>
      </div>

      <Campo id="p-nombre" label="Nombre del producto" required error={errors.name}>
        <input
          {...controlDe('p-nombre', errors.name)}
          type="text"
          value={data.name}
          maxLength={150}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ej: Laptop ASUS VivoBook 15 i5-12ª Gen"
          className={wizardInput(Boolean(errors.name))}
        />
      </Campo>

      <BusquedaWeb data={data} onChange={onChange} />

      <Campo id="p-descripcion" label="Descripción">
        <textarea
          id="p-descripcion"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder="Qué es, para qué sirve y qué lo hace especial"
          className={`${wizardInput()} h-auto resize-y py-2.5`}
        />
      </Campo>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo id="p-sku" label="SKU" required error={errors.sku} hint="Código interno; también el de SADES">
          <input
            {...controlDe('p-sku', errors.sku, 'hint')}
            type="text"
            value={data.sku}
            maxLength={60}
            autoCapitalize="characters"
            onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })}
            placeholder="Ej: LAPTOP-ASUS-001"
            className={`${wizardInput(Boolean(errors.sku))} font-mono`}
          />
        </Campo>
        <Campo id="p-barcode" label="Código de barras" error={errors.barcode}>
          <input
            {...controlDe('p-barcode', errors.barcode)}
            type="text"
            inputMode="numeric"
            value={data.barcode}
            maxLength={30}
            onChange={(e) => onChange({ barcode: e.target.value.trim() })}
            placeholder="EAN o UPC (opcional)"
            className={wizardInput(Boolean(errors.barcode))}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo id="p-categoria" label="Categoría" required error={errors.categoryId}>
        <select
          {...controlDe('p-categoria', errors.categoryId)}
          value={data.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          className={wizardInput(Boolean(errors.categoryId))}
        >
          <option value="">Elige una categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Campo>
      <Campo id="p-marca" label="Marca" error={errors.brand} hint="La del fabricante. Sale en la ficha y en los catálogos de Google y Meta">
        <input
          {...controlDe('p-marca', errors.brand, 'hint')}
          type="text"
          value={data.brand}
          maxLength={60}
          list="p-marcas"
          autoComplete="off"
          onChange={(e) => onChange({ brand: e.target.value })}
          placeholder="Ej: Xiaomi"
          className={wizardInput(Boolean(errors.brand))}
        />
        <datalist id="p-marcas">
          {marcas.map((m) => <option key={m} value={m} />)}
        </datalist>
      </Campo>
      </div>

      <Campo id="p-etiquetas" label="Etiquetas" hint="Palabras con las que el cliente lo busca: marca, modelo, uso">
        <div className="flex gap-2">
          <input
            {...controlDe('p-etiquetas', undefined, 'hint')}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEtiqueta(); } }}
            placeholder="Ej: gaming"
            className={wizardInput()}
          />
          <button
            type="button"
            onClick={agregarEtiqueta}
            disabled={!tagInput.trim()}
            aria-label="Agregar etiqueta"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-brand-600 hover:bg-brand-50 disabled:opacity-40"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {data.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Etiquetas agregadas">
            {data.tags.map((tag) => (
              <li key={tag} className="inline-flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-xs font-medium text-ink-soft">
                {tag}
                <button
                  type="button"
                  onClick={() => onChange({ tags: data.tags.filter((t) => t !== tag) })}
                  aria-label={`Quitar la etiqueta ${tag}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
                >
                  <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Campo>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface">
        <input
          type="checkbox"
          checked={data.isFeatured}
          onChange={(e) => onChange({ isFeatured: e.target.checked })}
          className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Producto destacado</span>
          <span className="block text-xs text-muted">Sale en la vitrina del inicio</span>
        </span>
        <FiStar className={`h-5 w-5 shrink-0 ${data.isFeatured ? 'fill-current text-warning' : 'text-muted'}`} aria-hidden="true" />
      </label>

      <ConditionSection data={data} onChange={onChange} errors={errors} />
    </div>
  );
}
