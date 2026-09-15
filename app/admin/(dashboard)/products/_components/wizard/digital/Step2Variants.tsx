'use client';

import { FiAlertTriangle, FiArrowDown, FiArrowUp, FiPlus, FiTrash2 } from 'react-icons/fi';
import { formatUSD } from '@/lib/currency';
import { DIGITAL_PROVIDERS, DIGITAL_UNIT_KEYS, DIGITAL_UNITS, formatFaceValue, getPlatform, type DigitalProvider, type DigitalUnit } from '@/lib/digital-catalog';
import { newVariantRow, rowMargin, type StepProps, type VariantRow } from '../types';
import { wizardCard, wizardError, wizardHint, wizardInput, wizardSecondaryButton, wizardSectionHelp, wizardSectionTitle } from '../ui';

const num = (value: string) => Number.parseFloat(value.replace(',', '.'));
const variantLabel = 'mb-1 block text-xs font-semibold text-ink-soft';

/**
 * Paso 2 del producto digital (C-60): los montos que se venden.
 * Cada fila: monto + unidad ("800 Robux", "$25"), costo en el proveedor, precio de venta, margen y proveedor.
 */
export default function DigitalStep2Variants({ data, onChange, errors }: StepProps) {
  const rows = data.digitalVariants;
  const platform = getPlatform(data.digitalPlatform);
  const defaultUnit: DigitalUnit = rows[rows.length - 1]?.unit ?? platform?.unit ?? 'USD';

  const setRows = (next: VariantRow[]) => onChange({ digitalVariants: next });
  const update = (key: string, changes: Partial<VariantRow>) =>
    setRows(
      rows.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...changes };
        // La etiqueta sigue al monto y la unidad mientras no se haya escrito a mano
        if (!next.labelEdited && ('faceValue' in changes || 'unit' in changes)) {
          const value = num(next.faceValue);
          next.label = value > 0 ? formatFaceValue(value, next.unit) : '';
        }
        return next;
      })
    );
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };
  const applyMargin = () => {
    const factor = 1 + data.marginPercent / 100;
    setRows(rows.map((row) => (num(row.costUSD) > 0 ? { ...row, priceUSD: (Math.ceil(num(row.costUSD) * factor * 100) / 100).toFixed(2) } : row)));
  };
  const setProviderForAll = (provider: DigitalProvider | '') => setRows(rows.map((row) => ({ ...row, provider })));

  const active = rows.filter((r) => r.isActive && num(r.priceUSD) > 0);
  const minPrice = active.length > 0 ? Math.min(...active.map((r) => num(r.priceUSD))) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={wizardSectionTitle}>Montos y precios</h2>
        <p className={wizardSectionHelp}>
          Cada monto es lo que el cliente elige en la tienda. El costo es lo que pagas en tu proveedor al comprar el código: solo lo ves tú.
        </p>
      </div>

      <div className={`${wizardCard} flex flex-col gap-4 bg-surface lg:flex-row lg:items-end`}>
        <div className="flex-1">
          <label htmlFor="margin" className="mb-1.5 block text-sm font-semibold text-ink">Calcular precios con un margen</label>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-28 shrink-0">
              <input id="margin" type="number" min={0} max={300} step={0.5} value={data.marginPercent} onChange={(e) => onChange({ marginPercent: Number(e.target.value) || 0 })} className={`${wizardInput()} pr-8`} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
            </div>
            <button type="button" onClick={applyMargin} className={wizardSecondaryButton}>Aplicar a los que tienen costo</button>
          </div>
          <p className={wizardHint}>Precio = costo + margen, redondeado hacia arriba al centavo.</p>
        </div>
        <div>
          <label htmlFor="provider-all" className="mb-1.5 block text-sm font-semibold text-ink">Proveedor de todos</label>
          <select id="provider-all" onChange={(e) => setProviderForAll(e.target.value as DigitalProvider | '')} defaultValue="" className={`${wizardInput()} sm:w-48`}>
            <option value="">Elegir…</option>
            {DIGITAL_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Todavía no hay montos. {platform ? 'Vuelve al paso 1 y elige la plataforma para cargar sus montos típicos, o agrega uno.' : 'Agrega el primero.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const margin = rowMargin(row);
            const belowCost = margin !== null && margin < 0;
            const id = (field: string) => `variant-${row.key}-${field}`;
            return (
              <li key={row.key} className={`rounded-2xl border p-4 ${row.isActive ? 'border-line bg-white' : 'border-dashed border-line bg-surface'}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={row.isActive} onChange={(e) => update(row.key, { isActive: e.target.checked })} className="h-5 w-5 shrink-0 accent-brand-500" />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-ink">{row.label || 'Monto nuevo'}</span>
                      <span className="block text-xs text-muted">{row.isActive ? 'Se vende en la tienda' : 'No se muestra en la tienda'}</span>
                    </span>
                  </label>
                  {margin !== null && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${belowCost ? 'bg-deal-bg text-deal' : 'bg-success-strong/10 text-success-strong'}`}>
                      {belowCost && <FiAlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
                      Margen {margin.toLocaleString('es-VE', { maximumFractionDigits: 1 })} %
                    </span>
                  )}
                  <div className="flex items-center">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${row.label || 'monto'}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-30"><FiArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Bajar ${row.label || 'monto'}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-30"><FiArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setRows(rows.filter((r) => r.key !== row.key))} aria-label={`Quitar ${row.label || 'monto'}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-deal-bg hover:text-deal"><FiTrash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor={id('face')} className={variantLabel}>Monto</label>
                    <input id={id('face')} type="number" min={0} step="any" inputMode="decimal" value={row.faceValue} onChange={(e) => update(row.key, { faceValue: e.target.value })} className={wizardInput()} />
                  </div>
                  <div>
                    <label htmlFor={id('unit')} className={variantLabel}>Unidad</label>
                    <select id={id('unit')} value={row.unit} onChange={(e) => update(row.key, { unit: e.target.value as DigitalUnit })} className={wizardInput()}>
                      {DIGITAL_UNIT_KEYS.map((u) => <option key={u} value={u}>{DIGITAL_UNITS[u].name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={id('label')} className={variantLabel}>Etiqueta en la tienda</label>
                    <input id={id('label')} value={row.label} maxLength={60} onChange={(e) => update(row.key, { label: e.target.value, labelEdited: true })} className={wizardInput()} />
                  </div>
                  <div>
                    <label htmlFor={id('cost')} className={variantLabel}>Costo (USD)</label>
                    <input id={id('cost')} type="number" min={0} step="0.01" inputMode="decimal" value={row.costUSD} onChange={(e) => update(row.key, { costUSD: e.target.value })} placeholder="0,00" className={wizardInput()} />
                  </div>
                  <div>
                    <label htmlFor={id('price')} className={variantLabel}>Precio de venta (USD)</label>
                    <input id={id('price')} type="number" min={0} step="0.01" inputMode="decimal" value={row.priceUSD} onChange={(e) => update(row.key, { priceUSD: e.target.value })} placeholder="0,00" className={wizardInput(row.isActive && !(num(row.priceUSD) > 0) && Boolean(errors.digitalVariants))} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={id('provider')} className={variantLabel}>Proveedor</label>
                    <select id={id('provider')} value={row.provider} onChange={(e) => update(row.key, { provider: e.target.value as DigitalProvider | '' })} className={wizardInput()}>
                      <option value="">Sin definir</option>
                      {DIGITAL_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setRows([...rows, newVariantRow(defaultUnit)])} className={wizardSecondaryButton}>
          <FiPlus className="h-4 w-4" aria-hidden="true" /> Agregar monto
        </button>
        {errors.digitalVariants && <p className={wizardError} role="alert">{errors.digitalVariants}</p>}
      </div>

      <div className={wizardCard}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Así lo verá el cliente</p>
        {active.length > 0 ? (
          <>
            <p className="mt-2 text-lg font-bold text-ink">{active.length > 1 ? 'Desde ' : ''}{formatUSD(minPrice)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {active.map((row) => (
                <div key={row.key} className="flex min-h-14 flex-col items-center justify-center rounded-lg border-2 border-line px-2 py-2">
                  <span className="text-base font-bold text-ink">{row.label}</span>
                  <span className="text-xs text-muted">{formatUSD(num(row.priceUSD))}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Activa al menos un monto con precio para ver la vista previa.</p>
        )}
      </div>
    </div>
  );
}
