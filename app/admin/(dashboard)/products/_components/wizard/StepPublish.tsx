'use client';

import Image from 'next/image';
import { FiAlertCircle, FiCheck, FiMonitor, FiTruck, FiZap } from 'react-icons/fi';
import { formatUSD } from '@/lib/currency';
import { DELIVERY_MODES, getPlatform } from '@/lib/digital-catalog';
import { leerNumero, type WizardData } from './types';
import { wizardPrimaryButton, wizardSecondaryButton, wizardSectionHelp, wizardSectionTitle } from './ui';

interface Props {
  data: WizardData;
  errors: Record<string, string>;
  isLoading: boolean;
  isEditing: boolean;
  /** Estado con el que se cargó el producto (al editar): cambia qué dicen los botones */
  estadoActual?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  onPublish: () => void;
  onDraft: () => void;
}

const num = (value: string) => Number.parseFloat((value || '').replace(',', '.'));

/** Último paso: vista previa como tarjeta de la tienda, lista de verificación y publicar o guardar borrador. */
export default function StepPublish({ data, errors, isLoading, isEditing, estadoActual, onPublish, onDraft }: Props) {
  const mainImage = data.images[0] ?? null;
  const isPhysical = data.productType === 'PHYSICAL';
  const activeVariants = data.digitalVariants.filter((v) => v.isActive && num(v.priceUSD) > 0);
  const displayPrice = isPhysical ? num(data.priceUSD) || 0 : activeVariants.length > 0 ? Math.min(...activeVariants.map((v) => num(v.priceUSD))) : 0;
  const comparePrice = num(data.compareAtPriceUSD);
  const hasDeal = isPhysical && comparePrice > displayPrice && displayPrice > 0;
  const platform = getPlatform(data.digitalPlatform);

  // C-134: "recomendado" no frena la publicación; lo demás sí. C-136: las especificaciones ya no se cuentan (hay productos con una)
  const checks: Array<{ ok: boolean; label: string; recomendado?: boolean }> = isPhysical
    ? [
        { ok: Boolean(data.name.trim()), label: 'Nombre del producto' },
        { ok: Boolean(data.sku.trim()), label: 'SKU' },
        { ok: Boolean(data.categoryId), label: 'Categoría' },
        { ok: data.images.length > 0, label: 'Al menos una imagen' },
        { ok: displayPrice > 0, label: 'Precio de venta' },
        { ok: leerNumero(data.weightKg) > 0, label: 'Peso (para calcular el envío)' },
        { ok: [data.dimensionLength, data.dimensionWidth, data.dimensionHeight].every((m) => leerNumero(m) > 0), label: 'Medidas de la caja' },
      ]
    : [
        { ok: Boolean(data.name.trim()), label: 'Nombre del producto' },
        { ok: Boolean(data.sku.trim()), label: 'SKU' },
        { ok: Boolean(data.digitalPlatform), label: 'Plataforma' },
        { ok: Boolean(data.categoryId), label: 'Categoría' },
        { ok: data.images.length > 0, label: 'Al menos una imagen' },
        { ok: activeVariants.length > 0, label: 'Al menos un monto activo con precio' },
        { ok: data.deliveryMethod !== 'MANUAL' || Boolean(data.accountFieldLabel.trim()), label: 'Dato de cuenta para la recarga directa' },
      ];
  const missing = checks.filter((c) => !c.ok && !c.recomendado).length;
  const publicado = estadoActual === 'PUBLISHED';

  return (
    <div className="space-y-8">
      <div>
        <h2 className={wizardSectionTitle}>Revisar y publicar</h2>
        <p className={wizardSectionHelp}>Así se verá la tarjeta en la tienda.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Tarjeta en la tienda</p>
          <article className="max-w-xs overflow-hidden rounded-xl border border-line bg-white">
            <div className="relative aspect-square bg-white">
              {mainImage ? (
                <Image src={mainImage} alt={data.name || 'Producto'} fill sizes="320px" className="object-contain" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted">
                  {isPhysical ? <FiTruck className="mb-2 h-10 w-10" aria-hidden="true" /> : <FiMonitor className="mb-2 h-10 w-10" aria-hidden="true" />}
                  <p className="text-xs font-medium">Sin imagen</p>
                </div>
              )}
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {hasDeal && <span className="rounded bg-deal px-1.5 py-0.5 text-[11px] font-semibold text-white">-{Math.round((1 - displayPrice / comparePrice) * 100)}%</span>}
                {!isPhysical && <span className="inline-flex items-center gap-0.5 rounded bg-brand-600 px-1.5 py-0.5 text-[11px] font-semibold text-white"><FiZap className="h-3 w-3" aria-hidden="true" />DIGITAL</span>}
              </div>
            </div>
            <div className="space-y-2 p-3">
              <p className="text-xs font-medium text-muted">{platform?.label ?? (isPhysical ? 'Producto físico' : 'Producto digital')}</p>
              <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-ink">{data.name || 'Nombre del producto'}</h3>
              <p className="text-xl font-bold text-ink">
                {!isPhysical && activeVariants.length > 1 && <span className="mr-1 text-xs font-medium text-muted">Desde</span>}
                {displayPrice > 0 ? formatUSD(displayPrice) : '—'}
              </p>
              {hasDeal && <p className="text-xs text-muted line-through">{formatUSD(comparePrice)}</p>}
              <p className={`flex items-center gap-1.5 text-xs font-medium ${isPhysical && !(Number(data.stock) > 0) ? 'text-deal' : 'text-success-strong'}`}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
                {isPhysical ? (Number(data.stock) > 0 ? `En stock (${data.stock})` : 'Agotado') : DELIVERY_MODES[data.deliveryMethod].store}
              </p>
              <div className="flex h-10 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white">
                {isPhysical ? 'Agregar al carrito' : 'Elegir monto'}
              </div>
            </div>
          </article>
          {!isPhysical && activeVariants.length > 0 && (
            <div className="mt-3 flex max-w-xs flex-wrap gap-1.5">
              {activeVariants.map((v) => (
                <span key={v.key} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  {v.label} · {formatUSD(num(v.priceUSD))}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className={`rounded-2xl border-2 p-4 ${missing === 0 ? 'border-success-strong/30 bg-success-strong/5' : 'border-warning-strong/30 bg-warning/10'}`}>
            <p className={`mb-3 flex items-center gap-2 text-sm font-bold ${missing === 0 ? 'text-success-strong' : 'text-warning-strong'}`}>
              {missing === 0 ? <FiCheck className="h-5 w-5" aria-hidden="true" /> : <FiAlertCircle className="h-5 w-5" aria-hidden="true" />}
              {missing === 0 ? 'Listo para publicar' : `Falta${missing === 1 ? '' : 'n'} ${missing} dato${missing === 1 ? '' : 's'}`}
            </p>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label} className={`flex items-center gap-2 text-sm ${c.ok ? 'text-ink' : c.recomendado ? 'text-muted' : 'text-warning-strong'}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-success-strong text-white' : c.recomendado ? 'bg-line' : 'bg-warning/30'}`}>
                    {c.ok ? <FiCheck className="h-3 w-3" aria-hidden="true" /> : <FiAlertCircle className="h-3 w-3" aria-hidden="true" />}
                  </span>
                  {c.label}{!c.ok && c.recomendado && ' (recomendado)'}
                </li>
              ))}
            </ul>
          </div>

          {errors.images && <p className="rounded-xl border border-deal/30 bg-deal-bg p-3 text-sm font-semibold text-deal">{errors.images}</p>}

        </div>
      </div>

      {/* sm:flex-1: en columna, flex-1 les quitaba la altura y los botones salían aplastados en el teléfono (C-134) */}
      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
        {/* C-134: al editar un borrador, el botón principal decía "Guardar cambios" y lo publicaba */}
        <button type="button" onClick={onDraft} disabled={isLoading} className={`${wizardSecondaryButton} h-12 sm:flex-1`}>
          {isEditing && publicado ? 'Pasar a borrador' : 'Guardar como borrador'}
        </button>
        <button type="button" onClick={onPublish} disabled={isLoading || missing > 0} className={`${wizardPrimaryButton} h-12 sm:flex-1`}>
          {isLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Guardando" />
          ) : (
            <>
              <FiCheck className="h-5 w-5" aria-hidden="true" />
              {isEditing && publicado ? 'Guardar cambios' : 'Publicar producto'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
