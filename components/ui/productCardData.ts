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
