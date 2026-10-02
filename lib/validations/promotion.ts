// Ofertas y cupones creados en el panel (C-102). Valida lo que llega del navegador antes de tocar la base.
import { z } from '@/lib/zod';
import { normalizarCodigo, PORCENTAJE_MAXIMO } from '@/lib/promotions-core';

const fecha = z
  .union([z.string(), z.null()])
  .transform((v, ctx) => {
    if (v === null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Fecha inválida' });
      return z.NEVER;
    }
    return d;
  });

const enteroOpcional = (max: number) =>
  z.union([z.number(), z.string(), z.null()]).transform((v, ctx) => {
    if (v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isInteger(n) || n < 1 || n > max) {
      ctx.addIssue({ code: 'custom', message: `Entre 1 y ${max}` });
      return z.NEVER;
    }
    return n;
  });

const montoOpcional = z.union([z.number(), z.string(), z.null()]).transform((v, ctx) => {
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 100000) {
    ctx.addIssue({ code: 'custom', message: 'Monto inválido' });
    return z.NEVER;
  }
  return Math.round(n * 100) / 100;
});

export const promotionSchema = z
  .object({
    name: z.string().trim().min(3, 'Escribe un nombre de al menos 3 caracteres').max(80),
    label: z.string().trim().max(40, 'Máximo 40 caracteres').nullable().optional().transform((v) => v || null),
    kind: z.enum(['AUTOMATIC', 'COUPON']),
    code: z.string().nullable().optional(),
    isPublic: z.boolean().optional().default(false),
    valueType: z.enum(['PERCENT', 'AMOUNT']),
    // Se revisa aquí (no solo abajo) para marcarlo aunque otro campo falle
    value: z.union([z.number(), z.string()]).refine((v) => {
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) && n > 0 && n <= 100000;
    }, 'Escribe un valor mayor que 0'),
    scope: z.enum(['ALL', 'CATEGORY', 'PRODUCT']),
    productIds: z.array(z.string().max(60)).max(500).optional().default([]),
    categoryIds: z.array(z.string().max(60)).max(200).optional().default([]),
    minSubtotalUSD: montoOpcional.optional().default(null),
    startsAt: fecha.optional().default(null),
    endsAt: fecha.optional().default(null),
    maxUses: enteroOpcional(1_000_000).optional().default(null),
    maxUsesPerUser: enteroOpcional(100).optional().default(null),
    isActive: z.boolean().optional().default(true),
  })
  .transform((d, ctx) => {
    const n = Number(String(d.value).replace(',', '.'));
    let percentOff: number | null = null;
    let amountOffUSD: number | null = null;
    if (d.valueType === 'PERCENT') {
      if (!Number.isInteger(n) || n < 1 || n > PORCENTAJE_MAXIMO) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: `El porcentaje va de 1 a ${PORCENTAJE_MAXIMO}` });
      }
      percentOff = n;
    } else {
      if (!Number.isFinite(n) || n <= 0 || n > 100000) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Monto inválido' });
      amountOffUSD = Math.round(n * 100) / 100;
    }

    let code: string | null = null;
    if (d.kind === 'COUPON') {
      code = normalizarCodigo(d.code);
      if (!code) ctx.addIssue({ code: 'custom', path: ['code'], message: 'Código de 3 a 30 letras, números o guiones' });
    }
    if (d.scope === 'PRODUCT' && d.productIds.length === 0) ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Elige al menos un producto' });
    if (d.scope === 'CATEGORY' && d.categoryIds.length === 0) ctx.addIssue({ code: 'custom', path: ['categoryIds'], message: 'Elige al menos una categoría' });
    if (d.startsAt && d.endsAt && d.endsAt <= d.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Debe terminar después de empezar' });

    return {
      name: d.name,
      label: d.label,
      kind: d.kind,
      code,
      // Una oferta automática no tiene código ni se "aplica": siempre es pública por definición
      isPublic: d.kind === 'COUPON' ? d.isPublic : false,
      percentOff,
      amountOffUSD,
      scope: d.scope,
      productIds: d.scope === 'PRODUCT' ? [...new Set(d.productIds)] : [],
      categoryIds: d.scope === 'CATEGORY' ? [...new Set(d.categoryIds)] : [],
      // La compra mínima solo tiene sentido en cupones
      minSubtotalUSD: d.kind === 'COUPON' ? d.minSubtotalUSD : null,
      startsAt: d.startsAt ?? new Date(),
      endsAt: d.endsAt,
      maxUses: d.maxUses,
      maxUsesPerUser: d.kind === 'COUPON' ? d.maxUsesPerUser : null,
      isActive: d.isActive,
    };
  });

export type PromotionInput = z.infer<typeof promotionSchema>;
