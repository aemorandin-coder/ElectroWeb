// Datos de la tienda para ElectroStudio (C-112). Solo servidor. Lista blanca: el estudio recibe nombre, foto,
// enlace y precio de venta (con la oferta vigente y en Bs a la tasa del momento), nunca costo, SKU ni stock.
import type { PaymentMethodType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct, type PublicProduct } from '@/lib/dto/product';
import { agotada, conOfertas, vigentes } from '@/lib/promotions';
import { publicReviewerName } from '@/lib/queries/product';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import path from 'path';
import { formatUSD, formatVES } from '@/lib/currency';
import { getPublicSettings } from '@/lib/site-settings';
import { roundMoney } from '@/lib/pricing';
import { diaEnCaracas, franjaNavidad } from '@/lib/navidad';
import {
  normalizeFlyer,
  type StudioCoupon,
  type StudioFlyer,
  type StudioFlyerData,
  type StudioRadarItem,
  type StudioResult,
  type StudioReview,
  type StudioStoreInfo,
  type StudioStoreProduct,
  type TramoRegalo,
} from './schema';
import { enTramo } from './live';

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

/**
 * C-117: si la foto del producto la armó la tienda con la cinta "ES", su original transparente está al lado
 * (<nombre>.orig.png). La historia usa ese: sin la cinta y sin fondo que recortar.
 */
function studioImage(value: string | null): string | null {
  const m = value?.match(/^\/api\/uploads\/products\/(product-[\w-]+)\.webp$/);
  if (!m) return value;
  return existsSync(path.join(process.cwd(), 'public', 'uploads', 'products', `${m[1]}.orig.png`)) ? `/api/uploads/products/${m[1]}.orig.png` : value;
}

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
    whatsapp: settings.whatsapp || null,
    // C-193: el tema de Marketing → Navidad. La franja, con la misma regla que la ficha y el carrito (C-190)
    navidad: {
      activo: settings.gorroNavidad !== null,
      gorro: settings.gorroNavidad ?? 'ajustado',
      franja: (() => {
        const fr = franjaNavidad(
          settings.entregaNavidad,
          { envio: settings.deliveryEnabled, delivery: settings.localDeliveryEnabled, retiro: settings.pickupEnabled },
          diaEnCaracas()
        );
        return fr ? { titulo: fr.titulo, detalle: fr.detalle } : null;
      })(),
    },
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
    image: studioImage(localPath(p.mainImage) ?? localPath(p.images[0])),
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
    conditionBadge: p.condition?.badge ?? null,
    digital: p.productType === 'DIGITAL',
  };
}

/**
 * Búsqueda por nombre (publicados) o productos puntuales por id (los de un flyer, aunque ya no estén publicados).
 * C-193: con `tramo`, solo los que se pueden comprar hoy y caben en ese tramo de Ideas para regalar (una gift card, si
 * alguno de sus montos cabe), como la página: los físicos con stock primero.
 */
export async function studioProducts({ q, ids, tramo, digital }: { q?: string; ids?: string[]; tramo?: TramoRegalo; digital?: boolean }): Promise<StudioStoreProduct[]> {
  const where: Prisma.ProductWhereInput = ids?.length
    ? { id: { in: ids.slice(0, 100) } }
    : {
        status: 'PUBLISHED',
        ...(digital ? { productType: 'DIGITAL' } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { shortCode: { equals: q.toUpperCase() } }] } : {}),
      };
  const [rows, settings] = await Promise.all([
    prisma.product.findMany({ where, include: publicProductInclude, orderBy: { updatedAt: 'desc' }, take: ids?.length || tramo ? 100 : 12 }),
    getPublicSettings(),
  ]);
  const published = new Map(rows.map((r) => [r.id, r.status === 'PUBLISHED']));
  const withOffers = await conOfertas(rows.map(toPublicProduct));
  const all = withOffers.map((p) => toStudioProduct(p, published.get(p.id) ?? false, settings.exchangeRateVES));
  if (!tramo) return all;
  return all
    .filter((p) => p.inStock && (p.hasVariants ? p.variants.some((v) => enTramo(v.priceUSD, tramo)) : enTramo(p.priceUSD, tramo)))
    .sort((a, b) => Number(a.digital) - Number(b.digital))
    .slice(0, 24);
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

/**
 * G-71 · Radar "¿Qué publicamos hoy?": sugiere hasta 4 piezas reales de la tienda sin costo, SKU ni stock numérico:
 * producto estrella del sorteo (C-297), oferta activa sin historia, recién llegado, reseña 5 estrellas y tasa BCV.
 */
