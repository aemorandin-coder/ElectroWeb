import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from '@/components/ui/AddToCartButton';
import Price from '@/components/ui/Price';
import ProductBadge, { getProductBadges } from '@/components/ui/ProductBadge';
import ShareButton from '@/components/ui/ShareButton';
import { getStockLabel, type ProductCardData } from '@/components/ui/productCardData';

interface FeaturedHeroCardProps {
  product: ProductCardData;
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

/**
 * Producto estrella de la vitrina (solo desktop). Toma la altura de la fila de al lado:
 * en lg la imagen va arriba y ocupa el alto sobrante; desde xl, imagen a la izquierda y datos a la derecha.
 */
export default function FeaturedHeroCard({ product, exchangeRateVES, lowStockThreshold }: FeaturedHeroCardProps) {
  const image = product.mainImage || product.images?.[0] || '/images/no-image.png';
  const href = `/productos/${product.slug}`;
  const meta = [product.brand?.name, product.category?.name].filter(Boolean).join(' · ');
  const badges = getProductBadges(product);
  const stockLabel = getStockLabel(product, lowStockThreshold);

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-md xl:flex-row">
      <div className="relative min-h-48 flex-1 bg-white xl:min-h-80 xl:w-1/2 xl:flex-none">
        <Image src={image} alt={product.name} fill priority sizes="(min-width: 1280px) 300px, 390px" className="object-contain p-4 xl:p-6" />
        {badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <ProductBadge key={badge.variant} variant={badge.variant}>{badge.label}</ProductBadge>
            ))}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2 p-5 xl:flex-1 xl:justify-center xl:gap-3 xl:p-6">
        {meta && <p className="truncate text-xs font-medium text-muted">{meta}</p>}
        <h3 className="text-xl font-semibold text-ink xl:text-2xl">
          <Link
            href={href}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 xl:line-clamp-3"
          >
            {product.name}
          </Link>
        </h3>
        <Price priceUSD={product.priceUSD} compareAtPriceUSD={product.compareAtPriceUSD} exchangeRateVES={exchangeRateVES} size="lg" />
        {stockLabel && <p className={`text-xs font-medium ${stockLabel.className}`}>{stockLabel.text}</p>}
        <div className="flex items-center gap-3 pt-1">
          <div className="min-w-0 flex-1 xl:max-w-60">
            <AddToCartButton product={product} />
          </div>
          <ShareButton path={product.shortCode ? `/p/${product.shortCode}` : href} title={product.name} />
        </div>
      </div>
    </article>
  );
}
