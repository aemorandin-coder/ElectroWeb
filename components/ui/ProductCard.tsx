import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import Price from './Price';
import ProductBadge, { getProductBadges } from './ProductBadge';
import ShareButton from './ShareButton';
import type { ProductCardData } from './productCardData';

export type { ProductCardData } from './productCardData';

interface ProductCardProps {
  product: ProductCardData;
  exchangeRateVES?: number | null;
  /** Unidades a partir de las cuales se muestra "Quedan N" */
  lowStockThreshold?: number;
  /** true para las primeras tarjetas visibles (carga prioritaria de la imagen) */
  priority?: boolean;
}

/**
 * Tarjeta de producto v2 (PLAN.md §3). Server Component: solo el botón de carrito y el de
 * compartir son cliente. Patrón stretched link: el nombre es el enlace y cubre la tarjeta;
 * los botones van con z-10 encima, así no hay botones dentro de un <a>.
 */
export default function ProductCard({ product, exchangeRateVES, lowStockThreshold = 3, priority = false }: ProductCardProps) {
  const image = product.mainImage || product.images?.[0] || '/images/no-image.png';
  const badges = getProductBadges(product);
  const isDigital = product.productType === 'DIGITAL';
  const href = `/productos/${product.slug}`;
  const meta = [product.brand?.name, product.category?.name].filter(Boolean).join(' · ');

  let stockLabel: { text: string; className: string } | null = null;
  if (isDigital) {
    stockLabel = { text: '● Entrega digital', className: 'text-success-strong' };
  } else if (product.stock <= 0) {
    stockLabel = null; // el badge y el botón ya dicen "Agotado"
  } else if (product.stock <= lowStockThreshold) {
    stockLabel = { text: `● Quedan ${product.stock}`, className: 'text-warning-strong' };
  } else {
    stockLabel = { text: '● En stock', className: 'text-success-strong' };
  }

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow lg:hover:shadow-md">
      <div className="relative aspect-square bg-white">
        <Image
          src={image}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-3"
        />
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <ProductBadge key={badge.variant} variant={badge.variant}>{badge.label}</ProductBadge>
            ))}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <ShareButton path={product.shortCode ? `/p/${product.shortCode}` : href} title={product.name} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {meta && <p className="truncate text-xs font-medium text-muted">{meta}</p>}
        <h3 className="min-h-10 text-sm font-medium text-ink">
          <Link
            href={href}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {product.name}
          </Link>
        </h3>
        <Price priceUSD={product.priceUSD} compareAtPriceUSD={product.compareAtPriceUSD} exchangeRateVES={exchangeRateVES} />
        {stockLabel && <p className={`text-xs font-medium ${stockLabel.className}`}>{stockLabel.text}</p>}
        <div className="mt-auto pt-1">
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
