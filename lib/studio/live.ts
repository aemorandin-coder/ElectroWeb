// Productos de la tienda dentro de un flyer (C-112). Al elegir un producto se llenan título, modelo, precio,
// oferta, Bs, enlace, foto y características; al abrir o exportar el flyer se vuelven a leer precio, oferta y Bs,
// así una historia vieja nunca sale con un precio que ya cambió.
import { formatAmount } from '@/lib/currency';
import { guessSpecIcon } from './icons';
import { hasProductForm, type StudioCoupon, type StudioFlyerData, type StudioProductSlot, type StudioReview, type StudioStoreInfo, type StudioStoreProduct } from './schema';

/** "Teclado Gaming AOAS M-880 60% RGB" → título "Teclado Gaming", modelo "AOAS M-880 60% RGB" */
export function splitName(name: string): { title: string; model: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let title = '';
  let i = 0;
  while (i < words.length && (title + ' ' + words[i]).trim().length <= 18) {
    title = `${title} ${words[i]}`.trim();
    i++;
  }
  if (!title && words.length) {
    title = words[0].slice(0, 18);
    i = 1;
  }
  return { title, model: words.slice(i).join(' ').slice(0, 80) };
}

/** Local para <input type="datetime-local"> */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lo que manda la tienda y no se escribe a mano cuando el producto está vinculado */
function prices(slot: StudioProductSlot, p: StudioStoreProduct): StudioProductSlot {
  return {
    ...slot,
    price: p.priceUSD,
    oldPrice: p.compareAtPriceUSD ?? 0,
    priceBs: p.priceVES > 0 ? formatAmount(p.priceVES) : '',
    from: p.hasVariants,
    url: p.url,
    imageUrl: slot.imageUrl || p.image || '',
    variants: p.variants.map((v) => ({ label: v.label, price: v.priceUSD })),
  };
}

const sameVariants = (a: StudioProductSlot['variants'], b: StudioProductSlot['variants']) =>
  a.length === b.length && a.every((v, i) => v.label === b[i].label && v.price === b[i].price);

/** Vincula un producto de la tienda a un espacio del flyer (y la cuenta regresiva de su oferta, si no hay otra) */
export function linkProduct(f: StudioFlyerData, index: number, p: StudioStoreProduct): StudioFlyerData {
  const { title, model } = splitName(p.name);
  const base: StudioProductSlot = {
    ...f.products[index],
    productId: p.id,
    title,
    model,
    promo: p.offerLabel ? p.offerLabel.toUpperCase().slice(0, 30) : '',
    imageUrl: p.image || '',
    cutout: true,
    specs: p.specs.map((s) => ({ icon: guessSpecIcon(`${s.label} ${s.value}`), label: s.label, value: s.value })),
  };
  const products = [...f.products];
  products[index] = prices(base, p);
  return {
    ...f,
    products,
    offerEnds: f.offerEnds || (p.offerEndsAt ? toLocalInput(p.offerEndsAt) : ''),
    name: f.name === 'Nueva historia' ? p.name.slice(0, 80) : f.name,
  };
}

/** Pone al día precio, oferta y Bs de los productos vinculados. Devuelve el mismo objeto si nada cambió. */
export function refreshLinked(f: StudioFlyerData, live: Record<string, StudioStoreProduct>): StudioFlyerData {
  let changed = false;
  const products = f.products.map((slot) => {
    const p = slot.productId ? live[slot.productId] : undefined;
    if (!p) return slot;
    const next = prices(slot, p);
    if (
      next.price !== slot.price ||
      next.oldPrice !== slot.oldPrice ||
      next.priceBs !== slot.priceBs ||
      next.from !== slot.from ||
      next.url !== slot.url ||
      next.imageUrl !== slot.imageUrl ||
      !sameVariants(next.variants, slot.variants)
    ) {
      changed = true;
      return next;
    }
    return slot;
  });
  return changed ? { ...f, products } : f;
}

export function linkedIds(flyers: StudioFlyerData[]): string[] {
  return [...new Set(flyers.flatMap((f) => f.products.map((p) => p.productId).filter((id): id is string => !!id)))];
}

/** Fecha ISO → valor de <input type="datetime-local"> (para el contador de la oferta) */
export const isoToLocalInput = (iso: string | null) => (iso ? toLocalInput(iso) : '');

/** Copia un cupón de Descuentos a la historia (y su vencimiento al contador, si no hay otro) */
export function linkCoupon(f: StudioFlyerData, c: StudioCoupon): StudioFlyerData {
  return {
    ...f,
    coupon: {
      code: c.code,
      label: (c.label ?? '').slice(0, 40),
      percentOff: c.percentOff ?? 0,
      amountOff: c.amountOffUSD ?? 0,
      minSubtotal: c.minSubtotalUSD ?? 0,
      endsAt: c.endsAt ?? '',
      scope: c.scope.slice(0, 60),
    },
    offerEnds: c.endsAt ? toLocalInput(c.endsAt) : f.offerEnds,
    offerLabel: c.endsAt ? f.offerLabel || 'El cupón vence en' : f.offerLabel,
    name: f.name === 'Nueva historia' ? `Cupón ${c.code}` : f.name,
  };
}

