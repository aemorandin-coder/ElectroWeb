// Datos de la tienda para ElectroStudio (C-112). Solo servidor. Lista blanca: el estudio recibe nombre, foto,
// enlace y precio de venta (con la oferta vigente y en Bs a la tasa del momento), nunca costo, SKU ni stock.
import type { PaymentMethodType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { agotada, conOfertas, vigentes } from '@/lib/promotions';
import { publicReviewerName } from '@/lib/queries/product';
import { randomBytes } from 'crypto';
import { getPublicSettings } from '@/lib/site-settings';
import { roundMoney } from '@/lib/pricing';
import {
  normalizeFlyer,
  type StudioCoupon,
  type StudioFlyer,
  type StudioFlyerData,
  type StudioResult,
  type StudioReview,
  type StudioStoreInfo,
  type StudioStoreProduct,
} from './schema';

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
  const [settings, methods, rateRow] = await Promise.all([
    getPublicSettings(),
    prisma.companyPaymentMethod.findMany({
      where: { isActive: true },
      select: { type: true, name: true, logo: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.companySettings.findUnique({ where: { id: 'default' }, select: { lastRateUpdate: true } }),
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
    rateUpdatedAt: rateRow?.lastRateUpdate?.toISOString() ?? null,
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
    variants: p.digitalVariants
      .filter((v) => v.priceUSD > 0)
      .slice(0, 8)
      .map((v) => ({ label: v.label.slice(0, 30), priceUSD: v.priceUSD })),
    hasVariants,
    published,
    inStock: p.productType === 'DIGITAL' || p.stock > 0,
  };
}

/** Búsqueda por nombre (publicados) o productos puntuales por id (los de un flyer, aunque ya no estén publicados). */
export async function studioProducts({ q, ids }: { q?: string; ids?: string[] }): Promise<StudioStoreProduct[]> {
  const where: Prisma.ProductWhereInput = ids?.length
    ? { id: { in: ids.slice(0, 100) } }
    : {
        status: 'PUBLISHED',
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { shortCode: { equals: q.toUpperCase() } }] } : {}),
      };
  const [rows, settings] = await Promise.all([
    prisma.product.findMany({ where, include: publicProductInclude, orderBy: { updatedAt: 'desc' }, take: ids?.length ? 100 : 12 }),
    getPublicSettings(),
  ]);
  const published = new Map(rows.map((r) => [r.id, r.status === 'PUBLISHED']));
  const withOffers = await conOfertas(rows.map(toPublicProduct));
  return withOffers.map((p) => toStudioProduct(p, published.get(p.id) ?? false, settings.exchangeRateVES));
}

/** Un flyer guardado tal como lo usa el editor: lo del JSON normalizado y la fecha de guardado para detectar cambios. */
export function flyerFromRow(row: { id: string; data: Prisma.JsonValue; updatedAt: Date; code: string | null }): StudioFlyer {
  return { ...normalizeFlyer(row.data), id: row.id, updatedAt: row.updatedAt.toISOString(), code: row.code };
}

export const flyerSelect = { id: true, data: true, updatedAt: true, code: true } as const;

/** Código corto y sin letras que se confunden (sin 0, o, 1, l): es lo que va en ?es= del enlace y el QR */
export function newFlyerCode(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(6);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

/** Cupones vigentes de Descuentos (públicos y privados: un cupón para Instagram suele ser privado). */
export async function studioCoupons(code?: string): Promise<StudioCoupon[]> {
  const rows = await prisma.promotion.findMany({
    where: { ...vigentes(new Date()), kind: 'COUPON', code: code ? code : { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });
  const vivos = rows.filter((p) => !agotada(p));
  const catIds = [...new Set(vivos.flatMap((p) => (p.scope === 'CATEGORY' ? p.categoryIds : [])))];
  const cats = catIds.length ? await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } }) : [];
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  return vivos.map((p) => {
    let scope = 'En toda la tienda';
    if (p.scope === 'CATEGORY') {
      const names = p.categoryIds.map((id) => catName.get(id)).filter(Boolean);
      scope = names.length === 1 ? `En ${names[0]}` : 'En categorías seleccionadas';
    } else if (p.scope === 'PRODUCT') scope = 'En productos seleccionados';
    return {
      code: p.code as string,
      label: p.label,
      percentOff: p.percentOff,
      amountOffUSD: p.amountOffUSD === null ? null : Number(p.amountOffUSD),
      minSubtotalUSD: p.minSubtotalUSD === null ? null : Number(p.minSubtotalUSD),
      endsAt: p.endsAt ? p.endsAt.toISOString() : null,
      scope,
      isPublic: p.isPublic,
    };
  });
}

/** Reseñas aprobadas con comentario, las mejores y más recientes primero. "Verificada": pedido entregado con ese producto. */
export async function studioReviews(): Promise<StudioReview[]> {
  const rows = await prisma.review.findMany({
    where: { isApproved: true, comment: { not: null } },
    orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    take: 40,
    select: { id: true, rating: true, comment: true, createdAt: true, userId: true, productId: true, user: { select: { name: true } } },
  });
  const withText = rows.filter((r) => (r.comment ?? '').trim().length >= 3);
  if (!withText.length) return [];
  const [buyers, products] = await Promise.all([
    prisma.order.findMany({
      where: { userId: { in: withText.map((r) => r.userId) }, status: 'DELIVERED', items: { some: { productId: { in: withText.map((r) => r.productId) } } } },
      select: { userId: true, items: { select: { productId: true } } },
    }),
    studioProducts({ ids: [...new Set(withText.map((r) => r.productId))] }),
  ]);
  const verified = new Set(buyers.flatMap((b) => b.items.map((i) => `${b.userId}:${i.productId}`)));
  const byId = new Map(products.map((p) => [p.id, p]));
  return withText.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: (r.comment ?? '').trim().slice(0, 400),
    author: publicReviewerName(r.user?.name),
    verified: verified.has(`${r.userId}:${r.productId}`),
    createdAt: r.createdAt.toISOString(),
    product: byId.get(r.productId) ?? null,
  }));
}

