import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Footer from '@/components/Footer';
import CategoryChips from '@/components/home/CategoryChips';
import CategoryRail from '@/components/home/CategoryRail';
import DigitalStrip from '@/components/home/DigitalStrip';
import FeaturedShowcase from '@/components/home/FeaturedShowcase';
import { estrellaDelDia } from '@/lib/destacados';
import MoreFromElectroShop from '@/components/home/MoreFromElectroShop';
import ProductSection from '@/components/home/ProductSection';
import TrustBar from '@/components/home/TrustBar';
import VitrinaDepartamento from '@/components/home/VitrinaDepartamento';
import VideoPlayer from '@/components/home/VideoPlayer';
import SaludoNavidad from '@/components/navidad/SaludoNavidad';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import SectionHeader from '@/components/ui/SectionHeader';
import { crearReparto, porDiaYDestacado, variados } from '@/lib/inicio/reparto';
import { diaEnCaracas } from '@/lib/navidad';
import {
  getActivePaymentMethodKinds,
  getBestSellers,
  getCategoriesRail,
  getCodigosDigitales,
  getCompraPorCategoria,
  getDeals,
  getFeatured,
  getHomeSettings,
  getDepartamentos,
  getRecienLlegados,
  getTopCategoriesWithProducts,
  getVitrinaDepartamento,
} from '@/lib/queries/home';
import { getHotAd, getSaludoNavidad } from '@/lib/queries/hot-ad';
import { safeHotAdLink } from '@/lib/hot-ad';
import { getPublicSettings } from '@/lib/site-settings';
import JsonLd from '@/components/seo/JsonLd';
import { storeJsonLd, websiteJsonLd } from '@/lib/seo';

const HotAdOverlay = dynamic(() => import('@/components/HotAdOverlay'));

export const revalidate = 60;

// Los enlaces de promotores (?ref=) y de las historias (?es=) son la misma portada
export const metadata: Metadata = { alternates: { canonical: '/' } };

// C-207: lo que muestra cada estante del inicio, y cuántos de un mismo departamento o categoría van en "Recién llegados"
// (C-210: 4, lo que eligió Andrés el 13/11)
const POR_ESTANTE = 12;
const NUEVOS_POR_GRUPO = 4;
const ESTANTES_DE_CATEGORIA = 3;

/**
 * Home "vitrina" (PLAN.md §3): lo primero son productos con precio y botón, no un mensaje.
 * Todo se renderiza en el servidor; solo carrito, compartir y buscador son cliente.
 */
