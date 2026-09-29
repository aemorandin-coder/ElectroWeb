'use client';

import {
  CONDITIONS,
  CONDITION_HELP,
  CONDITION_LABEL,
  DEFAULT_WARRANTY_DAYS,
  GRADES,
  GRADE_DEFINITION,
  GRADE_LABEL,
  PACKAGINGS,
  PACKAGING_LABEL,
  isSecondHand,
  needsGrade,
} from '@/lib/product-condition';
import { wizardChoice, wizardError, wizardHint, wizardInput, wizardLabel } from '../ui';
import type { StepProps } from '../types';

/**
 * Condición del producto (C-119): nuevo, caja abierta, reacondicionado o usado. Lo de un equipo que no es nuevo
 * (grado, empaque, qué incluye, horas, batería, detalles y pruebas) es lo que el cliente ve en la ficha.
 */
export default function ConditionSection({ data, onChange, errors }: Pick<StepProps, 'data' | 'onChange' | 'errors'>) {
  const secondHand = isSecondHand(data.condition);
  const err = (k: string) => (errors[k] ? <p className={wizardError}>{errors[k]}</p> : null);

  return (
    <section className="space-y-5 border-t border-line pt-6" aria-labelledby="cond-title">
      <div>
        <h3 id="cond-title" className="text-lg font-semibold text-ink">
          Condición del producto
        </h3>
        <p className="mt-1 text-sm text-muted">Si no es nuevo, el cliente ve todo lo de abajo en la ficha. Mientras más claro, menos reclamos.</p>
      </div>

      <fieldset>
        <legend className={wizardLabel}>Condición</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={data.condition === c}
              onClick={() => onChange({ condition: c, ...(c === 'NEW' ? { conditionGrade: '', packaging: '' } : {}) })}
              className={`${wizardChoice(data.condition === c)} flex flex-col items-start gap-0.5 p-3 text-left`}
            >
              <span className="text-sm font-semibold text-ink">{CONDITION_LABEL[c]}</span>
              <span className="text-xs text-muted">{CONDITION_HELP[c]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {secondHand && (
        <>
          <fieldset>
            <legend className={wizardLabel}>
              Estado estético{needsGrade(data.condition) ? '' : ' (opcional)'}
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={data.conditionGrade === g}
                  onClick={() => onChange({ conditionGrade: data.conditionGrade === g && !needsGrade(data.condition) ? '' : g })}
                  className={`${wizardChoice(data.conditionGrade === g)} flex flex-col items-start gap-0.5 p-3 text-left`}
                >
                  <span className="text-sm font-semibold text-ink">{GRADE_LABEL[g]}</span>
                  <span className="text-xs text-muted">{GRADE_DEFINITION[g]}</span>
                </button>
              ))}
            </div>
            {err('conditionGrade')}
          </fieldset>

          <fieldset>
            <legend className={wizardLabel}>Empaque</legend>
            <div className="flex flex-wrap gap-2">
              {PACKAGINGS.map((p) => (
                <button key={p} type="button" aria-pressed={data.packaging === p} onClick={() => onChange({ packaging: p })} className={`${wizardChoice(data.packaging === p)} px-4 py-2 text-sm font-semibold`}>
                  {PACKAGING_LABEL[p]}
                </button>
              ))}
            </div>
            {err('packaging')}
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-included" className={wizardLabel}>
                Qué incluye
              </label>
              <textarea id="c-included" rows={2} value={data.includedItems} onChange={(e) => onChange({ includedItems: e.target.value })} placeholder="Ej: Consola, 1 control, cable HDMI y cable de corriente" className={`${wizardInput(!!errors.includedItems)} h-auto py-2`} />
              {err('includedItems')}
            </div>
            <div>
              <label htmlFor="c-missing" className={wizardLabel}>
                Qué no incluye (opcional)
              </label>
              <textarea id="c-missing" rows={2} value={data.missingItems} onChange={(e) => onChange({ missingItems: e.target.value })} placeholder="Ej: Sin audífonos. Control genérico" className={`${wizardInput()} h-auto py-2`} />
            </div>
            <div>
              <label htmlFor="c-hours" className={wizardLabel}>
                Horas de uso (opcional)
              </label>
              <input id="c-hours" type="number" inputMode="numeric" min={0} step={1} value={data.usageHours} onChange={(e) => onChange({ usageHours: e.target.value })} placeholder="Ej: 350" className={wizardInput(!!errors.usageHours)} />
              {err('usageHours')}
            </div>
            <div>
              <label htmlFor="c-battery" className={wizardLabel}>
                Salud de la batería, % (opcional)
              </label>
              <input id="c-battery" type="number" inputMode="numeric" min={1} max={100} step={1} value={data.batteryHealth} onChange={(e) => onChange({ batteryHealth: e.target.value })} placeholder="Ej: 88" className={wizardInput(!!errors.batteryHealth)} />
              {err('batteryHealth')}
            </div>
            <div>
              <label htmlFor="c-cosmetic" className={wizardLabel}>
                Detalles de estética (opcional)
              </label>
              <textarea id="c-cosmetic" rows={2} value={data.cosmeticNotes} onChange={(e) => onChange({ cosmeticNotes: e.target.value })} placeholder="Ej: Rayón leve en la tapa superior" className={`${wizardInput()} h-auto py-2`} />
            </div>
            <div>
              <label htmlFor="c-tests" className={wizardLabel}>
                Pruebas hechas (opcional)
              </label>
              <textarea id="c-tests" rows={2} value={data.testNotes} onChange={(e) => onChange({ testNotes: e.target.value })} placeholder="Ej: Lee discos, WiFi, Bluetooth, puertos USB y HDMI" className={`${wizardInput()} h-auto py-2`} />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-warranty" className={wizardLabel}>
            Garantía de la tienda, en días
          </label>
          <input id="c-warranty" type="number" inputMode="numeric" min={0} max={1095} step={1} value={data.warrantyDays} onChange={(e) => onChange({ warrantyDays: e.target.value })} placeholder={String(DEFAULT_WARRANTY_DAYS[data.condition])} className={wizardInput(!!errors.warrantyDays)} />
          {err('warrantyDays') ?? <p className={wizardHint}>Vacío: {DEFAULT_WARRANTY_DAYS[data.condition]} días, la de {CONDITION_LABEL[data.condition].toLowerCase()}.</p>}
        </div>
        <div>
          <label htmlFor="c-serial" className={wizardLabel}>
            Número de serie (interno, opcional)
          </label>
          <input id="c-serial" type="text" value={data.serialNumber} onChange={(e) => onChange({ serialNumber: e.target.value })} maxLength={80} className={wizardInput()} />
          <p className={wizardHint}>Solo lo ven los administradores. Sirve para atender la garantía de esta unidad.</p>
        </div>
      </div>
    </section>
  );
}
