// ElectroStudio (C-112): forma de un flyer y de los ajustes de marca. Módulo puro: lo usan la API (validar lo que
// llega) y el editor (normalizar lo que se lee). Sale del artefacto "Flyers ElectroShop" de Andrés.
import { z } from 'zod';

/** photo: la foto del producto es obligatoria, opcional o no se usa */
export const TEMPLATES = {
  solo: { label: '1 producto', n: 1, photo: 'required' },
  duo: { label: '2 productos', n: 2, photo: 'required' },
  trio: { label: 'Categoría (3)', n: 3, photo: 'required' },
  nuevo: { label: 'Llegó nuevo', n: 1, photo: 'required' },
  giftcard: { label: 'Gift card', n: 1, photo: 'required' },
  cupon: { label: 'Cupón', n: 1, photo: 'optional' },
  resena: { label: 'Reseña', n: 1, photo: 'optional' },
  mensaje: { label: 'Mensaje', n: 1, photo: 'optional' },
  tasa: { label: 'Tasa BCV', n: 0, photo: 'none' },
} as const;
export type TemplateId = keyof typeof TEMPLATES;
export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];
/** Plantillas con productos que se escriben en el paso Contenido (el resto tiene su propio formulario) */
export const hasProductForm = (t: TemplateId) => t === 'solo' || t === 'duo' || t === 'trio' || t === 'nuevo' || t === 'giftcard';
/** Cuántas fotos de producto pide la plantilla (0 si no pide ninguna obligatoria) */
export const requiredPhotos = (t: TemplateId) => (TEMPLATES[t].photo === 'required' ? TEMPLATES[t].n : 0);

/** Tamaños de salida. Todos miden 1080 de ancho; los diseños se hacen en una grilla de 1080×1350 (4:5). */
export const FORMATS = {
  story: { label: 'Historia 9:16', short: '9:16', h: 1920 },
  post45: { label: 'Post 4:5', short: '4:5', h: 1350 },
  post11: { label: 'Post 1:1', short: '1:1', h: 1080 },
} as const;
export type FormatId = keyof typeof FORMATS;

export const BACKGROUNDS = {
  ondas: 'Ondas',
  diagonal: 'Diagonal',
  circulos: 'Círculos',
  arco: 'Arco',
  lateral: 'Ola lateral',
  liso: 'Claro',
  azul: 'Azul',
  circuito: 'Circuito',
  hexagonos: 'Hexágonos',
  aurora: 'Aurora',
  podio: 'Podio',
  rayos: 'Rayos',
  neon: 'Neón',
  foto: 'Tu foto',
  fotoproducto: 'Foto del producto',
} as const;
export type BackgroundId = keyof typeof BACKGROUNDS;
export const BACKGROUND_DEFAULT: Record<TemplateId, BackgroundId> = {
  solo: 'ondas',
  duo: 'ondas',
  trio: 'lateral',
  nuevo: 'podio',
  giftcard: 'aurora',
  cupon: 'rayos',
  resena: 'liso',
  mensaje: 'azul',
  tasa: 'circuito',
};

export const ANIMATIONS = { entrada: 'Entrada', zoom: 'Zoom', deslizar: 'Deslizar', destello: 'Destello', escribir: 'Escribir' } as const;
export type AnimationId = keyof typeof ANIMATIONS;

export const EFFECTS = { reflejo: 'Reflejo en el piso', particulas: 'Partículas', confeti: 'Confeti' } as const;
export type EffectId = keyof typeof EFFECTS;

/** Rutas de la propia tienda ("/api/uploads/…"). Una imagen de otro dominio "ensucia" el canvas y ya no se puede descargar. */
const localPath = z
  .string()
  .max(500)
  .refine((v) => v === '' || /^\/(?!\/)[^\s]*$/.test(v), 'Imagen inválida');
const webUrl = z
  .string()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s]*$/.test(v), 'Enlace inválido');
/** Texto libre: lo que pase del límite se recorta (no se pierde todo el campo) */
const text = (max: number) => z.string().catch('').transform((v) => v.slice(0, max));
const money = z.coerce.number().min(0).max(1_000_000).catch(0);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const specSchema = z.object({
  icon: text(20).default('check'),
  label: text(40).default(''),
  value: text(60).default(''),
});
export type StudioSpec = z.infer<typeof specSchema>;

const variantSchema = z.object({ label: text(30).default(''), price: money.default(0) });

export const productSlotSchema = z.object({
  /** Producto de la tienda: con él, precio, oferta y Bs salen del servidor al abrir el flyer. */
  productId: z.string().max(40).nullable().catch(null).default(null),
  title: text(60).default(''),
  model: text(80).default(''),
  price: money.default(0),
  oldPrice: money.default(0),
  promo: text(30).default(''),
  priceBs: text(30).default(''),
  from: z.boolean().catch(false).default(false),
  tag: text(60).default(''),
  url: webUrl.catch('').default(''),
  imageUrl: localPath.catch('').default(''),
  cutout: z.boolean().catch(true).default(true),
  specs: z.array(specSchema).max(4).catch([]).default([]),
  /** Montos de una gift card o recarga (de la tienda) */
  variants: z.array(variantSchema).max(8).catch([]).default([]),
});
export type StudioProductSlot = z.infer<typeof productSlotSchema>;