export async function studioRadar(): Promise<StudioRadarItem[]> {
  const now = new Date();
  const hace7Dias = new Date(now.getTime() - 7 * 86_400_000);
  const [estrella, storeInfo, recientesRows, flyersRecientes, reviews] = await Promise.all([
    prisma.estrellaSorteo.findFirst({
      where: { desde: { lte: now }, hasta: { gte: now }, sorteo: { activo: true, sorteadoAt: null } },
      orderBy: { desde: 'desc' },
      select: { id: true, productId: true, boletos: true },
    }),
    studioStoreInfo(),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: publicProductInclude,
      orderBy: { createdAt: 'desc' },
      take: 24,
    }),
    prisma.studioFlyer.findMany({
      where: { updatedAt: { gte: hace7Dias } },
      select: { data: true },
      take: 50,
    }),
    studioReviews(),
  ]);

  const usadosRecientes = new Set<string>();
  flyersRecientes.forEach((row) => {
    const f = normalizeFlyer(row.data);
    f.products.forEach((p) => {
      if (p.productId) usadosRecientes.add(p.productId);
    });
  });

  const estrellaList = estrella ? await studioProducts({ ids: [estrella.productId] }) : [];
  const estrellaProd = estrellaList.find((p) => p.published && p.inStock);

  const withOffers = await conOfertas(recientesRows.map(toPublicProduct));
  const catalog = withOffers.map((p) => toStudioProduct(p, true, storeInfo.rateVES)).filter((p) => p.inStock);

  const items: StudioRadarItem[] = [];
  const usadosEnRadar = new Set<string>();

  if (estrella && estrellaProd) {
    usadosEnRadar.add(estrellaProd.id);
    items.push({
      id: `estrella-${estrella.id}`,
      tipo: 'estrella',
      kicker: 'Sorteo semanal',
      titulo: `Producto estrella (+${estrella.boletos} boletos)`,
      detalle: `${estrellaProd.name}${usadosRecientes.has(estrellaProd.id) ? ' · vigente esta semana' : ' · aún sin historia'}`,
      cta: 'Crear historia',
      destacada: true,
      template: 'solo',
      product: estrellaProd,
      extra: {
        tag: `+${estrella.boletos} BOLETOS DEL SORTEO`,
        name: `Estrella: ${estrellaProd.name}`.slice(0, 80),
      },
    });
  }

  const tieneOferta = (p: StudioStoreProduct) => Boolean(p.offerLabel || (p.compareAtPriceUSD && p.compareAtPriceUSD > p.priceUSD));
  const oferta = catalog.find((p) => !usadosEnRadar.has(p.id) && tieneOferta(p) && !usadosRecientes.has(p.id))
    ?? catalog.find((p) => !usadosEnRadar.has(p.id) && tieneOferta(p));
  if (oferta) {
    usadosEnRadar.add(oferta.id);
    const pct = oferta.compareAtPriceUSD && oferta.compareAtPriceUSD > oferta.priceUSD
      ? Math.round((1 - oferta.priceUSD / oferta.compareAtPriceUSD) * 100)
      : 0;
    items.push({
      id: `oferta-${oferta.id}`,
      tipo: 'oferta',
      kicker: 'Oferta activa',
      titulo: oferta.name,
      detalle: pct > 0 && oferta.compareAtPriceUSD ? `De ${formatUSD(oferta.compareAtPriceUSD)} a ${formatUSD(oferta.priceUSD)} (-${pct} %)` : oferta.offerLabel || formatUSD(oferta.priceUSD),
      cta: 'Crear historia',
      template: 'solo',
      product: oferta,
    });
  }

  const nuevo = catalog.find((p) => !usadosEnRadar.has(p.id) && !usadosRecientes.has(p.id))
    ?? catalog.find((p) => !usadosEnRadar.has(p.id));
  if (nuevo) {
    usadosEnRadar.add(nuevo.id);
    items.push({
      id: `nuevo-${nuevo.id}`,
      tipo: 'nuevo',
      kicker: 'Recién llegado',
      titulo: nuevo.name,
      detalle: `${formatUSD(nuevo.priceUSD)}${usadosRecientes.has(nuevo.id) ? ' · sugerido hoy' : ' · aún sin historia'}`,
      cta: 'Crear historia',
      template: 'nuevo',
      product: nuevo,
    });
  }

  const resena5 = reviews.find((r) => r.rating === 5 && (!r.product || !usadosEnRadar.has(r.product.id)));
  if (resena5 && items.length < 3) {
    items.push({
      id: `resena-${resena5.id}`,
      tipo: 'resena',
      kicker: 'Reseña 5 estrellas',
      titulo: `Lo que dijo ${resena5.author}`,
      detalle: resena5.comment.slice(0, 68),
      cta: 'Crear reseña',
      template: 'resena',
      review: resena5,
    });
  }

  if (storeInfo.rateVES > 0) {
    items.push({
      id: 'tasa-bcv',
      tipo: 'tasa',
      kicker: 'Tasa del día',
      titulo: `Tasa BCV: ${formatVES(storeInfo.rateVES)}`,
      detalle: storeInfo.rateUpdatedAt ? 'Lista para publicar hoy' : 'Tasa vigente de la tienda',
      cta: 'Crear historia',
      template: 'tasa',
    });
  }

  return items.slice(0, 4);
}