/** Pone al día el cupón (si sigue vigente). Si ya no existe se deja como estaba: la lista avisa que venció */
export function refreshCoupon(f: StudioFlyerData, c: StudioCoupon | undefined): StudioFlyerData {
  if (f.template !== 'cupon' || !f.coupon.code || !c) return f;
  const next = linkCoupon({ ...f, name: f.name }, c);
  const a = next.coupon;
  const b = f.coupon;
  const same = a.label === b.label && a.percentOff === b.percentOff && a.amountOff === b.amountOff && a.minSubtotal === b.minSubtotal && a.endsAt === b.endsAt && a.scope === b.scope;
  return same ? f : { ...f, coupon: a, offerEnds: a.endsAt !== b.endsAt ? next.offerEnds : f.offerEnds };
}

/** Copia una reseña a la historia y vincula su producto (foto, nombre y precio) */
export function linkReview(f: StudioFlyerData, r: StudioReview): StudioFlyerData {
  let next: StudioFlyerData = {
    ...f,
    review: { id: r.id, rating: r.rating, comment: r.comment, author: r.author, verified: r.verified, productName: r.product?.name.slice(0, 80) ?? '' },
    name: f.name === 'Nueva historia' ? `Reseña de ${r.author}` : f.name,
  };
  if (r.product) next = linkProduct(next, 0, r.product);
  return { ...next, offerEnds: f.offerEnds, name: next.name.startsWith('Reseña') ? next.name : `Reseña de ${r.author}` };
}

/** La tasa BCV del día en la plantilla "Tasa BCV": siempre la de la tienda */
export function refreshRate(f: StudioFlyerData, store: Pick<StudioStoreInfo, 'rateVES' | 'rateUpdatedAt'> | null): StudioFlyerData {
  if (f.template !== 'tasa' || !store) return f;
  const date = store.rateUpdatedAt ?? '';
  return f.rate === store.rateVES && f.rateDate === date ? f : { ...f, rate: store.rateVES, rateDate: date };
}

/** Lo que salió en esta descarga: si después cambia en la tienda, la lista avisa */
export function exportSnapshot(f: StudioFlyerData): StudioFlyerData['exported'] {
  return {
    at: new Date().toISOString(),
    prices: f.products.slice(0, 3).map((p) => Number(p.price) || 0),
    rate: f.template === 'tasa' ? f.rate : 0,
    coupon: f.template === 'cupon' ? f.coupon.code : '',
  };
}

export interface StaleWarning {
  text: string;
  /** "danger": no conviene publicarla así; "warning": revisar */
  tone: 'danger' | 'warning';
  /** C-116: qué pasó, para decidir si impide descargar (cupón) o solo avisa */
  kind: 'gone' | 'soldout' | 'price' | 'offer' | 'coupon' | 'rate';
}

/**
 * Por qué una historia ya no refleja la tienda: producto fuera de la tienda o agotado, oferta o cupón vencidos,
 * o precio y tasa distintos a los de la última descarga.
 */
export function staleWarnings(
  f: StudioFlyerData,
  live: Record<string, StudioStoreProduct>,
  coupons: Record<string, StudioCoupon> | null,
  store: Pick<StudioStoreInfo, 'rateVES'> | null,
): StaleWarning[] {
  const out: StaleWarning[] = [];
  const now = Date.now();
  const usesProducts = hasProductForm(f.template) || f.template === 'resena' || f.template === 'cupon';
  if (usesProducts) {
    f.products.forEach((slot, i) => {
      const p = slot.productId ? live[slot.productId] : undefined;
      if (!p) return;
      const who = f.products.length > 1 && f.template !== 'resena' ? ` (${slot.title || `producto ${i + 1}`})` : '';
      if (!p.published) out.push({ text: `Ya no está en la tienda${who}`, tone: 'danger', kind: 'gone' });
      else if (!p.inStock) out.push({ text: `Agotado${who}`, tone: 'danger', kind: 'soldout' });
      // Contra el precio actual de la tienda, no el guardado en la historia (las de la lista no se abren)
      const before = f.exported.prices[i];
      if (f.exported.at && before !== undefined && before !== p.priceUSD) out.push({ text: `El precio cambió desde la descarga${who}`, tone: 'warning', kind: 'price' });
    });
  }
  const ends = Date.parse(f.offerEnds);
  if (f.offerEnds && Number.isFinite(ends) && ends < now) {
    out.push(f.template === 'cupon' ? { text: 'El cupón venció', tone: 'danger', kind: 'coupon' } : { text: 'La oferta terminó', tone: 'danger', kind: 'offer' });
  } else if (f.template === 'cupon' && f.coupon.code && coupons && !coupons[f.coupon.code]) out.push({ text: 'El cupón ya no está vigente', tone: 'danger', kind: 'coupon' });
  if (f.template === 'tasa' && f.exported.at && store && f.exported.rate && f.exported.rate !== store.rateVES) {
    out.push({ text: 'La tasa cambió desde la descarga', tone: 'warning', kind: 'rate' });
  }
  return out;
}
