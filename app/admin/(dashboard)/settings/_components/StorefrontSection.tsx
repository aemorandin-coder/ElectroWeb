'use client';

import { adminNotice } from '@/lib/admin-ui';
import type { SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow, TextField } from './fields';

interface StorefrontSectionProps extends SectionProps {
  /** Para avisar que las alertas de stock necesitan correos configurados */
  hasAlertEmails: boolean;
  onGoToAlerts: () => void;
}

export default function StorefrontSection({ form, set, errors, hasAlertEmails, onGoToAlerts }: StorefrontSectionProps) {
  const threshold = Number(form.lowStockThreshold) || 0;

  return (
    <>
      <SettingsCard title="Portada" description="Productos y categorías que se ven en la página de inicio.">
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

      <SettingsCard title="Video de la portada" description="Una sección con un video de YouTube (reseñas, novedades o un short).">
        <div className="space-y-5">
          <SwitchRow label="Mostrar video" checked={form.heroVideoEnabled} onChange={(v) => set('heroVideoEnabled', v)} />
          {form.heroVideoEnabled && (
            <div className="grid grid-cols-1 gap-4">
              <TextField label="Enlace de YouTube" type="url" value={form.heroVideoUrl} onChange={(v) => set('heroVideoUrl', v)} error={errors.heroVideoUrl} placeholder="https://www.youtube.com/watch?v=…" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Título de la sección" value={form.heroVideoTitle} onChange={(v) => set('heroVideoTitle', v)} error={errors.heroVideoTitle} maxLength={80} placeholder="Reviews y novedades" />
                <TextField label="Subtítulo" value={form.heroVideoDescription} onChange={(v) => set('heroVideoDescription', v)} error={errors.heroVideoDescription} maxLength={200} placeholder="Opcional" />
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Inventario">
        <div className="space-y-5">
          <NumberField
            label="Stock bajo desde"
            suffix="unidades"
            value={form.lowStockThreshold}
            onChange={(v) => set('lowStockThreshold', v)}
            error={errors.lowStockThreshold}
            min={0}
            max={1000}
            step={1}
            hint={threshold > 0 ? `Con ${threshold} unidades o menos, la ficha muestra cuántas quedan.` : 'En 0 no se avisa de pocas unidades.'}
            className="max-w-xs"
          />
          <SwitchRow
            label="Ocultar productos agotados"
            description="Los físicos sin stock desaparecen de la portada, el catálogo y los relacionados. Los digitales siempre se ven."
            checked={form.autoHideOutOfStock}
            onChange={(v) => set('autoHideOutOfStock', v)}
          />
          <div className="space-y-5 border-t border-line pt-5">
            <SwitchRow
              label="Avisarme cuando un producto quede con stock bajo"
              description="Cuando una venta lo deja en el umbral de arriba."
              checked={form.notifyLowStock}
              onChange={(v) => set('notifyLowStock', v)}
            />
            <SwitchRow
              label="Avisarme cuando un producto se agote"
              checked={form.notifyOutOfStock}
              onChange={(v) => set('notifyOutOfStock', v)}
            />
            {(form.notifyLowStock || form.notifyOutOfStock) && (
              <p className={adminNotice(hasAlertEmails ? 'neutral' : 'warning')}>
                El aviso llega a las notificaciones del panel
                {hasAlertEmails ? ' y a los correos de alerta.' : '. Para recibirlo también por correo, '}
                {!hasAlertEmails && (
                  <button type="button" onClick={onGoToAlerts} className="font-semibold underline">agrega un correo de alertas</button>
                )}
                {!hasAlertEmails && '.'}
              </p>
            )}
          </div>
        </div>
      </SettingsCard>
    </>
  );
}
