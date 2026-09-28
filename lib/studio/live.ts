// Productos de la tienda dentro de un flyer (C-112). Al elegir un producto se llenan título, modelo, precio,
// oferta, Bs, enlace, foto y características; al abrir o exportar el flyer se vuelven a leer precio, oferta y Bs,
// así una historia vieja nunca sale con un precio que ya cambió.
import { formatAmount } from '@/lib/currency';
import { guessSpecIcon } from './icons';
import type { StudioFlyerData, StudioProductSlot, StudioStoreProduct } from './schema';

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
  };
}

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
      next.imageUrl !== slot.imageUrl
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
