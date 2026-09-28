'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEdit3, FiX } from 'react-icons/fi';
import { adminChoice, adminHint, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { linkProduct } from '@/lib/studio/live';
import { TEMPLATES, blankProduct, hasProductForm, normalizeFlyer, type StudioFlyerData, type StudioStoreProduct, type TemplateId } from '@/lib/studio/schema';
import ProductPicker from './ProductPicker';
import { TEMPLATE_CARDS, TEMPLATE_START } from './StepContent';
import { useStudioContext } from './StudioContext';
import { smallButton } from './ui';
import { useFlyerRenderer } from './useFlyerRenderer';

/** Datos de muestra para el dibujo de cada plantilla (sin fotos: se ven los recuadros de la foto) */
const SAMPLE: Record<TemplateId, Partial<StudioFlyerData>> = {
  solo: { products: [{ title: 'Audífonos', model: 'Bluetooth 5.3', price: 25 }] as StudioFlyerData['products'] },
  duo: { products: [{ title: 'Teclado', price: 18 }, { title: 'Mouse', price: 9 }] as StudioFlyerData['products'] },
  trio: { heading: 'Gift Cards', products: [{ title: 'PlayStation', price: 11, from: true }, { title: 'Xbox', price: 11, from: true }, { title: 'Steam', price: 6, from: true }] as StudioFlyerData['products'] },
  nuevo: { heading: 'Recién llegado', products: [{ title: 'Control', model: 'Inalámbrico', price: 30 }] as StudioFlyerData['products'] },
  giftcard: { products: [{ title: 'PlayStation', price: 11 }] as StudioFlyerData['products'] },
  cupon: { coupon: { code: 'HOLA15', label: 'Tu primera compra', percentOff: 15, amountOff: 0, minSubtotal: 0, endsAt: '', scope: '' } },
  resena: { review: { id: '', rating: 5, comment: 'Llegó rapidísimo y bien embalado. Súper recomendados.', author: 'María', verified: true, productName: 'Audífonos' } },
  tasa: { rate: 36.5 },
  mensaje: { msg: { eyebrow: 'Horario', headline: 'Este domingo *abrimos*', body: 'De 9 a. m. a 2 p. m.', cta: '', contact: '', icon: 'reloj' } as StudioFlyerData['msg'] },
};

/** Cuántos productos de la tienda pide la plantilla en el asistente (0: se completa en el editor) */
const productsFor = (t: TemplateId) => (hasProductForm(t) ? TEMPLATES[t].n : 0);

/** La historia nueva: plantilla, su fondo y efectos de arranque, y los productos elegidos vinculados a la tienda */
function buildFlyer(template: TemplateId, picks: StudioStoreProduct[]): StudioFlyerData {
  const start = TEMPLATE_START[template];
  let f = normalizeFlyer({ template });
  f = {
    ...f,
    products: Array.from({ length: Math.max(TEMPLATES[template].n, 1) }, blankProduct),
    fx: start ? { ...f.fx, confeti: start.confeti ?? f.fx.confeti, reflejo: start.reflejo ?? f.fx.reflejo } : f.fx,
    anim: start?.anim ?? f.anim,
    name: template === 'tasa' ? 'Tasa BCV del día' : f.name,
  };
  picks.forEach((p, i) => {
    f = linkProduct(f, i, p);
  });
  return f;
}

// Dibujos de ejemplo ya hechos: no se repiten al volver al asistente
const sampleCache = new Map<TemplateId, string>();

/**
 * Asistente de "Nueva historia" (C-116, fase 2): primero qué publicar, luego el producto de la tienda,
 * y recién ahí se guarda. Así no quedan historias vacías en la lista.
 */
export default function StudioWizard() {
  const studio = useStudioContext();
  const router = useRouter();
  const { thumbnail } = useFlyerRenderer(studio.brand);
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [picks, setPicks] = useState<StudioStoreProduct[]>([]);
  const [creating, setCreating] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (studio.loading) return;
    TEMPLATE_CARDS.forEach(([id]) => {
      if (sampleCache.has(id)) return;
      const f = { ...normalizeFlyer({ template: id, ...SAMPLE[id] }), name: 'Ejemplo' };
      void thumbnail(f, null, { preview: true }).then(({ url }) => {
        if (!url) return;
        sampleCache.set(id, url);
        setTick((n) => n + 1);
      });
    });
  }, [studio.loading, thumbnail]);

  const create = async (t: TemplateId, chosen: StudioStoreProduct[]) => {
    if (creating) return;
    setCreating(true);
    chosen.forEach((p) => studio.rememberLive(p));
    const flyer = await studio.create(buildFlyer(t, chosen));
    if (flyer) router.replace(`/admin/studio/${flyer.id}`);
    else setCreating(false);
  };

  const choose = (t: TemplateId) => {
    setTemplate(t);
    setPicks([]);
    // Sin productos de la tienda (cupón, reseña, tasa, mensaje): se crea ya y se completa en el editor
    if (productsFor(t) === 0) void create(t, []);
  };

  const pick = (p: StudioStoreProduct) => {
    if (!template) return;
    const next = [...picks, p];
    setPicks(next);
    if (next.length >= productsFor(template)) void create(template, next);
  };

  const need = template ? productsFor(template) : 0;
  const card = template ? TEMPLATE_CARDS.find(([id]) => id === template) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/studio" className="mb-3 inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Historias
      </Link>
      <h1 className={adminPageTitle}>Nueva historia</h1>
      <p className={`${adminPageSubtitle} mb-5`}>
        {template && need > 0 ? `Paso 2 de 2 · Elige ${need > 1 ? `los ${need} productos` : 'el producto'} de la tienda: el precio, la oferta y la foto se ponen solos.` : 'Paso 1 de 2 · ¿Qué quieres publicar?'}
      </p>

      {!template || need === 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TEMPLATE_CARDS.map(([id, , title, desc]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => choose(id)}
                disabled={creating}
                aria-pressed={template === id}
                className={`${adminChoice(template === id)} flex h-full w-full flex-col items-stretch gap-2 p-2 text-left disabled:opacity-60`}
              >
                <span className="relative block aspect-[9/16] w-full overflow-hidden rounded-md border border-line bg-surface">
                  {sampleCache.get(id) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dibujo de ejemplo hecho en el navegador (URL de objeto)
                    <img src={sampleCache.get(id)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full animate-pulse bg-line" aria-hidden="true" />
                  )}
                </span>
                <span className="px-1 text-sm font-bold text-ink">{title}</span>
                <span className="px-1 pb-1 text-xs text-muted">{desc}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              Plantilla: <strong className="text-ink">{card?.[2]}</strong>
            </span>
            <button type="button" onClick={() => setTemplate(null)} disabled={creating} className={smallButton}>
              Cambiar
            </button>
          </div>

          {need > 1 && (
            <ol className="flex flex-col gap-2">
              {Array.from({ length: need }, (_, i) => {
                const p = picks[i];
                return (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                      {p?.image && <Image src={p.image} alt="" fill sizes="48px" className="object-contain" />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-semibold text-ink">Producto {i + 1}</span>
                      <span className="block truncate text-muted">{p ? `${p.name} · ${formatUSD(p.priceUSD)}` : i === picks.length ? 'Búscalo abajo' : 'Después'}</span>
                    </span>
                    {p && (
                      <button type="button" onClick={() => setPicks(picks.filter((_, k) => k !== i))} disabled={creating} className={smallButton} aria-label={`Quitar el producto ${i + 1}`}>
                        <FiX className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {creating ? (
            <p className="text-sm text-muted" aria-busy="true">
              Creando la historia…
            </p>
          ) : (
            <ProductPicker key={picks.length} onPick={pick} />
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {picks.length > 0 ? (
              <button type="button" onClick={() => void create(template, picks)} disabled={creating} className={adminPrimaryButton}>
                Crear con {picks.length === 1 ? '1 producto' : `${picks.length} productos`} y completar el resto a mano
              </button>
            ) : (
              <button type="button" onClick={() => void create(template, picks)} disabled={creating} className={adminSecondaryButton}>
                <FiEdit3 className="h-4 w-4" aria-hidden="true" />
                Escribir el producto a mano
              </button>
            )}
          </div>
          <p className={adminHint}>A mano: escribes el nombre y el precio en el editor. Con un producto de la tienda, el precio se pone al día solo.</p>
        </div>
      )}
    </div>
  );
}