export default async function Home() {
  const [settings, homeSettings, featured, deals, bestSellers, recientes, codigos, topCategories, paymentMethods, hotAd, saludo] = await Promise.all([
    getPublicSettings(),
    getHomeSettings(),
    getFeatured(),
    getDeals(24),
    getBestSellers(90, 24),
    getRecienLlegados(48),
    getCodigosDigitales(POR_ESTANTE),
    getTopCategoriesWithProducts(6, 16),
    getActivePaymentMethodKinds(),
    getHotAd(),
    getSaludoNavidad(),
  ]);
  // C-200: cada departamento aparte (Ferretería) tiene una sola vitrina, después de "Recién llegados"
  const [railCategories, compraPorCategoria, departamentos] = await Promise.all([
    homeSettings.showCategories ? getCategoriesRail(homeSettings.maxCategoriesDisplay) : [],
    homeSettings.showCategories ? getCompraPorCategoria(homeSettings.maxCategoriesDisplay) : { casillas: [], mas: null },
    getDepartamentos(),
  ]);
  const vitrinas = await Promise.all(departamentos.map(async (departamento) => ({ departamento, products: await getVitrinaDepartamento(departamento.id, 24) })));

  // C-207: cada producto sale una sola vez, en la primera sección que le toca, en el orden de la página; una sección con
  // menos de 4 no sale y lo suyo queda para las de abajo (lib/inicio/reparto.ts)
  const reparto = crearReparto();

  // La vitrina: solo lo que tiene la estrella, de toda la tienda (C-210, Andrés 13/11: "los he desactivado todos y siguen
  // apareciendo los mismos": antes se completaba con ofertas y lo nuevo). Sin ninguno, la sección no sale.
  // C-172: la estrella cambia cada día siguiendo el orden de los destacados (la página se regenera cada minuto)
  const showcase = estrellaDelDia(reparto.tomar(featured, featured.length, 1));
  const ofertas = reparto.tomar(deals, POR_ESTANTE);
  const masVendidos = reparto.tomar(bestSellers, POR_ESTANTE);
  // Las gift cards y recargas, en su sección y en ninguna otra
  const codigosDigitales = reparto.tomar(codigos, POR_ESTANTE);
  const categoriasDigitales = [...new Set(codigosDigitales.map((product) => product.category.slug))];
  const hrefDigitales = categoriasDigitales.length === 1 ? `/categorias/${categoriasDigitales[0]}` : '/productos?tipo=digital';
  // "Recién llegados": lo último de toda la tienda (Andrés, 13/11), por día y con los destacados del día primero, y pocos de
  // cada departamento o categoría: una carga de 70 productos de un proveedor no llena la sección
  const departamentoDe = new Map(departamentos.flatMap((departamento) => departamento.ids.map((id) => [id, departamento.id] as const)));
  const nuevos = porDiaYDestacado(
    recientes.filter((product) => !reparto.mostrado(product.id)),
    (product) => product.publishedAt ?? product.createdAt,
    (momento) => diaEnCaracas(new Date(momento))
  );
  const recienLlegados = reparto.tomar(variados(nuevos, (product) => departamentoDe.get(product.category.id) ?? product.category.id, NUEVOS_POR_GRUPO), POR_ESTANTE);
  const vitrinasConProductos = vitrinas
    .map(({ departamento, products }) => ({ departamento, products: reparto.tomar(products, POR_ESTANTE) }))
    .filter(({ products }) => products.length > 0);
  // Los estantes de categoría, con lo que no salió arriba: los primeros tres que tengan con qué
  const estantes: typeof topCategories = [];
  for (const { category, products } of topCategories) {
    if (estantes.length === ESTANTES_DE_CATEGORIA) break;
    const elegidos = reparto.tomar(products, POR_ESTANTE);
    if (elegidos.length > 0) estantes.push({ category, products: elegidos });
  }
  const rate = settings.exchangeRateVES;
  const lowStock = homeSettings.lowStockThreshold;

  return (
    <div className="min-h-dvh bg-white">
      <PublicHeader />
      {/* Datos estructurados (C-149): la tienda como negocio (nombre, RIF, dirección, horario) y el buscador del sitio */}
      <JsonLd data={storeJsonLd(settings)} />
      <JsonLd data={websiteJsonLd(settings)} />

      <main>
        <h1 className="sr-only">{settings.companyName}: tecnología, gaming y gift cards con envíos a toda Venezuela</h1>

        <CategoryChips categories={railCategories} />

        {showcase.length > 0 ? (
          <FeaturedShowcase products={showcase} exchangeRateVES={rate} lowStockThreshold={lowStock} />
        ) : recientes.length > 0 ? null : (
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

        {/* C-207: el saludo navideño, en una franja dentro de la página y después de los destacados: ya no tapa la tienda */}
        {saludo && (
          <section aria-label={saludo.titulo} className="bg-white pt-6 lg:pt-8">
            <Container>
              <SaludoNavidad titulo={saludo.titulo} mensaje={saludo.mensaje} boton={saludo.boton} enlace={safeHotAdLink(saludo.enlace)} gorro={saludo.gorro} />
            </Container>
          </section>
        )}

        <CategoryRail casillas={compraPorCategoria.casillas} mas={compraPorCategoria.mas} />

        <ProductSection id="ofertas" title="Ofertas" subtitle="Precios rebajados por tiempo limitado" href="/productos?oferta=1" products={ofertas} exchangeRateVES={rate} lowStockThreshold={lowStock} tone="surface" />

        <ProductSection id="mas-vendidos" title="Lo más vendido" subtitle="Lo que más compran nuestros clientes" products={masVendidos} exchangeRateVES={rate} lowStockThreshold={lowStock} />

        <DigitalStrip products={codigosDigitales} href={hrefDigitales} exchangeRateVES={rate} lowStockThreshold={lowStock} />

        <ProductSection id="recien-llegados" title="Recién llegados" subtitle="Lo último que llegó a la tienda" href="/productos" products={recienLlegados} exchangeRateVES={rate} lowStockThreshold={lowStock} tone="surface" />

        {vitrinasConProductos.map(({ departamento, products }) => (
          <VitrinaDepartamento key={departamento.id} departamento={departamento} products={products} exchangeRateVES={rate} lowStockThreshold={lowStock} />
        ))}

        {estantes.map(({ category, products }, index) => (
          <ProductSection
            key={category.id}
            id={`categoria-${category.slug}`}
            title={category.name}
            href={`/categorias/${category.slug}`}
            products={products}
            exchangeRateVES={rate}
            lowStockThreshold={lowStock}
            tone={(index + (vitrinasConProductos.length % 2)) % 2 === 0 ? 'white' : 'surface'}
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
