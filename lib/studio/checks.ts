// Revisión de una historia de ElectroStudio (C-116): una sola lista para el paso Publicar, la etiqueta de la
// lista de historias y cada descarga. Lo que "impide" no deja descargar; lo que "avisa" deja seguir si se confirma.

import { missingImages, type ProductSrc } from '@/lib/studio/engine';
import { staleWarnings } from '@/lib/studio/live';
import { TEMPLATES, type StudioCoupon, type StudioFlyerData, type StudioProductSlot, type StudioStoreInfo, type StudioStoreProduct } from '@/lib/studio/schema';

export type CheckLevel = 'ok' | 'warn' | 'block';

/** De qué se trata, para agruparlas en "Por atender" del inicio */
export type CheckKind = 'content' | 'photo' | 'price' | 'overflow' | 'store' | 'redownload' | 'caption' | 'date';

export interface FlyerCheck {
  level: CheckLevel;
  kind: CheckKind;
  text: string;
  /** Paso del editor donde se arregla (1 Contenido, 2 Foto, 3 Diseño, 4 Publicar) */
  step?: 1 | 2 | 3 | 4;
  /** Se revisa al descargar. El texto de Instagram, la fecha y "cambió desde la descarga" son para planificar */
  download: boolean;
}

export interface CheckEnv {
  src: ProductSrc;
  live: Record<string, StudioStoreProduct>;
  coupons: Record<string, StudioCoupon> | null;
  store: Pick<StudioStoreInfo, 'rateVES'> | null;
  /** Textos que el motor no pudo hacer caber ni con la letra más chica (solo se sabe después de dibujarla) */
  overflow?: string[];
}

export function slotDone(p: StudioProductSlot): boolean {
  return !!p.title && Number(p.price) > 0;
}

/** "del producto" o "del producto 2" */
const ofSlot = (f: StudioFlyerData, i: number) => (TEMPLATES[f.template].n > 1 ? `del producto ${i + 1}` : 'del producto');

/** Lo que falta escribir en el paso Contenido, dicho en concreto ("Falta el precio del producto 2") */
export function contentProblems(f: StudioFlyerData): string[] {
  switch (f.template) {
    case 'mensaje':
      return f.msg.headline.trim() ? [] : ['Falta el titular'];
    case 'tasa':
      return f.rate > 0 ? [] : ['Falta la tasa del día: cárgala en Configuración → Precios y pagos'];
    case 'cupon':
      return f.coupon.code.trim() ? [] : ['Falta elegir el cupón'];
    case 'resena':
      return f.review.comment.trim() ? [] : ['Falta el texto de la reseña'];
    case 'giftcard': {
      const p = f.products[0];
      const out: string[] = [];
      if (!p?.title) out.push('Falta el nombre de la gift card');
      if (!p || !(p.price > 0 || p.variants.some((v) => v.price > 0))) out.push('Falta el precio de la gift card');
      return out;
    }
    default: {
      const out: string[] = [];
      if (f.template === 'trio' && !f.heading.trim()) out.push('Falta el título de la categoría');
      f.products.slice(0, TEMPLATES[f.template].n).forEach((p, i) => {
        if (!p.title) out.push(`Falta el título ${ofSlot(f, i)}`);
        if (!(Number(p.price) > 0)) out.push(`Falta el precio ${ofSlot(f, i)}`);
      });
      return out;
    }
  }
}

const CONTENT_OK: Partial<Record<StudioFlyerData['template'], string>> = {
  mensaje: 'Titular escrito',
  tasa: 'Tasa del día cargada',
  cupon: 'Cupón elegido',
  resena: 'Reseña escrita',
};

/** Paso completo (el 3, Diseño, nunca se marca: siempre tiene algo elegido) */
export function stepDone(k: number, f: StudioFlyerData, src: ProductSrc): boolean {
  if (k === 1) return contentProblems(f).length === 0;
  if (k === 2) return missingImages(f, src).length === 0;
  if (k === 4) return !!f.caption.trim();
  return false;
}

