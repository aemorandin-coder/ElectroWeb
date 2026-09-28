'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiCheckCircle, FiPlus, FiRefreshCw, FiStar, FiTrash2 } from 'react-icons/fi';
import { adminBadge, adminEmpty, adminHint, adminIconButton, adminInput, adminLabel, adminNotice } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { linkCoupon, linkReview } from '@/lib/studio/live';
import type { StudioCoupon, StudioProductSlot, StudioReview } from '@/lib/studio/schema';
import { smallButton } from './ui';
import type { Studio } from './useStudio';

// Formularios de las plantillas nuevas de C-113: cupón, reseña y tasa del día

/** Título de arriba de la historia (la píldora); vacío usa el de la plantilla */
export function HeadingField({ studio, label, placeholder }: { studio: Studio; label: string; placeholder: string }) {
  const { current, update } = studio;
  if (!current) return null;
  return (
    <div>
      <label htmlFor="f-heading" className={adminLabel}>
        {label}
      </label>
      <input id="f-heading" type="text" value={current.heading} onChange={(e) => update((f) => ({ ...f, heading: e.target.value }))} placeholder={placeholder} className={adminInput()} />
    </div>
  );
}

function couponText(c: Pick<StudioCoupon, 'percentOff' | 'amountOffUSD'>): string {
  if (c.percentOff) return `${c.percentOff}% de descuento`;
  if (c.amountOffUSD) return `${formatUSD(c.amountOffUSD)} de descuento`;
  return 'Descuento';
}

