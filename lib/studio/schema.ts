// ElectroStudio (C-112): forma de un flyer y de los ajustes de marca. Módulo puro: lo usan la API (validar lo que
// llega) y el editor (normalizar lo que se lee). Sale del artefacto "Flyers ElectroShop" de Andrés.
import { z } from 'zod';

export const TEMPLATES = {
  solo: { label: '1 producto', n: 1 },
  duo: { label: '2 productos', n: 2 },
  trio: { label: 'Categoría (3)', n: 3 },
  mensaje: { label: 'Mensaje', n: 0 },
} as const;
export type TemplateId = keyof typeof TEMPLATES;
export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

export const BACKGROUNDS = {
  ondas: 'Ondas',
  diagonal: 'Diagonal',
  circulos: 'Círculos',
  arco: 'Arco',
  lateral: 'Ola lateral',
  liso: 'Claro',
  azul: 'Azul',
} as const;
export type BackgroundId = keyof typeof BACKGROUNDS;
export const BACKGROUND_DEFAULT: Record<TemplateId, BackgroundId> = { solo: 'ondas', duo: 'ondas', trio: 'lateral', mensaje: 'azul' };

export const ANIMATIONS = { entrada: 'Entrada', zoom: 'Zoom', deslizar: 'Deslizar', destello: 'Destello' } as const;
export type AnimationId = keyof typeof ANIMATIONS;

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

export const flyerSchema = z.object({
  name: text(80).default('Nueva historia'),
  template: z.enum(TEMPLATE_IDS as [TemplateId, ...TemplateId[]]).catch('solo').default('solo'),
  bg: z.union([z.enum(Object.keys(BACKGROUNDS) as [BackgroundId, ...BackgroundId[]]), z.literal('')]).catch('').default(''),
  anim: z.enum(Object.keys(ANIMATIONS) as [AnimationId, ...AnimationId[]]).catch('entrada').default('entrada'),
  heading: text(40).default(''),
  caption: text(2200).default(''),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).catch('').default(''),
  batch: text(40).default(''),
  qr: z.boolean().catch(false).default(false),
  qrUrl: webUrl.catch('').default(''),
  offerEnds: z.string().max(30).catch('').default(''),
  offerLabel: text(40).default(''),
  msg: messageSchema.catch(() => messageSchema.parse({})).default(() => messageSchema.parse({})),
  products: z.array(productSlotSchema).max(3).catch([]).default([]),
});
export type StudioFlyerData = z.infer<typeof flyerSchema>;
export type StudioFlyer = StudioFlyerData & { id: string; updatedAt: string };

export function blankProduct(): StudioProductSlot {
  return productSlotSchema.parse({});
}

/** Lee un flyer guardado (o a medio escribir) y le completa lo que falte, como `normalize` del artefacto. */
export function normalizeFlyer(raw: unknown): StudioFlyerData {
  const f = flyerSchema.parse(raw && typeof raw === 'object' ? raw : {});
  if (!f.products.length) f.products.push(blankProduct());
  return f;
}

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

/** Producto de la tienda tal como lo necesita el estudio: lista blanca, sin costo ni SKU. */
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
  /** Tiene montos (gift cards, recargas): el precio es el menor y se dice "Desde" */
  hasVariants: boolean;
  /** false si lo sacaron de la tienda: el flyer avisa */
  published: boolean;
}

/** Datos de la tienda para arrancar la marca y avisar de los métodos de pago activos. */
export interface StudioStoreInfo {
  logo: string | null;
  instagram: string | null;
  website: string;
  rateVES: number;
  payments: { label: string; logo: string | null }[];
}

export interface StudioListItem {
  id: string;
  name: string;
  template: TemplateId;
  date: string | null;
  batch: string | null;
  updatedAt: string;
}
