// Ofertas y cupones en el servidor (C-102): lectura de la base y aplicación a los productos de la tienda.
// Las reglas puras viven en lib/promotions-core.ts.

import { cache } from 'react';
import type { Prisma, Promotion } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PublicProduct } from '@/lib/dto/product';
import { aplicaA, mejorOferta, normalizarCodigo, type PromotionRule } from '@/lib/promotions-core';

/** Vigente ahora: activa, dentro de sus fechas y sin agotar. El tope de usos se revisa aparte (Prisma no compara columnas). */
function vigentes(now: Date): Prisma.PromotionWhereInput {
  return {
    isActive: true,
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  };
}

const agotada = (p: Pick<Promotion, 'maxUses' | 'usesCount'>) => p.maxUses !== null && p.usesCount >= p.maxUses;

export function toRule(p: Promotion): PromotionRule {
  return {
    id: p.id,
    kind: p.kind,
    label: p.label,
    code: p.code,
    percentOff: p.percentOff,
    amountOffUSD: p.amountOffUSD === null ? null : Number(p.amountOffUSD),
    scope: p.scope,
    productIds: p.productIds,
    categoryIds: p.categoryIds,
    minSubtotalUSD: p.minSubtotalUSD === null ? null : Number(p.minSubtotalUSD),
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
  };
}

/** Ofertas automáticas vigentes (una consulta por petición). */
export const getOfertasVigentes = cache(async (): Promise<PromotionRule[]> => {
  const rows = await prisma.promotion.findMany({ where: { ...vigentes(new Date()), kind: 'AUTOMATIC' } });
  return rows.filter((p) => !agotada(p)).map(toRule);
});

/** Cupones públicos vigentes: la ficha y el carrito los ofrecen con "Aplicar cupón". */
export const getCuponesPublicos = cache(async (): Promise<PromotionRule[]> => {
  const rows = await prisma.promotion.findMany({
    where: { ...vigentes(new Date()), kind: 'COUPON', isPublic: true, code: { not: null } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.filter((p) => !agotada(p)).map(toRule);
});

export type EstadoCupon =
  | { ok: true; promo: Promotion }
  | { ok: false; mensaje: string };

/** Busca un cupón por código y revisa fechas, topes y el límite por cliente. */
export async function buscarCupon(rawCode: unknown, userId: string, db: Prisma.TransactionClient = prisma): Promise<EstadoCupon> {
  const code = normalizarCodigo(rawCode);
  if (!code) return { ok: false, mensaje: 'Ese código no es válido.' };
  const promo = await db.promotion.findUnique({ where: { code } });
  const now = new Date();
  if (!promo || promo.kind !== 'COUPON' || !promo.isActive) return { ok: false, mensaje: 'Ese cupón no existe o ya no está activo.' };
  if (promo.startsAt > now) return { ok: false, mensaje: 'Ese cupón todavía no está disponible.' };
  if (promo.endsAt && promo.endsAt <= now) return { ok: false, mensaje: 'Ese cupón ya venció.' };
  if (agotada(promo)) return { ok: false, mensaje: 'Ese cupón se agotó.' };
  if (promo.maxUsesPerUser !== null) {
    const usados = await db.promotionRedemption.count({ where: { promotionId: promo.id, userId } });
    if (usados >= promo.maxUsesPerUser) return { ok: false, mensaje: 'Ya usaste este cupón.' };
  }
  return { ok: true, promo };
}

export interface CuponPublico {
  code: string;
  label: string | null;
  percentOff: number | null;
  amountOffUSD: number | null;
  minSubtotalUSD: number | null;
  endsAt: string | null;
}

/**
 * Aplica las ofertas automáticas a productos de la tienda: el precio pasa a ser el de la oferta y el anterior
 * queda como precio tachado (el mayor entre el precio normal y el "precio anterior" que puso el admin),
 * así las tarjetas, la ficha y el carrito muestran el ahorro sin cambiar nada más.
 */
export async function conOfertas(products: PublicProduct[]): Promise<PublicProduct[]> {
  const ofertas = products.some((p) => p.productType !== 'DIGITAL') ? await getOfertasVigentes() : [];
  return products.map((p) => {
    const oferta = ofertas.length > 0
      ? mejorOferta(ofertas, { id: p.id, categoryId: p.category.id, productType: p.productType }, p.priceUSD)
      : null;
    if (!oferta) return p;
    return {
      ...p,
      priceUSD: oferta.priceUSD,
      compareAtPriceUSD: Math.max(p.priceUSD, p.compareAtPriceUSD ?? 0),
      oferta: { label: oferta.label, percent: oferta.percent, endsAt: oferta.endsAt },
    };
  });
}

/** Cupones públicos que sirven para este producto (la ficha los ofrece). */
export async function cuponesParaProducto(p: Pick<PublicProduct, 'id' | 'category' | 'productType'>): Promise<CuponPublico[]> {
  if (p.productType === 'DIGITAL') return [];
  const cupones = await getCuponesPublicos();
  return cupones
    .filter((c) => c.code && aplicaA(c, { id: p.id, categoryId: p.category.id, productType: p.productType }))
    .map((c) => ({
      code: c.code as string,
      label: c.label,
      percentOff: c.percentOff,
      amountOffUSD: c.amountOffUSD,
      minSubtotalUSD: c.minSubtotalUSD,
      endsAt: c.endsAt,
    }));
}

/** Ids de productos físicos con una oferta automática vigente (para "Solo ofertas" y la sección Ofertas). */
export async function idsEnOferta(): Promise<{ todos: boolean; productIds: string[]; categoryIds: string[] }> {
  const ofertas = await getOfertasVigentes();
  return {
    todos: ofertas.some((o) => o.scope === 'ALL'),
    productIds: [...new Set(ofertas.filter((o) => o.scope === 'PRODUCT').flatMap((o) => o.productIds))],
    categoryIds: [...new Set(ofertas.filter((o) => o.scope === 'CATEGORY').flatMap((o) => o.categoryIds))],
  };
}

/** Condición de Prisma: el producto está rebajado (precio anterior o una oferta vigente). */
export async function filtroEnOferta(): Promise<Prisma.ProductWhereInput> {
  const { todos, productIds, categoryIds } = await idsEnOferta();
  const rebajado: Prisma.ProductWhereInput = { compareAtPriceUSD: { gt: prisma.product.fields.priceUSD } };
  if (todos) return { OR: [rebajado, { productType: 'PHYSICAL' }] };
  const or: Prisma.ProductWhereInput[] = [rebajado];
  if (productIds.length > 0) or.push({ id: { in: productIds }, productType: 'PHYSICAL' });
  if (categoryIds.length > 0) or.push({ categoryId: { in: categoryIds }, productType: 'PHYSICAL' });
  return { OR: or };
}
