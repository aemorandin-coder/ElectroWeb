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
 * La foto es cuadrada y ocupa la mitad de la tarjeta: con la estrella en 8 de 12 columnas mide lo mismo que el alto
 * de la fila (C-162). Se ajusta con object-contain: cualquier proporción llena su espacio sin recortarse.
 */
export default function FeaturedHeroCard({ product, exchangeRateVES, lowStockThreshold }: FeaturedHeroCardProps) {
  const image = product.mainImage || product.images?.[0] || '/images/no-image.png';
  const href = `/productos/${product.slug}`;
  const meta = [product.brand?.name, product.category?.name].filter(Boolean).join(' · ');
  const badges = getProductBadges(product);
  const stockLabel = getStockLabel(product, lowStockThreshold);

  return (
    <article className="relative flex h-full min-h-96 overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-md">
      {/* C-133: la foto cuadrada y de borde a borde, pegada a la esquina de abajo: la cinta ES cae en la esquina de la foto.
          C-162: tope de ancho para cuando la estrella está sola y ocupa toda la fila */}
      <div className="relative aspect-square w-1/2 max-w-[26rem] shrink-0 self-end bg-white">
        <Image src={image} alt={product.name} fill priority sizes="420px" className="object-contain" />
      </div>
      {/* C-162: las etiquetas van en la esquina de la tarjeta, no de la foto: si la tarjeta es más alta que la foto
          (una tarjeta vecina con oferta), no quedan flotando a media altura */}
      {badges.length > 0 && (
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <ProductBadge key={badge.variant} variant={badge.variant}>{badge.label}</ProductBadge>
          ))}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-5 pl-4 pr-6">
        {meta && <p className="truncate text-xs font-medium text-muted">{meta}</p>}
        <h3 className="text-2xl font-semibold text-ink">
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
