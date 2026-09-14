// Variantes digitales (C-60): validación de lo que envía el admin y guardado. Solo servidor.

import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { DIGITAL_PROVIDERS, DIGITAL_UNIT_KEYS, formatFaceValue } from '@/lib/digital-catalog';

const money = z.coerce.number().finite().min(0).max(100_000);

export const digitalVariantInputSchema = z
  .object({
    id: z.string().max(60).optional(),
    faceValue: z.coerce.number().finite().positive('El monto debe ser mayor a 0').max(10_000_000),
    unit: z.enum(DIGITAL_UNIT_KEYS as [string, ...string[]]),
    label: z.string().trim().max(60).optional().default(''),
    costUSD: money.default(0),
    priceUSD: money.refine((n) => n > 0, 'El precio de venta debe ser mayor a 0'),
    provider: z.enum(DIGITAL_PROVIDERS.map((p) => p.value) as [string, ...string[]]).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .transform((v) => ({ ...v, label: v.label || formatFaceValue(v.faceValue, v.unit as never) }));

export const digitalVariantsInputSchema = z
  .array(digitalVariantInputSchema)
  .max(40, 'Máximo 40 montos por producto')
  .superRefine((variants, ctx) => {
    if (!variants.some((v) => v.isActive)) {
      ctx.addIssue({ code: 'custom', message: 'Activa al menos un monto' });
    }
    const keys = new Set<string>();
    for (const v of variants) {
      const key = `${v.faceValue}-${v.unit}`;
      if (keys.has(key)) ctx.addIssue({ code: 'custom', message: `El monto ${v.label} está repetido` });
      keys.add(key);
    }
  });

export type DigitalVariantInput = z.infer<typeof digitalVariantInputSchema>;

/** Precio "desde" del producto: el menor precio de las variantes activas. */
export function minActivePrice(variants: DigitalVariantInput[]): number {
  const prices = variants.filter((v) => v.isActive).map((v) => v.priceUSD);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

/**
 * Deja las variantes del producto exactamente como las envió el admin, en ese orden.
 * Las que ya no vienen se borran; las líneas de pedidos viejos conservan su etiqueta (onDelete: SetNull).
 */
export async function syncDigitalVariants(tx: Prisma.TransactionClient, productId: string, variants: DigitalVariantInput[]) {
  const existing = await tx.digitalVariant.findMany({ where: { productId }, select: { id: true } });
  const existingIds = new Set(existing.map((v) => v.id));
  const keptIds = new Set(variants.map((v) => v.id).filter((id): id is string => Boolean(id && existingIds.has(id))));

  await tx.digitalVariant.deleteMany({ where: { productId, id: { notIn: [...keptIds] } } });

  for (const [sortOrder, v] of variants.entries()) {
    const data = {
      faceValue: v.faceValue,
      unit: v.unit,
      label: v.label,
      costUSD: v.costUSD,
      priceUSD: v.priceUSD,
      provider: v.provider ?? null,
      isActive: v.isActive,
      sortOrder,
    };
    if (v.id && keptIds.has(v.id)) {
      await tx.digitalVariant.update({ where: { id: v.id }, data });
    } else {
      await tx.digitalVariant.create({ data: { ...data, productId } });
    }
  }
}
