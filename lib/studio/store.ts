// Datos de la tienda para ElectroStudio (C-112). Solo servidor. Lista blanca: el estudio recibe nombre, foto,
// enlace y precio de venta (con la oferta vigente y en Bs a la tasa del momento), nunca costo, SKU ni stock.
import type { PaymentMethodType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { conOfertas } from '@/lib/promotions';
import { getPublicSettings } from '@/lib/site-settings';
import { roundMoney } from '@/lib/pricing';
import { normalizeFlyer, type StudioFlyer, type StudioFlyerData, type StudioStoreInfo, type StudioStoreProduct } from './schema';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com').replace(/\/$/, '');

const PAYMENT_LABEL: Record<PaymentMethodType, string> = {
  MOBILE_PAYMENT: 'Pago Móvil',
  BANK_TRANSFER: 'Transferencia',
  ZELLE: 'Zelle',
  ZINLI: 'Zinli',
  PAYPAL: 'PayPal',
  BINANCE_PAY: 'Binance Pay',
  CRYPTO: 'Cripto',
  CASH: 'Efectivo',
  MERCANTIL_PANAMA: 'Mercantil Panamá',
  OTHER: '',
};

/** Rutas de la tienda: solo esas se pueden pintar en el canvas sin bloquear la descarga */
const localPath = (value: string | null | undefined) => (value && /^\/(?!\/)/.test(value) ? value : null);

export async function studioStoreInfo(): Promise<StudioStoreInfo> {
  const [settings, methods] = await Promise.all([
    getPublicSettings(),
    prisma.companyPaymentMethod.findMany({
      where: { isActive: true },
      select: { type: true, name: true, logo: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);
  // Un método por tipo ("Pago Móvil" aunque haya dos bancos) y con el nombre corto que cabe en la historia
  const payments = new Map<string, { label: string; logo: string | null }>();
  for (const m of methods) {
    const label = PAYMENT_LABEL[m.type] || m.name.trim().slice(0, 24);
    if (label && !payments.has(label)) payments.set(label, { label, logo: localPath(m.logo) });
  }
  return {
    logo: localPath(settings.logo),
    instagram: settings.instagram,
    website: BASE_URL.replace(/^https?:\/\/(www\.)?/, ''),
    rateVES: settings.exchangeRateVES,
    payments: [...payments.values()],
  };
}

function specsOf(p: PublicProduct): { label: string; value: string }[] {
  if (!p.specs) return [];
  return Object.entries(p.specs)
    .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
    .map(([label, v]) => ({ label: label.slice(0, 40), value: String(v).slice(0, 60) }))
    .filter((s) => s.label && s.value)
    .slice(0, 4);
}

function toStudioProduct(p: PublicProduct, published: boolean, rateVES: number): StudioStoreProduct {
  const variantPrices = p.digitalVariants.map((v) => v.priceUSD).filter((n) => n > 0);
  const hasVariants = variantPrices.length > 0;
  const priceUSD = hasVariants ? Math.min(...variantPrices) : p.priceUSD;
  const compare = !hasVariants && p.compareAtPriceUSD && p.compareAtPriceUSD > priceUSD ? p.compareAtPriceUSD : null;
  return {
    id: p.id,
    name: p.name,
    url: `${BASE_URL}/productos/${p.slug}`,
    image: localPath(p.mainImage) ?? localPath(p.images[0]),
    categoryName: p.category.name,
    priceUSD,
    compareAtPriceUSD: compare,
    offerLabel: p.oferta?.label ?? null,
    offerEndsAt: p.oferta?.endsAt ?? null,
    priceVES: roundMoney(priceUSD * rateVES),
    specs: specsOf(p),
    hasVariants,
    published,
  };
}

/** Búsqueda por nombre (publicados) o productos puntuales por id (los de un flyer, aunque ya no estén publicados). */
export async function studioProducts({ q, ids }: { q?: string; ids?: string[] }): Promise<StudioStoreProduct[]> {
  const where: Prisma.ProductWhereInput = ids?.length
    ? { id: { in: ids.slice(0, 30) } }
    : {
        status: 'PUBLISHED',
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { shortCode: { equals: q.toUpperCase() } }] } : {}),
      };
  const [rows, settings] = await Promise.all([
    prisma.product.findMany({ where, include: publicProductInclude, orderBy: { updatedAt: 'desc' }, take: ids?.length ? 30 : 12 }),
    getPublicSettings(),
  ]);
  const published = new Map(rows.map((r) => [r.id, r.status === 'PUBLISHED']));
  const withOffers = await conOfertas(rows.map(toPublicProduct));
  return withOffers.map((p) => toStudioProduct(p, published.get(p.id) ?? false, settings.exchangeRateVES));
}

/** Un flyer guardado tal como lo usa el editor: lo del JSON normalizado y la fecha de guardado para detectar cambios. */
export function flyerFromRow(row: { id: string; data: Prisma.JsonValue; updatedAt: Date }): StudioFlyer {
  return { ...normalizeFlyer(row.data), id: row.id, updatedAt: row.updatedAt.toISOString() };
}

/** Columnas que se guardan aparte del JSON para listar y agrupar */
export function flyerColumns(f: StudioFlyerData) {
  return { name: f.name || 'Sin nombre', template: f.template, date: f.date || null, batch: f.batch.trim() || null };
}
