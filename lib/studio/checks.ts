// Revisión de una historia de ElectroStudio (C-116): una sola lista para el paso Publicar, la etiqueta de la
// lista de historias y cada descarga. Lo que "impide" no deja descargar; lo que "avisa" deja seguir si se confirma.

import { missingImages, type ProductSrc } from '@/lib/studio/engine';
import { CIERRE_LOGO, duracionDe, inicioEntrada, inicioSalida } from '@/lib/studio/animaciones';
import { nombreCapa } from '@/lib/studio/capas';
import { enTramo, hasChangesSinceExport, staleWarnings } from '@/lib/studio/live';
import { TEMPLATES, TRAMOS_REGALO, type StudioCoupon, type StudioFlyerData, type StudioProductSlot, type StudioStoreInfo, type StudioStoreProduct, type TemplateId } from '@/lib/studio/schema';

export type CheckLevel = 'ok' | 'warn' | 'block';

/** De qué se trata, para agruparlas en "Por atender" del inicio */
export type CheckKind = 'content' | 'photo' | 'price' | 'overflow' | 'store' | 'redownload' | 'caption' | 'date';

export interface FlyerCheck {
  level: CheckLevel;
  kind: CheckKind;
  text: string;
  /** Paso del editor donde se arregla (C-270: 1 Contenido, 2 Fotos, 3 Diseño, 4 Textos y stickers, 5 Animación, 6 Publicar) */
  step?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Se revisa al descargar. El texto de Instagram, la fecha y "cambió desde la descarga" son para planificar */
  download: boolean;
}

export interface TextIssues {
  cut: string[];
  tiny: string[];
  /** C-270: capas que salen del borde, que quedan muy chicas o que Instagram tapa (en una historia) */
  fuera?: string[];
  chicas?: string[];
  tapadas?: string[];
}

export interface CheckEnv {
  src: ProductSrc;
  live: Record<string, StudioStoreProduct>;
  coupons: Record<string, StudioCoupon> | null;
  store: Pick<StudioStoreInfo, 'rateVES'> | null;
  /** Textos que el motor no pudo hacer caber ni con la letra más chica, y los que quedaron diminutos (se sabe al dibujarla) */
  text?: TextIssues;
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
    case 'felicitacion':
      return f.msg.headline.trim() ? [] : ['Falta el titular'];
    case 'tasa':
      return f.rate > 0 ? [] : ['Falta la tasa del día: cárgala en Ajustes → Tasa e IVA'];
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
        // C-193: un regalo que no cabe en el presupuesto de la historia la contradice
        else if (f.template === 'regalos' && !enTramo(Number(p.price), f.tramo)) out.push(`El precio ${ofSlot(f, i)} no está en ${TRAMOS_REGALO[f.tramo].titulo.toLowerCase()}`);
      });
      return out;
    }
  }
}

const CONTENT_OK: Partial<Record<StudioFlyerData['template'], string>> = {
  mensaje: 'Titular escrito',
  felicitacion: 'Saludo escrito',
  tasa: 'Tasa del día cargada',
  cupon: 'Cupón elegido',
  resena: 'Reseña escrita',
};

/** Los pasos del editor (C-270): 1 Contenido, 2 Fotos, 3 Diseño, 4 Textos y stickers, 5 Animación y 6 Publicar */
export const PASO_PUBLICAR = 6;

