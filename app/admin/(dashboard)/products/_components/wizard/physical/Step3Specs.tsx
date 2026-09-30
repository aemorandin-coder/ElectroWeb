'use client';

import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { StepProps } from '../types';
import { wizardInput, wizardError, wizardSectionTitle, wizardSectionHelp } from '../ui';
import { claveNombre, combinarSugerencias, type SugerenciasSpecs } from '@/lib/spec-sugerencias';

// C-134:
// - Las sugerencias ponen solo el NOMBRE y llevan al valor. Antes un clic en "+ Procesador" agregaba
//   "Intel Core i5-12ª Gen" a cualquier producto: datos inventados en la ficha.
// - Ninguna es obligatoria: hay productos con una sola (Andrés, 30/09).
// - "Quitar" se ve siempre: antes solo aparecía con el mouse encima y en el teléfono no se podía borrar.
// C-136: las sugerencias salen de la categoría (lo que ya usan sus productos, y una lista base por tipo). Al elegir un
// nombre aparecen los valores más usados para completarlo con un toque.

export default function PhysicalStep3Specs({ data, onChange, errors, categories }: StepProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const valorRef = useRef<HTMLInputElement>(null);
  const nombreCategoria = categories.find((c) => c.id === data.categoryId)?.name ?? '';
  // La lista base se ve al instante; lo aprendido de la categoría llega del servidor
  const [aprendidas, setAprendidas] = useState<{ categoryId: string; datos: SugerenciasSpecs } | null>(null);
  const sugerencias = aprendidas?.categoryId === data.categoryId ? aprendidas.datos : combinarSugerencias(nombreCategoria, []);

  useEffect(() => {
    if (!data.categoryId) return;
    const control = new AbortController();
    fetch(`/api/admin/products/spec-sugerencias?categoryId=${encodeURIComponent(data.categoryId)}`, { signal: control.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: SugerenciasSpecs | null) => { if (datos) setAprendidas({ categoryId: data.categoryId, datos }); })
      .catch(() => {});
    return () => control.abort();
  }, [data.categoryId]);

  const entradas = Object.entries(data.specifications);
  const count = entradas.length;
  const usadas = new Set(entradas.map(([k]) => claveNombre(k)));
  const valoresSugeridos = key.trim() ? sugerencias.valores[claveNombre(key)] ?? [] : [];

  const handleAdd = () => {
    if (!key.trim() || !value.trim()) return;
    onChange({ specifications: { ...data.specifications, [key.trim()]: value.trim() } });
    setKey('');
    setValue('');
  };

  const handleRemove = (k: string) => {
    const next = { ...data.specifications };
    delete next[k];
    onChange({ specifications: next });
  };

  const usarSugerencia = (nombre: string) => {
    setKey(nombre);
    valorRef.current?.focus();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className={wizardSectionTitle}>Especificaciones</h2>
        <p className={wizardSectionHelp}>
          {count === 0
            ? 'Agrega las que apliquen a este producto. Ninguna es obligatoria: hay productos con una sola.'
            : `${count} ${count === 1 ? 'especificación' : 'especificaciones'} en la ficha técnica.`}
        </p>
      </div>

      {count > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line" aria-label="Especificaciones agregadas">
          {entradas.map(([k, v]) => (
            <li key={k} className="flex items-center gap-3 py-1.5 pl-3 pr-1 text-sm">
              <span className="w-2/5 shrink-0 font-semibold text-ink [overflow-wrap:anywhere]">{k}</span>
              <span className="min-w-0 flex-1 text-ink-soft [overflow-wrap:anywhere]">{v}</span>
              <button
                type="button"
                onClick={() => handleRemove(k)}
                aria-label={`Quitar ${k}`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-deal-bg hover:text-deal"
              >
                <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">Agregar</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="min-w-0">
            <span className="sr-only">Nombre de la especificación</span>
            <input
              type="text"
              value={key}
              maxLength={60}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Nombre (ej: Conexión)"
              className={wizardInput()}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); valorRef.current?.focus(); } }}
              list="spec-keys"
            />
          </label>
          <datalist id="spec-keys">
            {sugerencias.nombres.map((k) => <option key={k} value={k} />)}
          </datalist>
          <label className="min-w-0">
            <span className="sr-only">Valor</span>
            <input
              ref={valorRef}
              type="text"
              value={value}
              maxLength={200}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Valor (ej: USB-C)"
              className={wizardInput()}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!key.trim() || !value.trim()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" /> Agregar
          </button>
        </div>
        {valoresSugeridos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={`Valores usados para ${key}`}>
            <span className="text-xs text-muted">Usados en la categoría:</span>
            {valoresSugeridos.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setValue(v); valorRef.current?.focus(); }}
                className="h-9 rounded-full bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                {v}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5" aria-label={nombreCategoria ? `Sugeridas para ${nombreCategoria}` : 'Nombres sugeridos'}>
          {sugerencias.nombres.filter((k) => !usadas.has(claveNombre(k))).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => usarSugerencia(k)}
              className="h-9 rounded-full border border-line bg-white px-3 text-xs text-ink-soft hover:border-brand-500 hover:text-brand-600"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {errors.specifications && <p className={wizardError}>{errors.specifications}</p>}
    </div>
  );
}
