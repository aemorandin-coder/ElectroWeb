import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from '@/components/ui/AddToCartButton';
import Price from '@/components/ui/Price';
import ProductBadge, { getProductBadges } from '@/components/ui/ProductBadge';
import ShareButton from '@/components/ui/ShareButton';
import { getStockLabel, hasPriceRange, type ProductCardData } from '@/components/ui/productCardData';

interface FeaturedHeroCardProps {
  product: ProductCardData;
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

/**
 * Producto estrella de la vitrina (desde xl). Toma la altura de la fila de al lado.
 * La imagen ocupa más de la mitad de la tarjeta y se ajusta con object-contain,
 * así cualquier proporción (alta, ancha o cuadrada) llena su espacio sin recortarse.
 */
export default function FeaturedHeroCard({ product, exchangeRateVES, lowStockThreshold }: FeaturedHeroCardProps) {
  const image = product.mainImage || product.images?.[0] || '/images/no-image.png';
  const href = `/productos/${product.slug}`;
  const meta = [product.brand?.name, product.category?.name].filter(Boolean).join(' · ');
  const badges = getProductBadges(product);
  const stockLabel = getStockLabel(product, lowStockThreshold);

  return (
    <article className="relative flex h-full min-h-96 overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-md">
      <div className="relative w-[55%] shrink-0 bg-white">
        <Image src={image} alt={product.name} fill priority sizes="360px" className="object-contain p-3" />
        {badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <ProductBadge key={badge.variant} variant={badge.variant}>{badge.label}</ProductBadge>
            ))}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-5 pl-2 pr-5">
        {meta && <p className="truncate text-xs font-medium text-muted">{meta}</p>}
        <h3 className="text-xl font-semibold text-ink">
          <Link
            href={href}
            className="line-clamp-3 after:absolute after:inset-0 after:content-[''] hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {product.name}
          </Link>
        </h3>
        <Price priceUSD={product.priceUSD} compareAtPriceUSD={product.compareAtPriceUSD} exchangeRateVES={exchangeRateVES} size="lg" from={hasPriceRange(product)} />
        {stockLabel && <p className={`text-xs font-medium ${stockLabel.className}`}>{stockLabel.text}</p>}
        <div className="flex items-center gap-2 pt-1">
          <div className="min-w-0 flex-1">
            <AddToCartButton product={product} />
          </div>
          <ShareButton path={product.shortCode ? `/p/${product.shortCode}` : href} title={product.name} />
        </div>
      </div>
    </article>
  );
}
