// Ofertas y cupones en el panel (C-102): forma de la respuesta y datos para Prisma.
import type { Promotion } from '@prisma/client';
import type { PromotionInput } from '@/lib/validations/promotion';
import { montoDecimal } from '@/lib/pricing';

export type EstadoPromocion = 'ACTIVA' | 'PROGRAMADA' | 'VENCIDA' | 'PAUSADA' | 'AGOTADA';

function estado(p: Pick<Promotion, 'isActive' | 'startsAt' | 'endsAt' | 'maxUses' | 'usesCount'>, now = new Date()): EstadoPromocion {
  if (!p.isActive) return 'PAUSADA';
  if (p.endsAt && p.endsAt <= now) return 'VENCIDA';
  if (p.maxUses !== null && p.usesCount >= p.maxUses) return 'AGOTADA';
  if (p.startsAt > now) return 'PROGRAMADA';
  return 'ACTIVA';
}

export function toAdminPromotion(p: Promotion & { _sum?: number }) {
  return {
    id: p.id,
    name: p.name,
    label: p.label,
    kind: p.kind,
    code: p.code,
    isPublic: p.isPublic,
    percentOff: p.percentOff,
    amountOffUSD: p.amountOffUSD === null ? null : Number(p.amountOffUSD),
    scope: p.scope,
    productIds: p.productIds,
    categoryIds: p.categoryIds,
    minSubtotalUSD: p.minSubtotalUSD === null ? null : Number(p.minSubtotalUSD),
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    maxUses: p.maxUses,
    maxUsesPerUser: p.maxUsesPerUser,
    usesCount: p.usesCount,
    isActive: p.isActive,
    status: estado(p),
    savedUSD: p._sum ?? 0,
    createdAt: p.createdAt.toISOString(),
  };
}

export function datosPromocion(d: PromotionInput) {
  return {
    ...d,
    amountOffUSD: d.amountOffUSD === null ? null : montoDecimal(d.amountOffUSD),
    minSubtotalUSD: d.minSubtotalUSD === null ? null : montoDecimal(d.minSubtotalUSD),
  };
}

export function erroresZod(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