export function CouponForm({ studio }: { studio: Studio }) {
  const { current, update } = studio;
  const [list, setList] = useState<StudioCoupon[] | null>(null);
  const load = async () => {
    const res = await fetch('/api/admin/studio/coupons');
    setList(res.ok ? ((await res.json()) as { coupons: StudioCoupon[] }).coupons : []);
  };
  useCargarAlMontar(load);
  if (!current) return null;
  const chosen = current.coupon.code;

  return (
    <div className="flex flex-col gap-3">
      <HeadingField studio={studio} label="Título de arriba" placeholder="Cupón de descuento" />
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Cupón de Descuentos</p>
          <button type="button" onClick={() => void load()} className={smallButton} aria-label="Volver a cargar los cupones">
            <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {list === null ? (
          <p className={adminHint}>Cargando cupones…</p>
        ) : list.length === 0 ? (
          <div className={adminEmpty}>
            <p className="text-sm font-semibold text-ink">No hay cupones vigentes</p>
            <p className="mt-1 text-sm text-muted">Créalo en Descuentos → Ofertas y cupones y vuelve aquí.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {list.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  aria-pressed={chosen === c.code}
                  onClick={() => update((f) => linkCoupon(f, c))}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${
                    chosen === c.code ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200'
                  }`}
                >
                  <span className="rounded-lg border-2 border-dashed border-brand-500 px-2 py-1 font-mono text-sm font-bold text-brand-700">{c.code}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-semibold text-ink">{couponText(c)}</span>
                    <span className="block text-xs text-muted">
                      {[c.label, c.scope, c.minSubtotalUSD ? `mínimo ${formatUSD(c.minSubtotalUSD)}` : '', c.endsAt ? `vence ${new Date(c.endsAt).toLocaleDateString('es-VE')}` : 'sin vencimiento']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className={adminBadge(c.isPublic ? 'neutral' : 'brand')}>{c.isPublic ? 'Público' : 'Privado'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={adminHint}>Los datos del cupón salen de Descuentos y se ponen al día solos. Si vence, la lista de historias te avisa.</p>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <FiStar key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-tag text-tag' : 'text-subtle'}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ReviewForm({ studio }: { studio: Studio }) {
  const { current, update, rememberLive } = studio;
  const [list, setList] = useState<StudioReview[] | null>(null);
  useCargarAlMontar(async () => {
    const res = await fetch('/api/admin/studio/reviews');
    setList(res.ok ? ((await res.json()) as { reviews: StudioReview[] }).reviews : []);
  });
  if (!current) return null;
  const rv = current.review;
  const setReview = (patch: Partial<typeof rv>) => update((f) => ({ ...f, review: { ...f.review, ...patch } }));

  return (
    <div className="flex flex-col gap-3">
      <HeadingField studio={studio} label="Título de arriba" placeholder="Lo que dicen nuestros clientes" />
      <div>
        <p className={adminLabel}>Elegir una reseña aprobada</p>
        {list === null ? (
          <p className={adminHint}>Cargando reseñas…</p>
        ) : list.length === 0 ? (
          <p className={adminNotice('neutral')}>Todavía no hay reseñas aprobadas con comentario. Puedes escribirla abajo.</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={rv.id === r.id}
                  onClick={() => {
                    if (r.product) rememberLive(r.product);
                    update((f) => linkReview(f, r));
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border-2 p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${
                    rv.id === r.id ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200'
                  }`}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-line bg-white">
                    {r.product?.image && <Image src={r.product.image} alt="" fill sizes="44px" className="object-contain" />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <Stars rating={r.rating} />
                      <span className="font-semibold text-ink">{r.author}</span>
                      {r.verified && (
                        <span className={adminBadge('success')}>
                          <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                          Verificada
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-ink-soft">{r.comment}</span>
                    {r.product && <span className="block truncate text-xs text-muted">{r.product.name}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <div>
          <label htmlFor="rv-author" className={adminLabel}>
            Nombre
          </label>
          <input id="rv-author" type="text" value={rv.author} onChange={(e) => setReview({ author: e.target.value })} placeholder="Ej: María G." className={adminInput()} />
        </div>
        <div>
          <label htmlFor="rv-rating" className={adminLabel}>
            Estrellas
          </label>
          <select id="rv-rating" value={rv.rating} onChange={(e) => setReview({ rating: Number(e.target.value) })} className={adminInput()}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="rv-comment" className={adminLabel}>
          Reseña
        </label>
        <textarea id="rv-comment" rows={4} value={rv.comment} onChange={(e) => setReview({ comment: e.target.value })} className={`${adminInput()} h-auto py-2`} />
        <p className={adminHint}>
          {rv.id ? 'Puedes acortarla, pero no cambies lo que dijo el cliente.' : 'Usa solo reseñas reales de clientes.'}
          {rv.verified ? ' Sale con la marca "Compra verificada".' : ''}
        </p>
      </div>
    </div>
  );
}

export function RateInfo({ studio }: { studio: Studio }) {
  const { current, store } = studio;
  if (!current) return null;
  const rate = store?.rateVES ?? current.rate;
  return (
    <div className="flex flex-col gap-3">
      <div className={adminNotice('brand')}>
        <p className="font-semibold">Tasa de hoy: {rate ? formatVES(rate) : 'sin tasa'} por dólar</p>
        <p className="mt-1">
          Sale de Configuración (la tasa BCV que usa la tienda) y se pone al día sola cada vez que abres esta historia. Duplícala cada día o
          ábrela y descárgala de nuevo.
        </p>
        {store?.rateUpdatedAt && <p className="mt-1 text-xs">Publicada por el BCV: {new Date(store.rateUpdatedAt).toLocaleString('es-VE')}</p>}
      </div>
    </div>
  );
}

/** Montos de una gift card: los de la tienda si está vinculada, o escritos a mano */
export function VariantsEditor({ variants, linked, onChange }: { variants: StudioProductSlot['variants']; linked: boolean; onChange: (v: StudioProductSlot['variants']) => void }) {
  const set = (i: number, patch: Partial<StudioProductSlot['variants'][number]>) => onChange(variants.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-sm font-semibold text-ink">Montos ({variants.length}/8)</p>
      {linked ? (
        <>
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {variants.map((v) => (
              <li key={v.label} className="flex justify-between gap-2 rounded-lg bg-surface px-3 py-2">
                <span className="font-semibold text-ink">{v.label}</span>
                <span className="text-muted">{formatUSD(v.price)}</span>
              </li>
            ))}
          </ul>
          <p className={adminHint}>{variants.length ? 'Salen de la tienda y se ponen al día solos.' : 'Este producto no tiene montos: sale con su precio.'}</p>
        </>
      ) : (
        <>
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-1.5">
              <input type="text" aria-label={`Monto ${i + 1}`} value={v.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Ej: $10 o 800 Robux" className={adminInput()} />
              <input type="number" inputMode="decimal" step="0.01" min="0" aria-label={`Precio ${i + 1}`} value={v.price || ''} onChange={(e) => set(i, { price: Number(e.target.value || 0) })} placeholder="Precio" className={adminInput()} />
              <button type="button" onClick={() => onChange(variants.filter((_, k) => k !== i))} className={adminIconButton} aria-label={`Quitar monto ${i + 1}`}>
                <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {variants.length < 8 && (
            <button type="button" onClick={() => onChange([...variants, { label: '', price: 0 }])} className={`${smallButton} self-start`}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Agregar monto
            </button>
          )}
        </>
      )}
    </div>
  );
}
