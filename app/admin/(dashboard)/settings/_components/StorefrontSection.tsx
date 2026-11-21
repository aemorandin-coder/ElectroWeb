'use client';

import type { SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow } from './fields';

interface StorefrontSectionProps extends SectionProps {
  /** Conservado por compatibilidad con Ajustes → Inventario */
  parte?: 'inventario';
}

// C-293 / G-74: Portada pasó a Marketing (_components/PortadaStudio.tsx); aquí queda Inventario (Vender).
export default function StorefrontSection({ form, set, errors }: StorefrontSectionProps) {
  const threshold = Number(form.lowStockThreshold) || 0;

  return (
    <SettingsCard title="Inventario">
      <div className="space-y-5">
        <NumberField
          label="Poco stock desde"
          suffix="unidades"
          value={form.lowStockThreshold}
          onChange={(v) => set('lowStockThreshold', v)}
          error={errors.lowStockThreshold}
          min={0}
          max={1000}
          step={1}
          hint={threshold > 0 ? `Con ${threshold} o menos, la ficha dice cuántas quedan.` : 'En 0 no se dice cuántas quedan.'}
        />
        <SwitchRow
          label="Ocultar los productos agotados"
          description="Los físicos sin stock desaparecen de la tienda."
          ayuda="Salen de la portada, el catálogo y los relacionados. Los digitales siempre se ven."
          checked={form.autoHideOutOfStock}
          onChange={(v) => set('autoHideOutOfStock', v)}
        />
        {/* C-293 (D3): los interruptores "Avisarme con stock bajo / agotado" hacían lo mismo que estos avisos, que tienen sus canales */}
        <p className="text-sm text-muted">
          Los avisos de poco stock y de producto agotado se eligen en{' '}
          <a href="#avisos" className="font-semibold text-brand-600 hover:underline">Avisos → Qué avisar</a>.
        </p>
      </div>
    </SettingsCard>
  );
}