/**
 * Resultados por historia en los últimos `days` días: visitas por su enlace o QR (eventos studio_visit, una por sesión)
 * y compras de quienes llegaron por ella (eventos studio_order). Pagada = pago confirmado y no cancelada ni reembolsada,
 * la misma regla de las comisiones.
 */
export async function studioResults(days: number): Promise<StudioResult[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const flyers = await prisma.studioFlyer.findMany({ where: { code: { not: null } }, select: { id: true, code: true, name: true } });
  if (!flyers.length) return [];
  const codes = flyers.map((f) => f.code as string);
  const [visits, orderEvents] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['eventLabel', 'sessionId'],
      where: { eventType: 'studio_visit', eventLabel: { in: codes }, createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.findMany({
      where: { eventType: 'studio_order', eventLabel: { in: codes }, createdAt: { gte: since } },
      select: { eventLabel: true, metadata: true },
    }),
  ]);
  const visitCount = new Map<string, number>();
  visits.forEach((v) => v.eventLabel && visitCount.set(v.eventLabel, (visitCount.get(v.eventLabel) ?? 0) + 1));
  const orderIdsByCode = new Map<string, string[]>();
  orderEvents.forEach((e) => {
    const ids = (e.metadata as { orderIds?: unknown } | null)?.orderIds;
    if (!e.eventLabel || !Array.isArray(ids)) return;
    orderIdsByCode.set(e.eventLabel, [...(orderIdsByCode.get(e.eventLabel) ?? []), ...ids.filter((x): x is string => typeof x === 'string')]);
  });
  const allIds = [...new Set([...orderIdsByCode.values()].flat())];
  const orders = allIds.length
    ? await prisma.order.findMany({ where: { id: { in: allIds } }, select: { id: true, status: true, paymentStatus: true, totalUSD: true } })
    : [];
  const orderById = new Map(orders.map((o) => [o.id, o]));
  return flyers
    .map((f) => {
      const ids = [...new Set(orderIdsByCode.get(f.code as string) ?? [])].map((id) => orderById.get(id)).filter((o) => !!o);
      const paid = ids.filter((o) => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
      return {
        flyerId: f.id,
        code: f.code as string,
        name: f.name,
        visits: visitCount.get(f.code as string) ?? 0,
        orders: ids.length,
        paidOrders: paid.length,
        paidUSD: roundMoney(paid.reduce((n, o) => n + Number(o.totalUSD), 0)),
      };
    })
    .filter((r) => r.visits > 0 || r.orders > 0)
    .sort((a, b) => b.paidUSD - a.paidUSD || b.visits - a.visits);
}

/** Columnas que se guardan aparte del JSON para listar y agrupar */
export function flyerColumns(f: StudioFlyerData) {
  return { name: f.name || 'Sin nombre', template: f.template, date: f.date || null, batch: f.batch.trim() || null };
}
