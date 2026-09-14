// Datos que necesitan ProductCard y AddToCartButton. Coincide con un subconjunto de
// PublicProduct (lib/dto/product.ts): se puede pasar el DTO directamente.
export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  shortCode?: string | null;
  priceUSD: number;
  compareAtPriceUSD?: number | null;
  stock: number;
  images?: string[];
  mainImage?: string | null;
  productType?: 'PHYSICAL' | 'DIGITAL';
  deliveryMethod?: string | null;
  category?: { name: string; slug?: string } | null;
  brand?: { name: string } | null;
  createdAt?: string | Date | null;
  specs?: Record<string, unknown> | null;
  /** Montos de productos digitales (C-60) */
  digitalVariants?: { id: string; label: string; priceUSD: number }[];
  weightKg?: number | null;
  dimensions?: string | null;
  isConsolidable?: boolean;
  shippingCost?: number | null;
}

/** Los productos digitales con montos o con recarga directa se compran desde su página (se elige monto o cuenta). */
export function needsProductPage(product: ProductCardData): boolean {
  if (product.productType !== 'DIGITAL') return false;
  return (product.digitalVariants?.length ?? 0) > 0 || product.deliveryMethod === 'MANUAL';
}

/** Hay varios montos: el precio de la tarjeta es "Desde". */
export function hasPriceRange(product: ProductCardData): boolean {
  const prices = new Set((product.digitalVariants ?? []).map((v) => v.priceUSD));
  return prices.size > 1;
}

/** Texto de disponibilidad de una tarjeta. null si está agotado (lo dicen el badge y el botón). */
export function getStockLabel(
  product: Pick<ProductCardData, 'productType' | 'stock'>,
  lowStockThreshold: number
): { text: string; className: string } | null {
  if (product.productType === 'DIGITAL') return { text: '● Entrega digital', className: 'text-success-strong' };
  if (product.stock <= 0) return null;
  if (product.stock <= lowStockThreshold) return { text: `● Quedan ${product.stock}`, className: 'text-warning-strong' };
  return { text: '● En stock', className: 'text-success-strong' };
}