export function firstOpenStep(f: StudioFlyerData, src: ProductSrc): number {
  return [1, 2, 4].find((k) => !stepDone(k, f, src)) ?? 4;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function flyerChecks(f: StudioFlyerData, env: CheckEnv): FlyerCheck[] {
  const out: FlyerCheck[] = [];

  const content = contentProblems(f);
  if (content.length) content.forEach((text) => out.push({ level: 'block', kind: 'content', text, step: 1, download: true }));
  else out.push({ level: 'ok', kind: 'content', text: CONTENT_OK[f.template] ?? 'Textos y precio completos', step: 1, download: true });

  const miss = missingImages(f, env.src);
  if (miss.length) out.push({ level: 'warn', kind: 'photo', text: `Sale sin foto: ${miss.join(', ')}`, step: 2, download: true });
  else if (TEMPLATES[f.template].photo === 'required') out.push({ level: 'ok', kind: 'photo', text: 'Fotos listas', step: 2, download: true });

  // Con precio a mano, un "precio antes" que no es mayor no muestra oferta (con producto de la tienda lo pone ella)
  f.products.slice(0, TEMPLATES[f.template].n).forEach((p, i) => {
    if (!p.productId && p.oldPrice > 0 && p.price > 0 && p.oldPrice <= p.price) {
      out.push({ level: 'warn', kind: 'price', text: `El "precio antes" ${ofSlot(f, i)} no es mayor que el precio: no se verá la oferta`, step: 1, download: true });
    }
  });

  (env.overflow ?? []).forEach((t) =>
    out.push({ level: 'warn', kind: 'overflow', text: `Un texto no cabe y sale cortado: "${t.length > 40 ? `${t.slice(0, 40)}…` : t}". Acórtalo.`, step: 1, download: true }),
  );

  // "Desde la descarga" solo cuenta si ya se descargó: la próxima descarga lo corrige
  staleWarnings(f, env.live, env.coupons, env.store).forEach((w) => {
    if (w.kind === 'coupon') out.push({ level: 'block', kind: 'store', text: w.text, step: 1, download: true });
    else if (w.kind === 'price' || w.kind === 'rate') out.push({ level: 'warn', kind: 'redownload', text: `${w.text}: descárgala de nuevo`, download: false });
    else out.push({ level: 'warn', kind: 'store', text: w.text, step: 1, download: true });
  });

  if (f.caption.trim()) out.push({ level: 'ok', kind: 'caption', text: 'Texto para Instagram escrito', step: 4, download: false });
  else out.push({ level: 'warn', kind: 'caption', text: 'Falta el texto para Instagram', step: 4, download: false });

  if (f.date && !f.exported.at && f.date < todayYmd()) {
    out.push({ level: 'warn', kind: 'date', text: 'La fecha de publicación ya pasó', step: 4, download: false });
  }
  return out;
}

/** Etiqueta de la historia en la lista: lo más grave que tiene */
export function flyerStatus(checks: FlyerCheck[]): { tone: 'success' | 'warning' | 'danger'; text: string; more: number } {
  const blocks = checks.filter((c) => c.level === 'block');
  const warns = checks.filter((c) => c.level === 'warn');
  if (blocks.length) return { tone: 'danger', text: blocks[0].text, more: blocks.length + warns.length - 1 };
  if (warns.length) return { tone: 'warning', text: warns[0].text, more: warns.length - 1 };
  return { tone: 'success', text: 'Lista', more: 0 };
}

/** Lo que importa al descargar: lo que la impide y lo que conviene confirmar */
export function downloadIssues(checks: FlyerCheck[]): { blocks: FlyerCheck[]; warns: FlyerCheck[] } {
  const relevant = checks.filter((c) => c.download);
  return { blocks: relevant.filter((c) => c.level === 'block'), warns: relevant.filter((c) => c.level === 'warn') };
}
