'use client';

import { useRef, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { StepProps, SPECS_RECOMENDADAS } from '../types';
import { wizardInput, wizardError, wizardSectionTitle, wizardSectionHelp } from '../ui';

// C-134:
// - Las sugerencias ponen solo el NOMBRE y llevan al valor. Antes un clic en "+ Procesador" agregaba
//   "Intel Core i5-12ª Gen" a cualquier producto: datos inventados en la ficha.
// - 3 especificaciones se recomiendan, no se exigen (un cable no tiene 3).
// - "Quitar" se ve siempre: antes solo aparecía con el mouse encima y en el teléfono no se podía borrar.
const SUGERENCIAS = ['Marca', 'Modelo', 'Color', 'Conexión', 'Compatibilidad', 'Capacidad', 'Procesador', 'RAM', 'Almacenamiento', 'Pantalla', 'Batería', 'Garantía del fabricante'];

export default function PhysicalStep3Specs({ data, onChange, errors }: StepProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const valorRef = useRef<HTMLInputElement>(null);

  const entradas = Object.entries(data.specifications);
  const count = entradas.length;
  const faltan = Math.max(0, SPECS_RECOMENDADAS - count);

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
          {faltan > 0
            ? `Recomendado: ${SPECS_RECOMENDADAS} o más para una ficha completa (te faltan ${faltan}). No es obligatorio.`
            : `${count} especificaciones: la ficha técnica se ve completa.`}
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
            {SUGERENCIAS.map((k) => <option key={k} value={k} />)}
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
        <div className="flex flex-wrap gap-1.5" aria-label="Nombres sugeridos">
          {SUGERENCIAS.filter((k) => !data.specifications[k]).map((k) => (
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
