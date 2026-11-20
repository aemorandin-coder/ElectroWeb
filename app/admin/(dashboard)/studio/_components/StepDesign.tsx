'use client';

import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { qrUrlFor } from '@/lib/studio/engine';
import { BackgroundPicker, EffectsPicker, FormatPicker, PhotoControls, StoryColors, StylesBar, type DrawThumb } from './DesignControls';
import { sectionSummary, smallButton } from './ui';
import type { Studio } from './useStudio';

export default function StepDesign({ studio, onAnim, drawThumb, imgTick }: { studio: Studio; onAnim: () => void; drawThumb: DrawThumb; imgTick: number }) {
  const { current, update } = studio;
  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      <FormatPicker studio={studio} />
      <NavidadToggle studio={studio} />
      <StylesBar studio={studio} />
      <BackgroundPicker studio={studio} drawThumb={drawThumb} imgTick={imgTick} />
      <PhotoControls studio={studio} />
      <EffectsPicker studio={studio} onAnim={onAnim} />
      <StoryColors studio={studio} />

      <details className="border-t border-line pt-3" open={!!current.offerEnds}>
        <summary className={sectionSummary}>Contador de oferta</summary>
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label htmlFor="f-ends" className={adminLabel}>
              La oferta termina
            </label>
            <input id="f-ends" type="datetime-local" value={current.offerEnds} onChange={(e) => update((f) => ({ ...f, offerEnds: e.target.value }))} className={adminInput()} />
          </div>
          <div>
            <label htmlFor="f-olabel" className={adminLabel}>
              Texto del contador
            </label>
            <input id="f-olabel" type="text" value={current.offerLabel} onChange={(e) => update((f) => ({ ...f, offerLabel: e.target.value }))} placeholder="La oferta termina en" className={adminInput()} />
          </div>
          {current.offerEnds && (
            <button type="button" onClick={() => update((f) => ({ ...f, offerEnds: '' }))} className={`${smallButton} self-start`}>
              Quitar contador
            </button>
          )}
        </div>
      </details>

      <details className="border-t border-line pt-3" open={current.qr}>
        <summary className={sectionSummary}>Código QR</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={current.qr} onChange={(e) => update((f) => ({ ...f, qr: e.target.checked }))} className="h-4 w-4 accent-brand-500" />
            Mostrar código QR
          </label>
          {current.qr && (
            <div>
              <label htmlFor="f-qrurl" className={adminLabel}>
                Enlace del QR
              </label>
              <input
                id="f-qrurl"
                type="url"
                value={current.qrUrl}
                onChange={(e) => update((f) => ({ ...f, qrUrl: e.target.value }))}
                placeholder={qrUrlFor({ ...current, qrUrl: '' }, studio.brand)}
                className={adminInput()}
              />
              <p className={adminHint}>Vacío: lleva a la ficha del producto en la tienda. El QR suma la marca de la historia para contar visitas y compras.</p>
            </div>
          )}
        </div>
      </details>

      <p className={`${adminHint} border-t border-line pt-3`}>
        Logo, métodos de pago y colores globales se configuran en &quot;Ajustes de marca&quot; al inicio de ElectroStudio.
      </p>
    </div>
  );
}

/**
 * C-193: el toque navideño de la historia: el gorro de la tienda en el logo y en Chispa, y en los productos físicos la
 * franja "pide hasta el … para que llegue antes del 24" con las fechas de Marketing → Navidad.
 */
function NavidadToggle({ studio }: { studio: Studio }) {
  const { current, update, store } = studio;
  if (!current) return null;
  const nav = store?.navidad;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" checked={current.navidad} onChange={(e) => update((f) => ({ ...f, navidad: e.target.checked }))} className="h-4 w-4 accent-brand-500" />
        Toque navideño
      </label>
      <p className={adminHint}>
        El gorro de la tienda en el logo y en Chispa.
        {nav?.franja ? ` En los productos físicos: "${nav.franja.titulo}".` : ' La franja del 24 sale cuando estén las fechas en Marketing → Navidad y el tema encendido.'}
      </p>
    </div>
  );
}
