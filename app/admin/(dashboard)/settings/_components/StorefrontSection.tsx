'use client';

import type { SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow, TextField } from './fields';

interface StorefrontSectionProps extends SectionProps {
  /** Para avisar que las alertas de stock necesitan correos configurados */
  parte: 'portada' | 'inventario';
}

// C-293: dos secciones: `portada` (La tienda en línea) e `inventario` (Vender)
export default function StorefrontSection({ form, set, errors, parte }: StorefrontSectionProps) {
  const threshold = Number(form.lowStockThreshold) || 0;

  if (parte === 'inventario') return <>
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
    </>;

  return (
    <>
      <SettingsCard title="Portada" description="Lo que se ve en la página de inicio.">
        <div className="space-y-5">
          <NumberField
            label="Productos destacados"
            suffix="productos"
            value={form.maxFeaturedProducts}
            onChange={(v) => set('maxFeaturedProducts', v)}
            error={errors.maxFeaturedProducts}
            min={2}
            max={24}
            step={1}
            hint="Los marcados como destacados en cada producto. Entre 2 y 24."
            className="max-w-xs"
          />
          <SwitchRow label="Mostrar categorías" description="Bloque de categorías con sus productos." checked={form.showCategories} onChange={(v) => set('showCategories', v)} />
          {form.showCategories && (
            <NumberField label="Cuántas categorías" suffix="categorías" value={form.maxCategoriesDisplay} onChange={(v) => set('maxCategoriesDisplay', v)} error={errors.maxCategoriesDisplay} min={1} max={12} step={1} className="max-w-xs" />
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Video de la portada" description="Un video de YouTube: una reseña, una novedad o un short.">
        <div className="space-y-5">
          <SwitchRow label="Mostrar video" checked={form.heroVideoEnabled} onChange={(v) => set('heroVideoEnabled', v)} />
          {form.heroVideoEnabled && (
            <div className="grid grid-cols-1 gap-4">
              <TextField ancho="largo" label="Enlace de YouTube" type="url" value={form.heroVideoUrl} onChange={(v) => set('heroVideoUrl', v)} error={errors.heroVideoUrl} placeholder="https://www.youtube.com/watch?v=…" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Título de la sección" value={form.heroVideoTitle} onChange={(v) => set('heroVideoTitle', v)} error={errors.heroVideoTitle} maxLength={80} placeholder="Reviews y novedades" />
                <TextField label="Subtítulo" value={form.heroVideoDescription} onChange={(v) => set('heroVideoDescription', v)} error={errors.heroVideoDescription} maxLength={200} placeholder="Opcional" />
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

    </>
  );
}