export const messageSchema = z.object({
  eyebrow: text(40).default(''),
  headline: text(160).default(''),
  body: text(400).default(''),
  cta: text(40).default(''),
  contact: text(60).default(''),
  icon: text(20).default('ninguno'),
});
export type StudioMessage = z.infer<typeof messageSchema>;

const pct = (min: number, max: number, def: number) => z.coerce.number().min(min).max(max).catch(def).default(def);
const colorOrEmpty = z.union([hexColor, z.literal('')]).catch('').default('');

/** Fondo con una foto: la propia (del local, un unboxing) o la del producto, desenfocada y oscurecida para que se lea */
export const bgPhotoSchema = z.object({
  url: localPath.catch('').default(''),
  blur: pct(0, 40, 14),
  darken: pct(0, 85, 45),
  /** Tiñe la foto con el color de la marca */
  tint: z.boolean().catch(true).default(true),
  x: pct(0, 100, 50),
  y: pct(0, 100, 50),
  zoom: pct(100, 250, 100),
});
export type StudioBgPhoto = z.infer<typeof bgPhotoSchema>;

export const effectsSchema = z.object({
  reflejo: z.boolean().catch(false).default(false),
  particulas: z.boolean().catch(false).default(false),
  confeti: z.boolean().catch(false).default(false),
});
export type StudioEffects = z.infer<typeof effectsSchema>;

/** Cupón de Descuentos, copiado al elegirlo y puesto al día al abrir la historia */
export const couponSchema = z.object({
  code: text(40).default(''),
  label: text(40).default(''),
  percentOff: money.default(0),
  amountOff: money.default(0),
  minSubtotal: money.default(0),
  endsAt: z.string().max(40).catch('').default(''),
  scope: text(60).default(''),
});
export type StudioCouponData = z.infer<typeof couponSchema>;

/** Reseña aprobada de un cliente (solo el nombre corto, nunca el correo) */
export const reviewSchema = z.object({
  id: z.string().max(40).catch('').default(''),
  rating: z.coerce.number().int().min(1).max(5).catch(5).default(5),
  comment: text(400).default(''),
  author: text(40).default(''),
  verified: z.boolean().catch(false).default(false),
  productName: text(80).default(''),
});
export type StudioReviewData = z.infer<typeof reviewSchema>;

/** Lo que salió en la última descarga: si la tienda cambia después, la lista avisa */
export const exportedSchema = z.object({
  at: z.string().max(40).catch('').default(''),
  prices: z.array(money).max(3).catch([]).default([]),
  rate: money.default(0),
  coupon: text(40).default(''),
});

export const flyerSchema = z.object({
  name: text(80).default('Nueva historia'),
  template: z.enum(TEMPLATE_IDS as [TemplateId, ...TemplateId[]]).catch('solo').default('solo'),
  format: z.enum(Object.keys(FORMATS) as [FormatId, ...FormatId[]]).catch('story').default('story'),
  bg: z.union([z.enum(Object.keys(BACKGROUNDS) as [BackgroundId, ...BackgroundId[]]), z.literal('')]).catch('').default(''),
  bgPhoto: bgPhotoSchema.catch(() => bgPhotoSchema.parse({})).default(() => bgPhotoSchema.parse({})),
  anim: z.enum(Object.keys(ANIMATIONS) as [AnimationId, ...AnimationId[]]).catch('entrada').default('entrada'),
  fx: effectsSchema.catch(() => effectsSchema.parse({})).default(() => effectsSchema.parse({})),
  /** Colores solo de esta historia (vacío = los de la marca) */
  accent: colorOrEmpty,
  accent2: colorOrEmpty,
  heading: text(40).default(''),
  caption: text(2200).default(''),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).catch('').default(''),
  batch: text(40).default(''),
  qr: z.boolean().catch(false).default(false),
  qrUrl: webUrl.catch('').default(''),
  offerEnds: z.string().max(30).catch('').default(''),
  offerLabel: text(40).default(''),
  msg: messageSchema.catch(() => messageSchema.parse({})).default(() => messageSchema.parse({})),
  coupon: couponSchema.catch(() => couponSchema.parse({})).default(() => couponSchema.parse({})),
  review: reviewSchema.catch(() => reviewSchema.parse({})).default(() => reviewSchema.parse({})),
  /** Tasa BCV (Bs por dólar) y cuándo la publicó el BCV: la pone el servidor */
  rate: money.default(0),
  rateDate: z.string().max(40).catch('').default(''),
  exported: exportedSchema.catch(() => exportedSchema.parse({})).default(() => exportedSchema.parse({})),
  products: z.array(productSlotSchema).max(3).catch([]).default([]),
});
export type StudioFlyerData = z.infer<typeof flyerSchema>;
/** code: el de la marca de campaña (?es=código) del enlace y el QR */
export type StudioFlyer = StudioFlyerData & { id: string; updatedAt: string; code: string | null };

