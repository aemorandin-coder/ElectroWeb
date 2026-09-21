// Product.specs (JSON en texto) mezcla las especificaciones que ve el cliente con datos internos del panel.

/**
 * Claves internas de specs. Nunca salen en el DTO público y el formulario no las edita como especificación:
 * - digitalPricing: montos de productos digitales anteriores a C-60 (respaldo de lib/order-quote.ts).
 * - __adminPricing: el último margen usado en el wizard digital (C-95).
 */
export const INTERNAL_SPEC_KEYS = ['digitalPricing', '__adminPricing'] as const;

/** specs en texto u objeto → objeto plano nuevo ({} si no es válido). */
export function parseSpecsObject(raw: unknown): Record<string, unknown> {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

/** Margen del wizard digital: de 0 a 300 %, como el campo del panel. undefined si no es válido. */
export function parseDigitalMargin(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 300 ? value : undefined;
}

/** Último margen guardado para el producto, o null si nunca se guardó. */
export function digitalMarginFromSpecs(raw: unknown): number | null {
  const pricing = parseSpecsObject(raw).__adminPricing;
  const margin = pricing && typeof pricing === 'object' ? (pricing as Record<string, unknown>).digitalMarginPercent : undefined;
  return parseDigitalMargin(margin) ?? null;
}

/**
 * specs que se guarda al editar un producto.
 * - specifications (del formulario) reemplaza las especificaciones; si no llega, quedan las anteriores.
 * - Las claves internas se conservan salvo que lleguen explícitas (digitalPricing, digitalMarginPercent).
 *   Antes, guardar las especificaciones borraba digitalPricing.
 */
export function specsForUpdate(
  oldSpecs: unknown,
  input: { specifications?: unknown; digitalPricing?: unknown; digitalMarginPercent?: number },
): Record<string, unknown> {
  const old = parseSpecsObject(oldSpecs);
  const next = input.specifications !== undefined ? parseSpecsObject(input.specifications) : { ...old };
  for (const key of INTERNAL_SPEC_KEYS) delete next[key];

  if (Array.isArray(input.digitalPricing)) next.digitalPricing = input.digitalPricing;
  else if (old.digitalPricing !== undefined) next.digitalPricing = old.digitalPricing;

  if (input.digitalMarginPercent !== undefined) next.__adminPricing = { digitalMarginPercent: input.digitalMarginPercent };
  else if (old.__adminPricing !== undefined) next.__adminPricing = old.__adminPricing;

  return next;
}
