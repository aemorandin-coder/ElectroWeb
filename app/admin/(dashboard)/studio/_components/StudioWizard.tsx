'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconoCalendario, IconoCerrar, IconoEditar, IconoFlechaIzquierda } from '@/components/iconos';
import Opcion, { claseOpcion } from '@/components/admin/Opcion';
import { adminDato, adminHint, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { stepDone } from '@/lib/studio/checks';
import { linkProduct } from '@/lib/studio/live';
import { TEMPLATES, TRAMOS_REGALO, blankProduct, hasProductForm, normalizeFlyer, type StudioFlyerData, type StudioStoreProduct, type TemplateId, type TramoRegalo } from '@/lib/studio/schema';
import ProductPicker from './ProductPicker';
import { FELICITACION_MSG, TEMPLATE_CARDS, TEMPLATE_GROUPS, TEMPLATE_START } from './StepContent';
import { useStudioContext } from './StudioContext';
import { smallButton } from './ui';
import { useFlyerRenderer } from './useFlyerRenderer';

/** Datos de muestra para el dibujo de cada plantilla */
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
  regalos: { tramo: 'de-20-a-50', products: [{ title: 'Audífonos', price: 25 }, { title: 'Teclado', price: 28 }, { title: 'Control', price: 45 }] as StudioFlyerData['products'] },
  felicitacion: { chispa: 'saluda', navidad: true, msg: { eyebrow: 'Electro Shop te desea', headline: '¡Feliz *Navidad*!', body: 'Gracias por confiar en nosotros este año.', cta: '', contact: '', icon: 'ninguno' } },
};

const productsFor = (t: TemplateId) => (hasProductForm(t) ? TEMPLATES[t].n : 0);

function buildFlyer(template: TemplateId, picks: StudioStoreProduct[], opciones: { navidad: boolean; tramo: TramoRegalo | null; fecha?: string }): StudioFlyerData {
  const start = TEMPLATE_START[template];
  let f = normalizeFlyer({ template });
  f = {
    ...f,
    date: opciones.fecha ?? '',
    products: Array.from({ length: Math.max(TEMPLATES[template].n, 1) }, blankProduct),
    fx: start ? { ...f.fx, confeti: start.confeti ?? f.fx.confeti, reflejo: start.reflejo ?? f.fx.reflejo } : f.fx,
    anim: start?.anim ?? f.anim,
    name: template === 'tasa' ? 'Tasa BCV del día' : template === 'felicitacion' ? 'Felicitación' : f.name,
    navidad: opciones.navidad || template === 'felicitacion',
  };
  if (template === 'felicitacion') f = { ...f, msg: FELICITACION_MSG, chispa: 'saluda' };
  if (template === 'regalos' && opciones.tramo) f = { ...f, tramo: opciones.tramo, qr: true, name: `Regalos ${TRAMOS_REGALO[opciones.tramo].titulo.toLowerCase()}` };
  picks.forEach((p, i) => {
    f = linkProduct(f, i, p);
  });
  return f;
}

const sampleCache = new Map<TemplateId, string>();

/**
 * Asistente de "Nueva historia" (G-71): alineado al marco del panel (sin mx-auto), agrupado por objetivo,
 * y aterriza en el primer paso útil (nunca salta directo a Publicar).
 */
export default function StudioWizard() {
  const studio = useStudioContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFecha = searchParams.get('fecha') ?? '';
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(rawFecha) ? rawFecha : '';
  const { thumbnail } = useFlyerRenderer(studio.brand, studio.store?.navidad ?? null);
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [tramo, setTramo] = useState<TramoRegalo | null>(null);
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
    const built = buildFlyer(t, chosen, { navidad: studio.store?.navidad.activo ?? false, tramo, fecha });
    const flyer = await studio.create(built);
    if (flyer) {
      const src = (p: { imageUrl: string }) => p.imageUrl;
      const paso = !stepDone(1, built, src) ? 1 : TEMPLATES[t].photo !== 'none' && !stepDone(2, built, src) ? 2 : 3;
      router.replace(`/admin/studio/${flyer.id}?paso=${paso}`);
    } else {
      setCreating(false);
    }
  };

  const choose = (t: TemplateId) => {
    setTemplate(t);
    setTramo(null);
    setPicks([]);
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
    <div>
      <Link href="/admin/studio" className="mb-3 inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" />
        Historias
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={adminPageTitle}>Nueva historia</h1>
          <p className={adminPageSubtitle}>
            {template && need > 0 ? `Paso 2 de 2 · Elige ${need > 1 ? `los ${need} productos` : 'el producto'} de la tienda: el precio, la oferta y la foto se ponen solos.` : 'Paso 1 de 2 · ¿Qué quieres publicar hoy?'}
          </p>
        </div>
        {fecha && (
          <span className={adminDato}>
            <IconoCalendario className="h-3.5 w-3.5" aria-hidden="true" />
            Para el {new Date(`${fecha}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {!template || need === 0 ? (
        <div className="flex flex-col gap-6">
          {TEMPLATE_GROUPS.map((g) => (
            <section key={g.titulo} className="flex flex-col gap-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{g.titulo}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {g.ids.map((id) => {
                  const tpl = TEMPLATE_CARDS.find(([x]) => x === id);
                  if (!tpl) return null;
                  const [, , title, desc] = tpl;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => choose(id)}
                        disabled={creating}
                        aria-pressed={template === id}
                        className={`${claseOpcion(template === id)} flex h-full w-full flex-col items-stretch gap-2 p-2 text-left disabled:opacity-60`}
                      >
                        <span className="relative block aspect-[9/16] w-full overflow-hidden rounded-md border border-line bg-surface">
                          {sampleCache.get(id) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- dibujo de ejemplo hecho en el navegador
                            <img src={sampleCache.get(id)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="block h-full w-full animate-pulse bg-line" aria-hidden="true" />
                          )}
                        </span>
                        <span className="px-1 text-sm font-bold text-ink">{title}</span>
                        <span className="px-1 pb-1 text-xs text-muted">{desc}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-3xl">
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
                        <IconoCerrar className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {template === 'regalos' && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold text-ink">¿Qué presupuesto?</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(Object.keys(TRAMOS_REGALO) as TramoRegalo[]).map((id) => (
                  <Opcion
                    key={id}
                    tamano="chica"
                    elegida={tramo === id}
                    titulo={TRAMOS_REGALO[id].titulo}
                    disabled={creating}
                    aria-pressed={tramo === id}
                    onClick={() => {
                      setTramo(id);
                      setPicks([]);
                    }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {creating ? (
            <p className="text-sm text-muted" aria-busy="true">
              Creando la historia…
            </p>
          ) : template === 'regalos' && !tramo ? (
            <p className={adminHint}>Elige el presupuesto: después salen solo los productos que caben en él, como en Ideas para regalar.</p>
          ) : (
            <ProductPicker
              key={`${tramo ?? ''}-${picks.length}`}
              onPick={pick}
              tramo={template === 'regalos' && tramo ? tramo : undefined}
              soloDigitales={template === 'giftcard'}
              excluir={picks.map((p) => p.id)}
            />
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {picks.length > 0 ? (
              <button type="button" onClick={() => void create(template, picks)} disabled={creating} className={adminPrimaryButton}>
                Crear con {picks.length === 1 ? '1 producto' : `${picks.length} productos`} y completar el resto a mano
              </button>
            ) : (
              <button type="button" onClick={() => void create(template, picks)} disabled={creating} className={adminSecondaryButton}>
                <IconoEditar className="h-4 w-4" aria-hidden="true" />
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
