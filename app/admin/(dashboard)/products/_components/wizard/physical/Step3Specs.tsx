'use client';

import { useState } from 'react';
import { FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import { StepProps } from '../types';
import { wizardInput, wizardError, wizardSectionTitle, wizardSectionHelp } from '../ui';

const SUGGESTED_SPECS: Record<string, string[]> = {
  Procesador: ['Intel Core i5-12ª Gen', 'AMD Ryzen 5 5600X', 'Intel Core i7-13ª Gen'],
  RAM: ['8 GB DDR4', '16 GB DDR4', '32 GB DDR5'],
  Almacenamiento: ['256 GB SSD NVMe', '512 GB SSD NVMe', '1 TB HDD'],
  Pantalla: ['15.6" Full HD IPS', '14" Full HD TN', '27" 4K IPS'],
  'Sistema Operativo': ['Windows 11 Home', 'Windows 11 Pro', 'Sin SO'],
  Conectividad: ['WiFi 6, Bluetooth 5.2', 'WiFi 5, Bluetooth 4.2'],
  'Puertos USB': ['2x USB-A 3.0, 1x USB-C', '3x USB-A 2.0, 1x HDMI'],
};

export default function PhysicalStep3Specs({ data, onChange, errors }: StepProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

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

  const handleSuggestion = (k: string, v: string) => {
    if (data.specifications[k]) return;
    onChange({ specifications: { ...data.specifications, [k]: v } });
  };

  const count = Object.keys(data.specifications).length;
  const needed = Math.max(0, 3 - count);

  return (
    <div className="space-y-6">
      <div>
        <h2 className={wizardSectionTitle}>Especificaciones técnicas</h2>
        <p className={wizardSectionHelp}>
          Detalla las características técnicas del producto. Mínimo <strong>3 especificaciones</strong>.
        </p>
      </div>

      {/* Progress indicator */}
      <div className={[
        'flex items-center gap-3 p-3 rounded-xl border',
        count >= 3 ? 'bg-success-strong/10 border-success-strong/30' : 'bg-warning/10 border-warning-strong/30',
      ].join(' ')}>
        <div className={`text-2xl font-bold ${count >= 3 ? 'text-success-strong' : 'text-warning-strong'}`}>{count}</div>
        <div>
          <p className={`text-sm font-semibold ${count >= 3 ? 'text-success-strong' : 'text-warning-strong'}`}>
            {count >= 3 ? '¡Mínimo cumplido!' : `Faltan ${needed} especificaciones`}
          </p>
          <p className={`text-xs ${count >= 3 ? 'text-success-strong' : 'text-warning-strong'}`}>
            {count >= 3 ? 'Puedes agregar más para una ficha técnica completa.' : 'Se requieren al menos 3 para publicar.'}
          </p>
        </div>
      </div>

      {/* Current specs table */}
      {count > 0 && (
        <div className="border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {Object.entries(data.specifications).map(([k, v]) => (
                <tr key={k} className="group hover:bg-surface transition-colors">
                  <td className="px-4 py-3 font-semibold text-ink w-2/5">{k}</td>
                  <td className="px-4 py-3 text-ink-soft">{v}</td>
                  <td className="px-4 py-3 text-right w-10">
                    <button
                      type="button"
                      onClick={() => handleRemove(k)}
                      className="p-1.5 text-muted hover:text-deal opacity-0 group-hover:opacity-100 transition-all hover:bg-deal-bg rounded-lg"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new spec */}
      <div className="bg-surface rounded-xl p-4 border border-line">
        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Agregar especificación</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Nombre (ej: Procesador)"
              className={wizardInput()}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              list="spec-keys"
            />
            <datalist id="spec-keys">
              {Object.keys(SUGGESTED_SPECS).map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Valor (ej: Intel Core i5)"
              className={wizardInput()}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!key.trim() || !value.trim()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FiInfo className="w-4 h-4 text-brand-600" />
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Sugerencias rápidas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUGGESTED_SPECS).map(([k, vals]) => (
            !data.specifications[k] && (
              <button
                key={k}
                type="button"
                onClick={() => handleSuggestion(k, vals[0])}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-xs text-ink-soft hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              >
                + {k}
              </button>
            )
          ))}
        </div>
      </div>

      {errors.specifications && (
        <div className="p-3 bg-deal-bg border border-deal/30 rounded-xl">
          <p className={wizardError}>{errors.specifications}</p>
        </div>
      )}
    </div>
  );
}
