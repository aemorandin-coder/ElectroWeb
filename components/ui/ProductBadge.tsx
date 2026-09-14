export type ProductBadgeVariant = 'deal' | 'new' | 'digital' | 'soldout' | 'tag';

const VARIANT_CLASSES: Record<ProductBadgeVariant, string> = {
  deal: 'bg-deal-bg text-deal',
  new: 'bg-brand-50 text-brand-600',
  digital: 'bg-brand-600 text-white',
  soldout: 'bg-gray-100 text-ink-soft',
  tag: 'bg-tag text-ink',
};

interface ProductBadgeProps {
  variant: ProductBadgeVariant;
  children: React.ReactNode;
}

export default function ProductBadge({ variant, children }: ProductBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ${VARIANT_CLASSES[variant]}`}>
      {children}
    </span>
  );
}

const NEW_PRODUCT_DAYS = 14;

/** Badges de una tarjeta: % de oferta, Nuevo (≤ 14 días), Digital y Agotado. */
export function getProductBadges(
  product: {
    priceUSD: number;
    compareAtPriceUSD?: number | null;
    createdAt?: string | Date | null;
    productType?: string | null;
    stock: number;
  },
  now: number = Date.now()
): Array<{ variant: ProductBadgeVariant; label: string }> {
  const badges: Array<{ variant: ProductBadgeVariant; label: string }> = [];
  const isDigital = product.productType === 'DIGITAL';

  if (product.compareAtPriceUSD && product.compareAtPriceUSD > product.priceUSD) {
    const percent = Math.round((1 - product.priceUSD / product.compareAtPriceUSD) * 100);
    if (percent > 0) badges.push({ variant: 'deal', label: `-${percent}%` });
  }
  if (product.createdAt) {
    const created = new Date(product.createdAt).getTime();
    if (Number.isFinite(created) && now - created <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000) {
      badges.push({ variant: 'new', label: 'NUEVO' });
    }
  }
  if (isDigital) badges.push({ variant: 'digital', label: '⚡ DIGITAL' });
  if (!isDigital && product.stock <= 0) badges.push({ variant: 'soldout', label: 'AGOTADO' });

  return badges;
}
