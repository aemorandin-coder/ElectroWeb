'use client';

import { adminNotice } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import type { SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow, TextAreaField, TextField } from './fields';

// C-100: ZOOM y MRW con cobro a destino (el cliente paga el flete al recibir), envío gratis por producto
// o desde un monto (la tienda paga la guía), y delivery propio en Guanare con tarifa fija.
export default function ShippingSection({ form, set, errors }: SectionProps) {
  const packaging = Number(form.packagingFeeUSD) || 0;
  const freeFrom = Number(form.freeDeliveryThresholdUSD) || 0;
  const localFee = Number(form.deliveryFeeUSD) || 0;

  return (
    <>
      <SettingsCard title="Envíos nacionales con ZOOM y MRW" description="Para productos físicos. Los digitales se entregan siempre sin envío.">
        <div className="space-y-5">
          <SwitchRow
            label="Hacer envíos nacionales"
            description="Apagado, el checkout no ofrece ZOOM ni MRW y la tienda deja de anunciar envíos a toda Venezuela."
            checked={form.deliveryEnabled}
            onChange={(v) => set('deliveryEnabled', v)}
            error={errors.deliveryEnabled}
          />
          {form.deliveryEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="Embalaje" prefix="$" value={form.packagingFeeUSD} onChange={(v) => set('packagingFeeUSD', v)} error={errors.packagingFeeUSD} step={0.01} hint="Lo único que cobra la tienda por el envío" />
                <NumberField
                  label="Envío gratis desde"
                  prefix="$"
                  value={form.freeDeliveryThresholdUSD}
                  onChange={(v) => set('freeDeliveryThresholdUSD', v)}
                  error={errors.freeDeliveryThresholdUSD}
                  step={0.01}
                  placeholder="Sin envío gratis"
                  hint="Compras físicas desde este monto: la tienda paga la guía."
                />
              </div>
              <div className={adminNotice('brand')}>
                <p className="font-semibold">Cobro a destino</p>
                <p className="mt-1">
                  El cliente le paga el flete a ZOOM o MRW cuando retira o recibe su paquete. En el checkout paga solo el embalaje
                  ({formatUSD(packaging)}) y ve la tarifa de ZOOM como referencia.
                </p>
                <p className="mt-1">
                  Envío gratis (no paga nada y la tienda paga la guía): si el paquete lleva un producto con &quot;Envío gratis&quot; en su ficha
                  {freeFrom > 0 ? ` o la compra física es de ${formatUSD(freeFrom)} o más` : ''}.
                </p>
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Delivery en Guanare" description="Tu propio delivery dentro de la ciudad.">
        <div className="space-y-5">
          <SwitchRow
            label="Ofrecer delivery en Guanare"
            description="El cliente escribe su dirección y paga la tarifa fija. Gratis si el pedido tiene envío gratis."
            checked={form.localDeliveryEnabled}
            onChange={(v) => set('localDeliveryEnabled', v)}
          />
          {form.localDeliveryEnabled && (
            <NumberField
              label="Tarifa del delivery"
              prefix="$"
              value={form.deliveryFeeUSD}
              onChange={(v) => set('deliveryFeeUSD', v)}
              error={errors.deliveryFeeUSD}
              step={0.01}
              hint={localFee > 0 ? `El cliente paga ${formatUSD(localFee)} por pedido.` : 'Con 0, el delivery es gratis siempre.'}
              className="max-w-xs"
            />
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
