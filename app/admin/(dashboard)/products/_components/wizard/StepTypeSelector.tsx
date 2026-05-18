'use client';

import { useState } from 'react';
import { MdOutlineLocalShipping } from 'react-icons/md';
import { FiMonitor, FiSearch } from 'react-icons/fi';
import { WizardData } from './types';
import SadesSearchModal from './SadesSearchModal';

interface Props {
  selected: WizardData['productType'];
  onSelect: (type: 'PHYSICAL' | 'DIGITAL') => void;
  onSadesImport: (updates: Partial<WizardData>) => void;
  isEditing: boolean;
}

export default function StepTypeSelector({ selected, onSelect, onSadesImport, isEditing }: Props) {
  const [showSades, setShowSades] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] py-8">
      {showSades && (
        <SadesSearchModal
          onImport={(updates) => { onSadesImport(updates); setShowSades(false); }}
          onClose={() => setShowSades(false)}
        />
      )}

      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Tipo de producto' : '¿Qué tipo de producto vas a crear?'}
        </h2>
        <p className="text-gray-500 mt-2 text-sm">
          {isEditing ? 'El tipo de producto no se puede cambiar después de creado.' : 'Esto determina el flujo del formulario.'}
        </p>
      </div>

      <div className="flex gap-6 mb-10 w-full max-w-lg">
        {/* Physical */}
        <button
          type="button"
          onClick={() => !isEditing && onSelect('PHYSICAL')}
          disabled={isEditing && selected !== 'PHYSICAL'}
          className={[
            'flex-1 p-8 rounded-2xl border-2 transition-all text-center',
            selected === 'PHYSICAL'
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
              : isEditing
              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer',
          ].join(' ')}
        >
          <div className={[
            'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
            selected === 'PHYSICAL' ? 'bg-blue-100' : 'bg-gray-100',
          ].join(' ')}>
            <MdOutlineLocalShipping className={`w-8 h-8 ${selected === 'PHYSICAL' ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${selected === 'PHYSICAL' ? 'text-blue-700' : 'text-gray-700'}`}>
            Producto Físico
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Electrodomésticos, periféricos, hardware. Requiere peso, dimensiones y envío.
          </p>
          {selected === 'PHYSICAL' && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              Seleccionado
            </div>
          )}
        </button>

        {/* Digital */}
        <button
          type="button"
          onClick={() => !isEditing && onSelect('DIGITAL')}
          disabled={isEditing && selected !== 'DIGITAL'}
          className={[
            'flex-1 p-8 rounded-2xl border-2 transition-all text-center',
            selected === 'DIGITAL'
              ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100'
              : isEditing
              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 cursor-pointer',
          ].join(' ')}
        >
          <div className={[
            'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
            selected === 'DIGITAL' ? 'bg-purple-100' : 'bg-gray-100',
          ].join(' ')}>
            <FiMonitor className={`w-8 h-8 ${selected === 'DIGITAL' ? 'text-purple-600' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${selected === 'DIGITAL' ? 'text-purple-700' : 'text-gray-700'}`}>
            Producto Digital
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Gift cards, recargas, licencias. Entrega por código o recarga directa.
          </p>
          {selected === 'DIGITAL' && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              Seleccionado
            </div>
          )}
        </button>
      </div>

      {/* SADES import — only when creating */}
      {!isEditing && (
        <div className="w-full max-w-lg">
          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">o importa desde el catálogo</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => setShowSades(true)}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-gray-600 hover:text-blue-600 group"
          >
            <div className="w-9 h-9 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
              <FiSearch className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Importar desde SADES</p>
              <p className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors">Pre-llena nombre, SKU, precio y specs del catálogo ElectroCaja</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
