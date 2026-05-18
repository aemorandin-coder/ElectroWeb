'use client';

import { useState } from 'react';
import { FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import { StepProps } from '../types';

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
        <h2 className="text-xl font-bold text-gray-900">Especificaciones técnicas</h2>
        <p className="text-sm text-gray-500 mt-1">
          Detalla las características técnicas del producto. Mínimo <strong>3 especificaciones</strong>.
        </p>
      </div>

      {/* Progress indicator */}
      <div className={[
        'flex items-center gap-3 p-3 rounded-xl border',
        count >= 3 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
      ].join(' ')}>
        <div className={`text-2xl font-bold ${count >= 3 ? 'text-green-600' : 'text-amber-600'}`}>{count}</div>
        <div>
          <p className={`text-sm font-semibold ${count >= 3 ? 'text-green-700' : 'text-amber-700'}`}>
            {count >= 3 ? '¡Mínimo cumplido!' : `Faltan ${needed} especificaciones`}
          </p>
          <p className={`text-xs ${count >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
            {count >= 3 ? 'Puedes agregar más para una ficha técnica completa.' : 'Se requieren al menos 3 para publicar.'}
          </p>
        </div>
      </div>

      {/* Current specs table */}
      {count > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {Object.entries(data.specifications).map(([k, v]) => (
                <tr key={k} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900 w-2/5">{k}</td>
                  <td className="px-4 py-3 text-gray-600">{v}</td>
                  <td className="px-4 py-3 text-right w-10">
                    <button
                      type="button"
                      onClick={() => handleRemove(k)}
                      className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
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
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Agregar especificación</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Nombre (ej: Procesador)"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!key.trim() || !value.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FiInfo className="w-4 h-4 text-blue-500" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sugerencias rápidas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUGGESTED_SPECS).map(([k, vals]) => (
            !data.specifications[k] && (
              <button
                key={k}
                type="button"
                onClick={() => handleSuggestion(k, vals[0])}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                + {k}
              </button>
            )
          ))}
        </div>
      </div>

      {errors.specifications && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium">{errors.specifications}</p>
        </div>
      )}
    </div>
  );
}
