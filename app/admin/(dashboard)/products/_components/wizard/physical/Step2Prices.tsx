'use client';

import { useSession } from 'next-auth/react';
import { FiAlertTriangle, FiInfo, FiTruck } from 'react-icons/fi';
import { useSettings } from '@/contexts/SettingsContext';
import { formatUSD } from '@/lib/currency';
import { desglosePrecio, formatMargen, MARGEN_SUGERIDO, precioSugerido } from '@/lib/precio-sugerido';
import { StepProps, leerNumero } from '../types';
import { wizardChoice, wizardInput, wizardSectionTitle, wizardSectionHelp } from '../ui';
import { Campo, Seccion, controlDe } from '../Campo';

// C-134: secciones sin tarjeta dentro de la tarjeta, una columna en el teléfono, los números con coma o punto
// ("49,90") y el tipo de envío como radio (antes era un <div> con clic: no se elegía con el teclado).
// C-146b: del costo sale el precio sugerido (costo + 30 % + IVA) y el margen es el real: sobre el costo y sin el IVA
// que el precio lleva dentro. Antes "Margen" era ganancia entre precio, con el IVA contado como ganancia.

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
  const { settings } = useSettings();
  const { data: session } = useSession();
  const iva = settings?.taxEnabled ? settings.taxPercent : 0;
  const precio = leerNumero(data.priceUSD);
  const costo = leerNumero(data.costPerItem);
  const sugerido = precioSugerido(costo, iva);
  const desglose = desglosePrecio(precio, costo > 0 ? costo : null, iva);
  const ganancia = desglose?.gananciaUSD ?? null;
  const margen = desglose?.margenPercent ?? null;
  const formula = `costo + ${MARGEN_SUGERIDO} %${iva > 0 ? ` + IVA ${String(iva).replace('.', ',')} %` : ''}`;
  // El aviso del tope es solo para el dueño (decisión D7 de C-120)
  const pasaDelTope = session?.user?.role === 'SUPER_ADMIN' && margen !== null && margen > MARGEN_SUGERIDO + 0.05;

  return (
    <div className="space-y-5">
      <div>
        <h2 className={wizardSectionTitle}>Precio, stock y envío</h2>
        <p className={wizardSectionHelp}>En dólares. Puedes escribir 49,90 o 49.90.</p>
      </div>

      <Seccion id="sec-precios" titulo="Precio">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="p-costo" label="Costo" error={errors.costPerItem} hint="Lo que te cuesta puesto en la tienda. Solo lo ve el equipo">
            <Monto id="p-costo" value={data.costPerItem} onChange={(v) => onChange({ costPerItem: v })} error={errors.costPerItem} hint="hint" />
          </Campo>
          <Campo id="p-precio" label="Precio de venta" required error={errors.priceUSD} hint={iva > 0 ? 'Con el IVA incluido: es lo que paga el cliente' : undefined}>
            <Monto id="p-precio" value={data.priceUSD} onChange={(v) => onChange({ priceUSD: v })} error={errors.priceUSD} hint={iva > 0 ? 'hint' : undefined} />
          </Campo>
          {sugerido !== null && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 sm:col-span-2" aria-live="polite">
              <p className="min-w-0 text-sm text-ink-soft">
                Precio sugerido: <strong className="tabular-nums text-ink">{formatUSD(sugerido)}</strong>
                <span className="block text-xs text-muted">{formula}</span>
              </p>
              <button
                type="button"
                onClick={() => onChange({ priceUSD: sugerido.toFixed(2).replace('.', ',') })}
                disabled={Math.abs(precio - sugerido) < 0.005}
                className="inline-flex h-11 shrink-0 items-center rounded-lg border border-brand-500 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-default disabled:border-line disabled:text-muted"
              >
                {Math.abs(precio - sugerido) < 0.005 ? 'Es el precio actual' : 'Usar este precio'}
              </button>
            </div>
          )}
          <Campo id="p-tachado" label="Precio antes (tachado)" error={errors.compareAtPriceUSD} hint="Solo si está en oferta: mayor que el de venta">
            <Monto id="p-tachado" value={data.compareAtPriceUSD} onChange={(v) => onChange({ compareAtPriceUSD: v })} error={errors.compareAtPriceUSD} placeholder="Vacío si no hay oferta" hint="hint" />
          </Campo>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-surface px-4 py-3 sm:self-end" aria-live="polite">
            {iva > 0 && (
              <div className="col-span-2 text-xs text-muted">
                <dt className="sr-only">Precio sin el IVA</dt>
                <dd>{desglose ? `Sin el IVA: ${formatUSD(desglose.baseUSD)} · IVA: ${formatUSD(desglose.ivaUSD)}` : 'Escribe el precio para ver cuánto es IVA'}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted">Margen sobre el costo</dt>
              <dd className={`text-lg font-bold tabular-nums ${margen === null ? 'text-muted' : margen > 0 ? 'text-success-strong' : 'text-deal'}`}>
                {margen === null ? '—' : formatMargen(margen)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ganancia por unidad</dt>
              <dd className={`text-lg font-bold tabular-nums ${ganancia === null ? 'text-muted' : ganancia > 0 ? 'text-success-strong' : 'text-deal'}`}>
                {ganancia === null ? '—' : formatUSD(ganancia)}
              </dd>
            </div>
          </dl>
        </div>
        {ganancia !== null && ganancia <= 0 && (
          <p className="flex items-start gap-2 text-sm font-medium text-deal" role="alert">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {iva > 0 ? 'Quitando el IVA, lo' : 'Lo'} vendes {ganancia === 0 ? 'al costo' : 'por debajo del costo'}. Revisa el precio.
          </p>
        )}
        {pasaDelTope && (
          <p className="flex items-start gap-2 text-sm text-warning-strong">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              El margen pasa del {MARGEN_SUGERIDO} % sobre el costo que escribiste. El tope de la Ley de Precios Justos se mide sobre todos tus costos (flete, gastos de la tienda): confírmalo con tu contador. Este aviso solo lo ves tú.
            </span>
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
            ZOOM o MRW con cobro a destino: con el peso y las medidas la tienda elige el empaque, cobra su embalaje y muestra la tarifa de referencia.
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
              { val: false, title: 'Bulto aparte', desc: 'TVs y electrodomésticos grandes: viajan solos, en su propia caja.' },
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
