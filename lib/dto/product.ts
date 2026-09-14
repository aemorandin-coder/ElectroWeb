// DTO público de producto: lo único que sale del servidor hacia la tienda y las APIs públicas.
// Lista blanca de campos. Nunca incluir costPerItem, barcode, minStock, sku, status, tags
// ni el costo o el proveedor de las variantes digitales.

import type { Brand, Category, DigitalVariant, Prisma, Product, ProductType } from '@prisma/client';
import { formatFaceValue, guessLegacyUnit, isDigitalUnit, type DigitalUnit } from '@/lib/digital-catalog';
import { parseProductImages } from '@/lib/product-utils';

// category es obligatoria en el esquema: consultar siempre con publicProductInclude
export type ProductWithPublicRelations = Product & {
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  brand?: Pick<Brand, 'name' | 'slug'> | null;
  digitalVariants?: Pick<DigitalVariant, 'id' | 'label' | 'faceValue' | 'unit' | 'priceUSD'>[];
};

/** Monto que se vende de un producto digital ("$25", "800 Robux"). Sin costo ni proveedor. */
export interface PublicDigitalVariant {
  id: string;
  label: string;
  faceValue: number;
  unit: DigitalUnit;
  priceUSD: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  shortCode: string | null;
  description: string;
  priceUSD: number;
  compareAtPriceUSD: number | null;
  stock: number;
  images: string[];
  mainImage: string | null;
  productType: ProductType;
  digitalPlatform: string | null;
  digitalRegion: string | null;
  deliveryMethod: string | null;
  /** Variantes activas en orden (C-60). Vacío en productos físicos. */
  digitalVariants: PublicDigitalVariant[];
  /** Dato de cuenta que se pide en recargas directas */
  accountFieldLabel: string | null;
  accountFieldHint: string | null;
  redemptionInstructions: string | null;
  // Datos de envío: el checkout los usa para mostrar el costo estimado
  weightKg: number | null;
  dimensions: string | null;
  isConsolidable: boolean;
  shippingCost: number | null;
  category: { id: string; name: string; slug: string };
  brand: { name: string; slug: string } | null;
  isFeatured: boolean;
  createdAt: string;
  specs: Record<string, unknown> | null;
  features: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
}

function toNumberOrNull(value: { toString(): string } | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function parseSpecs(specs: string | null): Record<string, unknown> | null {
  if (!specs) return null;
  try {
    const parsed: unknown = JSON.parse(specs);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// specs guarda especificaciones públicas y, en productos viejos, las denominaciones digitales con su costo.
// Las denominaciones ya no salen por aquí: la tienda usa digitalVariants.
function toPublicSpecs(specs: string | null): Record<string, unknown> | null {
  const parsed = parseSpecs(specs);
  if (!parsed) return null;
  const rest = { ...parsed };
  delete rest.digitalPricing;
  return rest;
}

/**
 * Variantes de datos viejos (specs.digitalPricing, sin unidad) mientras no se corra
 * scripts/migrate-digital-variants.ts. El id "legacy-<monto>" lo entiende el cálculo de la orden.
 */
export function legacyDigitalVariants(specs: string | null, platform: string | null): PublicDigitalVariant[] {
  const pricing = parseSpecs(specs)?.digitalPricing;
  if (!Array.isArray(pricing)) return [];
  return pricing
    .filter((p) => p && typeof p === 'object' && (p as { enabled?: unknown }).enabled !== false)
    .map((p) => {
      const faceValue = Number((p as { amount?: unknown }).amount);
      const priceUSD = Number((p as { salePrice?: unknown }).salePrice);
      const unit = guessLegacyUnit(platform, faceValue);
      return { id: `legacy-${faceValue}`, label: formatFaceValue(faceValue, unit), faceValue, unit, priceUSD };
    })
    .filter((v) => Number.isFinite(v.faceValue) && v.faceValue > 0 && Number.isFinite(v.priceUSD) && v.priceUSD > 0);
}

function toPublicVariants(product: ProductWithPublicRelations): PublicDigitalVariant[] {
  if (product.productType !== 'DIGITAL') return [];
  if (product.digitalVariants && product.digitalVariants.length > 0) {
    return product.digitalVariants.map((v) => ({
      id: v.id,
      label: v.label,
      faceValue: Number(v.faceValue.toString()),
      unit: isDigitalUnit(v.unit) ? v.unit : 'USD',
      priceUSD: Number(v.priceUSD.toString()),
    }));
  }
  return legacyDigitalVariants(product.specs, product.digitalPlatform);
}

function toPublicFeatures(features: string | null): string[] {
  if (!features) return [];
  try {
    const parsed: unknown = JSON.parse(features);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

export function toPublicProduct(product: ProductWithPublicRelations): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortCode: product.shortCode,
    description: product.description,
    priceUSD: toNumberOrNull(product.priceUSD) ?? 0,
    compareAtPriceUSD: toNumberOrNull(product.compareAtPriceUSD),
    stock: product.stock,
    images: parseProductImages(product.images),
    mainImage: product.mainImage,
    productType: product.productType,
    digitalPlatform: product.digitalPlatform,
    digitalRegion: product.digitalRegion,
    deliveryMethod: product.deliveryMethod,
    digitalVariants: toPublicVariants(product),
    accountFieldLabel: product.accountFieldLabel,
    accountFieldHint: product.accountFieldHint,
    redemptionInstructions: product.redemptionInstructions,
    weightKg: toNumberOrNull(product.weightKg),
    dimensions: product.dimensions,
    isConsolidable: product.isConsolidable,
    shippingCost: toNumberOrNull(product.shippingCost),
    category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
    brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt.toISOString(),
    specs: toPublicSpecs(product.specs),
    features: toPublicFeatures(product.features),
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    seoImage: product.seoImage,
  };
}

// Relaciones mínimas para construir el DTO (evita traer la categoría o marca completas)
export const publicProductInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  // Solo activas y solo campos públicos: el costo y el proveedor no se consultan
  digitalVariants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { priceUSD: 'asc' }],
    select: { id: true, label: true, faceValue: true, unit: true, priceUSD: true },
  },
} satisfies Prisma.ProductInclude;
