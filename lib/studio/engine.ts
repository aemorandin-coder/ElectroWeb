// Motor de dibujo de ElectroStudio (C-112): pinta una historia de 1080×1920 en un canvas, estática o en un instante
// de la animación de 7 s. Port del artefacto "Flyers ElectroShop" de Andrés; los diseños y medidas son los suyos.
// Solo navegador (canvas, FontFace, Image).
import qrcode from 'qrcode-generator';
import { formatAmount } from '@/lib/currency';
import { ICON_PATHS, payIcon } from './icons';
import {
  ANIMATIONS,
  BACKGROUNDS,
  BACKGROUND_DEFAULT,
  FORMATS,
  blankProduct,
  payKey,
  payMethods,
  requiredPhotos,
  type AnimationId,
  type BackgroundId,
  type FormatId,
  type StudioBrand,
  type StudioEffects,
  type StudioFlyerData,
  type StudioProductSlot,
  type StudioSpec,
  type TemplateId,
} from './schema';

export const W = 1080;
/** Alto de la historia (9:16), el formato por defecto */
export const H = 1920;
export const formatHeight = (format: FormatId) => FORMATS[format]?.h ?? H;
export const DURATION = 7;
export const OFFICIAL_LOGO = { color: '/images/studio/logo-color.png', white: '/images/studio/logo-white.png' };

/* ---------- fuentes ---------- */
const FAMILY = 'StudioMontserrat';
let fontsReady: Promise<void> | null = null;

/** Montserrat local (OFL, public/fonts). Hasta que cargue, el canvas usa Arial Black. */
export function loadStudioFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  if (typeof FontFace === 'undefined') return Promise.resolve();
  const faces = [
    new FontFace(FAMILY, 'url(/fonts/Montserrat-latin-wght-normal.woff2)', { weight: '100 900', style: 'normal' }),
    new FontFace(FAMILY, 'url(/fonts/Montserrat-latin-wght-italic.woff2)', { weight: '100 900', style: 'italic' }),
  ];
  fontsReady = Promise.all(faces.map((face) => face.load().then((loaded) => void document.fonts.add(loaded))))
    .then(() => undefined)
    .catch(() => undefined);
  return fontsReady;
}

const F = (w: number, s: number, it = true) => `${it ? 'italic ' : ''}${w} ${s}px ${FAMILY}, "Arial Black", Arial, sans-serif`;

/* ---------- imágenes ---------- */
type Drawable = HTMLImageElement | HTMLCanvasElement;
interface ImageEntry {
  status: 'loading' | 'ok' | 'err';
  img: HTMLImageElement | null;
  ready: Promise<void>;
}

/** Carga y guarda las imágenes del estudio. `onLoad` avisa para volver a dibujar cuando llega una. */
export class StudioImages {
  private cache = new Map<string, ImageEntry>();
  private cutouts = new Map<string, HTMLCanvasElement>();
  onLoad: (() => void) | null = null;

  get(src: string): HTMLImageElement | null {
    if (!src) return null;
    const hit = this.cache.get(src);
    if (hit) return hit.status === 'ok' ? hit.img : null;
    let settle: () => void = () => {};
    const entry: ImageEntry = { status: 'loading', img: null, ready: new Promise<void>((r) => (settle = r)) };
    this.cache.set(src, entry);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      entry.status = 'ok';
      entry.img = img;
      settle();
      this.onLoad?.();
    };
    img.onerror = () => {
      entry.status = 'err';
      settle();
    };
    img.src = src;
    return null;
  }

  failed(src: string): boolean {
    return this.cache.get(src)?.status === 'err';
  }

  /** Espera a que carguen (o fallen) estas imágenes, como mucho `timeoutMs`. */
  async whenReady(srcs: string[], timeoutMs = 6000): Promise<void> {
    srcs.filter(Boolean).forEach((s) => this.get(s));
    const all = Promise.all(srcs.filter(Boolean).map((s) => this.cache.get(s)?.ready ?? Promise.resolve()));
    await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
  }

  /** La foto sin el fondo blanco que toca los bordes (relleno por inundación desde el marco). */
  cutout(src: string, img: HTMLImageElement): HTMLCanvasElement {
    const hit = this.cutouts.get(src);
    if (hit) return hit;
    const max = 1400;
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * sc));
    const h = Math.max(1, Math.round(img.naturalHeight * sc));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    if (!x) return c;
    x.drawImage(img, 0, 0, w, h);
    try {
      const d = x.getImageData(0, 0, w, h);
      const p = d.data;
      const isBg = (k: number) => p[k + 3] > 0 && p[k] > 232 && p[k + 1] > 232 && p[k + 2] > 232;
      const seen = new Uint8Array(w * h);
      const stack: number[] = [];
      for (let i = 0; i < w; i++) stack.push(i, (h - 1) * w + i);
      for (let j = 0; j < h; j++) stack.push(j * w, j * w + w - 1);
      while (stack.length) {
        const q = stack.pop() as number;
        if (seen[q]) continue;
        seen[q] = 1;
        const k = q * 4;
        if (!isBg(k)) continue;
        p[k + 3] = 0;
        const xx = q % w;
        const yy = (q - xx) / w;
        if (xx > 0) stack.push(q - 1);
        if (xx < w - 1) stack.push(q + 1);
        if (yy > 0) stack.push(q - w);
        if (yy < h - 1) stack.push(q + w);
      }
      x.putImageData(d, 0, 0);
    } catch {
      // Imagen de otro dominio sin permiso: se usa tal cual
    }
    this.cutouts.set(src, c);
    return c;
  }
}

/** De dónde sale la foto de cada producto: la del flyer, o una recién pegada que aún se está subiendo. */
export type ProductSrc = (slot: StudioProductSlot, index: number) => string;

export interface DrawOptions {
  /** Vista previa: muestra los recuadros "Pega aquí la foto" y, si se pide, las zonas de Instagram */
  preview: boolean;
  safeZones?: boolean;
  /** Segundo de la animación; null = imagen fija */
  t?: number | null;
  /** Hora real en que empezó la animación (para el contador de la oferta) */
  epoch?: number;
  /** Código de la historia: va en el QR (?es=código) para medir visitas y compras */
  code?: string | null;
}

export function missingImages(f: StudioFlyerData | null, productSrc: ProductSrc): string[] {
  if (!f) return [];
  const n = requiredPhotos(f.template);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = f.products[i];
    if (!p) continue;
    if (!productSrc(p, i)) out.push(p.title || `Producto ${i + 1}`);
  }
  return out;
}

export function bgFor(f: Pick<StudioFlyerData, 'bg' | 'template'>): BackgroundId {
  return f.bg && BACKGROUNDS[f.bg] ? f.bg : BACKGROUND_DEFAULT[f.template] || 'ondas';
}

type Box = [number, number, number, number];
type FxKind = 'up' | 'left' | 'right' | 'zoomin' | 'pop' | 'wipe' | 'fade';

/** Números al azar pero siempre los mismos (mulberry32): el fondo y las partículas no cambian entre dibujos */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "#004AAD" + 0.5 → "rgba(0,74,173,0.5)" */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- paleta ---------- */
const INK = '#0A1B3D';
const PALE = '#EEF3FB';
const HOT = '#E0263A'; // solo ofertas: sticker de descuento, etiqueta y contador
const LIGHT_ON_DARK = '#9CC0FF';
const GOLD = '#FFB400'; // estrellas de las reseñas
const CONFETTI = ['#FFB400', '#E0263A', '#22D3EE', '#FFFFFF'];
/* Los diseños están hechos en una grilla de 1080×1350 (4:5). Cada formato la acomoda en su lienzo (FORMAT_LAYOUT):
   - Historia 9:16: se estira en vertical (K) para llenar el espacio entre la barra de perfil y la de responder.
   - Post 4:5: tal cual.
   - Post 1:1: se achica parejo (SC) y se centra; el fondo sí llena todo el ancho. */
const CH = 1350;
const FORMAT_LAYOUT: Record<FormatId, { K: number; OY: number; S: number; TX: number }> = {
  story: { K: 1.15, OY: 185, S: 1, TX: 0 },
  post45: { K: 1, OY: 0, S: 1, TX: 0 },
  post11: { K: 1, OY: 0, S: 0.8, TX: 108 },
};
const SPLIT: Record<TemplateId, number> = { solo: 860, duo: 650, trio: 880, nuevo: 900, giftcard: 600, cupon: 980, resena: 900, mensaje: 1000, tasa: 790 };
/** Dónde va el podio y el centro de los rayos, según la plantilla */
const PODIUM_X: Partial<Record<TemplateId, number>> = { solo: 760, duo: 850, nuevo: 400, giftcard: 840 };
const RAYS_CENTER: Partial<Record<TemplateId, [number, number]>> = { solo: [310, 1010], duo: [505, 475], cupon: [540, 560], tasa: [540, 520], nuevo: [540, 620] };

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const back = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const iconPathCache = new Map<string, Path2D[]>();
function iconPaths(name: string): Path2D[] {
  let paths = iconPathCache.get(name);
  if (!paths) {
    paths = (ICON_PATHS[name] || ICON_PATHS.check).map((d) => new Path2D(d));
    iconPathCache.set(name, paths);
  }
  return paths;
}

const qrCache = new Map<string, boolean[][] | null>();
function qrModules(text: string): boolean[][] | null {
  if (!text) return null;
  const hit = qrCache.get(text);
  if (hit !== undefined) return hit;
  let m: boolean[][] | null = null;
  try {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    m = [];
    for (let r = 0; r < n; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < n; c++) row.push(q.isDark(r, c));
      m.push(row);
    }
  } catch {
    m = null;
  }
  qrCache.set(text, m);
  return m;
}

function dims(img: Drawable): { w: number; h: number } {
  return img instanceof HTMLImageElement ? { w: img.naturalWidth, h: img.naturalHeight } : { w: img.width, h: img.height };
}

