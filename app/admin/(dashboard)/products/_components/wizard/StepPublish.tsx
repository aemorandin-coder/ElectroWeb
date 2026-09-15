'use client';

import Image from 'next/image';
import { FiAlertCircle, FiCheck, FiMonitor, FiTruck, FiZap } from 'react-icons/fi';
import { formatUSD } from '@/lib/currency';
import { DELIVERY_MODES, getPlatform } from '@/lib/digital-catalog';
import type { WizardData } from './types';
import { wizardCard, wizardPrimaryButton, wizardSecondaryButton, wizardSectionHelp, wizardSectionTitle } from './ui';

interface Props {
  data: WizardData;
  errors: Record<string, string>;
  isLoading: boolean;
  isEditing: boolean;
  onPublish: () => void;
  onDraft: () => void;
}

const num = (value: string) => Number.parseFloat((value || '').replace(',', '.'));

/** Último paso: vista previa como tarjeta de la tienda, lista de verificación y publicar o guardar borrador. */
export default function StepPublish({ data, errors, isLoading, isEditing, onPublish, onDraft }: Props) {
  const mainImage = data.images[0] ?? null;
  const isPhysical = data.productType === 'PHYSICAL';
  const activeVariants = data.digitalVariants.filter((v) => v.isActive && num(v.priceUSD) > 0);
  const displayPrice = isPhysical ? num(data.priceUSD) || 0 : activeVariants.length > 0 ? Math.min(...activeVariants.map((v) => num(v.priceUSD))) : 0;
  const comparePrice = num(data.compareAtPriceUSD);
  const hasDeal = isPhysical && comparePrice > displayPrice && displayPrice > 0;
  const platform = getPlatform(data.digitalPlatform);

  const checks = isPhysical
    ? [
        { ok: Boolean(data.name.trim()), label: 'Nombre del producto' },
        { ok: Boolean(data.sku.trim()), label: 'SKU' },
        { ok: Boolean(data.categoryId), label: 'Categoría' },
        { ok: data.images.length > 0, label: 'Al menos una imagen' },
        { ok: displayPrice > 0, label: 'Precio de venta' },
        { ok: num(data.weightKg) > 0, label: 'Peso (para calcular el envío)' },
        { ok: Object.keys(data.specifications).length >= 3, label: 'Al menos 3 especificaciones' },
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
  const missing = checks.filter((c) => !c.ok).length;

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
                <Image src={mainImage} alt={data.name || 'Producto'} fill sizes="320px" className="object-contain p-3" />
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
                <li key={c.label} className={`flex items-center gap-2 text-sm ${c.ok ? 'text-ink' : 'text-warning-strong'}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-success-strong text-white' : 'bg-warning/30'}`}>
                    {c.ok ? <FiCheck className="h-3 w-3" aria-hidden="true" /> : <FiAlertCircle className="h-3 w-3" aria-hidden="true" />}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          {errors.images && <p className="rounded-xl border border-deal/30 bg-deal-bg p-3 text-sm font-semibold text-deal">{errors.images}</p>}

          {data.name && (
            <dl className={`${wizardCard} space-y-2 text-sm`}>
              <div className="flex justify-between gap-3"><dt className="text-muted">Tipo</dt><dd className="font-semibold text-ink">{isPhysical ? 'Físico' : `Digital · ${platform?.label ?? '—'}`}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">SKU</dt><dd className="font-mono text-xs text-ink">{data.sku || '—'}</dd></div>
              {isPhysical ? (
                <div className="flex justify-between gap-3"><dt className="text-muted">Precio</dt><dd className="font-semibold text-ink">{displayPrice > 0 ? formatUSD(displayPrice) : '—'}</dd></div>
              ) : (
                <>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Montos activos</dt><dd className="font-semibold text-ink">{activeVariants.length} de {data.digitalVariants.length}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Entrega</dt><dd className="font-semibold text-ink">{DELIVERY_MODES[data.deliveryMethod].admin}</dd></div>
                </>
              )}
              <div className="flex justify-between gap-3"><dt className="text-muted">Imágenes</dt><dd className={`font-semibold ${data.images.length > 0 ? 'text-success-strong' : 'text-deal'}`}>{data.images.length} / 8</dd></div>
            </dl>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
        <button type="button" onClick={onDraft} disabled={isLoading} className={`${wizardSecondaryButton} h-12 flex-1`}>
          Guardar como borrador
        </button>
        <button type="button" onClick={onPublish} disabled={isLoading || missing > 0} className={`${wizardPrimaryButton} h-12 flex-1`}>
          {isLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Guardando" />
          ) : (
            <>
              <FiCheck className="h-5 w-5" aria-hidden="true" />
              {isEditing ? 'Guardar cambios' : 'Publicar producto'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
