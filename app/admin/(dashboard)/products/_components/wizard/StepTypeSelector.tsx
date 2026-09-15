'use client';

import { useState } from 'react';
import { FiCheck, FiMonitor, FiSearch, FiTruck } from 'react-icons/fi';
import SadesSearchModal from './SadesSearchModal';
import type { WizardData } from './types';
import { wizardChoice } from './ui';

interface Props {
  selected: WizardData['productType'];
  onSelect: (type: 'PHYSICAL' | 'DIGITAL') => void;
  onSadesImport: (updates: Partial<WizardData>) => void;
  isEditing: boolean;
}

const TYPES = [
  {
    value: 'PHYSICAL' as const,
    Icon: FiTruck,
    title: 'Producto físico',
    text: 'Se envía o se retira en tienda. Pide precio, stock, peso y medidas.',
    examples: 'Periféricos, componentes, consolas',
  },
  {
    value: 'DIGITAL' as const,
    Icon: FiMonitor,
    title: 'Producto digital',
    text: 'Gift cards y saldo. Eliges los montos (en dólares, Robux…) y cómo se entrega.',
    examples: 'PlayStation, Xbox, Roblox, Steam',
  },
];

/** Primer paso del asistente (C-60): elegir tipo. En edición solo muestra el tipo actual. */
export default function StepTypeSelector({ selected, onSelect, onSadesImport, isEditing }: Props) {
  const [showSades, setShowSades] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-6">
      {showSades && (
        <SadesSearchModal
          onImport={(updates) => { onSadesImport(updates); setShowSades(false); }}
          onClose={() => setShowSades(false)}
        />
      )}

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-ink">{isEditing ? 'Tipo de producto' : '¿Qué vas a vender?'}</h2>
        <p className="mt-2 text-sm text-muted">
          {isEditing ? 'El tipo no se puede cambiar después de crear el producto.' : 'Elige el tipo: el formulario se adapta a lo que necesita cada uno.'}
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        {TYPES.map(({ value, Icon, title, text, examples }) => {
          const isSelected = selected === value;
          const locked = isEditing && !isSelected;
          return (
            <button
              key={value}
              type="button"
              onClick={() => !isEditing && onSelect(value)}
              disabled={locked}
              aria-pressed={isSelected}
              className={`${wizardChoice(isSelected)} relative flex flex-col gap-4 p-6 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isSelected ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-bold text-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{text}</span>
                <span className="mt-3 block text-xs font-medium text-muted">Ej.: {examples}</span>
              </span>
              {isSelected && (
                <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white">
                  <FiCheck className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!isEditing && (
        <div className="mt-8 w-full">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium text-muted">o importa un producto físico del catálogo</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            onClick={() => setShowSades(true)}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-white px-5 py-4 text-left hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink-soft">
              <FiSearch className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Importar desde SADES</span>
              <span className="block text-xs text-muted">Llena nombre, SKU, precio y especificaciones desde el catálogo ElectroCaja</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
