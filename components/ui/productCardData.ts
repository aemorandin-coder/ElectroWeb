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
  weightKg?: number | null;
  dimensions?: string | null;
  isConsolidable?: boolean;
  shippingCost?: number | null;
}

/** Los productos digitales con denominaciones o con recarga manual se compran desde su página. */
export function needsProductPage(product: ProductCardData): boolean {
  if (product.productType !== 'DIGITAL') return false;
  const pricing = product.specs?.digitalPricing;
  return (Array.isArray(pricing) && pricing.length > 0) || product.deliveryMethod === 'MANUAL';
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
