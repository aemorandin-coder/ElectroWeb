// DTO público de producto: lo único que sale del servidor hacia la tienda y las APIs públicas.
// Lista blanca de campos. Nunca incluir costPerItem, barcode, minStock, sku, status, tags
// ni el costo de las denominaciones digitales (specs.digitalPricing[].cost).

import type { Brand, Category, Product, ProductType } from '@prisma/client';
import { parseProductImages } from '@/lib/product-utils';

// category es obligatoria en el esquema: consultar siempre con publicProductInclude
export type ProductWithPublicRelations = Product & {
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  brand?: Pick<Brand, 'name' | 'slug'> | null;
};

export interface PublicDigitalDenomination {
  amount: number;
  salePrice: number;
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

// specs guarda especificaciones públicas y, en productos digitales, las denominaciones
// con su costo interno. De las denominaciones solo salen monto y precio de venta.
function toPublicSpecs(specs: string | null): Record<string, unknown> | null {
  if (!specs) return null;
  try {
    const parsed: unknown = JSON.parse(specs);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const { digitalPricing, ...rest } = parsed as Record<string, unknown>;
    if (!Array.isArray(digitalPricing)) return rest;

    const denominations: PublicDigitalDenomination[] = digitalPricing
      .filter((p) => p && typeof p === 'object' && (p as { enabled?: unknown }).enabled !== false)
      .map((p) => ({
        amount: Number((p as { amount?: unknown }).amount),
        salePrice: Number((p as { salePrice?: unknown }).salePrice),
      }))
      .filter((p) => Number.isFinite(p.amount) && Number.isFinite(p.salePrice) && p.salePrice > 0);

    return { ...rest, digitalPricing: denominations };
  } catch {
    return null;
  }
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
} as const;
