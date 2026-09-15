'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiArrowRight, FiCreditCard, FiDownloadCloud, FiRefreshCw } from 'react-icons/fi';
import { adminChoice, adminIconChip, adminNotice, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import type { SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow } from './fields';

interface PricesSectionProps extends SectionProps {
  /** Modo automático tal como está guardado (el botón "Actualizar ahora" solo sirve con el modo ya guardado) */
  savedAutoExchangeRates: boolean;
  lastRateUpdate: string | null;
  onRateRefreshed: (rate: number, lastRateUpdate: string) => void;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'sin registro';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PricesSection({ form, set, errors, savedAutoExchangeRates, lastRateUpdate, onRateRefreshed }: PricesSectionProps) {
  const [loadingRate, setLoadingRate] = useState(false);
  const rate = Number(form.exchangeRateVES) || 0;

  const refreshSavedRate = async () => {
    setLoadingRate(true);
    try {
      const response = await fetch('/api/admin/exchange-rate', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.rate === 'number') {
        onRateRefreshed(data.rate, data.lastRateUpdate);
        toast.success(data.message || 'Tasa actualizada');
      } else {
        toast.error(data.message || data.error || 'No se pudo actualizar la tasa');
      }
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setLoadingRate(false);
    }
  };

  const fillOfficialRate = async () => {
    setLoadingRate(true);
    try {
      const response = await fetch('/api/exchange-rates');
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.VES === 'number' && !data.isFallback) {
        set('exchangeRateVES', String(data.VES));
        toast.success('Tasa del BCV cargada. Recuerda guardar.');
      } else {
        toast.error('La fuente de la tasa no respondió. Escríbela a mano.');
      }
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setLoadingRate(false);
    }
  };

  return (
    <>
      <SettingsCard title="Tasa BCV" description="Con esta tasa se calculan todos los precios en bolívares de la tienda y de las órdenes.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Cómo se actualiza la tasa">
          {[
            { auto: true, title: 'Automática', text: 'Se trae sola del BCV cada hora.' },
            { auto: false, title: 'Manual', text: 'La escribes tú cuando cambie.' },
          ].map((option) => (
            <button
              key={option.title}
              type="button"
              role="radio"
              aria-checked={form.autoExchangeRates === option.auto}
              onClick={() => set('autoExchangeRates', option.auto)}
              className={`${adminChoice(form.autoExchangeRates === option.auto)} p-4`}
            >
              <span className="block text-sm font-semibold text-ink">{option.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{option.text}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
          {form.autoExchangeRates ? (
            <div>
              <p className="text-sm text-muted">Tasa actual</p>
              <p className="text-2xl font-bold tabular-nums text-ink">{rate > 0 ? formatVES(rate) : 'Sin tasa'}</p>
              <p className="mt-0.5 text-xs text-muted">
                {savedAutoExchangeRates ? `Actualizada ${timeAgo(lastRateUpdate)}` : 'Al guardar se trae la tasa del BCV en el momento.'}
              </p>
            </div>
          ) : (
            <NumberField
              label="Bolívares por dólar"
              prefix="Bs"
              value={form.exchangeRateVES}
              onChange={(v) => set('exchangeRateVES', v)}
              error={errors.exchangeRateVES}
              min={0}
              step={0.01}
              hint={lastRateUpdate ? `Último cambio ${timeAgo(lastRateUpdate)}` : undefined}
            />
          )}
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {form.autoExchangeRates ? (
              savedAutoExchangeRates && (
                <button type="button" onClick={refreshSavedRate} disabled={loadingRate} className={adminSecondaryButton}>
                  <FiRefreshCw className={`h-4 w-4 ${loadingRate ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Actualizar ahora
                </button>
              )
            ) : (
              <button type="button" onClick={fillOfficialRate} disabled={loadingRate} className={adminSecondaryButton}>
                <FiDownloadCloud className={`h-4 w-4 ${loadingRate ? 'animate-pulse' : ''}`} aria-hidden="true" />
                Traer tasa del BCV
              </button>
            )}
          </div>
        </div>

        {rate > 0 && (
          <p className={`${adminNotice('neutral')} mt-4 tabular-nums`}>
            Un producto de {formatUSD(10)} se muestra a <strong className="text-ink">{formatVES(10 * rate)}</strong>.
          </p>
        )}
      </SettingsCard>

      <SettingsCard title="IVA">
        <div className="space-y-4">
          <SwitchRow
            label="Cobrar IVA"
            description="Se suma al total de cada orden en el checkout."
            checked={form.taxEnabled}
            onChange={(v) => set('taxEnabled', v)}
          />
          {form.taxEnabled && (
            <NumberField label="Porcentaje" suffix="%" value={form.taxPercent} onChange={(v) => set('taxPercent', v)} error={errors.taxPercent} min={0} max={100} step={0.01} className="max-w-xs" />
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Montos por compra" description="Vacío significa sin límite. Se aplican al total de la orden, con envío.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label="Mínimo" prefix="$" value={form.minOrderAmountUSD} onChange={(v) => set('minOrderAmountUSD', v)} error={errors.minOrderAmountUSD} step={0.01} placeholder="Sin mínimo" />
          <NumberField label="Máximo" prefix="$" value={form.maxOrderAmountUSD} onChange={(v) => set('maxOrderAmountUSD', v)} error={errors.maxOrderAmountUSD} step={0.01} placeholder="Sin máximo" />
        </div>
      </SettingsCard>

      <Link href="/admin/payments" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50">
        <span className={adminIconChip('brand')}>
          <FiCreditCard className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Métodos de pago</span>
          <span className="block text-sm text-muted">Pago Móvil, Zelle, Binance, transferencias y efectivo se configuran en su propia página.</span>
        </span>
        <FiArrowRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </>
  );
}
