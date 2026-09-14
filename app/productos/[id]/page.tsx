import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiChevronRight, FiCreditCard, FiMapPin, FiShield, FiStar, FiTruck, FiZap } from 'react-icons/fi';
import Footer from '@/components/Footer';
import { PAYMENT_LABELS } from '@/components/home/TrustBar';
import ProductGallery from '@/components/product/ProductGallery';
import ProductReviews from '@/components/product/ProductReviews';
import PurchasePanel from '@/components/product/PurchasePanel';
import WishlistButton from '@/components/product/WishlistButton';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import ProductBadge, { getProductBadges } from '@/components/ui/ProductBadge';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import SectionHeader from '@/components/ui/SectionHeader';
import ShareButton from '@/components/ui/ShareButton';
import { DELIVERY_MODES, DIGITAL_REGIONS, getPlatform } from '@/lib/digital-catalog';
import { getActivePaymentMethodKinds, getHomeSettings } from '@/lib/queries/home';
import { getProductBySlug, getPublicReviews, getRelatedProducts, getReviewSummary } from '@/lib/queries/product';
import { getPublicSettings } from '@/lib/site-settings';

type PageProps = { params: Promise<{ id: string }> };

// Claves de specs que son datos internos del producto digital, no especificaciones
const HIDDEN_SPEC_KEYS = new Set(['digitalPricing', 'redemptionInstructions']);
const regionName = (value: string) => DIGITAL_REGIONS.find((r) => r.value === value)?.label ?? value;

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';
function absoluteUrl(url: string | null | undefined): string | null {
  if (!url || url.startsWith('data:')) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${baseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductBySlug(id);
  if (!product) return { title: 'Producto no encontrado', robots: { index: false } };

  const description = (product.seoDescription || product.description || `Compra ${product.name} con envío a toda Venezuela.`).replace(/\s+/g, ' ').slice(0, 160);
  const image = absoluteUrl(product.seoImage) || absoluteUrl(product.mainImage) || absoluteUrl(product.images[0]);
  // Una sola definición de metadatos (antes había otra en layout.tsx que la pisaba)
  return {
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/productos/${product.slug}`,
      type: 'website',
      locale: 'es_VE',
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: product.name, description, images: image ? [image] : undefined },
    other: {
      'product:price:amount': product.priceUSD.toFixed(2),
      'product:price:currency': 'USD',
      'product:availability': product.productType === 'DIGITAL' || product.stock > 0 ? 'in stock' : 'out of stock',
    },
  };
}

/**
 * Detalle de producto (C-31). Server Component con Prisma directo (sin fetch a la propia API);
 * solo galería, compra, favoritos, compartir y reseñas son cliente.
 */
export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductBySlug(id);
  if (!product) notFound();

  const [settings, homeSettings, summary, reviews, related, paymentKinds] = await Promise.all([
    getPublicSettings(),
    getHomeSettings(),
    getReviewSummary(product.id),
    getPublicReviews(product.id),
    getRelatedProducts(product, 8),
    getActivePaymentMethodKinds(),
  ]);

  const isDigital = product.productType === 'DIGITAL';
  const images = [...new Set([product.mainImage, ...product.images].filter((src): src is string => Boolean(src)))];
  const specs = Object.entries(product.specs ?? {}).filter(
    ([key, value]) => !HIDDEN_SPEC_KEYS.has(key) && value !== null && value !== '' && typeof value !== 'object'
  );
  // Las instrucciones son una columna del producto (C-60; antes se leían de specs y nunca aparecían)
  const instructions = product.redemptionInstructions?.trim() ?? '';
  const deliveryMode = DELIVERY_MODES[product.deliveryMethod === 'MANUAL' ? 'MANUAL' : 'INSTANT'];
  const waNumber = settings.whatsapp?.replace(/\D/g, '');
  const sharePath = product.shortCode ? `/p/${product.shortCode}` : `/productos/${product.slug}`;
  const inStock = isDigital || product.stock > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description?.slice(0, 500) || undefined,
    image: images.map(absoluteUrl).filter(Boolean),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: product.category.name,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl()}/productos/${product.slug}`,
      priceCurrency: 'USD',
      price: product.priceUSD.toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: summary.count > 0 ? { '@type': 'AggregateRating', ratingValue: summary.average.toFixed(1), reviewCount: summary.count } : undefined,
  };

  const delivery = [
    isDigital
      ? { Icon: FiZap, title: deliveryMode.store, text: deliveryMode.storeHelp }
      : { Icon: FiTruck, title: 'Envíos a toda Venezuela', text: 'El costo se calcula en el checkout según el peso' },
    ...(!isDigital && settings.pickupEnabled ? [{ Icon: FiMapPin, title: 'Retiro en tienda', text: settings.pickupAddress || 'Coordina el retiro al comprar' }] : []),
    { Icon: FiShield, title: 'Producto 100% original', text: 'Con respaldo de la tienda' },
    ...(paymentKinds.length > 0
      ? [{ Icon: FiCreditCard, title: 'Formas de pago', text: paymentKinds.map((kind) => PAYMENT_LABELS[kind].label).join(' · ') }]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      {/* JSON-LD de producto: precio, disponibilidad y valoración para Google */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <main>
        <Container className="pb-10 pt-4 lg:pt-6">
          <nav aria-label="Ruta de navegación" className="mb-2 lg:mb-3">
            <ol className="flex min-w-0 items-center gap-1 text-xs text-muted">
              <li className="shrink-0"><Link href="/" className="hover:text-brand-600 hover:underline">Inicio</Link></li>
              <li aria-hidden="true" className="shrink-0"><FiChevronRight className="h-3 w-3" /></li>
              <li className="shrink-0"><Link href="/productos" className="hover:text-brand-600 hover:underline">Productos</Link></li>
              <li aria-hidden="true" className="shrink-0"><FiChevronRight className="h-3 w-3" /></li>
              <li className="shrink-0"><Link href={`/productos?category=${product.category.slug}`} className="hover:text-brand-600 hover:underline">{product.category.name}</Link></li>
              <li aria-hidden="true" className="hidden shrink-0 sm:block"><FiChevronRight className="h-3 w-3" /></li>
              <li className="hidden min-w-0 sm:block"><span aria-current="page" className="block truncate text-ink-soft">{product.name}</span></li>
            </ol>
          </nav>

          <div className="grid gap-4 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <div className="lg:sticky lg:top-28">
                <ProductGallery
                  images={images}
                  name={product.name}
                  badges={getProductBadges(product).map((badge) => (
                    <ProductBadge key={badge.variant} variant={badge.variant}>{badge.label}</ProductBadge>
                  ))}
                  actions={
                    <>
                      <WishlistButton productId={product.id} productName={product.name} />
                      <ShareButton path={sharePath} title={product.name} className="h-10 w-10 shadow-sm" />
                    </>
                  }
                />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-line bg-white p-4 lg:p-6">
                <p className="text-xs font-medium text-muted">
                  {product.brand && <span className="uppercase tracking-wide">{product.brand.name} · </span>}
                  <Link href={`/productos?category=${product.category.slug}`} className="text-brand-700 hover:underline">{product.category.name}</Link>
                </p>
                <h1 className="mt-1 text-xl font-bold leading-snug text-ink sm:text-2xl lg:text-3xl">{product.name}</h1>

                <a href="#resenas" className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand-700">
                  <span className="flex text-warning" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <FiStar key={n} className={`h-4 w-4 ${n <= Math.round(summary.average) ? 'fill-current' : 'text-line'}`} />
                    ))}
                  </span>
                  {summary.count > 0 ? (
                    <span>{summary.average.toFixed(1)} · {summary.count} {summary.count === 1 ? 'reseña' : 'reseñas'}</span>
                  ) : (
                    <span>Sin reseñas todavía</span>
                  )}
                </a>

                {isDigital && (product.digitalPlatform || product.digitalRegion) && (
                  <dl className="mt-3 flex flex-wrap gap-2 text-xs">
                    {product.digitalPlatform && (
                      <div className="flex gap-1 rounded-full bg-surface px-3 py-1"><dt className="text-muted">Plataforma:</dt><dd className="font-semibold text-ink">{getPlatform(product.digitalPlatform)?.label ?? product.digitalPlatform}</dd></div>
                    )}
                    {product.digitalRegion && (
                      <div className="flex gap-1 rounded-full bg-surface px-3 py-1"><dt className="text-muted">Región:</dt><dd className="font-semibold text-ink">{regionName(product.digitalRegion)}</dd></div>
                    )}
                  </dl>
                )}

                <div className="mt-4 border-t border-line pt-4 lg:mt-5 lg:pt-5">
                  <PurchasePanel product={product} exchangeRateVES={settings.exchangeRateVES} lowStockThreshold={homeSettings.lowStockThreshold} />
                </div>

                <ul className="mt-5 space-y-3 border-t border-line pt-5">
                  {delivery.map(({ Icon, title, text }) => (
                    <li key={title} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{title}</span>
                        <span className="block text-xs text-muted">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hola, quiero información sobre: ${product.name}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    <FaWhatsapp className="h-5 w-5 text-success-strong" aria-hidden="true" />
                    ¿Dudas? Pregúntanos por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-12 lg:gap-10">
            <section aria-labelledby="descripcion-title" className={`rounded-2xl border border-line bg-white p-4 lg:p-6 ${specs.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              <h2 id="descripcion-title" className="text-lg font-bold text-ink lg:text-xl">Descripción</h2>
              {product.description ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{product.description}</p>
              ) : (
                <p className="mt-3 text-sm text-muted">Pronto agregaremos la descripción de este producto.</p>
              )}
              {product.features.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {product.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              )}
              {instructions && (
                <div className="mt-6 rounded-xl bg-surface p-4">
                  <h3 className="text-sm font-semibold text-ink">¿Cómo se canjea?</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{instructions}</p>
                </div>
              )}
            </section>

            {specs.length > 0 && (
              <section aria-labelledby="specs-title" className="rounded-2xl border border-line bg-white p-4 lg:col-span-5 lg:p-6">
                <h2 id="specs-title" className="text-lg font-bold text-ink lg:text-xl">Especificaciones</h2>
                <dl className="mt-3 divide-y divide-line">
                  {specs.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-3 py-2.5 text-sm">
                      <dt className="text-muted">{key}</dt>
                      <dd className="font-medium text-ink">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <section id="resenas" aria-labelledby="resenas-title" className="mt-8 scroll-mt-28 lg:mt-10">
            <SectionHeader id="resenas-title" title="Reseñas" />
            <ProductReviews productId={product.id} initialReviews={reviews} initialSummary={summary} />
          </section>

          {related.length > 0 && (
            <section aria-labelledby="relacionados-title" className="mt-8 lg:mt-10">
              <SectionHeader id="relacionados-title" title="También te puede interesar" href={`/productos?category=${product.category.slug}`} />
              <ProductShelf label="Productos relacionados">
                {related.map((item) => (
                  <ProductCard key={item.id} product={item} exchangeRateVES={settings.exchangeRateVES} lowStockThreshold={homeSettings.lowStockThreshold} />
                ))}
              </ProductShelf>
            </section>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
