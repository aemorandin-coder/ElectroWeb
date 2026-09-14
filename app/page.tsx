import dynamic from 'next/dynamic';
import Link from 'next/link';
import Footer from '@/components/Footer';
import CategoryChips from '@/components/home/CategoryChips';
import CategoryRail from '@/components/home/CategoryRail';
import DigitalStrip from '@/components/home/DigitalStrip';
import FeaturedShowcase from '@/components/home/FeaturedShowcase';
import MoreFromElectroShop from '@/components/home/MoreFromElectroShop';
import ProductSection from '@/components/home/ProductSection';
import TrustBar from '@/components/home/TrustBar';
import VideoPlayer from '@/components/home/VideoPlayer';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import SectionHeader from '@/components/ui/SectionHeader';
import type { PublicProduct } from '@/lib/dto/product';
import {
  getActivePaymentMethodKinds,
  getBestSellers,
  getCategoriesRail,
  getDeals,
  getFeatured,
  getHomeSettings,
  getNewArrivals,
  getTopCategoriesWithProducts,
} from '@/lib/queries/home';
import { getHotAd } from '@/lib/queries/hot-ad';
import { getPublicSettings } from '@/lib/site-settings';

const HotAdOverlay = dynamic(() => import('@/components/HotAdOverlay'));

export const revalidate = 60;

// La vitrina necesita 1 producto estrella + 4 en desktop
const SHOWCASE_MIN = 5;

function uniqueById(products: PublicProduct[]): PublicProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => (seen.has(product.id) ? false : (seen.add(product.id), true)));
}

/**
 * Home "vitrina" (PLAN.md §3): lo primero son productos con precio y botón, no un mensaje.
 * Todo se renderiza en el servidor; solo carrito, compartir y buscador son cliente.
 */
export default async function Home() {
  const [settings, homeSettings, featured, deals, bestSellers, newArrivals, topCategories, paymentMethods, hotAd] = await Promise.all([
    getPublicSettings(),
    getHomeSettings(),
    getFeatured(),
    getDeals(12),
    getBestSellers(90, 12),
    getNewArrivals(12),
    getTopCategoriesWithProducts(3, 10),
    getActivePaymentMethodKinds(),
    getHotAd(),
  ]);
  const railCategories = homeSettings.showCategories ? await getCategoriesRail(homeSettings.maxCategoriesDisplay) : [];

  // Si hay pocos destacados, la vitrina se completa con ofertas y recién llegados:
  // el primer pantallazo siempre muestra productos.
  const showcase = uniqueById([...featured, ...deals, ...newArrivals]).slice(
    0,
    Math.max(SHOWCASE_MIN, homeSettings.maxFeaturedProducts)
  );
  const rate = settings.exchangeRateVES;
  const lowStock = homeSettings.lowStockThreshold;

  return (
    <div className="min-h-dvh bg-white">
      <PublicHeader />

      <main>
        <h1 className="sr-only">{settings.companyName}: tecnología, gaming y gift cards con envíos a toda Venezuela</h1>

        <CategoryChips categories={railCategories} />

        {showcase.length > 0 ? (
          <FeaturedShowcase products={showcase} exchangeRateVES={rate} lowStockThreshold={lowStock} />
        ) : (
          <section className="bg-surface py-12">
            <Container className="text-center">
              <p className="text-lg font-semibold text-ink">Estamos preparando el catálogo</p>
              <p className="mt-1 text-sm text-muted">Mientras tanto, explora todo lo que tenemos.</p>
              <Link href="/productos" className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
                Ver productos
              </Link>
            </Container>
          </section>
        )}

        <CategoryRail categories={railCategories} />

        <ProductSection id="ofertas" title="Ofertas" subtitle="Precios rebajados por tiempo limitado" href="/productos?oferta=1" products={deals} exchangeRateVES={rate} lowStockThreshold={lowStock} tone="surface" />

        <ProductSection id="mas-vendidos" title="Lo más vendido" subtitle="Lo que más compran nuestros clientes" products={bestSellers} exchangeRateVES={rate} lowStockThreshold={lowStock} />

        <DigitalStrip />

        <ProductSection id="recien-llegados" title="Recién llegados" href="/productos" products={newArrivals} exchangeRateVES={rate} lowStockThreshold={lowStock} tone="surface" />

        {topCategories.map(({ category, products }, index) => (
          <ProductSection
            key={category.id}
            id={`categoria-${category.slug}`}
            title={category.name}
            href={`/categorias/${category.slug}`}
            products={products}
            exchangeRateVES={rate}
            lowStockThreshold={lowStock}
            tone={index % 2 === 0 ? 'white' : 'surface'}
          />
        ))}

        <TrustBar whatsapp={settings.whatsapp} paymentMethods={paymentMethods} />

        <MoreFromElectroShop />

        {settings.heroVideoEnabled && settings.heroVideoUrl && (
          <section aria-labelledby="videos-title" className="bg-surface py-6 lg:py-8">
            <Container>
              <SectionHeader id="videos-title" title={settings.heroVideoTitle || 'Reviews y novedades'} subtitle={settings.heroVideoDescription || undefined} />
              <div className="mx-auto max-w-4xl">
                <VideoPlayer videoUrl={settings.heroVideoUrl} />
              </div>
            </Container>
          </section>
        )}
      </main>

      <Footer />

      {hotAd && <HotAdOverlay hotAd={hotAd} />}
    </div>
  );
}
