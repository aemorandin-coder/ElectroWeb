// Texto para la publicación armado con los datos del flyer (C-112). Reemplaza a la IA de la herramienta vieja,
// que llamaba a un modelo de Gemini que ya no existe. Sin emojis (regla del proyecto).
import { formatAmount } from '@/lib/currency';
import { TEMPLATES, payMethods, slugify, type StudioBrand, type StudioFlyerData, type StudioProductSlot } from './schema';

function priceLine(p: StudioProductSlot, brand: StudioBrand): string {
  if (!(Number(p.price) > 0)) return '';
  // "$60,00" (formato de la tienda, D4) y "Ref: 60,00"
  const prefix = brand.pricePrefix === '$' ? '$' : brand.pricePrefix ? `${brand.pricePrefix} ` : '';
  const main = `${p.from ? 'Desde ' : ''}${prefix}${formatAmount(p.price)}`;
  const before = Number(p.oldPrice) > Number(p.price) ? ` (antes ${prefix}${formatAmount(p.oldPrice)})` : '';
  const bs = brand.showBs && p.priceBs ? ` · Bs. ${String(p.priceBs).replace(/^Bs\.?\s*/i, '')} a tasa BCV` : '';
  return `${main}${before}${bs}`;
}

function hashtag(text: string): string {
  const words = slugify(text).split('-').filter(Boolean);
  return words.length ? `#${words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')}` : '';
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

const longDate = (iso: string) => {
  const d = iso ? new Date(iso) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
};

/** link: el enlace de la historia con su marca de campaña (?es=código), para contar las visitas desde el texto */
export function buildCaption(f: StudioFlyerData, brand: StudioBrand, link = ''): string {
  const lines: string[] = [];
  const tags = new Set<string>(['#ElectroShop', '#Guanare', '#Venezuela']);

  if (f.template === 'tasa') {
    lines.push(`Tasa oficial BCV del ${longDate(f.rateDate)}:`, `1 dólar = Bs. ${formatAmount(f.rate)}`, '');
    [10, 20, 50, 100].forEach((a) => lines.push(`$${a} = Bs. ${formatAmount(a * f.rate)}`));
    lines.push('', 'Nuestros precios en bolívares se calculan con esta tasa.');
    tags.add('#TasaBCV').add('#DolarBCV');
  } else if (f.template === 'cupon') {
    const c = f.coupon;
    const what = c.percentOff > 0 ? `${c.percentOff}% de descuento` : c.amountOff > 0 ? `$${formatAmount(c.amountOff)} de descuento` : 'Un descuento';
    lines.push((f.heading || 'Cupón de descuento').toUpperCase(), '', `${what} con el código ${c.code || '(código)'}.`);
    const cond = [c.minSubtotal > 0 ? `Compra mínima $${formatAmount(c.minSubtotal)}` : '', c.scope].filter(Boolean).join(' · ');
    if (cond) lines.push(cond);
    if (c.endsAt) lines.push(`Válido hasta el ${longDate(c.endsAt)}.`);
    lines.push('Escríbelo al pagar en la web.');
    tags.add('#Cupon').add('#Descuento');
  } else if (f.template === 'resena') {
    const r = f.review;
    lines.push(`${r.rating} de 5 estrellas`, '', `"${r.comment}"`, `— ${r.author || 'Cliente'}${r.verified ? ' (compra verificada)' : ''}`);
    const p = f.products[0];
    if (p?.title) {
      lines.push('', [p.title, p.model].filter(Boolean).join(' '));
      const price = priceLine(p, brand);
      if (price) lines.push(price);
      tags.add(hashtag(p.title));
    }
    tags.add('#ClientesFelices');
  } else if (f.template === 'mensaje') {
    const m = f.msg;
    if (m.eyebrow) lines.push(m.eyebrow.toUpperCase());
    if (m.headline) lines.push(m.headline.replace(/\*/g, ''));
    if (m.body) lines.push('', m.body);
    if (m.cta || m.contact) lines.push('', [m.cta, m.contact].filter(Boolean).join(': '));
  } else {
    const n = TEMPLATES[f.template].n;
    const products = f.products.slice(0, n).filter((p) => p.title || p.model);
    if (f.template === 'trio' && f.heading) {
      lines.push(f.heading.toUpperCase(), '');
      tags.add(hashtag(f.heading));
    }
    if (f.template === 'nuevo') {
      lines.push((f.heading || 'Recién llegado').toUpperCase(), '');
      tags.add('#Nuevo');
    }
    products.forEach((p, i) => {
      if (i > 0) lines.push('');
      lines.push([p.title, p.model].filter(Boolean).join(' '));
      if (f.template !== 'trio' && f.template !== 'giftcard') {
        p.specs.filter((s) => s.label || s.value).forEach((s) => lines.push(`- ${[s.label, s.value].filter(Boolean).join(': ')}`));
      }
      const variants = f.template === 'giftcard' ? p.variants.filter((v) => v.label && v.price > 0) : [];
      if (variants.length) {
        variants.forEach((v) => lines.push(`- ${v.label}: $${formatAmount(v.price)}`));
        tags.add('#GiftCard');
      }
      const price = variants.length ? '' : priceLine(p, brand);
      if (price) lines.push(price);
      if (p.promo) lines.push(p.promo.toUpperCase());
      if (f.template !== 'trio' && p.tag) lines.push(p.tag);
      if (p.title) tags.add(hashtag(p.title));
    });
    if (f.offerEnds) {
      const end = new Date(f.offerEnds);
      if (!Number.isNaN(end.getTime())) {
        lines.push('', `Oferta válida hasta el ${end.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
      }
    }
  }

  const pays = payMethods(brand);
  const store: string[] = [];
  if (brand.shipping) store.push(`${brand.shipping.replace(/\.$/, '')}.`);
  if (pays.length) store.push(`Paga con ${listJoin(pays)}.`);
  if (link) store.push(`Compra aquí: ${link}`);
  else if (brand.website) store.push(`Compra en ${brand.website} o escríbenos por WhatsApp.`);
  if (store.length) lines.push('', ...store);

  lines.push('', [...tags].filter(Boolean).slice(0, 8).join(' '));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
