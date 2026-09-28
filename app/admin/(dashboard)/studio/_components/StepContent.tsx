'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiAlertTriangle, FiCheckCircle, FiExternalLink, FiLink, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { adminBadge, adminChoice, adminHint, adminInput, adminLabel, adminNotice } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { SPEC_ICONS } from '@/lib/studio/icons';
import { slotDone } from '@/lib/studio/checks';
import { linkProduct } from '@/lib/studio/live';
import { TEMPLATES, hasProductForm, type StudioMessage, type StudioProductSlot, type StudioSpec, type TemplateId } from '@/lib/studio/schema';
import ProductPicker from './ProductPicker';
import { CouponForm, HeadingField, RateInfo, ReviewForm, VariantsEditor } from './TemplateForms';
import StudioIcon from './StudioIcon';
import { sectionSummary, smallButton } from './ui';
import type { Studio } from './useStudio';

export const TEMPLATE_CARDS: [TemplateId, string, string, string][] = [
  ['solo', 'tarjeta', '1 producto', 'Un producto con precio y características'],
  ['duo', 'chip', '2 productos', 'Dos productos, cada uno con su precio'],
  ['trio', 'pantalla', 'Categoría', '3 productos con precio "Desde"'],
  ['nuevo', 'rayo', 'Llegó nuevo', 'Lanzamiento en podio, con confeti'],
  ['giftcard', 'regalo', 'Gift card', 'Montos y precios de una gift card'],
  ['cupon', 'billete', 'Cupón', 'Un cupón de Descuentos con su código'],
  ['resena', 'estrella', 'Reseña', 'Lo que dijo un cliente, con estrellas'],
  ['tasa', 'tasa', 'Tasa BCV', 'La tasa del día y equivalencias'],
  ['mensaje', 'chat', 'Mensaje', 'Aviso, horario o convocatoria'],
];
/** Fondo y efectos con que arranca cada plantilla al elegirla (si la persona no eligió otros) */
export const TEMPLATE_START: Partial<Record<TemplateId, { confeti?: boolean; reflejo?: boolean; anim?: 'escribir' }>> = {
  nuevo: { confeti: true, reflejo: true },
  resena: { anim: 'escribir' },
};

/** Mensajes listos para ajustar. "Únete como creador" viene de la herramienta vieja de redes. */
const PRESETS: { label: string; msg: Partial<StudioMessage> }[] = [
  {
    label: 'Únete como creador',
    msg: {
      eyebrow: 'Creadores',
      headline: 'Gana *recomendando* lo que te gusta',
      body: 'Comparte tu código con tus seguidores y gana una comisión por cada compra pagada.',
      cta: 'Escríbenos',
      icon: 'estrella',
    },
  },
  {
    label: 'Horario especial',
    msg: { eyebrow: 'Horario', headline: 'Este domingo *abrimos* de 9 a. m. a 2 p. m.', body: 'Te esperamos en la tienda.', cta: '', icon: 'reloj' },
  },
  {
    label: 'Llegó mercancía',
    msg: { eyebrow: 'Novedad', headline: '*Llegó* mercancía nueva', body: 'Pregunta por disponibilidad y precios.', cta: 'Escríbenos', icon: 'regalo' },
  },
  {
    label: 'Envíos',
    msg: { eyebrow: 'Envíos', headline: 'Enviamos a *toda Venezuela*', body: 'Despachamos por ZOOM y MRW con cobro a destino.', cta: 'Compra en la web', icon: 'camion' },
  },
];

interface Props {
  studio: Studio;
  activeSlot: number;
  setActiveSlot: (i: number) => void;
}