/** Pasos visibles según la plantilla: las que no usan foto de producto omiten Fotos (G-71) */
export function activeStepsFor(template: TemplateId): number[] {
  return TEMPLATES[template].photo === 'none' ? [1, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
}

/** Paso completo. Diseño, Textos y Animación son opcionales: no se marcan solos (siempre tienen algo elegido) */
export function stepDone(k: number, f: StudioFlyerData, src: ProductSrc): boolean {
  if (k === 1) return contentProblems(f).length === 0;
  if (k === 2) return missingImages(f, src).length === 0;
  if (k === PASO_PUBLICAR) return !!f.caption.trim();
  return false;
}

export function firstOpenStep(f: StudioFlyerData, src: ProductSrc): number {
  if (!stepDone(1, f, src)) return 1;
  if (TEMPLATES[f.template].photo !== 'none' && !stepDone(2, f, src)) return 2;
  return 1;
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

  const short = (t: string) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);
  (env.text?.cut ?? []).forEach((t) =>
    out.push({ level: 'warn', kind: 'overflow', text: `Un texto no cabe y sale cortado: "${short(t)}". Acórtalo.`, step: 1, download: true }),
  );
  (env.text?.tiny ?? []).forEach((t) =>
    out.push({ level: 'warn', kind: 'overflow', text: `Un texto queda muy chico para leerse: "${short(t)}". Acórtalo.`, step: 1, download: true }),
  );
  // C-273: una pieza que entra cuando el video ya terminó, o que sale antes de terminar de entrar, en el paso Animación
  const dur = duracionDe(f);
  const finVisible = dur - (f.cierreLogo ? CIERRE_LOGO : 0);
  f.capas.forEach((c, i) => {
    if (c.oculta) return;
    const entra = inicioEntrada(c.entrada.inicio, i);
    if (entra >= finVisible - 0.2) {
      out.push({ level: 'warn', kind: 'overflow', text: `"${short(nombreCapa(c))}" entra cuando el video ya terminó (dura ${dur} s). Que entre antes.`, step: 5, download: true });
    } else if (c.salida.tipo !== 'ninguna' && inicioSalida(c.salida.inicio, dur, f.cierreLogo) < entra + c.entrada.dura) {
      out.push({ level: 'warn', kind: 'overflow', text: `"${short(nombreCapa(c))}" sale antes de terminar de entrar. Que salga más tarde.`, step: 5, download: true });
    }
  });
  // C-270: las capas se arreglan moviéndolas o agrandándolas, en el paso Textos y stickers
  (env.text?.fuera ?? []).forEach((t) =>
    out.push({ level: 'warn', kind: 'overflow', text: `"${short(t)}" sale del borde y se corta. Muévelo hacia adentro.`, step: 4, download: true }),
  );
  (env.text?.chicas ?? []).forEach((t) =>
    out.push({ level: 'warn', kind: 'overflow', text: `"${short(t)}" queda muy chico para leerse en el teléfono. Agrándalo.`, step: 4, download: true }),
  );
  (env.text?.tapadas ?? []).forEach((t) =>
    out.push({ level: 'warn', kind: 'overflow', text: `Instagram tapa "${short(t)}" (arriba o abajo de la historia). Muévelo hacia el centro.`, step: 4, download: true }),
  );

  // "Desde la descarga" solo cuenta si ya se descargó: la próxima descarga lo corrige
  staleWarnings(f, env.live, env.coupons, env.store).forEach((w) => {
    if (w.kind === 'coupon') out.push({ level: 'block', kind: 'store', text: w.text, step: 1, download: true });
    else if (w.kind === 'price' || w.kind === 'rate') out.push({ level: 'warn', kind: 'redownload', text: `${w.text}: descárgala de nuevo`, step: PASO_PUBLICAR, download: false });
    else out.push({ level: 'warn', kind: 'store', text: w.text, step: 1, download: true });
  });

  if (hasChangesSinceExport(f)) {
    out.push({ level: 'warn', kind: 'redownload', text: 'Editaste esta historia después de sacarla: descárgala de nuevo', step: PASO_PUBLICAR, download: false });
  }

  if (f.caption.trim()) out.push({ level: 'ok', kind: 'caption', text: 'Texto para Instagram escrito', step: PASO_PUBLICAR, download: false });
  else out.push({ level: 'warn', kind: 'caption', text: 'Falta el texto para Instagram', step: PASO_PUBLICAR, download: false });

  if (f.date && !f.exported.at && f.date < todayYmd()) {
    out.push({ level: 'warn', kind: 'date', text: 'La fecha de publicación ya pasó', step: PASO_PUBLICAR, download: false });
  }
  return out;
}

/** Etiqueta de la historia en la lista: lo más grave que tiene (sin hacer ruido por caption cuando aún no hace falta) */
export function flyerStatus(checks: FlyerCheck[]): { tone: 'success' | 'warning' | 'danger'; text: string; more: number; step?: number } {
  const relevant = checks.filter((c) => c.kind !== 'caption');
  const blocks = relevant.filter((c) => c.level === 'block');
  const warns = relevant.filter((c) => c.level === 'warn');
  if (blocks.length) return { tone: 'danger', text: blocks[0].text, more: blocks.length + warns.length - 1, step: blocks[0].step };
  if (warns.length) return { tone: 'warning', text: warns[0].text, more: warns.length - 1, step: warns[0].step };
  return { tone: 'success', text: 'Lista para publicar', more: 0 };
}

/** Lo que importa al descargar: lo que la impide y lo que conviene confirmar */
export function downloadIssues(checks: FlyerCheck[]): { blocks: FlyerCheck[]; warns: FlyerCheck[] } {
  const relevant = checks.filter((c) => c.download);
  return { blocks: relevant.filter((c) => c.level === 'block'), warns: relevant.filter((c) => c.level === 'warn') };
}
