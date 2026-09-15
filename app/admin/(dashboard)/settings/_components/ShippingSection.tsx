'use client';

import { adminNotice } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import type { SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow, TextAreaField, TextField } from './fields';

const EXAMPLE_KG = 2;

export default function ShippingSection({ form, set, errors }: SectionProps) {
  const perKg = Number(form.shippingCostPerKg) || 0;
  const minimum = Number(form.minConsolidatedShipping) || 0;
  const packaging = Number(form.packagingFeeUSD) || 0;
  const freeFrom = Number(form.freeDeliveryThresholdUSD) || 0;
  // Misma fórmula que lib/pricing.ts para productos que se consolidan (los voluminosos suman su costo fijo)
  const byWeight = Math.max(EXAMPLE_KG * perKg, minimum);
  const example = byWeight + packaging;

  return (
    <>
      <SettingsCard title="Envíos a domicilio y por courier" description="Para productos físicos. Los digitales se entregan siempre sin envío.">
        <div className="space-y-5">
          <SwitchRow
            label="Hacer envíos"
            description="Apagado, el checkout solo ofrece retiro en tienda y la tienda deja de anunciar envíos a toda Venezuela."
            checked={form.deliveryEnabled}
            onChange={(v) => set('deliveryEnabled', v)}
            error={errors.deliveryEnabled}
          />
          {form.deliveryEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <NumberField label="Costo por kilo" prefix="$" value={form.shippingCostPerKg} onChange={(v) => set('shippingCostPerKg', v)} error={errors.shippingCostPerKg} step={0.01} />
                <NumberField label="Envío mínimo" prefix="$" value={form.minConsolidatedShipping} onChange={(v) => set('minConsolidatedShipping', v)} error={errors.minConsolidatedShipping} step={0.01} hint="Aunque pese poco" />
                <NumberField label="Embalaje" prefix="$" value={form.packagingFeeUSD} onChange={(v) => set('packagingFeeUSD', v)} error={errors.packagingFeeUSD} step={0.01} hint="Fijo por orden" />
              </div>
              <NumberField
                label="Envío gratis desde"
                prefix="$"
                value={form.freeDeliveryThresholdUSD}
                onChange={(v) => set('freeDeliveryThresholdUSD', v)}
                error={errors.freeDeliveryThresholdUSD}
                step={0.01}
                placeholder="Sin envío gratis"
                hint="Con compras desde este monto solo se cobra el embalaje."
                className="max-w-xs"
              />
              <div className={`${adminNotice('brand')} tabular-nums`}>
                <p className="font-semibold">Ejemplo: una orden de {EXAMPLE_KG} kg</p>
                <p className="mt-1">
                  {EXAMPLE_KG} kg × {formatUSD(perKg)} = {formatUSD(EXAMPLE_KG * perKg)}
                  {EXAMPLE_KG * perKg < minimum ? ` (sube al mínimo de ${formatUSD(minimum)})` : ''} + {formatUSD(packaging)} de embalaje = <strong>{formatUSD(example)}</strong>
                </p>
                {freeFrom > 0 && <p className="mt-1">Si la compra es de {formatUSD(freeFrom)} o más, paga solo {formatUSD(packaging)}.</p>}
                <p className="mt-1 text-xs">Los productos voluminosos suman el costo de envío fijo que tienen en su ficha.</p>
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Retiro en tienda">
        <div className="space-y-5">
          <SwitchRow
            label="Permitir retiro en tienda"
            description="El cliente elige retirar en el checkout y no paga envío."
            checked={form.pickupEnabled}
            onChange={(v) => set('pickupEnabled', v)}
          />
          {form.pickupEnabled && (
            <div className="grid grid-cols-1 gap-4">
              <TextField label="Dirección de retiro" value={form.pickupAddress} onChange={(v) => set('pickupAddress', v)} error={errors.pickupAddress} maxLength={250} placeholder="Carrera 5, frente a la plaza Miranda, Guanare" hint="Se muestra en la ficha del producto y en el checkout." />
              <TextAreaField label="Instrucciones" value={form.pickupInstructions} onChange={(v) => set('pickupInstructions', v)} error={errors.pickupInstructions} maxLength={500} rows={2} placeholder="Horario de retiro y qué traer (cédula, número de orden)" />
            </div>
          )}
        </div>
      </SettingsCard>
    </>
  );
}