export function blankProduct(): StudioProductSlot {
  return productSlotSchema.parse({});
}

/** Lee un flyer guardado (o a medio escribir) y le completa lo que falte, como `normalize` del artefacto. */
export function normalizeFlyer(raw: unknown): StudioFlyerData {
  const f = flyerSchema.parse(raw && typeof raw === 'object' ? raw : {});
  if (!f.products.length) f.products.push(blankProduct());
  return f;
}

export const styleSchema = z.object({
  id: z.string().max(20).catch('').default(''),
  name: text(30).default('Estilo'),
  bg: z.union([z.enum(Object.keys(BACKGROUNDS) as [BackgroundId, ...BackgroundId[]]), z.literal('')]).catch('').default(''),
  anim: z.enum(Object.keys(ANIMATIONS) as [AnimationId, ...AnimationId[]]).catch('entrada').default('entrada'),
  fx: effectsSchema.catch(() => effectsSchema.parse({})).default(() => effectsSchema.parse({})),
  accent: colorOrEmpty,
  accent2: colorOrEmpty,
});
export type StudioStyle = z.infer<typeof styleSchema>;

export const brandSchema = z.object({
  accent: hexColor.catch('#004AAD').default('#004AAD'),
  accent2: hexColor.catch('#2463D6').default('#2463D6'),
  pricePrefix: z.enum(['$', 'Ref:', '']).catch('$').default('$'),
  showBs: z.boolean().catch(true).default(true),
  handle: text(40).default('@electroshopgre'),
  website: text(60).default('electroshopve.com'),
  shipping: text(60).default('Envíos a toda Venezuela'),
  payments: text(120).default('Pago Móvil · Binance Pay · PayPal'),
  /** Logo propio; vacío = el oficial (color o blanco según el fondo) */
  logoUrl: localPath.catch('').default(''),
  /** Logo de cada método de pago, por su nombre en minúsculas y sin acentos */
  payLogos: z.record(z.string().max(60), localPath).catch({}).default({}),
  /** Estilos guardados: combinaciones de fondo, animación, efectos y colores para aplicar en un toque */
  styles: z.array(styleSchema).max(12).catch([]).default([]),
});
export type StudioBrand = z.infer<typeof brandSchema>;

export function normalizeBrand(raw: unknown): StudioBrand {
  return brandSchema.parse(raw && typeof raw === 'object' ? raw : {});
}

export function slugify(s: string): string {
  return (
    (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'flyer'
  );
}

export const payKey = (method: string) => slugify(method);

export function payMethods(brand: Pick<StudioBrand, 'payments'>): string[] {
  return (brand.payments || '')
    .split(/·|,|\||\//)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

/** Producto de la tienda tal como lo necesita el estudio: lista blanca, sin costo, SKU ni cantidad en stock. */
export interface StudioStoreProduct {
  id: string;
  name: string;
  url: string;
  image: string | null;
  categoryName: string;
  priceUSD: number;
  /** Precio tachado (oferta vigente o "precio anterior" del admin) */
  compareAtPriceUSD: number | null;
  offerLabel: string | null;
  offerEndsAt: string | null;
  /** Precio en Bs con la tasa BCV del momento */
  priceVES: number;
  /** Primeras características de la ficha, como "Capacidad: 128 GB" */
  specs: { label: string; value: string }[];
  /** Montos de gift cards y recargas: el precio es el menor y se dice "Desde" */
  variants: { label: string; priceUSD: number }[];
  hasVariants: boolean;
  /** false si lo sacaron de la tienda: el flyer avisa */
  published: boolean;
  /** Solo si hay o no: la cantidad no sale del servidor */
  inStock: boolean;
}

export interface StudioCoupon {
  code: string;
  label: string | null;
  percentOff: number | null;
  amountOffUSD: number | null;
  minSubtotalUSD: number | null;
  endsAt: string | null;
  /** "En toda la tienda", "En Audio" o "En productos seleccionados" */
  scope: string;
  isPublic: boolean;
}

export interface StudioReview {
  id: string;
  rating: number;
  comment: string;
  author: string;
  verified: boolean;
  createdAt: string;
  product: StudioStoreProduct | null;
}

/** Datos de la tienda para arrancar la marca, la tasa del día y los métodos de pago activos. */
export interface StudioStoreInfo {
  logo: string | null;
  instagram: string | null;
  website: string;
  rateVES: number;
  rateUpdatedAt: string | null;
  payments: { label: string; logo: string | null }[];
}

/** Resultados de una historia: visitas por su enlace o QR y compras de quienes llegaron por ella */
export interface StudioResult {
  flyerId: string;
  code: string;
  name: string;
  visits: number;
  orders: number;
  paidOrders: number;
  paidUSD: number;
}
