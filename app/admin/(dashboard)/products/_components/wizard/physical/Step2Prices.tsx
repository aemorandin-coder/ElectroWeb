'use client';

import { FiAlertTriangle, FiInfo, FiTruck } from 'react-icons/fi';
import { formatUSD } from '@/lib/currency';
import { StepProps, leerNumero } from '../types';
import { wizardChoice, wizardInput, wizardSectionTitle, wizardSectionHelp } from '../ui';
import { Campo, Seccion, controlDe } from '../Campo';

// C-134: secciones sin tarjeta dentro de la tarjeta, una columna en el teléfono, los números con coma o punto
// ("49,90") y el tipo de envío como radio (antes era un <div> con clic: no se elegía con el teclado).

function Monto({ id, value, onChange, error, placeholder = '0,00', hint }: {
  id: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted" aria-hidden="true">$</span>
      <input
        {...controlDe(id, error, hint)}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        placeholder={placeholder}
        className={`${wizardInput(Boolean(error))} pl-7 tabular-nums`}
      />
    </div>
  );
}

export default function PhysicalStep2Prices({ data, onChange, errors }: StepProps) {
  const precio = leerNumero(data.priceUSD);
  const costo = leerNumero(data.costPerItem);
  const ganancia = precio > 0 && costo >= 0 && data.costPerItem.trim() ? precio - costo : null;
  const margen = ganancia !== null && precio > 0 ? (ganancia / precio) * 100 : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className={wizardSectionTitle}>Precio, stock y envío</h2>
        <p className={wizardSectionHelp}>En dólares. Puedes escribir 49,90 o 49.90.</p>
      </div>

      <Seccion id="sec-precios" titulo="Precio">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="p-precio" label="Precio de venta" required error={errors.priceUSD}>
            <Monto id="p-precio" value={data.priceUSD} onChange={(v) => onChange({ priceUSD: v })} error={errors.priceUSD} />
          </Campo>
          <Campo id="p-tachado" label="Precio antes (tachado)" error={errors.compareAtPriceUSD} hint="Solo si está en oferta: mayor que el de venta">
            <Monto id="p-tachado" value={data.compareAtPriceUSD} onChange={(v) => onChange({ compareAtPriceUSD: v })} error={errors.compareAtPriceUSD} placeholder="Vacío si no hay oferta" hint="hint" />
          </Campo>
          <Campo id="p-costo" label="Costo" error={errors.costPerItem} hint="Solo lo ve el equipo">
            <Monto id="p-costo" value={data.costPerItem} onChange={(v) => onChange({ costPerItem: v })} error={errors.costPerItem} hint="hint" />
          </Campo>
          <div className="flex items-center gap-6 rounded-xl bg-surface px-4 py-3 sm:self-end" aria-live="polite">
            <div>
              <span className="block text-xs text-muted">Margen</span>
              <span className={`text-lg font-bold tabular-nums ${margen === null ? 'text-muted' : margen > 0 ? 'text-success-strong' : 'text-deal'}`}>
                {margen === null ? '—' : `${margen.toFixed(1).replace('.', ',')} %`}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted">Ganancia por unidad</span>
              <span className={`text-lg font-bold tabular-nums ${ganancia === null ? 'text-muted' : ganancia > 0 ? 'text-success-strong' : 'text-deal'}`}>
                {ganancia === null ? '—' : formatUSD(ganancia)}
              </span>
            </div>
          </div>
        </div>
        {ganancia !== null && ganancia <= 0 && (
          <p className="flex items-start gap-2 text-sm font-medium text-deal">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Lo vendes {ganancia === 0 ? 'al costo' : 'por debajo del costo'}. Revisa el precio.
          </p>
        )}
      </Seccion>

      <Seccion id="sec-stock" titulo="Stock">
        <Campo id="p-stock" label="Unidades disponibles" required error={errors.stock} className="max-w-48">
          <input
            {...controlDe('p-stock', errors.stock)}
            type="text"
            inputMode="numeric"
            value={data.stock}
            onChange={(e) => onChange({ stock: e.target.value.replace(/\D/g, '') })}
            className={`${wizardInput(Boolean(errors.stock))} tabular-nums`}
          />
        </Campo>
      </Seccion>

      <Seccion
        id="sec-envio"
        titulo="Envío"
        ayuda={(
          <span className="inline-flex items-start gap-1.5">
            <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            ZOOM o MRW con cobro a destino: el peso y las medidas dan la tarifa de referencia que ve el cliente.
          </span>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
          <Campo id="p-peso" label="Peso" required error={errors.weightKg}>
            <div className="relative">
              <input
                {...controlDe('p-peso', errors.weightKg)}
                type="text"
                inputMode="decimal"
                value={data.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value.replace(/[^\d.,]/g, '') })}
                placeholder="0,5"
                className={`${wizardInput(Boolean(errors.weightKg))} pr-10 tabular-nums`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">kg</span>
            </div>
          </Campo>
          <fieldset className="min-w-0">
            <legend className="mb-1.5 block text-sm font-semibold text-ink">
              Medidas de la caja <span className="font-normal text-muted">(cm)</span><span className="text-deal" aria-hidden="true"> *</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {([['dimensionLength', 'Largo'], ['dimensionWidth', 'Ancho'], ['dimensionHeight', 'Alto']] as const).map(([field, lbl]) => (
                <label key={field} className="min-w-0">
                  <span className="sr-only">{lbl} en cm</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data[field]}
                    onChange={(e) => onChange({ [field]: e.target.value.replace(/[^\d.,]/g, '') } as Partial<StepProps['data']>)}
                    placeholder={lbl}
                    aria-invalid={errors.dimensions ? true : undefined}
                    aria-describedby={errors.dimensions ? 'p-medidas-error' : undefined}
                    className={`${wizardInput(Boolean(errors.dimensions))} px-2.5 tabular-nums`}
                  />
                </label>
              ))}
            </div>
            {errors.dimensions && <p id="p-medidas-error" className="mt-1 text-xs font-medium text-deal">{errors.dimensions}</p>}
          </fieldset>
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold text-ink">Cómo viaja</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { val: true, title: 'En el mismo paquete', desc: 'Productos pequeños: van junto con el resto del pedido. Lo normal.' },
              { val: false, title: 'Bulto aparte', desc: 'TVs y electrodomésticos grandes: viajan solos.' },
            ].map(({ val, title, desc }) => (
              <label key={String(val)} className={`${wizardChoice(data.isConsolidable === val)} flex cursor-pointer items-start gap-3 p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500`}>
                <input
                  type="radio"
                  name="consolidable"
                  checked={data.isConsolidable === val}
                  onChange={() => onChange({ isConsolidable: val })}
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-xs text-muted">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* C-100: envío gratis por producto (la tienda paga la guía de todo el paquete) */}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
          <label htmlFor="free-shipping" className="min-w-0 cursor-pointer">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <FiTruck className="h-4 w-4 text-success-strong" aria-hidden="true" /> Envío gratis
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              La tienda paga el envío de todo el pedido que lo lleve. Para productos de alto precio.
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
      </Seccion>
    </div>
  );
}
