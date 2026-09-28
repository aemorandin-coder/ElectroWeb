'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { OFFICIAL_LOGO, qrUrlFor } from '@/lib/studio/engine';
import { payIcon } from '@/lib/studio/icons';
import { payKey, payMethods, type StudioBrand } from '@/lib/studio/schema';
import { BackgroundPicker, EffectsPicker, FormatPicker, PhotoControls, StoryColors, StylesBar, type DrawThumb } from './DesignControls';
import StudioIcon from './StudioIcon';
import { uploadStudioImage } from './exporters';
import { sectionSummary, smallButton } from './ui';
import type { Studio } from './useStudio';

export default function StepDesign({ studio, onAnim, drawThumb, imgTick }: { studio: Studio; onAnim: () => void; drawThumb: DrawThumb; imgTick: number }) {
  const { current, update } = studio;
  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      <FormatPicker studio={studio} />
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

      <BrandSettings studio={studio} />
    </div>
  );
}

function BrandSettings({ studio }: { studio: Studio }) {
  const { brand, setBrand, store } = studio;
  const [uploading, setUploading] = useState<string | null>(null);
  const set = (patch: Partial<StudioBrand>) => setBrand((b) => ({ ...b, ...patch }));

  const upload = async (key: string, file: File, apply: (url: string) => void) => {
    setUploading(key);
    try {
      apply(await uploadStudioImage(file));
      toast.success('Imagen guardada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo subir');
    } finally {
      setUploading(null);
    }
  };

  const applyStorePayments = () => {
    if (!store?.payments.length) return;
    const chosen = store.payments.slice(0, 4);
    setBrand((b) => {
      const payLogos = { ...b.payLogos };
      chosen.forEach((p) => {
        if (p.logo && !payLogos[payKey(p.label)]) payLogos[payKey(p.label)] = p.logo;
      });
      return { ...b, payments: chosen.map((p) => p.label).join(' · '), payLogos };
    });
  };

  return (
    <details className="border-t border-line pt-3">
      <summary className={sectionSummary}>Marca y ajustes (para todas las historias)</summary>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <span className="flex h-12 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeño de vista previa */}
            <img src={brand.logoUrl || OFFICIAL_LOGO.color} alt="" className="max-h-full max-w-full object-contain" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">{brand.logoUrl ? 'Logo subido' : 'Logo oficial (color o blanco según el fondo)'}</span>
            <div className="flex flex-wrap gap-2">
              <label className={smallButton}>
                {uploading === 'logo' ? 'Subiendo…' : brand.logoUrl ? 'Cambiar' : 'Subir otro PNG'}
                <input
                  type="file"
                  accept="image/png,image/webp"
                  className="sr-only"
                  disabled={!!uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload('logo', f, (url) => set({ logoUrl: url }));
                    e.target.value = '';
                  }}
                />
              </label>
              {brand.logoUrl && (
                <button type="button" onClick={() => set({ logoUrl: '' })} className={smallButton}>
                  Volver al oficial
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="b-accent" className={adminLabel}>
              Color principal
            </label>
            <input id="b-accent" type="color" value={brand.accent} onChange={(e) => set({ accent: e.target.value })} className="h-11 w-full cursor-pointer rounded-lg border border-line bg-white p-1" />
          </div>
          <div>
            <label htmlFor="b-accent2" className={adminLabel}>
              Color secundario
            </label>
            <input id="b-accent2" type="color" value={brand.accent2} onChange={(e) => set({ accent2: e.target.value })} className="h-11 w-full cursor-pointer rounded-lg border border-line bg-white p-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="b-prefix" className={adminLabel}>
              Símbolo de precio
            </label>
            <select id="b-prefix" value={brand.pricePrefix} onChange={(e) => set({ pricePrefix: e.target.value as StudioBrand['pricePrefix'] })} className={adminInput()}>
              <option value="$">$</option>
              <option value="Ref:">Ref:</option>
              <option value="">Ninguno</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-3 text-sm text-ink">
            <input type="checkbox" checked={brand.showBs} onChange={(e) => set({ showBs: e.target.checked })} className="h-4 w-4 accent-brand-500" />
            Mostrar precio en Bs
          </label>
        </div>

        <div>
          <label htmlFor="b-ship" className={adminLabel}>
            Línea de envíos
          </label>
          <input id="b-ship" type="text" value={brand.shipping} onChange={(e) => set({ shipping: e.target.value })} className={adminInput()} />
        </div>

        <div>
          <label htmlFor="b-pay" className={adminLabel}>
            Métodos de pago
          </label>
          <input id="b-pay" type="text" value={brand.payments} onChange={(e) => set({ payments: e.target.value })} className={adminInput()} />
          <p className={adminHint}>Hasta 4, separados con &quot;·&quot; o comas.</p>
          {!!store?.payments.length && (
            <button type="button" onClick={applyStorePayments} className={`${smallButton} mt-2`}>
              Usar los activos en la tienda ({store.payments.map((p) => p.label).join(', ')})
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className={adminLabel}>Logos de pago (opcional)</p>
          {payMethods(brand).map((m) => {
            const key = payKey(m);
            const src = brand.payLogos[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white text-brand-500">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo pequeño de vista previa
                    <img src={src} alt="" className="max-h-full max-w-full object-contain p-1" />
                  ) : (
                    <StudioIcon name={payIcon(m)} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{m}</span>
                <label className={smallButton}>
                  {uploading === key ? 'Subiendo…' : src ? 'Cambiar' : 'Subir logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={!!uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(key, f, (url) => setBrand((b) => ({ ...b, payLogos: { ...b.payLogos, [key]: url } })));
                      e.target.value = '';
                    }}
                  />
                </label>
                {src && (
                  <button
                    type="button"
                    onClick={() =>
                      setBrand((b) => {
                        const payLogos = { ...b.payLogos };
                        delete payLogos[key];
                        return { ...b, payLogos };
                      })
                    }
                    className={smallButton}
                  >
                    Quitar
                  </button>
                )}
              </div>
            );
          })}
          <p className={adminHint}>Sin logo se usa un ícono.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="b-handle" className={adminLabel}>
              Instagram
            </label>
            <input id="b-handle" type="text" value={brand.handle} onChange={(e) => set({ handle: e.target.value })} className={adminInput()} />
          </div>
          <div>
            <label htmlFor="b-web" className={adminLabel}>
              Web
            </label>
            <input id="b-web" type="text" value={brand.website} onChange={(e) => set({ website: e.target.value })} className={adminInput()} />
          </div>
        </div>
      </div>
    </details>
  );
}
