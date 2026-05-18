'use client';

import EpicTooltip from '@/components/EpicTooltip';
import { StepProps } from '../types';
import { FiCheck, FiInfo } from 'react-icons/fi';
import { MdOutlineLocalShipping } from 'react-icons/md';

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
        <h2 className="text-xl font-bold text-gray-900">Precios e Inventario</h2>
        <p className="text-sm text-gray-500 mt-1">Precio de venta, costos, stock y datos de envío.</p>
      </div>

      {/* Pricing */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-gray-500">Precios</h3>

        <div className="grid grid-cols-2 gap-5">
          <div className="relative group">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Precio de venta (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.priceUSD}
                onChange={(e) => onChange({ priceUSD: e.target.value })}
                placeholder="0.00"
                className={[
                  'w-full pl-8 pr-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
                  errors.priceUSD ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
                ].join(' ')}
              />
            </div>
            <EpicTooltip message={errors.priceUSD || ''} visible={!!errors.priceUSD} position="right" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Precio tachado / comparación</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.compareAtPriceUSD}
                onChange={(e) => onChange({ compareAtPriceUSD: e.target.value })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Se muestra tachado en la tienda. Deja vacío si no hay oferta.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Costo por artículo</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.costPerItem}
                onChange={(e) => onChange({ costPerItem: e.target.value })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">No visible para el cliente</p>
          </div>

          <div className="col-span-2 flex items-center gap-8 bg-gray-50 rounded-xl px-5">
            <div>
              <span className="block text-xs text-gray-500 mb-0.5">Margen</span>
              <span className={`text-xl font-bold ${margin && parseFloat(margin) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {margin ? `${margin}%` : '—'}
              </span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <span className="block text-xs text-gray-500 mb-0.5">Ganancia por unidad</span>
              <span className={`text-xl font-bold ${profit && parseFloat(profit) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {profit ? `$${profit}` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Inventario</h3>
        <div className="relative group">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Cantidad en stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={data.stock}
            onChange={(e) => onChange({ stock: e.target.value })}
            className={[
              'w-48 px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
              errors.stock ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
            ].join(' ')}
          />
          <EpicTooltip message={errors.stock || ''} visible={!!errors.stock} position="right" />
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MdOutlineLocalShipping className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Envío y dimensiones</h3>
        </div>

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
          <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Los envíos son manejados por <strong>ZOOM, MRW y TEALCA</strong>. Solo cobramos <strong>$2.50 de embalaje</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Weight */}
          <div className="relative group">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Peso (kg) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value })}
                placeholder="0.00"
                className={[
                  'w-full pr-12 px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
                  errors.weightKg ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
                ].join(' ')}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
            </div>
            <EpicTooltip message={errors.weightKg || ''} visible={!!errors.weightKg} position="right" />
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Dimensiones (cm) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([['dimensionLength', 'L'], ['dimensionWidth', 'A'], ['dimensionHeight', 'H']] as const).map(([field, lbl]) => (
                <div key={field} className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={data[field]}
                    onChange={(e) => onChange({ [field]: e.target.value } as any)}
                    placeholder="0"
                    className={[
                      'w-full pr-7 px-2.5 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 transition-all',
                      errors.dimensions ? 'border-red-300 bg-red-50/30' : 'border-gray-300',
                    ].join(' ')}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{lbl}</span>
                </div>
              ))}
            </div>
            {errors.dimensions && <p className="text-xs text-red-600 mt-1">{errors.dimensions}</p>}
          </div>
        </div>

        {/* Shipping type */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de envío</label>
          <div className="space-y-3">
            {[
              { val: true, title: 'Consolidable (Recomendado)', desc: 'Productos pequeños que se envían junto con otros en la misma caja.', badge: 'green' },
              { val: false, title: 'Envío individual', desc: 'Para TVs, electrodomésticos grandes. Se envía por separado.', badge: 'amber' },
            ].map(({ val, title, desc, badge }) => (
              <div
                key={String(val)}
                onClick={() => onChange({ isConsolidable: val })}
                className={[
                  'p-4 rounded-xl border-2 cursor-pointer transition-all',
                  data.isConsolidable === val
                    ? badge === 'green' ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className={[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    data.isConsolidable === val
                      ? badge === 'green' ? 'border-green-500 bg-green-500' : 'border-amber-500 bg-amber-500'
                      : 'border-gray-300',
                  ].join(' ')}>
                    {data.isConsolidable === val && <FiCheck className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    {!val && data.isConsolidable === false && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-amber-700 mb-1">Costo de envío fijo (USD)</label>
                        <div className="relative w-36">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.shippingCost}
                            onChange={(e) => onChange({ shippingCost: e.target.value })}
                            placeholder="15.00"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
