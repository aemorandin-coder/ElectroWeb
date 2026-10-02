// Productos usados y reacondicionados (C-119). Módulo puro: lo usan el formulario del admin, la API,
// la tienda, la orden y los términos, para que todos digan lo mismo.
// Los grados siguen a Amazon Renewed (distancia de 30 cm) y el empaque, a lo que pidió Andrés (caja original o no).

import { z } from '@/lib/zod';

export const CONDITIONS = ['NEW', 'OPEN_BOX', 'REFURBISHED', 'USED'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABEL: Record<Condition, string> = {
  NEW: 'Nuevo',
  OPEN_BOX: 'Caja abierta',
  REFURBISHED: 'Reacondicionado',
  USED: 'Usado',
};

/** Qué significa cada condición, dicho al cliente */
export const CONDITION_HELP: Record<Condition, string> = {
  NEW: 'Sellado y sin uso.',
  OPEN_BOX: 'Sin uso. La caja se abrió (exhibición, revisión o caja dañada).',
  REFURBISHED: 'Usado, revisado, limpiado y probado por la tienda, con repuestos si hizo falta.',
  USED: 'Usado, probado por la tienda y funcionando.',
};

export const GRADES = ['EXCELLENT', 'VERY_GOOD', 'GOOD'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABEL: Record<Grade, string> = {
  EXCELLENT: 'Excelente',
  VERY_GOOD: 'Muy bueno',
  GOOD: 'Bueno',
};

/** Estado estético, con una regla que se puede comprobar */
export const GRADE_DEFINITION: Record<Grade, string> = {
  EXCELLENT: 'Sin marcas visibles a 30 cm de distancia.',
  VERY_GOOD: 'Marcas leves, apenas visibles a 30 cm. Pantalla sin rayones.',
  GOOD: 'Marcas de uso visibles. Funciona perfecto.',
};

export const PACKAGINGS = ['ORIGINAL', 'GENERIC', 'NONE'] as const;
export type Packaging = (typeof PACKAGINGS)[number];

export const PACKAGING_LABEL: Record<Packaging, string> = {
  ORIGINAL: 'Caja original',
  GENERIC: 'Caja genérica',
  NONE: 'Sin caja',
};

/** Garantía de la tienda por defecto, en días (Andrés, 29/09). Cada producto puede tener la suya. */
export const DEFAULT_WARRANTY_DAYS: Record<Condition, number> = {
  NEW: 30,
  OPEN_BOX: 30,
  REFURBISHED: 90,
  USED: 30,
};

/** Motivos de una solicitud de garantía. No hay devoluciones por cambio de opinión (Andrés, 29/09) */
export const WARRANTY_REASONS = {
  DEFECT: 'Falla de funcionamiento',
  NOT_AS_DESCRIBED: 'No coincide con lo publicado',
  DAMAGED_ON_ARRIVAL: 'Llegó dañado',
} as const;
export type WarrantyReason = keyof typeof WARRANTY_REASONS;

export const isSecondHand = (c: Condition | null | undefined): boolean => !!c && c !== 'NEW';
/** Reacondicionado y usado llevan grado; caja abierta es sin uso, el grado es opcional */
export const needsGrade = (c: Condition) => c === 'REFURBISHED' || c === 'USED';

/** Días de garantía de la tienda de un producto (o de lo que guardó la orden) */
export function warrantyDaysFor(condition: Condition | null | undefined, days: number | null | undefined): number {
  return days && days > 0 ? days : DEFAULT_WARRANTY_DAYS[condition ?? 'NEW'];
}

/** "Usado · Muy bueno", "Reacondicionado", "Caja abierta"; null si es nuevo */
export function conditionBadge(condition: Condition | null | undefined, grade: Grade | null | undefined): string | null {
  if (!isSecondHand(condition)) return null;
  const c = condition as Condition;
  return grade ? `${CONDITION_LABEL[c]} · ${GRADE_LABEL[grade]}` : CONDITION_LABEL[c];
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullish()
    .transform((v) => (v ? v : null));
const optionalInt = (min: number, max: number, message: string) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().int(message).min(min, message).max(max, message).nullable());

/** Lo que manda el formulario del admin. En un producto nuevo, todo lo de usado se guarda vacío. */
export const conditionInputSchema = z
  .object({
    condition: z.enum(CONDITIONS).default('NEW'),
    conditionGrade: z.enum(GRADES).nullish().transform((v) => v ?? null),
    packaging: z.enum(PACKAGINGS).nullish().transform((v) => v ?? null),
    includedItems: text(500),
    missingItems: text(300),
    usageHours: optionalInt(0, 200000, 'Horas de uso: un número entero'),
    batteryHealth: optionalInt(1, 100, 'Salud de la batería: de 1 a 100 %'),
    cosmeticNotes: text(500),
    testNotes: text(500),
    warrantyDays: optionalInt(0, 1095, 'Garantía: de 0 a 1095 días'),
    serialNumber: text(80),
  })
  .superRefine((v, ctx) => {
    if (needsGrade(v.condition) && !v.conditionGrade) ctx.addIssue({ code: 'custom', path: ['conditionGrade'], message: 'Elige el estado estético (grado)' });
    if (isSecondHand(v.condition) && !v.packaging) ctx.addIssue({ code: 'custom', path: ['packaging'], message: 'Elige el empaque' });
  })
  .transform((v) =>
    v.condition === 'NEW'
      ? {
          condition: 'NEW' as const,
          conditionGrade: null,
          packaging: null,
          includedItems: null,
          missingItems: null,
          usageHours: null,
          batteryHealth: null,
          cosmeticNotes: null,
          testNotes: null,
          warrantyDays: v.warrantyDays,
          serialNumber: v.serialNumber,
        }
      : v,
  );

export type ConditionInput = z.output<typeof conditionInputSchema>;

/** Campos de condición del body (si no vino ninguno, undefined: el PATCH no los toca) */
export function pickConditionInput(body: Record<string, unknown>): Record<string, unknown> | undefined {
  const keys = ['condition', 'conditionGrade', 'packaging', 'includedItems', 'missingItems', 'usageHours', 'batteryHealth', 'cosmeticNotes', 'testNotes', 'warrantyDays', 'serialNumber'];
  if (!keys.some((k) => k in body)) return undefined;
  return Object.fromEntries(keys.map((k) => [k, body[k]]));
}
