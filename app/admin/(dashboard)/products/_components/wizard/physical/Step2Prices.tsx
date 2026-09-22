'use client';

import EpicTooltip from '@/components/EpicTooltip';
import { StepProps } from '../types';
import { FiCheck, FiInfo, FiTruck } from 'react-icons/fi';
import { MdOutlineLocalShipping } from 'react-icons/md';
import { wizardInput, wizardLabel, wizardHint, wizardError, wizardSectionTitle, wizardSectionHelp } from '../ui';

export default function PhysicalStep2Prices({ data, onChange, errors }: StepProps) {
  const margin =
    data.priceUSD && data.costPerItem
      ? ((parseFloat(data.priceUSD) - parseFloat(data.costPerItem)) / parseFloat(data.priceUSD) * 100).toFixed(1)
      : null;

  const profit =
    data.priceUSD && data.costPerItem
      ? (parseFloat(data.priceUSD) - parseFloat(data.costPerItem)).toFixed(2)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className={wizardSectionTitle}>Precios e Inventario</h2>
        <p className={wizardSectionHelp}>Precio de venta, costos, stock y datos de envío.</p>
      </div>

      {/* Pricing */}
      <div className="bg-white border border-line rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Precios</h3>

        <div className="grid grid-cols-2 gap-5">
          <div className="relative group">
            <label className={wizardLabel}>
              Precio de venta (USD) <span className="text-deal">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.priceUSD}
                onChange={(e) => onChange({ priceUSD: e.target.value })}
                placeholder="0.00"
                className={`${wizardInput(Boolean(errors.priceUSD))} pl-8`}
              />
            </div>
            <EpicTooltip message={errors.priceUSD || ''} visible={!!errors.priceUSD} position="right" />
          </div>

          <div>
            <label className={wizardLabel}>Precio tachado / comparación</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.compareAtPriceUSD}
                onChange={(e) => onChange({ compareAtPriceUSD: e.target.value })}
                placeholder="0.00"
                className={`${wizardInput()} pl-8`}
              />
            </div>
            <p className={wizardHint}>Se muestra tachado en la tienda. Deja vacío si no hay oferta.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 pt-4 border-t border-line">
          <div>
            <label className={wizardLabel}>Costo por artículo</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.costPerItem}
                onChange={(e) => onChange({ costPerItem: e.target.value })}
                placeholder="0.00"
                className={`${wizardInput()} pl-8`}
              />
            </div>
            <p className={wizardHint}>No visible para el cliente</p>
          </div>

          <div className="col-span-2 flex items-center gap-8 bg-surface rounded-xl px-5">
            <div>
              <span className="block text-xs text-muted mb-0.5">Margen</span>
              <span className={`text-xl font-bold ${margin && parseFloat(margin) > 0 ? 'text-success-strong' : 'text-muted'}`}>
                {margin ? `${margin}%` : '—'}
              </span>
            </div>
            <div className="w-px h-8 bg-line" />
            <div>
              <span className="block text-xs text-muted mb-0.5">Ganancia por unidad</span>
              <span className={`text-xl font-bold ${profit && parseFloat(profit) > 0 ? 'text-success-strong' : 'text-muted'}`}>
                {profit ? `$${profit}` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="bg-white border border-line rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Inventario</h3>
        <div className="relative group">
          <label className={wizardLabel}>
            Cantidad en stock <span className="text-deal">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={data.stock}
            onChange={(e) => onChange({ stock: e.target.value })}
            className={`${wizardInput(Boolean(errors.stock))} w-48`}
          />
          <EpicTooltip message={errors.stock || ''} visible={!!errors.stock} position="right" />
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-white border border-line rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MdOutlineLocalShipping className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Envío y dimensiones</h3>
        </div>

        <div className="p-4 bg-brand-50 rounded-xl border border-line flex gap-3">
          <FiInfo className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-brand-700">
            Los envíos van por <strong>ZOOM o MRW con cobro a destino</strong>: el cliente paga el flete al retirar y la tienda cobra solo el embalaje. El peso y las medidas sirven para la tarifa de referencia de ZOOM.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Weight */}
          <div className="relative group">
            <label className={wizardLabel}>
              Peso (kg) <span className="text-deal">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value })}
                placeholder="0.00"
                className={`${wizardInput(Boolean(errors.weightKg))} pr-12`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">kg</span>
            </div>
            <EpicTooltip message={errors.weightKg || ''} visible={!!errors.weightKg} position="right" />
          </div>

          {/* Dimensions */}
          <div>
            <label className={wizardLabel}>
              Dimensiones (cm) <span className="text-deal">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([['dimensionLength', 'L'], ['dimensionWidth', 'A'], ['dimensionHeight', 'H']] as const).map(([field, lbl]) => (
                <div key={field} className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={data[field]}
                    onChange={(e) => onChange({ [field]: e.target.value } as Partial<StepProps['data']>)}
                    placeholder="0"
                    className={`${wizardInput(Boolean(errors.dimensions))} pr-7 px-2.5 text-xs`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">{lbl}</span>
                </div>
              ))}
            </div>
            {errors.dimensions && <p className={wizardError}>{errors.dimensions}</p>}
          </div>
        </div>

        {/* Shipping type */}
        <div className="pt-4 border-t border-line">
          <label className={wizardLabel}>Tipo de envío</label>
          <div className="space-y-3">
            {[
              { val: true, title: 'Consolidable (Recomendado)', desc: 'Productos pequeños que se envían junto con otros en la misma caja.', badge: 'green' },
              { val: false, title: 'Envío individual', desc: 'Para TVs y electrodomésticos grandes: viaja como un bulto aparte.', badge: 'amber' },
            ].map(({ val, title, desc, badge }) => (
              <div
                key={String(val)}
                onClick={() => onChange({ isConsolidable: val })}
                className={[
                  'p-4 rounded-xl border-2 cursor-pointer transition-all',
                  data.isConsolidable === val
                    ? badge === 'green' ? 'border-success-strong bg-success-strong/10' : 'border-warning-strong bg-warning/10'
                    : 'border-line hover:border-line-strong',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className={[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    data.isConsolidable === val
                      ? badge === 'green' ? 'border-success-strong bg-success-strong' : 'border-warning-strong bg-warning-strong'
                      : 'border-line',
                  ].join(' ')}>
                    {data.isConsolidable === val && <FiCheck className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="text-xs text-muted mt-0.5">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* C-100: envío gratis por producto (la tienda paga la guía de todo el paquete) */}
        <div className="pt-4 border-t border-line">
          <div className="flex items-start justify-between gap-4">
            <label htmlFor="free-shipping" className="min-w-0 cursor-pointer">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <FiTruck className="h-4 w-4 text-success-strong" aria-hidden="true" /> Envío gratis
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Para productos de alto precio. La tienda paga el envío de todo el pedido que lo lleve y el producto muestra el badge &quot;Envío gratis&quot;.
              </span>
            </label>
            <button
              id="free-shipping"
              type="button"
              role="switch"
              aria-checked={data.freeShipping}
              onClick={() => onChange({ freeShipping: !data.freeShipping })}
              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${data.freeShipping ? 'bg-success-strong' : 'bg-subtle'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${data.freeShipping ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