export default function StepContent({ studio, activeSlot, setActiveSlot }: Props) {
  const { current, update } = studio;
  const { confirm } = useConfirm();
  if (!current) return null;
  const n = TEMPLATES[current.template].n;
  const chooseTemplate = (id: TemplateId) =>
    update((f) => {
      const start = TEMPLATE_START[id];
      // Una plantilla nueva arranca con su fondo (bg vacío = el de la plantilla) y, si tiene, sus efectos
      return {
        ...f,
        template: id,
        bg: '',
        fx: start ? { ...f.fx, confeti: start.confeti ?? f.fx.confeti, reflejo: start.reflejo ?? f.fx.reflejo } : f.fx,
        anim: start?.anim ?? f.anim,
        name: id === 'tasa' && f.name === 'Nueva historia' ? 'Tasa BCV del día' : f.name,
      };
    });

  const setMsg = (patch: Partial<StudioMessage>) => update((f) => ({ ...f, msg: { ...f.msg, ...patch } }));
  // Como con un producto de la tienda: la historia nueva toma su nombre del titular
  const nameFromHeadline = (headline: string) => {
    const clean = headline.replace(/\*/g, '').trim().slice(0, 80);
    if (clean && current.name === 'Nueva historia') update((f) => ({ ...f, name: clean }));
  };
  const applyPreset = async (msg: Partial<StudioMessage>) => {
    if (current.msg.headline || current.msg.body) {
      const ok = await confirm({ title: 'Usar este mensaje', message: 'Se reemplaza el texto que escribiste.', confirmText: 'Reemplazar', cancelText: 'Cancelar' });
      if (!ok) return;
    }
    setMsg({ eyebrow: '', headline: '', body: '', cta: '', contact: '', ...msg });
    nameFromHeadline(msg.headline ?? '');
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className={adminLabel}>¿Qué quieres publicar?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TEMPLATE_CARDS.map(([id, icon, title, desc]) => (
            <button
              key={id}
              type="button"
              aria-pressed={current.template === id}
              onClick={() => current.template !== id && chooseTemplate(id)}
              className={`${adminChoice(current.template === id)} flex flex-col items-start gap-1 p-3`}
            >
              <StudioIcon name={icon} className="h-6 w-6 text-brand-500" />
              <span className="text-sm font-bold text-ink">{title}</span>
              <span className="text-xs text-muted">{desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {current.template === 'cupon' && <CouponForm studio={studio} />}
      {current.template === 'resena' && <ReviewForm studio={studio} />}
      {current.template === 'tasa' && <RateInfo studio={studio} />}
      {current.template === 'nuevo' && <HeadingField studio={studio} label="Etiqueta de arriba" placeholder="Recién llegado" />}

      {!hasProductForm(current.template) && current.template !== 'mensaje' ? null : current.template === 'mensaje' ? (
        <>
          <div>
            <p className={adminLabel}>Mensajes listos</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => void applyPreset(p.msg)} className={smallButton}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="m-headline" className={adminLabel}>
              Titular
            </label>
            <textarea
              id="m-headline"
              rows={2}
              value={current.msg.headline}
              onChange={(e) => setMsg({ headline: e.target.value })}
              onBlur={(e) => nameFromHeadline(e.target.value)}
              placeholder="Ej: Este domingo *abrimos* de 9am a 2pm"
              className={`${adminInput()} h-auto py-2`}
            />
            <p className={adminHint}>Pon *asteriscos* alrededor de las palabras que quieras resaltar.</p>
          </div>
          <div>
            <label htmlFor="m-body" className={adminLabel}>
              Texto
            </label>
            <textarea id="m-body" rows={3} value={current.msg.body} onChange={(e) => setMsg({ body: e.target.value })} placeholder="Una o dos frases" className={`${adminInput()} h-auto py-2`} />
          </div>
          <details className="border-t border-line pt-3">
            <summary className={sectionSummary}>Más opciones del mensaje</summary>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label htmlFor="m-eyebrow" className={adminLabel}>
                  Etiqueta superior
                </label>
                <input id="m-eyebrow" type="text" value={current.msg.eyebrow} onChange={(e) => setMsg({ eyebrow: e.target.value })} placeholder="Ej: AVISO · HORARIO · NOVEDAD" className={adminInput()} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="m-cta" className={adminLabel}>
                    Botón
                  </label>
                  <input id="m-cta" type="text" value={current.msg.cta} onChange={(e) => setMsg({ cta: e.target.value })} placeholder="Ej: Escríbenos" className={adminInput()} />
                </div>
                <div>
                  <label htmlFor="m-contact" className={adminLabel}>
                    Contacto
                  </label>
                  <input id="m-contact" type="text" value={current.msg.contact} onChange={(e) => setMsg({ contact: e.target.value })} placeholder="+58 …" className={adminInput()} />
                </div>
              </div>
            </div>
          </details>
        </>
      ) : (
        <>
          {current.template === 'trio' && (
            <div>
              <label htmlFor="f-heading" className={adminLabel}>
                Título de la categoría
              </label>
              <input id="f-heading" type="text" value={current.heading} onChange={(e) => update((f) => ({ ...f, heading: e.target.value }))} placeholder="Ej: Gift Cards" className={adminInput()} />
            </div>
          )}
          {Array.from({ length: n }, (_, i) => (
            <ProductSlot key={i} studio={studio} index={i} count={n} active={activeSlot === i} onFocus={() => setActiveSlot(i)} />
          ))}
        </>
      )}
    </div>
  );
}

function ProductSlot({ studio, index, count, active, onFocus }: { studio: Studio; index: number; count: number; active: boolean; onFocus: () => void }) {
  const { current, update, live, rememberLive } = studio;
  const [picking, setPicking] = useState(false);
  if (!current) return null;
  const p = current.products[index];
  if (!p) return null;
  const linked = p.productId ? live[p.productId] : undefined;
  const id = (k: string) => `p${index}-${k}`;

  const setSlot = (patch: Partial<StudioProductSlot>) =>
    update((f) => ({ ...f, products: f.products.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  const setSpec = (k: number, patch: Partial<StudioSpec>) =>
    update((f) => ({
      ...f,
      products: f.products.map((s, i) => {
        if (i !== index) return s;
        const specs = [...s.specs];
        while (specs.length <= k) specs.push({ icon: 'check', label: '', value: '' });
        specs[k] = { ...specs[k], ...patch };
        // Las filas vacías del final no se guardan
        while (specs.length && !specs[specs.length - 1].label && !specs[specs.length - 1].value) specs.pop();
        return { ...s, specs };
      }),
    }));

  const body = (
    <div className="flex flex-col gap-3" onFocus={onFocus} onPointerDown={onFocus}>
      {p.productId ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-start gap-3">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-white">
              {(linked?.image || p.imageUrl) && <Image src={linked?.image || p.imageUrl} alt="" fill sizes="56px" className="object-contain" />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <FiLink className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                <span className="truncate">{linked?.name ?? 'Producto de la tienda'}</span>
              </p>
              <p className="text-muted">
                {p.from && 'Desde '}
                {formatUSD(p.price)}
                {p.oldPrice > p.price && <span className="ml-1.5 line-through">{formatUSD(p.oldPrice)}</span>}
                {p.priceBs && <span> · Bs. {p.priceBs}</span>}
              </p>
              {linked?.offerLabel && <span className={adminBadge('danger')}>Oferta: {linked.offerLabel}</span>}
            </div>
          </div>
          {linked && !linked.published && (
            <p className={`${adminNotice('warning')} flex items-center gap-2 p-2`}>
              <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Este producto ya no está publicado en la tienda.
            </p>
          )}
          <p className={adminHint}>El precio, la oferta y los Bs salen de la tienda y se ponen al día solos cada vez que abres la historia.</p>
          <div className="flex flex-wrap gap-2">
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className={smallButton}>
                <FiExternalLink className="h-4 w-4" aria-hidden="true" />
                Ver en la tienda
              </a>
            )}
            <button type="button" onClick={() => setPicking(true)} className={smallButton}>
              <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
              Cambiar producto
            </button>
            <button type="button" onClick={() => setSlot({ productId: null })} className={smallButton}>
              Escribir el precio a mano
            </button>
          </div>
        </div>
      ) : (
        !picking && (
          <button type="button" onClick={() => setPicking(true)} className={`${smallButton} self-start`}>
            <FiSearch className="h-4 w-4" aria-hidden="true" />
            Elegir de la tienda
          </button>
        )
      )}
      {picking && (
        <ProductPicker
          onCancel={() => setPicking(false)}
          onPick={(prod) => {
            rememberLive(prod);
            update((f) => linkProduct(f, index, prod));
            setPicking(false);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={id('title')} className={adminLabel}>
            Título grande
          </label>
          <input id={id('title')} type="text" value={p.title} onChange={(e) => setSlot({ title: e.target.value })} placeholder="Ej: Teclado Gaming" className={adminInput()} />
        </div>
        <div>
          <label htmlFor={id('model')} className={adminLabel}>
            Modelo
          </label>
          <input id={id('model')} type="text" value={p.model} onChange={(e) => setSlot({ model: e.target.value })} placeholder="Ej: AOAS M-880" className={adminInput()} />
        </div>
      </div>

      {!p.productId && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={id('price')} className={adminLabel}>
                Precio en $
              </label>
              <input id={id('price')} type="number" inputMode="decimal" step="0.01" min="0" value={p.price || ''} onChange={(e) => setSlot({ price: Number(e.target.value || 0) })} placeholder="0,00" className={adminInput()} />
            </div>
            <div>
              <label htmlFor={id('bs')} className={adminLabel}>
                Precio en Bs.
              </label>
              <input id={id('bs')} type="text" value={p.priceBs} onChange={(e) => setSlot({ priceBs: e.target.value })} placeholder="Opcional" className={adminInput()} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={p.from} onChange={(e) => setSlot({ from: e.target.checked })} className="h-4 w-4 accent-brand-500" />
            Decir &quot;Desde&quot; (precio variable)
          </label>
        </>
      )}

      <details className="border-t border-line pt-3" open={!!p.promo || (!p.productId && p.oldPrice > 0)}>
        <summary className={sectionSummary}>Oferta</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {!p.productId && (
            <div>
              <label htmlFor={id('old')} className={adminLabel}>
                Precio antes
              </label>
              <input id={id('old')} type="number" inputMode="decimal" step="0.01" min="0" value={p.oldPrice || ''} onChange={(e) => setSlot({ oldPrice: Number(e.target.value || 0) })} placeholder="Ej: 35" className={adminInput()} />
            </div>
          )}
          <div className={p.productId ? 'col-span-2' : ''}>
            <label htmlFor={id('promo')} className={adminLabel}>
              Etiqueta
            </label>
            <input id={id('promo')} type="text" value={p.promo} onChange={(e) => setSlot({ promo: e.target.value })} placeholder="Ej: SOLO HOY" className={adminInput()} />
          </div>
          <p className={`${adminHint} col-span-2`}>
            {p.productId
              ? 'El precio tachado y el % salen de la oferta que tenga el producto en Descuentos.'
              : 'Con "Precio antes" aparece tachado y con el % de descuento.'}
          </p>
        </div>
      </details>

      {studio.current?.template === 'giftcard' && (
        <VariantsEditor
          variants={p.variants}
          linked={!!p.productId}
          onChange={(variants) => setSlot({ variants })}
        />
      )}

      {studio.current?.template !== 'trio' && studio.current?.template !== 'giftcard' && (
        <details className="border-t border-line pt-3">
          <summary className={sectionSummary}>Características ({p.specs.filter((s) => s.label || s.value).length}/4) y frase</summary>
          <div className="mt-3 flex flex-col gap-2">
            {[0, 1, 2, 3].map((k) => {
              const s = p.specs[k] ?? { icon: 'check', label: '', value: '' };
              return (
                <div key={k} className="grid grid-cols-[6.5rem_1fr_1fr] gap-1.5">
                  <select aria-label={`Ícono ${k + 1}`} value={s.icon} onChange={(e) => setSpec(k, { icon: e.target.value })} className={`${adminInput()} px-2`}>
                    {SPEC_ICONS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <input type="text" aria-label={`Nombre ${k + 1}`} value={s.label} onChange={(e) => setSpec(k, { label: e.target.value })} placeholder="Ej: Capacidad" className={adminInput()} />
                  <input type="text" aria-label={`Valor ${k + 1}`} value={s.value} onChange={(e) => setSpec(k, { value: e.target.value })} placeholder="Ej: 128 GB" className={adminInput()} />
                </div>
              );
            })}
            <div>
              <label htmlFor={id('tag')} className={adminLabel}>
                Frase corta
              </label>
              <input id={id('tag')} type="text" value={p.tag} onChange={(e) => setSlot({ tag: e.target.value })} placeholder="Ej: NUEVO · CON GARANTÍA" className={adminInput()} />
            </div>
          </div>
        </details>
      )}
    </div>
  );

  if (count === 1) return body;
  return (
    <details open={active} className={`rounded-xl border p-3 ${active ? 'border-brand-500' : 'border-line'}`}>
      <summary className={sectionSummary} onClick={onFocus}>
        <span className="truncate">
          Producto {index + 1}
          {p.title && ` · ${p.title}`}
        </span>
        {slotDone(p) && <FiCheckCircle className="h-4 w-4 shrink-0 text-success-strong" aria-label="Completo" />}
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}