/** Enlace de la historia (QR y texto). Con código lleva la marca de campaña ?es=código, que cuenta visitas y compras. */
export function qrUrlFor(f: StudioFlyerData, brand: StudioBrand, code?: string | null): string {
  const site = `https://${(brand.website || 'electroshopve.com').replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  let base = (f.qrUrl || '').trim() || (f.products[0] || {}).url || site;
  if (base.startsWith('/')) base = site + base;
  if (!code) return base;
  try {
    const u = new URL(base);
    u.searchParams.set('es', code);
    return u.toString();
  } catch {
    return base;
  }
}

export function discountPct(p: Pick<StudioProductSlot, 'oldPrice' | 'price'>): number {
  const o = Number(p.oldPrice) || 0;
  const n = Number(p.price) || 0;
  return o > n && n > 0 ? Math.round(((o - n) / o) * 100) : 0;
}

/**
 * Un renderizador por canvas. Guarda el estado de un dibujo (instante, animación, fondo) entre las funciones
 * de las plantillas, igual que el artefacto.
 */
export function createRenderer(canvas: HTMLCanvasElement, images: StudioImages, productSrc: ProductSrc) {
  const mainCtx = canvas.getContext('2d');
  if (!mainCtx) throw new Error('Canvas 2D no disponible');
  let ctx: CanvasRenderingContext2D = mainCtx;
  let brand: StudioBrand;
  let T: number | null = null;
  let animEpoch = 0;
  let ANIM: AnimationId = 'entrada';
  let bgData: Uint8ClampedArray | null = null;
  let slideFlip = 0;
  const bgCache = new Map<string, { canvas: HTMLCanvasElement; data: Uint8ClampedArray }>();
  // Textos que no cupieron ni con la letra mínima en el dibujo en curso (C-116)
  const overflow = new Set<string>();
  // Historia que se dibuja y su formato: fijados al empezar cada dibujo
  let FL: StudioFlyerData | null = null;
  let FX: StudioEffects = { reflejo: false, particulas: false, confeti: false };
  let CODE: string | null = null;
  let FH = H;
  let K = 1.15;
  let OY = 185;
  let SC = 1;
  let TX = 0;
  let TOP = -OY;
  let BOT = H - OY;
  const Y = (v: number) => v * K;
  function setFormat(format: FormatId) {
    const l = FORMAT_LAYOUT[format] ?? FORMAT_LAYOUT.story;
    FH = formatHeight(format);
    ({ K, OY, S: SC, TX } = l);
    // El fondo se dibuja con escala vertical SC: estas son sus coordenadas arriba y abajo del lienzo
    TOP = -OY / SC;
    BOT = (FH - OY) / SC;
  }

  const PR = () => (FL?.accent || brand.accent || '#004AAD');
  const SE = () => (FL?.accent2 || brand.accent2 || '#2463D6');

  /* ---------- ayudas de canvas ---------- */
  function fit(text: string, maxW: number, start: number, w: number, it = true, min = 18): number {
    let s = start;
    ctx.font = F(w, s, it);
    while (ctx.measureText(text).width > maxW && s > min) {
      s -= 2;
      ctx.font = F(w, s, it);
    }
    // C-116: ni con la letra más chica cabe; se avisa antes de descargar
    if (text.trim() && ctx.measureText(text).width > maxW) overflow.add(text.trim());
    return s;
  }
  function rr(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  function spacing(px: string) {
    // letterSpacing es reciente en canvas: donde no existe, no pasa nada
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = px;
  }
  function contain(img: Drawable, x: number, y: number, w: number, h: number, shadow = true, anchor: 'center' | 'bottom' = 'center', reflect = false) {
    const { w: iw, h: ih } = dims(img);
    const s = Math.min(w / iw, h / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = x + (w - dw) / 2;
    const dy = anchor === 'bottom' ? y + h - dh : y + (h - dh) / 2;
    ctx.save();
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,.28)';
      ctx.shadowBlur = 36;
      ctx.shadowOffsetY = 22;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    if (reflect) ctx.drawImage(reflection(img), dx, dy + dh + 6, dw, dh * 0.4);
  }
  /** Reflejo en el piso: la parte de abajo de la foto, invertida y desvanecida (se calcula una vez por foto) */
  const reflections = new WeakMap<Drawable, HTMLCanvasElement>();
  function reflection(img: Drawable): HTMLCanvasElement {
    const hit = reflections.get(img);
    if (hit) return hit;
    const { w: iw, h: ih } = dims(img);
    const rh = Math.max(1, Math.round(ih * 0.4));
    const c = document.createElement('canvas');
    c.width = Math.max(1, iw);
    c.height = rh;
    const x = c.getContext('2d');
    if (x) {
      x.translate(0, rh);
      x.scale(1, -1);
      x.drawImage(img, 0, ih - rh, iw, rh, 0, 0, iw, rh);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'destination-in';
      const g = x.createLinearGradient(0, 0, 0, rh);
      g.addColorStop(0, 'rgba(0,0,0,.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, iw, rh);
    }
    reflections.set(img, c);
    return c;
  }
  function placeholder(x: number, y: number, w: number, h: number, label: string, dark = false) {
    ctx.save();
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.35)';
    rr(x, y, w, h, 24);
    ctx.stroke();
    ctx.fillStyle = dark ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = F(800, 34);
    ctx.fillText('Pega aquí la foto', x + w / 2, y + h / 2 - 22);
    ctx.font = F(500, 24, false);
    ctx.fillText(label || 'Ctrl+V o arrastra', x + w / 2, y + h / 2 + 22);
    ctx.restore();
  }
  function burst(cx: number, cy: number, r: number, color: string, n = 14, depth = 0.085, rot = 0) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2 + rot;
      const rad = i % 2 === 0 ? r : r * (1 - depth);
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  /** "1.099" y "00": el formato de la tienda (D4), con los decimales pequeños arriba */
  function splitPrice(v: number) {
    const [int, dec] = formatAmount(Number(v) || 0).split(',');
    return { int, dec };
  }
  function ink(t: string) {
    const m = ctx.measureText(t);
    return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight };
  }
  /** Precio grande centrado en cx con la base en y. Separa por el contorno real de las cifras para que nada choque. */
  function bigPrice(cx: number, y: number, value: number, size: number, color: string, prefix: string, maxW = Infinity) {
    const { int, dec } = splitPrice(value);
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let sz = size;
    let parts = { mp: { l: 0, r: 0, w: 0 }, mi: { l: 0, r: 0, w: 0 }, md: { l: 0, r: 0, w: 0 }, g1: 0, g2: 0, total: 0 };
    for (let k = 0; k < 30; k++) {
      ctx.font = F(800, sz * 0.3, false);
      const mp = prefix ? ink(prefix) : { l: 0, r: 0, w: 0 };
      ctx.font = F(900, sz, false);
      const mi = ink(int);
      ctx.font = F(900, sz * 0.42, false);
      const md = ink(`,${dec}`);
      const g1 = prefix ? sz * 0.06 : 0;
      const g2 = sz * 0.05;
      parts = { mp, mi, md, g1, g2, total: mp.w + g1 + mi.w + g2 + md.w };
      if (parts.total <= maxW) break;
      sz *= 0.94;
    }
    const { mp, mi, md, g1, g2, total } = parts;
    ctx.fillStyle = color;
    let x = cx - total / 2;
    if (prefix) {
      ctx.font = F(800, sz * 0.3, false);
      ctx.fillText(prefix, x + mp.l, y - sz * 0.42);
      x += mp.w + g1;
    }
    ctx.font = F(900, sz, false);
    ctx.fillText(int, x + mi.l, y);
    x += mi.w + g2;
    ctx.font = F(900, sz * 0.42, false);
    ctx.fillText(`,${dec}`, x + md.l, y - sz * 0.36);
    ctx.restore();
    return total;
  }
  function wrapLines(text: string, maxW: number): string[] {
    const words = (text || '').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- íconos ---------- */
  function icon(name: string, x: number, y: number, s: number, color: string, weight = 2.2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 24, s / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    iconPaths(name).forEach((p) => ctx.stroke(p));
    ctx.restore();
  }
  /** Ícono dentro de un recuadro de color: el tratamiento principal de los íconos en las historias */
  function iconBadge(name: string, x: number, y: number, s: number, dark: boolean) {
    ctx.save();
    ctx.fillStyle = dark ? '#FFFFFF' : PR();
    rr(x, y, s, s, s * 0.26);
    ctx.fill();
    icon(name, x + s * 0.2, y + s * 0.2, s * 0.6, dark ? PR() : '#FFFFFF', 2.3);
    ctx.restore();
  }
  function payLogo(m: string): HTMLImageElement | null {
    const src = brand.payLogos[payKey(m)];
    return src ? images.get(src) : null;
  }

  /* ---------- color según el fondo ---------- */
  function lumAt(px: number, py: number): number {
    if (!bgData) return 255;
    // Del contenido al lienzo: el contenido está desplazado (TX, OY) y escalado (SC)
    const X = Math.max(0, Math.min(W - 1, Math.round(TX + px * SC)));
    const Yy = Math.max(0, Math.min(FH - 1, Math.round(OY + py * SC)));
    const k = (Yy * W + X) * 4;
    return 0.2126 * bgData[k] + 0.7152 * bgData[k + 1] + 0.0722 * bgData[k + 2];
  }
  function isDark(x: number, y: number, w = 0, h = 0): boolean {
    const pts = w || h ? [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2]] : [[x, y]];
    let s = 0;
    pts.forEach((p) => (s += lumAt(p[0], p[1])));
    return s / pts.length < 150;
  }
  const textOn = (x: number, y: number, w = 0, h = 0) => (isDark(x, y, w, h) ? '#FFFFFF' : INK);

  /* ---------- línea de tiempo ---------- */
  function prog(start: number, dur: number): number {
    if (T === null) return 1;
    return Math.max(0, Math.min(1, (T - start) / dur));
  }
  function fx(kind: FxKind, start: number, dur: number, box: Box | null, fn: () => void) {
    const p = prog(start, dur);
    if (p <= 0) return;
    if (p >= 1) {
      fn();
      return;
    }
    if (ANIM === 'deslizar') {
      if (kind === 'up' || kind === 'fade') kind = slideFlip++ % 2 ? 'right' : 'left';
      else if (kind === 'pop') kind = 'right';
    }
    if (ANIM === 'zoom' && kind === 'up') kind = 'zoomin';
    ctx.save();
    const e = ease(p);
    const b = box || [0, 0, W, Y(CH)];
    switch (kind) {
      case 'up':
        ctx.globalAlpha *= e;
        ctx.translate(0, (1 - e) * 110);
        break;
      case 'left':
        ctx.globalAlpha *= e;
        ctx.translate(-(1 - e) * 260, 0);
        break;
      case 'right':
        ctx.globalAlpha *= e;
        ctx.translate((1 - e) * 260, 0);
        break;
      case 'zoomin': {
        const s = 1 + (1 - e) * 0.5;
        const cx = b[0] + b[2] / 2;
        const cy = b[1] + b[3] / 2;
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha *= e;
        break;
      }
      case 'pop': {
        const s = Math.max(0.01, back(p));
        const cx = b[0] + b[2] / 2;
        const cy = b[1] + b[3] / 2;
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha *= Math.min(1, p * 3);
        break;
      }
      case 'wipe':
        ctx.beginPath();
        ctx.rect(b[0] - 10, b[1] - 40, (b[2] + 20) * e, b[3] + 120);
        ctx.clip();
        break;
      default:
        ctx.globalAlpha *= e;
    }
    fn();
    ctx.restore();
  }
  const bob = (phase = 0) => (T === null ? 0 : Math.sin(T * 2.2 + phase) * 9 * prog(1.6, 0.6));
  const spin = () => (T === null ? 0 : T * 0.12);
  const count = (start: number) => (T === null ? 1 : ease(prog(start, 0.9)));
  /** "Destello": una franja de luz que cruza la caja */
  function shine(box: Box, t0: number) {
    if (T === null || ANIM !== 'destello') return;
    [t0, t0 + 2.6].forEach((ts) => {
      const p = prog(ts, 0.8);
      if (p <= 0 || p >= 1) return;
      const [x, y, w, h] = box;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const cx = x - 200 + p * (w + 400);
      const g = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.translate(cx, y + h / 2);
      ctx.rotate(0.35);
      ctx.translate(-cx, -(y + h / 2));
      ctx.fillStyle = g;
      ctx.fillRect(cx - 90, y - h, 180, h * 3);
      ctx.restore();
    });
  }
  /** Animación "Escribir": el texto aparece letra por letra entre t0 y t0 + dur */
  function typed(text: string, t0: number, dur: number): string {
    if (T === null || ANIM !== 'escribir') return text;
    return text.slice(0, Math.floor(prog(t0, dur) * text.length));
  }
  /** Partículas de luz detrás del contenido: quietas en la imagen, flotando en el video */
  function particles() {
    const r = rng(23);
    const h = Y(CH);
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const x0 = r() * W;
      const y0 = r() * h;
      const size = 2 + r() * 5;
      const speed = 20 + r() * 50;
      const phase = r() * 6.28;
      const y = T === null ? y0 : ((y0 - T * speed) % h + h) % h;
      const x = x0 + (T === null ? 0 : Math.sin(T * 1.4 + phase) * 14);
      const dark = isDark(x, y);
      ctx.globalAlpha = 0.25 + r() * 0.5;
      ctx.fillStyle = dark ? '#FFFFFF' : PR();
      if (i % 6 === 0) {
        // Destellos en cruz
        ctx.fillRect(x - size * 2, y - 1, size * 4, 2);
        ctx.fillRect(x - 1, y - size * 2, 2, size * 4);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  /** Confeti encima de todo: cae al principio del video y queda repartido en la imagen fija */
  function confetti() {
    const r = rng(41);
    const h = Y(CH);
    const p = T === null ? 1 : ease(prog(0.9, 1.8));
    if (p <= 0) return;
    ctx.save();
    for (let i = 0; i < 64; i++) {
      const x = r() * W;
      // Más confeti arriba y a los lados, para no tapar el precio
      const yEnd = Math.pow(r(), 1.6) * h * 0.75;
      const y = yEnd - (1 - p) * (h * 0.8 + r() * 300);
      const w = 10 + r() * 14;
      const hh = 6 + r() * 8;
      const rot = r() * Math.PI + (T === null ? 0 : T * (r() - 0.5) * 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = i % 5 === 0 ? PR() : i % 7 === 0 ? SE() : CONFETTI[i % CONFETTI.length];
      ctx.globalAlpha = 0.9;
      if (i % 4 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, hh * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-w / 2, -hh / 2, w, hh);
      ctx.restore();
    }
    ctx.restore();
  }
  const pulse = () =>
    T === null || ANIM !== 'destello' ? 1 : 1 + 0.05 * Math.max(0, Math.sin(((T - 3) * Math.PI) / 0.6)) * (T > 3 && T < 3.6 ? 1 : 0);

  /* ---------- fondos (coordenadas del contenido; TOP..BOT cubre toda la historia) ---------- */
  function circle(x: number, y: number, r: number) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function wave(y: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y + 20);
    ctx.bezierCurveTo(220, y - 100, 430, y + 100, 660, y + 40);
    ctx.bezierCurveTo(860, y - 10, 940, y - 140, W, y - 130);
    ctx.lineTo(W, BOT);
    ctx.lineTo(0, BOT);
    ctx.closePath();
    ctx.fill();
  }
  function dots(color: string, step = 34, r = 3, area: Box = [0, 0, W, CH]) {
    ctx.fillStyle = color;
    for (let y = area[1] + step / 2; y < area[1] + area[3]; y += step)
      for (let x = area[0] + step / 2; x < area[0] + area[2]; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 7);
        ctx.fill();
      }
  }
  function drawBg(style: BackgroundId, split: number) {
    const P = PR();
    const S = SE();
    ctx.fillStyle = PALE;
    ctx.fillRect(0, TOP, W, BOT - TOP);
    const g = ctx.createRadialGradient(600, Y(380), 40, 600, Y(380), 860);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, TOP, W, BOT - TOP);
    switch (style) {
      case 'diagonal':
        ctx.fillStyle = S;
        ctx.beginPath();
        ctx.moveTo(0, split + 110);
        ctx.lineTo(W, split - 330);
        ctx.lineTo(W, split - 280);
        ctx.lineTo(0, split + 160);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = P;
        ctx.beginPath();
        ctx.moveTo(0, split + 190);
        ctx.lineTo(W, split - 250);
        ctx.lineTo(W, BOT);
        ctx.lineTo(0, BOT);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = S;
        ctx.beginPath();
        ctx.moveTo(W - 420, TOP);
        ctx.lineTo(W, TOP);
        ctx.lineTo(W, 60);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = P;
        ctx.beginPath();
        ctx.moveTo(0, TOP);
        ctx.lineTo(300, TOP);
        ctx.lineTo(0, -40);
        ctx.closePath();
        ctx.fill();
        break;
      case 'circulos':
        ctx.fillStyle = S;
        circle(W + 120, BOT - 240, 480);
        ctx.fillStyle = P;
        circle(W * 0.22, BOT + 300, BOT + 300 - split);
        ctx.fillStyle = P;
        circle(W - 30, -60, 240);
        ctx.strokeStyle = S;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(W - 30, -60, 290, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = S;
        circle(-60, -120, 150);
        break;
      case 'arco': {
        const R = 1500;
        ctx.fillStyle = P;
        circle(W / 2, split + R, R);
        ctx.strokeStyle = S;
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(W / 2, split + R, R + 40, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.fillStyle = P;
        circle(W / 2, TOP - 1340, 1480);
        dots('rgba(36,99,214,.2)', 30, 3.2, [W - 300, 10, 260, 120]);
        break;
      }
      case 'lateral':
        ctx.fillStyle = P;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        ([[S, 700], ['#FFFFFF', 740]] as [string, number][]).forEach(([c, x0]) => {
          const d = x0 - 700;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x0, TOP);
          ctx.lineTo(x0, 0);
          ctx.bezierCurveTo(730 + d, Y(160), 490 + d, Y(250), 530 + d, Y(330));
          ctx.bezierCurveTo(570 + d, Y(410), 670 + d, Y(380), 730 + d, Y(460));
          ctx.bezierCurveTo(810 + d, Y(560), 750 + d, Y(660), 830 + d, Y(760));
          ctx.bezierCurveTo(900 + d, Y(850), 1010 + d, Y(820), W, Y(880));
          ctx.lineTo(W, TOP);
          ctx.closePath();
          ctx.fill();
        });
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.moveTo(0, Y(1030));
        ctx.bezierCurveTo(120, Y(1130), 200, Y(1260), 380, Y(1350));
        ctx.lineTo(560, BOT);
        ctx.lineTo(0, BOT);
        ctx.closePath();
        ctx.fill();
        break;
      case 'liso':
        dots('rgba(36,99,214,.14)', 36, 3, [0, TOP, W, Y(1200) - TOP]);
        ctx.fillStyle = P;
        ctx.fillRect(0, Y(1200), W, BOT - Y(1200));
        ctx.fillStyle = S;
        ctx.fillRect(0, Y(1200) - 12, W, 12);
        break;
      case 'azul': {
        ctx.fillStyle = P;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        const g2 = ctx.createRadialGradient(W - 120, 60, 20, W - 120, 60, 860);
        g2.addColorStop(0, 'rgba(80,140,240,.75)');
        g2.addColorStop(1, 'rgba(80,140,240,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        ctx.lineWidth = 3;
        for (let i = 1; i < 10; i++) {
          ctx.beginPath();
          ctx.arc(W + 40, BOT + 40, 150 * i, 0, Math.PI * 2);
          ctx.stroke();
        }
        dots('rgba(255,255,255,.14)', 32, 3, [W - 330, -170, 290, 150]);
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, Y(1220), W, BOT - Y(1220));
        ctx.globalAlpha = 1;
        break;
      }
      case 'circuito': {
        const g = ctx.createLinearGradient(0, TOP, 0, BOT);
        g.addColorStop(0, INK);
        g.addColorStop(1, P);
        ctx.fillStyle = g;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        const r = rng(7);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < 38; i++) {
          let x = Math.round((r() * W) / 40) * 40;
          let y = TOP + r() * (BOT - TOP);
          const accentTrace = i % 5 === 0;
          ctx.strokeStyle = accentTrace ? alpha(LIGHT_ON_DARK, 0.45) : 'rgba(255,255,255,.10)';
          ctx.lineWidth = accentTrace ? 5 : 4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 3; k++) {
            const len = 60 + r() * 220;
            if (k % 2 === 0) x += (r() < 0.5 ? -1 : 1) * len;
            else y += (r() < 0.5 ? -1 : 1) * len * 0.7;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        // Un chip de fondo, arriba a la derecha
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(W - 330, -90, 250, 250, 26);
        else ctx.rect(W - 330, -90, 250, 250);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(W - 300 + i * 48, -90);
          ctx.lineTo(W - 300 + i * 48, -130);
          ctx.moveTo(W - 300 + i * 48, 160);
          ctx.lineTo(W - 300 + i * 48, 200);
          ctx.stroke();
        }
        break;
      }
      case 'hexagonos': {
        const edge = (x: number) => split + 60 - (120 * x) / W;
        ctx.fillStyle = P;
        ctx.beginPath();
        ctx.moveTo(0, edge(0));
        ctx.lineTo(W, edge(W));
        ctx.lineTo(W, BOT);
        ctx.lineTo(0, BOT);
        ctx.closePath();
        ctx.fill();
        const R = 46;
        const hw = Math.sqrt(3) * R;
        ctx.lineWidth = 3;
        for (let row = 0, cy = TOP; cy < BOT + R; row++, cy += R * 1.5) {
          for (let cx = row % 2 ? hw / 2 : 0; cx < W + hw; cx += hw) {
            const onBand = cy > edge(cx);
            const a = onBand ? 0.13 : 0.04 + 0.18 * Math.max(0, (cy - TOP) / (split - TOP));
            ctx.strokeStyle = onBand ? `rgba(255,255,255,${a})` : alpha(P, a);
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ang = (Math.PI / 3) * k + Math.PI / 6;
              const px = cx + R * Math.cos(ang);
              const py = cy + R * Math.sin(ang);
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        break;
      }
      case 'aurora': {
        ctx.fillStyle = INK;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        const blobs: [number, number, number, string][] = [
          [W * 0.15, Y(200), 760, alpha(P, 0.95)],
          [W * 0.95, Y(520), 700, alpha(S, 0.85)],
          [W * 0.45, Y(1150), 820, alpha('#22D3EE', 0.35)],
          [W * 0.05, Y(1350), 620, alpha(LIGHT_ON_DARK, 0.3)],
        ];
        blobs.forEach(([x, y, r, c]) => {
          const g = ctx.createRadialGradient(x, y, 10, x, y, r);
          g.addColorStop(0, c);
          g.addColorStop(1, 'rgba(10,27,61,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, TOP, W, BOT - TOP);
        });
        const r = rng(11);
        for (let i = 0; i < 70; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.45})`;
          ctx.beginPath();
          ctx.arc(r() * W, TOP + r() * (BOT - TOP), 1.5 + r() * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'podio': {
        const px = PODIUM_X[FL?.template ?? 'solo'] ?? W / 2;
        const glow = ctx.createRadialGradient(px, split - 260, 20, px, split - 260, 620);
        glow.addColorStop(0, 'rgba(255,255,255,1)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        ctx.strokeStyle = alpha(S, 0.16);
        ctx.lineWidth = 16;
        [430, 540].forEach((r) => {
          ctx.beginPath();
          ctx.arc(px, split - 240, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        const floor = ctx.createLinearGradient(0, split, 0, BOT);
        floor.addColorStop(0, P);
        floor.addColorStop(1, INK);
        ctx.fillStyle = floor;
        ctx.fillRect(0, split + 30, W, BOT - split);
        const rx = 340;
        const ry = 62;
        const hgt = 90;
        ctx.fillStyle = S;
        ctx.fillRect(px - rx, split, rx * 2, hgt);
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(px, split + hgt, rx, ry, 0, 0, Math.PI);
        ctx.fill();
        const top = ctx.createLinearGradient(0, split - ry, 0, split + ry);
        top.addColorStop(0, '#FFFFFF');
        top.addColorStop(1, PALE);
        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.ellipse(px, split, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = alpha(S, 0.6);
        ctx.lineWidth = 6;
        ctx.stroke();
        break;
      }
      case 'rayos': {
        const [rcx, rcy] = RAYS_CENTER[FL?.template ?? 'solo'] ?? [W / 2, 600];
        const cx = rcx;
        const cy = Y(rcy);
        ctx.fillStyle = P;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        ctx.fillStyle = alpha(S, 0.85);
        const n = 22;
        for (let i = 0; i < n; i += 2) {
          const a0 = (Math.PI * 2 * i) / n;
          const a1 = (Math.PI * 2 * (i + 1)) / n;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a0) * 3000, cy + Math.sin(a0) * 3000);
          ctx.lineTo(cx + Math.cos(a1) * 3000, cy + Math.sin(a1) * 3000);
          ctx.closePath();
          ctx.fill();
        }
        const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 620);
        g.addColorStop(0, 'rgba(255,255,255,.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, TOP, W, BOT - TOP);
        ctx.fillStyle = alpha(INK, 0.4);
        ctx.fillRect(0, Y(1220), W, BOT - Y(1220));
        break;
      }
      case 'neon': {
        ctx.fillStyle = '#070B1A';
        ctx.fillRect(0, TOP, W, BOT - TOP);
        const vx = W / 2;
        ctx.save();
        ctx.shadowColor = S;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = alpha(LIGHT_ON_DARK, 0.45);
        ctx.lineWidth = 3;
        for (let i = 1; i < 14; i++) {
          const y = split + Math.pow(i / 13, 1.8) * (BOT - split);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        for (let i = -9; i <= 9; i++) {
          ctx.beginPath();
          ctx.moveTo(vx + i * 30, split);
          ctx.lineTo(vx + i * 260, BOT);
          ctx.stroke();
        }
        ctx.shadowColor = P;
        ctx.shadowBlur = 34;
        ctx.strokeStyle = S;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(0, split);
        ctx.lineTo(W, split);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.strokeStyle = alpha(S, 0.9);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(28, TOP + 28, W - 56, split - TOP - 70, 40);
        else ctx.rect(28, TOP + 28, W - 56, split - TOP - 70);
        ctx.stroke();
        ctx.restore();
        const sun = ctx.createLinearGradient(0, split - 420, 0, split - 40);
        sun.addColorStop(0, S);
        sun.addColorStop(1, P);
        ctx.fillStyle = sun;
        ctx.beginPath();
        ctx.arc(W * 0.8, split - 230, 170, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#070B1A';
        for (let i = 0; i < 6; i++) ctx.fillRect(W * 0.8 - 180, split - 200 + i * 30, 360, 6 + i * 2);
        break;
      }
      case 'foto':
      case 'fotoproducto':
        photoBackground(style, split);
        break;
      default: // ondas
        ctx.fillStyle = S;
        circle(W + 40, -90, 380);
        ctx.fillStyle = P;
        circle(W + 60, -110, 340);
        ctx.fillStyle = S;
        circle(-80, -150, 190);
        wave(split - 26, S);
        wave(split, P);
    }
  }
  /** La foto del fondo: la propia del paso Diseño o la del primer producto */
  function photoSource(style: BackgroundId): string {
    if (!FL) return '';
    if (style === 'foto') return FL.bgPhoto.url;
    return FL.products[0] ? productSrc(FL.products[0], 0) : '';
  }
  function photoKey(style: BackgroundId): string {
    if (style !== 'foto' && style !== 'fotoproducto') return '';
    const src = photoSource(style);
    const bp = FL?.bgPhoto;
    return [src, images.get(src) ? 1 : 0, bp?.blur, bp?.darken, bp?.tint, bp?.x, bp?.y, bp?.zoom].join(',');
  }
  /** Foto a pantalla completa, desenfocada, oscurecida y (si se pide) teñida con el color de la marca, para que se lea encima */
  function photoBackground(style: BackgroundId, split: number) {
    const bp = FL?.bgPhoto ?? { blur: 14, darken: 45, tint: true, x: 50, y: 50, zoom: 100 };
    const src = photoSource(style);
    const img = images.get(src);
    const h = BOT - TOP;
    if (!img) {
      const g = ctx.createLinearGradient(0, TOP, 0, BOT);
      g.addColorStop(0, SE());
      g.addColorStop(1, INK);
      ctx.fillStyle = g;
      ctx.fillRect(0, TOP, W, h);
      return;
    }
    // Cubrir el lienzo (como object-fit: cover) con zoom y punto de interés; el desenfoque necesita margen extra
    const blur = bp.blur;
    const margin = blur * 3;
    const cover = Math.max((W + margin * 2) / img.naturalWidth, (h + margin * 2) / img.naturalHeight) * (bp.zoom / 100);
    const dw = img.naturalWidth * cover;
    const dh = img.naturalHeight * cover;
    const dx = -((dw - W) * bp.x) / 100;
    const dy = TOP - ((dh - h) * bp.y) / 100;
    ctx.save();
    if (blur > 0 && typeof ctx.filter === 'string') {
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
    } else if (blur > 0) {
      // Navegadores sin ctx.filter (Safari viejo): achicar y volver a agrandar desenfoca igual
      const f = 1 + blur * 0.6;
      const small = document.createElement('canvas');
      small.width = Math.max(8, Math.round(dw / f));
      small.height = Math.max(8, Math.round(dh / f));
      small.getContext('2d')?.drawImage(img, 0, 0, small.width, small.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(small, dx, dy, dw, dh);
    } else ctx.drawImage(img, dx, dy, dw, dh);
    if (bp.tint) {
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = PR();
      ctx.fillRect(0, TOP, W, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = `rgba(6,14,32,${bp.darken / 100})`;
    ctx.fillRect(0, TOP, W, h);
    // Más oscuro arriba (logo) y abajo (precio y pie), donde va el texto
    const g = ctx.createLinearGradient(0, TOP, 0, BOT);
    g.addColorStop(0, 'rgba(6,14,32,.45)');
    g.addColorStop(0.3, 'rgba(6,14,32,0)');
    g.addColorStop(Math.min(0.95, Math.max(0.35, (split - TOP) / h)), 'rgba(6,14,32,0)');
    g.addColorStop(1, 'rgba(6,14,32,.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, TOP, W, h);
    ctx.restore();
  }
  function bgCanvas(style: BackgroundId, split: number) {
    const key = [style, split, PR(), SE(), FH, FL?.template ?? '', photoKey(style)].join('|');
    const hit = bgCache.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = FH;
    const cx2 = c.getContext('2d', { willReadFrequently: true });
    if (!cx2) throw new Error('Canvas 2D no disponible');
    const saved = ctx;
    ctx = cx2;
    ctx.save();
    ctx.translate(0, OY);
    ctx.scale(1, SC);
    drawBg(style, Y(split));
    ctx.restore();
    ctx = saved;
    const entry = { canvas: c, data: cx2.getImageData(0, 0, W, FH).data };
    if (bgCache.size > 16) bgCache.clear();
    bgCache.set(key, entry);
    return entry;
  }
  /** Pinta el fondo (con su entrada) y pasa a coordenadas del contenido */
  function layerBg(style: BackgroundId, split: number) {
    const bg = bgCanvas(style, split);
    bgData = bg.data;
    const p = prog(0, 0.9);
    ctx.fillStyle = PALE;
    ctx.fillRect(0, 0, W, FH);
    if (p >= 1) ctx.drawImage(bg.canvas, 0, 0);
    else if (p > 0) {
      ctx.save();
      ctx.beginPath();
      if (ANIM === 'deslizar') ctx.rect(0, 0, W * ease(p), FH);
      else ctx.arc(0, FH, ease(p) * 2500, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(bg.canvas, 0, 0);
      ctx.restore();
    }
    ctx.translate(TX, OY);
    ctx.scale(SC, SC);
    if (FX.particulas) particles();
    if (ANIM === 'zoom' && T !== null) {
      const s = 1 + 0.05 * (T / DURATION);
      ctx.translate(W / 2, Y(CH) / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -Y(CH) / 2);
    }
  }

  /* ---------- logo ---------- */
  function drawLogo(x: number, y: number, maxW: number, maxH: number, alignRight = false) {
    let lg: HTMLImageElement | null = brand.logoUrl ? images.get(brand.logoUrl) : null;
    if (!lg) lg = images.get(isDark(x, y, maxW, maxH) ? OFFICIAL_LOGO.white : OFFICIAL_LOGO.color);
    if (lg) {
      const s = Math.min(maxW / lg.naturalWidth, maxH / lg.naturalHeight);
      const w = lg.naturalWidth * s;
      const h = lg.naturalHeight * s;
      ctx.drawImage(lg, alignRight ? x + maxW - w : x, y + (maxH - h) / 2, w, h);
      return;
    }
    ctx.save();
    ctx.fillStyle = textOn(x, y, maxW, maxH);
    ctx.textBaseline = 'middle';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.font = F(900, 44, false);
    ctx.fillText('ElectroShop', alignRight ? x + maxW : x, y + maxH / 2);
    ctx.restore();
  }

  /* ---------- ofertas, contador y QR ---------- */
  function sticker(cx: number, cy: number, r: number, text: string, t0: number) {
    fx('pop', t0, 0.5, [cx - r, cy - r, 2 * r, 2 * r], () => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.22 + (T === null ? 0 : Math.sin(T * 3) * 0.04));
      ctx.translate(-cx, -cy);
      burst(cx, cy, r, HOT, 12, 0.13);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const s = fit(text, r * 1.45, r * 0.62, 900, false, 14);
      ctx.font = F(900, s, false);
      ctx.fillText(text, cx, cy + 2);
      ctx.restore();
    });
  }
  const nowMs = () => (T === null ? Date.now() : animEpoch + T * 1000);
  function countdown(f: StudioFlyerData, xr: number, y: number, t0 = 0.5) {
    if (!f.offerEnds) return;
    const end = Date.parse(f.offerEnds);
    if (!Number.isFinite(end)) return;
    const left = end - nowMs();
    if (left <= 0) return;
    const sec = Math.floor(left / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const digits = `${d ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
    fx('right', t0, 0.5, null, () => {
      ctx.save();
      const cell = 30;
      const label = (f.offerLabel || 'La oferta termina en').toUpperCase();
      ctx.font = F(800, 18, false);
      spacing('2px');
      const lw = ctx.measureText(label).width;
      spacing('0px');
      const dw = digits.length * cell;
      const w = Math.max(lw, dw) + 44;
      const hgt = 96;
      const x = xr - w;
      ctx.fillStyle = HOT;
      rr(x, y, w, hgt, 18);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = F(800, 18, false);
      spacing('2px');
      ctx.fillText(label, x + 22, y + 32);
      spacing('0px');
      ctx.font = F(900, 44, false);
      ctx.textAlign = 'center';
      [...digits].forEach((ch, i) => ctx.fillText(ch, x + 22 + cell * i + cell / 2, y + 80));
      ctx.restore();
    });
  }
  function qrCard(f: StudioFlyerData, x: number, y: number, size: number, t0 = 1.9, caption = 'ESCANEA Y COMPRA') {
    if (!f.qr) return;
    const m = qrModules(qrUrlFor(f, brand, CODE));
    if (!m) return;
    fx('pop', t0, 0.5, [x, y, size, size], () => {
      ctx.save();
      const pad = size * 0.08;
      ctx.shadowColor = 'rgba(10,27,61,.3)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#fff';
      rr(x, y, size, size + (caption ? 34 : 0), 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      const n = m.length;
      const cs = (size - pad * 2) / n;
      ctx.fillStyle = INK;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(x + pad + c * cs, y + pad + r * cs, cs + 0.6, cs + 0.6);
      if (caption) {
        ctx.fillStyle = PR();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const s = fit(caption, size - 16, 18, 800, false, 11);
        ctx.font = F(800, s, false);
        ctx.fillText(caption, x + size / 2, y + size + 12);
      }
      ctx.restore();
    });
  }
  const qrOn = (f: StudioFlyerData) => !!(f.qr && qrModules(qrUrlFor(f, brand, CODE)));

  /* ---------- piezas compartidas ---------- */
  function footer(y: number) {
    const items: [string, string][] = [
      ['camion', brand.shipping || 'Envíos nacionales'],
      ['escudo', 'Garantía'],
      ['chat', 'Soporte por WhatsApp'],
    ];
    ctx.save();
    let fs = 30;
    let iw = 50;
    const gap = 44;
    let widths: number[] = [];
    for (;;) {
      ctx.font = F(800, fs);
      widths = items.map((it) => iw + 12 + ctx.measureText(it[1]).width);
      if (widths.reduce((a, b) => a + b, 0) + gap * 2 <= W - 90 || fs <= 20) break;
      fs -= 1;
      iw -= 1;
    }
    const total = widths.reduce((a, b) => a + b, 0) + gap * 2;
    let x = W / 2 - total / 2;
    const col = textOn(x, y - 30, total, 60);
    items.forEach((it, i) => {
      icon(it[0], x, y - iw / 2 - 4, iw, col, 2.2);
      ctx.fillStyle = col;
      ctx.font = F(800, fs);
      ctx.textBaseline = 'middle';
      ctx.fillText(it[1], x + iw + 12, y - 4);
      x += widths[i] + gap;
    });
    ctx.globalAlpha *= 0.8;
    ctx.font = F(600, 24, false);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText([brand.handle, brand.website].filter(Boolean).join('   ·   '), W / 2, y + 46);
    ctx.restore();
  }
  /** Tarjeta de métodos de pago: un recuadro por método y la nota de la tasa BCV */
  function paymentCard(x: number, y: number, w: number, t0 = 1.6): number {
    const ms = payMethods(brand);
    if (!ms.length) return 0;
    const h = 250;
    fx('right', t0, 0.5, null, () => {
      ctx.save();
      ctx.fillStyle = INK;
      rr(x, y, w, h, 22);
      ctx.fill();
      ctx.fillStyle = LIGHT_ON_DARK;
      ctx.font = F(900, 28);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('PAGA CON', x + 24, y + 46);
      const cw = (w - 24) / ms.length;
      const bs = Math.min(76, cw - 26);
      const lfs = Math.min(...ms.map((m) => fit(m, cw - 10, 24, 700, false, 13)));
      ms.forEach((m, i) => {
        const cx = x + 12 + cw * i + cw / 2;
        const lg = payLogo(m);
        if (lg) {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          rr(cx - bs / 2, y + 66, bs, bs, bs * 0.26);
          ctx.fill();
          const pad = bs * 0.14;
          const sc = Math.min((bs - 2 * pad) / lg.naturalWidth, (bs - 2 * pad) / lg.naturalHeight);
          const lw = lg.naturalWidth * sc;
          const lh = lg.naturalHeight * sc;
          ctx.drawImage(lg, cx - lw / 2, y + 66 + (bs - lh) / 2, lw, lh);
          ctx.restore();
        } else iconBadge(payIcon(m), cx - bs / 2, y + 66, bs, false);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = F(700, lfs, false);
        ctx.fillText(m, cx, y + 66 + bs + 32);
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      let note = 'Precios en $ y Bs. a tasa BCV';
      let nfs = fit(note, w - 78, 19, 600, false, 12);
      if (nfs < 15) {
        note = '$ y Bs. a tasa BCV';
        nfs = fit(note, w - 78, 19, 600, false, 12);
      }
      ctx.font = F(600, nfs, false);
      icon('tasa', x + 24, y + h - 36, 22, LIGHT_ON_DARK, 2.4);
      ctx.fillText(note, x + 54, y + h - 18);
      ctx.restore();
    });
    return h;
  }
  function specsBlock(specs: StudioSpec[], x: number, y: number, maxW: number, rowH: number, iconS = 74, t0 = 0.9) {
    (specs || [])
      .filter((s) => s && (s.label || s.value))
      .slice(0, 4)
      .forEach((sp, i) =>
        fx('left', t0 + i * 0.14, 0.5, null, () => {
          const yy = y + i * rowH;
          const color = textOn(x, yy, maxW, iconS);
          iconBadge(sp.icon || 'check', x, yy, iconS, isDark(x, yy, iconS, iconS));
          ctx.fillStyle = color;
          ctx.textBaseline = 'alphabetic';
          const lx = x + iconS + 20;
          const lw = maxW - iconS - 20;
          const s1 = fit(sp.label || '', lw, 36, 800);
          ctx.font = F(800, s1);
          ctx.fillText(sp.label || '', lx, yy + iconS * 0.42);
          const s2 = fit(sp.value || '', lw, 30, 500, true, 16);
          ctx.font = F(500, s2);
          ctx.fillText(sp.value || '', lx, yy + iconS * 0.42 + 38);
        }),
      );
  }
  function titleBox(x: number, y: number, text: string, size: number, maxW: number, align: 'left' | 'right' = 'left', t0 = 0.35) {
    const s = fit(text, maxW - 50, size, 900);
    ctx.font = F(900, s);
    const tw = ctx.measureText(text).width;
    const bw = tw + 50;
    const bh = s * 1.12;
    const bx = align === 'right' ? x - bw : x;
    const dark = isDark(bx, y, bw, bh);
    fx('wipe', t0, 0.5, [bx, y, bw, bh], () => {
      if (!dark) {
        const g = ctx.createLinearGradient(0, y + bh, 0, y + bh + 46);
        g.addColorStop(0, 'rgba(10,27,61,.20)');
        g.addColorStop(1, 'rgba(10,27,61,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bx + 10, y + bh, bw - 20, 46);
      }
      ctx.fillStyle = dark ? '#FFFFFF' : PR();
      ctx.fillRect(bx, y, bw, bh);
      ctx.font = F(900, s);
      ctx.fillStyle = dark ? PR() : '#FFFFFF';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(typed(text, t0 + 0.15, 0.8), bx + 22, y + bh * 0.8);
    });
    shine([bx, y, bw, bh], 2.4);
    return { bx, bw, bh, s };
  }
  function priceBurst(cx: number, cy: number, r: number, p: StudioProductSlot, pillText: string, t0 = 1.3) {
    const dark = isDark(cx, cy - r, 0, 0) || isDark(cx, cy);
    const fill = dark ? '#FFFFFF' : PR();
    const txt = dark ? INK : '#FFFFFF';
    const old = Number(p.oldPrice) || 0;
    const pct = discountPct(p);
    fx('pop', t0, 0.6, [cx - r, cy - r, 2 * r, 2 * r], () => {
      const pl = pulse();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pl, pl);
      ctx.translate(-cx, -cy);
      burst(cx, cy, r, fill, 14, 0.085, spin());
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = txt;
      ctx.textBaseline = 'alphabetic';
      if (pct) {
        const ot = `ANTES ${brand.pricePrefix ? `${brand.pricePrefix} ` : ''}${formatAmount(old)}`;
        ctx.font = F(700, r * 0.11, false);
        const ow = ctx.measureText(ot).width;
        ctx.globalAlpha = 0.85;
        ctx.fillText(ot, cx, cy - r * 0.42);
        ctx.fillStyle = HOT;
        ctx.fillRect(cx - ow / 2 - 4, cy - r * 0.42 - r * 0.045, ow + 8, Math.max(3, r * 0.022));
        ctx.globalAlpha = 1;
        ctx.fillStyle = txt;
      } else {
        ctx.font = F(800, r * 0.12, false);
        ctx.fillText(p.from ? 'PRECIO DESDE' : 'PRECIO', cx, cy - r * 0.42);
      }
      const digits = String(Math.floor(Number(p.price) || 0)).length;
      const size = digits >= 4 ? r * 0.42 : digits === 3 ? r * 0.5 : r * 0.62;
      bigPrice(cx, cy + r * 0.14, (Number(p.price) || 0) * count(t0 + 0.15), size, txt, brand.pricePrefix, r * 1.5);
      if (pillText) {
        ctx.font = F(800, r * 0.105, false);
        const pw = Math.min(ctx.measureText(pillText).width + 40, r * 1.5);
        const s = fit(pillText, pw - 40, r * 0.105, 800, false, 14);
        ctx.fillStyle = dark ? PR() : '#FFFFFF';
        ctx.fillRect(cx - pw / 2, cy + r * 0.24, pw, r * 0.21);
        ctx.fillStyle = dark ? '#FFFFFF' : PR();
        ctx.font = F(800, s, false);
        ctx.textBaseline = 'middle';
        ctx.fillText(pillText, cx, cy + r * 0.345);
        ctx.fillStyle = txt;
        ctx.font = F(700, r * 0.085, false);
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Tasa BCV del día', cx, cy + r * 0.6);
      }
      ctx.restore();
      shine([cx - r, cy - r, 2 * r, 2 * r], 2.7);
      ctx.restore();
    });
    if (pct) sticker(cx + r * 0.74, cy - r * 0.74, r * 0.3, `-${pct}%`, t0 + 0.45);
    if (p.promo) {
      fx('pop', t0 + 0.55, 0.5, [cx - r * 0.6, cy + r * 0.74, r * 1.2, r * 0.26], () => {
        ctx.save();
        const t = p.promo.toUpperCase();
        const s = fit(t, r * 1.3, r * 0.12, 900, true, 14);
        ctx.font = F(900, s);
        const w = ctx.measureText(t).width + 44;
        const h = r * 0.24;
        ctx.fillStyle = HOT;
        rr(cx - w / 2, cy + r * 0.76, w, h, h / 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t, cx, cy + r * 0.76 + h / 2 + 2);
        ctx.restore();
      });
    }
  }
  const bsText = (p: StudioProductSlot) => (brand.showBs && p.priceBs ? `Bs. ${String(p.priceBs).replace(/^Bs\.?\s*/i, '')}` : '');
  function tagText(text: string, x: number, y: number, maxW: number, align: CanvasTextAlign = 'left', t0 = 1.8) {
    if (!text) return;
    const t = text.toUpperCase();
    fx('up', t0, 0.5, null, () => {
      ctx.save();
      ctx.textAlign = align;
      const s = fit(t, maxW, 34, 900);
      ctx.font = F(900, s);
      const bx = align === 'center' ? x - maxW / 2 : align === 'right' ? x - maxW : x;
      ctx.fillStyle = textOn(bx, y - s, maxW, s);
      ctx.fillText(t, x, y);
      ctx.restore();
    });
  }
  function productDrawable(p: StudioProductSlot, i: number): Drawable | null {
    const src = productSrc(p, i);
    const img = images.get(src);
    if (!img) return null;
    return p.cutout ? images.cutout(src, img) : img;
  }
  function productImage(p: StudioProductSlot, i: number, box: Box, anchor: 'center' | 'bottom' = 'center', t0 = 0.7, phase = 0) {
    const img = productDrawable(p, i);
    fx('up', t0, 0.7, box, () => {
      if (img) contain(img, box[0], box[1] + bob(phase), box[2], box[3], true, anchor, FX.reflejo);
    });
    return img;
  }

  /* ---------- plantillas ---------- */
  function drawSolo(f: StudioFlyerData, preview: boolean) {
    const p = f.products[0] || blankProduct();
    layerBg(bgFor(f), SPLIT.solo);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(40), 440, 84));
    countdown(f, W - 56, Y(30));
    const tb = titleBox(60, Y(170), (p.title || 'PRODUCTO').toUpperCase(), 108, 660);
    const mt = (p.model || '').toUpperCase();
    fx('up', 0.6, 0.5, null, () => {
      ctx.save();
      ctx.textAlign = 'center';
      const ms = fit(mt, 620, 62, 900);
      ctx.font = F(900, ms);
      ctx.fillStyle = textOn(tb.bx, Y(170) + tb.bh + 20, tb.bw, 60);
      ctx.fillText(mt, tb.bx + tb.bw / 2, Y(170) + tb.bh + 80);
      ctx.restore();
    });

    const img = productImage(p, 0, [460, Y(250), 600, Y(650)]);
    if (!img && preview) placeholder(510, Y(300), 520, Y(560), 'Ctrl+V o arrastra la foto', isDark(770, Y(570)));

    specsBlock(p.specs, 60, Y(410), 400, Y(100));
    priceBurst(310, Y(1010), 250, p, bsText(p));

    const withQr = qrOn(f);
    const bx = 600;
    const by = Y(965);
    const bw = withQr ? 300 : 430;
    const ph = paymentCard(bx, by, bw);
    if (withQr) qrCard(f, bx + bw + 14, by, 116, 1.9, 'ESCANEA');
    tagText(p.tag, bx, by + ph + 58, 430);
    fx('up', 2.0, 0.5, null, () => footer(Y(1285)));
  }

  function drawDuo(f: StudioFlyerData, preview: boolean) {
    const a = f.products[0] || blankProduct();
    const b = f.products[1] || blankProduct();
    layerBg(bgFor(f), SPLIT.duo);
    fx('up', 0.2, 0.5, null, () => drawLogo(52, Y(30), 380, 70));
    countdown(f, W - 40, Y(18));
    const t1 = titleBox(64, Y(124), (a.title || 'PRODUCTO').toUpperCase(), 88, 540);
    fx('up', 0.55, 0.5, null, () => {
      ctx.save();
      const m1t = (a.model || '').toUpperCase();
      const m1 = fit(m1t, 340, 48, 900);
      ctx.font = F(900, m1);
      ctx.fillStyle = textOn(t1.bx, Y(124) + t1.bh + 14, 340, 50);
      ctx.fillText(m1t, t1.bx + 6, Y(124) + t1.bh + 60);
      ctx.restore();
    });
    if (!productImage(a, 0, [650, Y(120), 410, Y(500)], 'center', 0.6) && preview) placeholder(680, Y(140), 360, Y(450), '', isDark(860, Y(350)));
    specsBlock(a.specs, 64, Y(330), 250, Y(84), 58, 0.8);
    priceBurst(505, Y(475), 180, a, bsText(a), 1.1);
    tagText(a.tag, 870, Y(672), 340, 'center', 1.5);

    if (!productImage(b, 1, [30, Y(720), 460, Y(490)], 'center', 1.0, 1.5) && preview) placeholder(60, Y(740), 400, Y(450), '', isDark(260, Y(960)));
    const t2 = titleBox(1016, Y(735), (b.title || 'PRODUCTO').toUpperCase(), 88, 520, 'right', 1.1);
    fx('up', 1.35, 0.5, null, () => {
      ctx.save();
      ctx.textAlign = 'right';
      const m2t = (b.model || '').toUpperCase();
      const m2 = fit(m2t, 310, 48, 900);
      ctx.font = F(900, m2);
      ctx.fillStyle = textOn(720, Y(735) + t2.bh + 14, 310, 50);
      ctx.fillText(m2t, 1030, Y(735) + t2.bh + 60);
      ctx.restore();
    });
    specsBlock(b.specs, 740, Y(905), 320, Y(84), 58, 1.5);
    priceBurst(565, Y(1015), 195, b, bsText(b), 1.8);
    const withQr = qrOn(f);
    qrCard(f, 40, Y(1170), 130, 2.2);
    tagText(b.tag, withQr ? 360 : 260, Y(1238), withQr ? 300 : 420, 'center', 2.1);
    fx('up', 2.3, 0.5, null, () => footer(Y(1300)));
  }

  function trioLabel(p: StudioProductSlot, x: number, y: number, t0: number) {
    const w = 300;
    ctx.save();
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, 110);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    spacing('-1px');
    const s1 = fit((p.title || '').toUpperCase(), w - 30, 46, 900, false);
    ctx.font = F(900, s1, false);
    ctx.fillText((p.title || '').toUpperCase(), x + 16, y + 50);
    ctx.fillStyle = LIGHT_ON_DARK;
    const s2 = fit((p.model || '').toUpperCase(), w - 30, 34, 600, false, 14);
    ctx.font = F(600, s2, false);
    ctx.fillText((p.model || '').toUpperCase(), x + 16, y + 94);
    spacing('0px');
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y + 110, 150, 74);
    ctx.fillStyle = INK;
    ctx.font = F(500, 44, false);
    ctx.fillText(p.from ? 'Desde' : 'Precio', x + 12, y + 162);
    ctx.restore();
    const pw = 170;
    const pcol = textOn(x + 158, y + 120, pw, 60);
    bigPrice(x + 158 + pw / 2, y + 172, (Number(p.price) || 0) * count(t0), 70, pcol, brand.pricePrefix || '', pw);
    if (p.promo) {
      ctx.save();
      const t = p.promo.toUpperCase();
      ctx.font = F(900, 22);
      const tw2 = ctx.measureText(t).width;
      ctx.fillStyle = HOT;
      rr(x, y + 192, tw2 + 28, 38, 19);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, x + 14, y + 212);
      ctx.restore();
    }
  }

  function drawTrio(f: StudioFlyerData, preview: boolean) {
    const P = [0, 1, 2].map((i) => f.products[i] || blankProduct());
    layerBg(bgFor(f), SPLIT.trio);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(36), 400, 80));
    countdown(f, W - 40, Y(22));
    const title = (f.heading || 'OFERTAS').toString();
    const ts = fit(title, 580, 132, 900);
    ctx.font = F(900, ts);
    const tw = ctx.measureText(title).width;
    const bx = W / 2 - (tw + 70) / 2 - 20;
    const by = Y(150);
    const bw = tw + 70;
    const bh = ts * 1.1;
    fx('pop', 0.35, 0.6, [bx, by, bw, bh], () => {
      ctx.save();
      ctx.shadowColor = 'rgba(10,27,61,.35)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
      ctx.font = F(900, ts);
      ctx.fillStyle = INK;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(typed(title, 0.5, 0.9), bx + 32, by + bh * 0.8);
    });
    shine([bx, by, bw, bh], 2.4);
    const boxes: Box[] = [
      [100, Y(600), 490, Y(440)],
      [530, Y(640), 460, Y(330)],
      [360, Y(800), 440, Y(330)],
    ];
    [0, 1, 2].forEach((i) => {
      const r = boxes[i];
      const d = productImage(P[i], i, r, i === 2 ? 'bottom' : 'center', 0.7 + i * 0.25, i * 1.3);
      if (!d && preview && (P[i].title || i < f.products.length))
        placeholder(r[0] + 20, r[1] + 20, r[2] - 40, r[3] - 40, `Foto ${i + 1}`, isDark(r[0] + r[2] / 2, r[1] + r[3] / 2));
    });
    const labels: [number, number, FxKind][] = [
      [104, Y(430), 'left'],
      [624, Y(430), 'right'],
      [716, Y(1060), 'right'],
    ];
    labels.forEach((pos, i) => {
      if (P[i].title || P[i].price) {
        fx(pos[2], 1.2 + i * 0.25, 0.5, null, () => trioLabel(P[i], pos[0], pos[1], 1.3 + i * 0.25));
        const pct = discountPct(P[i]);
        if (pct) sticker(pos[0] + 318, pos[1] - 18, 46, `-${pct}%`, 1.6 + i * 0.25);
      }
    });
    qrCard(f, 60, Y(1080), 150, 2.1);
    fx('up', 2.1, 0.5, null, () => footer(Y(1318)));
  }

  /** Titular del mensaje: las palabras entre *asteriscos* van resaltadas */
  function richLines(text: string, maxW: number, size: number) {
    ctx.font = F(900, size);
    const raw = (text || '').split(/\s+/).filter(Boolean);
    let open = false;
    const words = raw.map((w) => {
      const s = w.startsWith('*');
      const e = w.endsWith('*') && w.length > 1;
      if (s) open = true;
      const o = { t: w.replace(/\*/g, ''), hl: open };
      if (e) open = false;
      return o;
    });
    const lines: { t: string; hl: boolean }[][] = [];
    let line: { t: string; hl: boolean }[] = [];
    let lw = 0;
    const sp = ctx.measureText(' ').width;
    words.forEach((w) => {
      const ww = ctx.measureText(w.t).width;
      const add = line.length ? sp + ww : ww;
      if (lw + add > maxW && line.length) {
        lines.push(line);
        line = [w];
        lw = ww;
      } else {
        line.push(w);
        lw += add;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  }

  function drawMensaje(f: StudioFlyerData) {
    const m = f.msg;
    layerBg(bgFor(f), SPLIT.mensaje);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(44), 440, 84));
    countdown(f, W - 56, Y(30));
    const X = 70;
    const maxW = W - 140;
    let y = Y(260);
    if (m.eyebrow) {
      const yy = y;
      fx('left', 0.4, 0.5, null, () => {
        ctx.save();
        const t = m.eyebrow.toUpperCase();
        ctx.font = F(800, 32, false);
        spacing('3px');
        const tw = ctx.measureText(t).width;
        const dark = isDark(X, yy, tw + 44, 60);
        ctx.fillStyle = dark ? '#FFFFFF' : PR();
        rr(X, yy, tw + 52, 60, 30);
        ctx.fill();
        ctx.fillStyle = dark ? PR() : '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(t, X + 26, yy + 31);
        ctx.restore();
      });
      y += 110;
    }
    const img = productDrawable(f.products[0] || blankProduct(), 0);
    const withQr = qrOn(f);
    const yMax = Y(1285) - 90; // lejos del pie
    const sideW = img || withQr ? 600 : maxW - 40;
    ctx.font = F(500, 42, false);
    const allBody = m.body ? wrapLines(m.body, sideW) : [];
    let bodyLines = allBody.slice(0, 7);
    const rest = () => (bodyLines.length ? bodyLines.length * 58 + 60 : 0) + (m.cta ? 124 : 0) + (m.contact ? 60 : 0);
    let size = 160;
    let lines = richLines(m.headline || 'Tu mensaje aquí', maxW, size);
    let fits = false;
    for (; size >= 56; size -= 4) {
      lines = richLines(m.headline || 'Tu mensaje aquí', maxW, size);
      if (lines.length <= 4 && y + lines.length * size * 1.02 + 50 + rest() <= yMax) {
        fits = true;
        break;
      }
    }
    // Ningún tamaño alcanzó: queda en el mínimo, con las líneas medidas a ese tamaño (antes se medían a 52 y se dibujaban a 56)
    if (!fits) {
      size = 56;
      lines = richLines(m.headline || 'Tu mensaje aquí', maxW, size);
    }
    while (bodyLines.length > 2 && y + lines.length * size * 1.02 + 50 + rest() > yMax) bodyLines = bodyLines.slice(0, -1);
    // C-116: titular que no cabe (muchas líneas o una palabra más ancha que la historia) y texto recortado
    if (m.headline.trim()) {
      ctx.font = F(900, size);
      const sp = ctx.measureText(' ').width;
      const wide = lines.some((ln) => ln.reduce((sum, w) => sum + ctx.measureText(w.t).width, 0) + sp * (ln.length - 1) > maxW);
      if (!fits || wide) overflow.add(m.headline.replace(/\*/g, '').trim());
    }
    if (bodyLines.length < allBody.length) overflow.add(m.body.trim());
    const baseCol = textOn(X, y, maxW, lines.length * size);
    const hlCol = isDark(X, y, maxW, lines.length * size) ? LIGHT_ON_DARK : SE();
    lines.forEach((ln, i) => {
      const by = y + size * 0.86 + i * size * 1.02;
      fx('up', 0.6 + i * 0.18, 0.55, null, () => {
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        ctx.font = F(900, size);
        const sp = ctx.measureText(' ').width;
        let x = X;
        // "Escribir": la línea aparece letra por letra
        let budget = typed(ln.map((w) => w.t).join(' '), 0.6 + i * 0.45, 0.45).length;
        ln.forEach((w) => {
          if (budget <= 0) return;
          const part = w.t.slice(0, budget);
          budget -= w.t.length + 1;
          ctx.fillStyle = w.hl ? hlCol : baseCol;
          ctx.fillText(part, x, by);
          x += ctx.measureText(w.t).width + sp;
        });
        ctx.restore();
      });
    });
    shine([X - 10, y, maxW + 20, lines.length * size * 1.02 + 10], 2.4);
    y += lines.length * size * 1.02 + 50;
    const y0side = y;
    const tb = 0.8 + lines.length * 0.18;
    if (m.body) {
      const yy = y;
      const bl = bodyLines;
      fx('fade', tb, 0.6, null, () => {
        ctx.save();
        ctx.font = F(500, 42, false);
        ctx.fillStyle = textOn(X, yy, 600, bl.length * 56);
        ctx.globalAlpha *= 0.9;
        bl.forEach((l, i) => ctx.fillText(l, X, yy + 42 + i * 58));
        ctx.restore();
      });
      y += bl.length * 58 + 60;
    }
    if (m.cta) {
      const yy = y;
      fx('pop', tb + 0.3, 0.6, [X, yy, 520, 92], () => {
        ctx.save();
        ctx.font = F(800, 42);
        const t = m.cta;
        const tw = ctx.measureText(t).width;
        const dark = isDark(X, yy, tw + 80, 92);
        ctx.fillStyle = dark ? '#FFFFFF' : PR();
        rr(X, yy, tw + 88, 92, 46);
        ctx.fill();
        ctx.fillStyle = dark ? PR() : '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(t, X + 44, yy + 48);
        ctx.restore();
      });
      y += 124;
    }
    if (m.contact) {
      const yy = y;
      fx('up', tb + 0.5, 0.5, null, () => {
        ctx.save();
        ctx.font = F(700, 38, false);
        ctx.fillStyle = textOn(X, yy, 600, 44);
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(m.contact, X, yy + 38);
        ctx.restore();
      });
    }
    const sideTop = Math.max(y0side, yMax - 440);
    if (withQr) qrCard(f, W - 70 - 240, Math.max(y0side, yMax - 290), 240, tb + 0.4);
    else if (img) fx('up', tb, 0.7, [640, sideTop, 400, yMax - sideTop], () => contain(img, 640, sideTop + bob(), 400, yMax - sideTop, true, 'bottom'));
    else if (m.icon && m.icon !== 'ninguno')
      fx('pop', tb, 0.7, [720, yMax - 330, 320, 320], () => {
        ctx.save();
        ctx.globalAlpha *= 0.16;
        icon(m.icon, 720, yMax - 330 + bob(), 320, textOn(880, yMax - 170));
        ctx.restore();
      });
    fx('up', tb + 0.7, 0.5, null, () => footer(Y(1285)));
  }

  /* ---------- piezas de las plantillas nuevas (C-113) ---------- */
  /** Precio con el símbolo de la marca: "$60,00", "Ref: 60,00" o "60,00" */
  const money = (n: number) => `${brand.pricePrefix === '$' ? '$' : brand.pricePrefix ? `${brand.pricePrefix} ` : ''}${formatAmount(n)}`;
  /** Etiqueta en píldora ("RECIÉN LLEGADO", "TASA OFICIAL BCV") */
  function pill(text: string, x: number, y: number, t0: number, align: 'left' | 'center' = 'left') {
    fx('left', t0, 0.5, null, () => {
      ctx.save();
      const t = text.toUpperCase();
      ctx.font = F(800, 32, false);
      spacing('3px');
      const w = ctx.measureText(t).width + 52;
      const px = align === 'center' ? x - w / 2 : x;
      const dark = isDark(px, y, w, 60);
      ctx.fillStyle = dark ? '#FFFFFF' : PR();
      rr(px, y, w, 60, 30);
      ctx.fill();
      ctx.fillStyle = dark ? PR() : '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, px + 26, y + 31);
      ctx.restore();
    });
  }
  function star(x: number, y: number, s: number, filled: boolean, onDark: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 24, s / 24);
    const path = iconPaths('estrella')[0];
    ctx.fillStyle = filled ? GOLD : onDark ? 'rgba(255,255,255,.2)' : alpha(INK, 0.12);
    ctx.fill(path);
    ctx.strokeStyle = filled ? GOLD : onDark ? 'rgba(255,255,255,.4)' : alpha(INK, 0.25);
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.restore();
  }
  function longDate(iso: string): string {
    const d = iso ? new Date(iso) : new Date();
    const text = (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  /** Número corto para un cupón: "15" o "7,50" */
  const shortAmount = (n: number) => (Number.isInteger(n) ? String(n) : formatAmount(n));

  function drawNuevo(f: StudioFlyerData, preview: boolean) {
    const p = f.products[0] || blankProduct();
    layerBg(bgFor(f), SPLIT.nuevo);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(40), 440, 84));
    countdown(f, W - 56, Y(30));
    pill(f.heading || 'Recién llegado', W / 2, Y(140), 0.3, 'center');
    const title = (p.title || 'PRODUCTO').toUpperCase();
    const mt = (p.model || '').toUpperCase();
    fx('up', 0.5, 0.5, null, () => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const s = fit(title, 960, 116, 900);
      ctx.font = F(900, s);
      ctx.fillStyle = textOn(60, Y(215), 960, s);
      ctx.fillText(typed(title, 0.5, 0.8), W / 2, Y(215) + s * 0.9);
      if (mt) {
        const ms = fit(mt, 900, 48, 800);
        ctx.font = F(800, ms);
        ctx.globalAlpha *= 0.85;
        ctx.fillText(mt, W / 2, Y(215) + s * 0.9 + ms + 16);
      }
      ctx.restore();
    });
    const img = productImage(p, 0, [40, Y(370), 720, Y(520)], 'bottom', 0.8);
    if (!img && preview) placeholder(90, Y(400), 620, Y(460), 'Ctrl+V o arrastra la foto', isDark(400, Y(620)));
    priceBurst(880, Y(520), 165, p, bsText(p), 1.3);
    specsBlock(p.specs.slice(0, 3), 720, Y(730), 340, Y(78), 54, 1.5);
    tagText(p.tag, W / 2, Y(1135), 900, 'center', 1.9);
    qrCard(f, W - 60 - 130, Y(1060), 130, 2.0, 'ESCANEA');
    fx('up', 2.1, 0.5, null, () => footer(Y(1285)));
  }

  function drawGiftcard(f: StudioFlyerData, preview: boolean) {
    const p = f.products[0] || blankProduct();
    layerBg(bgFor(f), SPLIT.giftcard);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(40), 440, 84));
    countdown(f, W - 56, Y(30));
    const tb = titleBox(60, Y(170), (p.title || 'GIFT CARD').toUpperCase(), 100, 600);
    const sub = p.model || 'Código digital · Entrega rápida';
    fx('up', 0.6, 0.5, null, () => {
      ctx.save();
      const ss = fit(sub, 520, 40, 800);
      ctx.font = F(800, ss);
      ctx.fillStyle = textOn(60, Y(170) + tb.bh + 20, 520, 50);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(sub, 64, Y(170) + tb.bh + 64);
      ctx.restore();
    });
    const img = productImage(p, 0, [620, Y(120), 440, Y(420)], 'center', 0.6);
    if (!img && preview) placeholder(650, Y(150), 380, Y(360), '', isDark(840, Y(330)));
    const variants = p.variants.filter((v) => v.label || v.price > 0).slice(0, 8);
    if (variants.length) {
      const y0 = Y(670);
      fx('up', 0.9, 0.5, null, () => {
        ctx.save();
        ctx.font = F(900, 34);
        ctx.fillStyle = textOn(60, y0 - 50, 500, 40);
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('ELIGE TU MONTO', 64, y0 - 22);
        ctx.restore();
      });
      const cw = 470;
      const ch = Y(100);
      variants.forEach((v, i) => {
        const x = 60 + (i % 2) * (cw + 20);
        const y = y0 + Math.floor(i / 2) * Y(118);
        fx('left', 1.0 + i * 0.1, 0.45, null, () => {
          ctx.save();
          const dark = isDark(x, y, cw, ch);
          ctx.fillStyle = dark ? '#FFFFFF' : PR();
          rr(x, y, cw, ch, 22);
          ctx.fill();
          ctx.fillStyle = dark ? INK : '#FFFFFF';
          ctx.textBaseline = 'middle';
          const ls = fit(v.label, cw * 0.5, 44, 900, false, 18);
          ctx.font = F(900, ls, false);
          ctx.fillText(v.label, x + 28, y + ch / 2 + 2);
          ctx.textAlign = 'right';
          ctx.fillStyle = dark ? PR() : '#FFFFFF';
          const pr = v.price > 0 ? money(v.price) : '';
          const ps = fit(pr, cw * 0.42, 40, 800, false, 18);
          ctx.font = F(800, ps, false);
          ctx.fillText(pr, x + cw - 28, y + ch / 2 + 2);
          ctx.restore();
        });
      });
    } else priceBurst(300, Y(900), 230, p, bsText(p), 1.1);
    qrCard(f, W - 60 - 130, Y(1110), 120, 2.0, 'ESCANEA');
    fx('up', 2.0, 0.5, null, () => footer(Y(1285)));
  }

  function drawCupon(f: StudioFlyerData) {
    const c = f.coupon;
    layerBg(bgFor(f), SPLIT.cupon);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(40), 440, 84));
    countdown(f, W - 56, Y(30));
    pill(f.heading || 'Cupón de descuento', W / 2, Y(165), 0.3, 'center');
    const tx = 90;
    const ty = Y(260);
    const tw = 900;
    const th = Y(640);
    const ny = ty + th * 0.6;
    const nr = 38;
    const big = c.percentOff > 0 ? `${shortAmount(c.percentOff)}%` : c.amountOff > 0 ? `${brand.pricePrefix === '$' ? '$' : ''}${shortAmount(c.amountOff)}` : '';
    fx('pop', 0.4, 0.6, [tx, ty, tw, th], () => {
      ctx.save();
      ctx.shadowColor = 'rgba(10,27,61,.35)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#FFFFFF';
      // Ticket con muescas a los lados
      ctx.beginPath();
      ctx.moveTo(tx + 30, ty);
      ctx.lineTo(tx + tw - 30, ty);
      ctx.arcTo(tx + tw, ty, tx + tw, ty + 30, 30);
      ctx.lineTo(tx + tw, ny - nr);
      ctx.arc(tx + tw, ny, nr, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(tx + tw, ty + th - 30);
      ctx.arcTo(tx + tw, ty + th, tx + tw - 30, ty + th, 30);
      ctx.lineTo(tx + 30, ty + th);
      ctx.arcTo(tx, ty + th, tx, ty + th - 30, 30);
      ctx.lineTo(tx, ny + nr);
      ctx.arc(tx, ny, nr, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(tx, ty + 30);
      ctx.arcTo(tx, ty, tx + 30, ty, 30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = alpha(INK, 0.25);
      ctx.setLineDash([14, 12]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tx + nr + 20, ny);
      ctx.lineTo(tx + tw - nr - 20, ny);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      if (c.label) {
        ctx.font = F(800, 34, false);
        spacing('3px');
        ctx.fillStyle = SE();
        ctx.fillText(c.label.toUpperCase(), W / 2, ty + th * 0.13);
        spacing('0px');
      }
      const bs = fit(big || 'DESCUENTO', tw - 140, 230, 900);
      ctx.font = F(900, bs);
      ctx.fillStyle = PR();
      ctx.fillText(big || 'DESCUENTO', W / 2, ty + th * 0.4);
      if (big) {
        ctx.font = F(800, 46);
        ctx.fillStyle = INK;
        ctx.fillText('DE DESCUENTO', W / 2, ty + th * 0.5);
      }
      // El código, en un recuadro punteado
      const bw = 640;
      const bh = th * 0.17;
      const by = ny + th * 0.06;
      ctx.fillStyle = alpha(PR(), 0.07);
      rr(W / 2 - bw / 2, by, bw, bh, 22);
      ctx.fill();
      ctx.setLineDash([16, 10]);
      ctx.strokeStyle = PR();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.setLineDash([]);
      const code = c.code || 'TUCÓDIGO';
      ctx.font = F(900, 90, false);
      spacing('6px');
      let cs = 90;
      while (ctx.measureText(code).width > bw - 60 && cs > 30) {
        cs -= 4;
        ctx.font = F(900, cs, false);
      }
      ctx.fillStyle = INK;
      ctx.textBaseline = 'middle';
      ctx.fillText(typed(code, 1.0, 0.8), W / 2, by + bh / 2 + 4);
      spacing('0px');
      ctx.textBaseline = 'alphabetic';
      ctx.font = F(600, 26, false);
      ctx.fillStyle = alpha(INK, 0.7);
      ctx.fillText('Escribe este código al pagar', W / 2, by + bh + 40);
      const cond = [c.minSubtotal > 0 ? `Compra mínima ${money(c.minSubtotal)}` : '', c.scope].filter(Boolean).join(' · ');
      if (cond) {
        const s2 = fit(cond, tw - 100, 30, 700, false, 16);
        ctx.font = F(700, s2, false);
        ctx.fillStyle = INK;
        ctx.fillText(cond, W / 2, ty + th - 34);
      }
      ctx.restore();
    });
    shine([tx, ty, tw, th], 2.4);
    const img = productDrawable(f.products[0] || blankProduct(), 0);
    const withQr = qrOn(f);
    const side = img || withQr;
    const lines = [c.endsAt ? `Válido hasta el ${longDate(c.endsAt).toLowerCase()}` : '', `Úsalo en ${brand.website || 'electroshopve.com'}`].filter(Boolean);
    fx('up', 1.4, 0.5, null, () => {
      ctx.save();
      ctx.textAlign = side ? 'left' : 'center';
      ctx.textBaseline = 'alphabetic';
      const x = side ? 70 : W / 2;
      lines.forEach((l, i) => {
        const s2 = fit(l, side ? 600 : 900, i === 0 ? 42 : 34, i === 0 ? 900 : 700, i === 0, 18);
        ctx.font = F(i === 0 ? 900 : 700, s2, i === 0);
        ctx.fillStyle = textOn(side ? 70 : 90, Y(940) + i * 56, side ? 600 : 900, 50);
        ctx.fillText(l, x, Y(990) + i * 56);
      });
      ctx.restore();
    });
    if (withQr) qrCard(f, W - 70 - 190, Y(930), 190, 1.7);
    else if (img) fx('up', 1.5, 0.6, [700, Y(920), 340, Y(290)], () => contain(img, 700, Y(920) + bob(), 340, Y(290), true, 'bottom', FX.reflejo));
    fx('up', 2.0, 0.5, null, () => footer(Y(1285)));
  }

  function drawResena(f: StudioFlyerData) {
    const rv = f.review;
    const p = f.products[0] || blankProduct();
    layerBg(bgFor(f), SPLIT.resena);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(40), 440, 84));
    pill(f.heading || 'Lo que dicen nuestros clientes', 70, Y(165), 0.3);
    const onDark = isDark(70, Y(260), 420, 70);
    for (let i = 0; i < 5; i++) fx('pop', 0.5 + i * 0.1, 0.4, [70 + i * 84, Y(255), 70, 70], () => star(70 + i * 84, Y(255), 70, i < rv.rating, onDark));
    fx('fade', 0.6, 0.6, null, () => {
      ctx.save();
      ctx.font = F(900, 300, false);
      ctx.fillStyle = alpha(PR(), 0.16);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('“', 30, Y(330) + 230);
      ctx.restore();
    });
    const text = rv.comment || 'Aquí va la reseña del cliente';
    const top = Y(370);
    const room = Y(830) - top;
    let size = 62;
    let lines: string[] = [];
    for (; size >= 32; size -= 2) {
      ctx.font = F(700, size);
      lines = wrapLines(text, 930);
      if (lines.length * size * 1.3 <= room) break;
    }
    const maxLines = Math.max(1, Math.floor(room / (size * 1.3)));
    if (lines.length > maxLines) {
      overflow.add(text);
      lines = [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`];
    }
    const color = textOn(70, top, 930, lines.length * size * 1.3);
    lines.forEach((l, i) =>
      fx('up', 0.8 + i * 0.12, 0.5, null, () => {
        ctx.save();
        ctx.font = F(700, size);
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(typed(l, 0.8 + i * 0.35, 0.35), 74, top + size + i * size * 1.3);
        ctx.restore();
      }),
    );
    const ay = top + size + lines.length * size * 1.3 + 30;
    fx('up', 1.3, 0.5, null, () => {
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      ctx.font = F(800, 40, false);
      const col = textOn(74, ay - 30, 600, 40);
      ctx.fillStyle = col;
      const who = `— ${rv.author || 'Cliente'}`;
      ctx.fillText(who, 74, ay + 10);
      if (rv.verified) {
        const wx = 74 + ctx.measureText(who).width + 30;
        icon('escudo', wx, ay - 24, 36, col, 2.4);
        ctx.font = F(700, 28, false);
        ctx.fillText('Compra verificada', wx + 46, ay + 6);
      }
      ctx.restore();
    });
    const img = productDrawable(p, 0);
    if (p.title || img) {
      const cx = 70;
      const cy = Y(930);
      const cw = 940;
      const ch = Y(230);
      fx('up', 1.5, 0.6, [cx, cy, cw, ch], () => {
        ctx.save();
        ctx.shadowColor = 'rgba(10,27,61,.25)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#FFFFFF';
        rr(cx, cy, cw, ch, 28);
        ctx.fill();
        ctx.restore();
        if (img) contain(img, cx + 24, cy + 20, 220, ch - 40, false);
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        const tx0 = cx + (img ? 280 : 40);
        const tmax = cw - (img ? 320 : 80);
        const name = [p.title, p.model].filter(Boolean).join(' ') || rv.productName;
        const ns = fit(name, tmax, 44, 900, false, 20);
        ctx.font = F(900, ns, false);
        ctx.fillStyle = INK;
        ctx.fillText(name, tx0, cy + ch * 0.36);
        if (p.price > 0) {
          ctx.font = F(900, 56, false);
          ctx.fillStyle = PR();
          ctx.fillText(`${p.from ? 'Desde ' : ''}${money(p.price)}`, tx0, cy + ch * 0.68);
        }
        ctx.font = F(600, 26, false);
        ctx.fillStyle = alpha(INK, 0.7);
        ctx.fillText(`Cómpralo en ${brand.website || 'electroshopve.com'}`, tx0, cy + ch * 0.88);
        ctx.restore();
      });
    }
    fx('up', 2.0, 0.5, null, () => footer(Y(1285)));
  }

  function drawTasa(f: StudioFlyerData) {
    const rate = Number(f.rate) || 0;
    layerBg(bgFor(f), SPLIT.tasa);
    fx('up', 0.2, 0.5, null, () => drawLogo(56, Y(40), 440, 84));
    pill('Tasa oficial BCV', 70, Y(165), 0.3);
    const date = longDate(f.rateDate);
    fx('up', 0.45, 0.5, null, () => {
      ctx.save();
      const ds = fit(date, 940, 66, 900);
      ctx.font = F(900, ds);
      ctx.fillStyle = textOn(70, Y(250), 940, ds);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(typed(date, 0.45, 0.7), 72, Y(250) + ds);
      ctx.restore();
    });
    const cx = 70;
    const cy = Y(370);
    const cw = 940;
    const chh = Y(320);
    fx('pop', 0.7, 0.6, [cx, cy, cw, chh], () => {
      ctx.save();
      ctx.shadowColor = 'rgba(10,27,61,.3)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = '#FFFFFF';
      rr(cx, cy, cw, chh, 36);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = F(800, 36, false);
      ctx.fillStyle = alpha(INK, 0.75);
      ctx.fillText('1 DÓLAR (USD) =', W / 2, cy + chh * 0.22);
      const value = rate > 0 ? `Bs. ${formatAmount(rate * count(0.8))}` : 'Bs. —';
      const vs = fit(`Bs. ${formatAmount(rate)}`, cw - 100, 200, 900, false, 40);
      ctx.font = F(900, vs, false);
      ctx.fillStyle = PR();
      ctx.fillText(value, W / 2, cy + chh * 0.72);
      ctx.font = F(600, 28, false);
      ctx.fillStyle = alpha(INK, 0.65);
      ctx.fillText('Bolívares por cada dólar', W / 2, cy + chh - 30);
      ctx.restore();
    });
    shine([cx, cy, cw, chh], 2.4);
    const y0 = Y(790);
    fx('up', 1.2, 0.5, null, () => {
      ctx.save();
      ctx.font = F(900, 32);
      ctx.fillStyle = textOn(70, y0 - 50, 500, 40);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('EQUIVALENCIAS', 72, y0 - 20);
      ctx.restore();
    });
    [10, 20, 50, 100].forEach((a, i) => {
      const x = 70 + (i % 2) * 480;
      const y = y0 + Math.floor(i / 2) * Y(130);
      const w = 460;
      const h = Y(110);
      fx('left', 1.3 + i * 0.12, 0.45, null, () => {
        ctx.save();
        const dark = isDark(x, y, w, h);
        ctx.fillStyle = dark ? 'rgba(255,255,255,.14)' : alpha(PR(), 0.08);
        rr(x, y, w, h, 22);
        ctx.fill();
        ctx.fillStyle = dark ? '#FFFFFF' : INK;
        ctx.textBaseline = 'middle';
        ctx.font = F(900, 46, false);
        ctx.fillText(`$${a}`, x + 26, y + h / 2 + 2);
        ctx.textAlign = 'right';
        const bs = rate > 0 ? `Bs. ${formatAmount(a * rate)}` : '—';
        const s2 = fit(bs, w - 170, 38, 800, false, 18);
        ctx.font = F(800, s2, false);
        ctx.fillStyle = dark ? LIGHT_ON_DARK : PR();
        ctx.fillText(bs, x + w - 26, y + h / 2 + 2);
        ctx.restore();
      });
    });
    fx('up', 1.8, 0.5, null, () => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const note = 'Nuestros precios en bolívares se calculan con esta tasa.';
      const ns = fit(note, 940, 30, 600, false, 16);
      ctx.font = F(600, ns, false);
      ctx.fillStyle = textOn(70, y0 + Y(270), 940, 40);
      ctx.fillText(note, W / 2, y0 + Y(300));
      ctx.restore();
    });
    fx('up', 2.0, 0.5, null, () => footer(Y(1285)));
  }

  function safeZones() {
    ctx.save();
    const top = 200;
    const bottom = 190;
    ctx.fillStyle = 'rgba(220,38,38,.18)';
    ctx.fillRect(0, 0, W, top);
    ctx.fillRect(0, FH - bottom, W, bottom);
    ctx.strokeStyle = 'rgba(220,38,38,.8)';
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(W, top);
    ctx.moveTo(0, FH - bottom);
    ctx.lineTo(W, FH - bottom);
    ctx.stroke();
    ctx.fillStyle = '#B91C1C';
    ctx.font = F(700, 28, false);
    ctx.textAlign = 'center';
    ctx.fillText('Tapado por Instagram (perfil)', W / 2, top / 2 + 10);
    ctx.fillText('Tapado por Instagram (responder)', W / 2, FH - bottom / 2 + 10);
    ctx.restore();
  }

  /** Dibuja el flyer completo (o el aviso de "elige un flyer" si no hay ninguno) */
  function draw(f: StudioFlyerData | null, b: StudioBrand, opts: DrawOptions) {
    brand = b;
    FL = f;
    FX = f?.fx ?? { reflejo: false, particulas: false, confeti: false };
    CODE = opts.code ?? null;
    overflow.clear();
    setFormat(f?.format ?? 'story');
    // Cambiar el alto borra el lienzo: solo cuando cambia el formato
    if (canvas.height !== FH) canvas.height = FH;
    T = opts.t ?? null;
    animEpoch = opts.epoch ?? Date.now();
    bgData = null;
    slideFlip = 0;
    ANIM = f && ANIMATIONS[f.anim] ? f.anim : 'entrada';
    ctx.save();
    ctx.clearRect(0, 0, W, FH);
    if (!f) {
      ctx.fillStyle = PALE;
      ctx.fillRect(0, 0, W, FH);
      ctx.fillStyle = '#7A8AA8';
      ctx.textAlign = 'center';
      ctx.font = F(800, 40);
      ctx.fillText('Elige o crea una historia', W / 2, FH / 2);
      ctx.restore();
      return;
    }
    switch (f.template) {
      case 'duo':
        drawDuo(f, opts.preview);
        break;
      case 'trio':
        drawTrio(f, opts.preview);
        break;
      case 'mensaje':
        drawMensaje(f);
        break;
      case 'nuevo':
        drawNuevo(f, opts.preview);
        break;
      case 'giftcard':
        drawGiftcard(f, opts.preview);
        break;
      case 'cupon':
        drawCupon(f);
        break;
      case 'resena':
        drawResena(f);
        break;
      case 'tasa':
        drawTasa(f);
        break;
      default:
        drawSolo(f, opts.preview);
    }
    if (FX.confeti) confetti();
    ctx.restore();
    if (opts.preview && opts.safeZones && f.format === 'story') safeZones();
  }

  /** Miniatura de un fondo para el selector: el mismo dibujo, a escala */
  function drawBackgroundThumb(target: HTMLCanvasElement, style: BackgroundId, f: StudioFlyerData, b: StudioBrand) {
    const x = target.getContext('2d');
    if (!x) return;
    brand = b;
    FL = f;
    setFormat(f.format);
    const saved = ctx;
    ctx = x;
    ctx.save();
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.scale(target.width / W, target.height / FH);
    ctx.translate(0, OY);
    ctx.scale(1, SC);
    drawBg(style, Y(SPLIT[f.template]));
    ctx.restore();
    ctx = saved;
  }

  return {
    draw,
    drawBackgroundThumb,
    /** Textos que no cupieron en el último dibujo (C-116) */
    overflows: () => [...overflow],
  };
}

export type StudioRenderer = ReturnType<typeof createRenderer>;

/** Todas las imágenes que usa un flyer, para esperarlas antes de exportar. */
export function flyerImageSources(f: StudioFlyerData, brand: StudioBrand, productSrc: ProductSrc): string[] {
  const srcs = f.products.map((p, i) => productSrc(p, i)).filter(Boolean);
  if (f.bg === 'foto') srcs.push(f.bgPhoto.url);
  srcs.push(brand.logoUrl || '', OFFICIAL_LOGO.color, OFFICIAL_LOGO.white, ...Object.values(brand.payLogos));
  return srcs.filter(Boolean);
}
