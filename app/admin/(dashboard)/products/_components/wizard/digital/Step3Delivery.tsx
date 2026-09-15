'use client';

import { FiKey, FiUserCheck } from 'react-icons/fi';
import { DELIVERY_MODES, getPlatform, type DeliveryMode } from '@/lib/digital-catalog';
import type { StepProps } from '../types';
import { wizardCard, wizardChoice, wizardError, wizardHint, wizardInput, wizardLabel, wizardSecondaryButton, wizardSectionHelp, wizardSectionTitle } from '../ui';

const MODE_ICONS: Record<DeliveryMode, typeof FiKey> = { INSTANT: FiKey, MANUAL: FiUserCheck };

/**
 * Paso 3 del producto digital (C-60): cómo se entrega.
 * Los códigos se compran al proveedor cuando se confirma el pago: "Código digital" no promete entrega automática.
 */
export default function DigitalStep3Delivery({ data, onChange, errors }: StepProps) {
  const platform = getPlatform(data.digitalPlatform);
  const isManual = data.deliveryMethod === 'MANUAL';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={wizardSectionTitle}>Entrega</h2>
        <p className={wizardSectionHelp}>Qué recibe el cliente después de pagar. Esto se muestra tal cual en la ficha del producto.</p>
      </div>

      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="sr-only">Modo de entrega</legend>
        {(Object.keys(DELIVERY_MODES) as DeliveryMode[]).map((mode) => {
          const info = DELIVERY_MODES[mode];
          const Icon = MODE_ICONS[mode];
          const selected = data.deliveryMethod === mode;
          return (
            <button key={mode} type="button" onClick={() => onChange({ deliveryMethod: mode })} aria-pressed={selected} className={`${wizardChoice(selected)} flex gap-4 p-4`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-brand-500 text-white' : 'bg-surface text-ink'}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{info.admin}</span>
                <span className="mt-1 block text-sm text-muted">{info.adminHelp}</span>
                <span className="mt-2 block text-xs text-ink-soft">
                  En la tienda: <strong>{info.store}</strong> · {info.storeHelp}
                </span>
              </span>
            </button>
          );
        })}
      </fieldset>

      {isManual && (
        <div className={`${wizardCard} space-y-4`}>
          <div>
            <p className="text-sm font-bold text-ink">Dato de la cuenta que le pedimos al cliente</p>
            <p className={wizardHint}>Aparece como campo obligatorio antes de agregar al carrito y llega en el pedido.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="account-label" className={wizardLabel}>Nombre del campo <span className="text-deal" aria-hidden="true">*</span></label>
              <input id="account-label" value={data.accountFieldLabel} maxLength={80} onChange={(e) => onChange({ accountFieldLabel: e.target.value })} placeholder={platform?.accountFieldLabel || 'Ej: ID de jugador'} className={wizardInput(Boolean(errors.accountFieldLabel))} />
              {errors.accountFieldLabel && <p className={wizardError}>{errors.accountFieldLabel}</p>}
            </div>
            <div>
              <label htmlFor="account-hint" className={wizardLabel}>Ayuda debajo del campo</label>
              <input id="account-hint" value={data.accountFieldHint} maxLength={160} onChange={(e) => onChange({ accountFieldHint: e.target.value })} placeholder={platform?.accountFieldHint || 'Ej: Lo ves en tu perfil dentro del juego'} className={wizardInput()} />
            </div>
          </div>
          <div className="rounded-xl bg-surface p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Vista previa</p>
            <p className="mb-1.5 text-sm font-semibold text-ink">{data.accountFieldLabel || 'Nombre del campo'} <span className="text-deal">*</span></p>
            <div className="flex h-11 items-center rounded-lg border border-line bg-white px-3 text-sm text-muted">{data.accountFieldLabel || 'Nombre del campo'}</div>
            <p className="mt-1 text-xs text-muted">{data.accountFieldHint || 'Recargamos el saldo directo a esta cuenta. Revisa que esté bien escrita.'}</p>
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="instructions" className="text-sm font-semibold text-ink">
            Instrucciones de canje <span className="text-xs font-normal text-muted">(opcional)</span>
          </label>
          {platform?.instructions && data.redemptionInstructions !== platform.instructions && (
            <button type="button" onClick={() => onChange({ redemptionInstructions: platform.instructions })} className={`${wizardSecondaryButton} h-9 px-3 text-xs`}>
              Usar las de {platform.label}
            </button>
          )}
        </div>
        <textarea
          id="instructions"
          value={data.redemptionInstructions}
          onChange={(e) => onChange({ redemptionInstructions: e.target.value })}
          rows={6}
          placeholder={'1. Abre la tienda de la plataforma\n2. Ve a "Canjear código"\n3. Escribe el código'}
          className={`${wizardInput()} h-auto resize-y py-2.5`}
        />
        <p className={wizardHint}>Se muestran en la ficha del producto, en “¿Cómo se canjea?”.</p>
      </div>
    </div>
  );
}
