import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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
import BanderaSorteo from '@/components/sorteo/BanderaSorteo';
import TemaLanzamiento from '@/components/lanzamiento/TemaLanzamiento';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import SectionHeader from '@/components/ui/SectionHeader';
import { crearReparto, MIN_SECCION, porDiaYDestacado } from '@/lib/inicio/reparto';
import { diaEnCaracas } from '@/lib/navidad';
import type { SeccionPortadaId } from '@/lib/portada';
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
  getTemaLanzamiento,
  getTopCategoriesWithProducts,
  getVitrinaDepartamento,
  getRubros,
  rubrosEnPalabras,
} from '@/lib/queries/home';
import { getHotAd, getSaludoNavidad } from '@/lib/queries/hot-ad';
import { safeHotAdLink } from '@/lib/hot-ad';
import { getPublicSettings } from '@/lib/site-settings';
import { getSorteoVigente } from '@/lib/sorteo/servidor';
import { banderaPublica } from '@/lib/dto/sorteo';
import JsonLd from '@/components/seo/JsonLd';
import { storeJsonLd, websiteJsonLd } from '@/lib/seo';

const HotAdOverlay = dynamic(() => import('@/components/HotAdOverlay'));

export const revalidate = 60;

// Los enlaces de promotores (?ref=) y de las historias (?es=) son la misma portada
export const metadata: Metadata = { alternates: { canonical: '/' } };

// G-75: cantidad de productos que muestra cada estante del inicio
const POR_ESTANTE = 12;

/**
 * Home "vitrina" (PLAN.md §3): lo primero son productos con precio y botón, no un mensaje.
 * Todo se renderiza en el servidor; solo carrito, compartir y buscador son cliente.
 */
export default async function Home() {
  const [settings, homeSettings, featured, deals, bestSellers, recientes, codigos, topCategories, paymentMethods, hotAd, saludo, temaLanzamiento] = await Promise.all([
    getPublicSettings(),
    getHomeSettings(),
    getFeatured(),
    getDeals(24),
    getBestSellers(90, 24),
    getRecienLlegados(120),
    getCodigosDigitales(POR_ESTANTE),
    getTopCategoriesWithProducts(12, 16),
    getActivePaymentMethodKinds(),
    getHotAd(),
    getSaludoNavidad(),
    getTemaLanzamiento(),
  ]);
  // C-253: la bandera del sorteo (la página se regenera cada minuto: cambia de etapa sola). C-254: también cerrado, con la
  // fecha del resultado, y la semana del ganador (lib/sorteo/entrega.ts); lo que sale, por lib/dto/sorteo.ts
  const sorteo = await getSorteoVigente();
  const bandera = sorteo ? banderaPublica(sorteo) : null;
  // C-200: cada departamento aparte (Ferretería) tiene una sola vitrina, después de "Recién llegados"
  // C-225: lo que vende la tienda, para el título oculto del inicio
  const rubros = await getRubros();
  const [railCategories, compraPorCategoria, departamentos] = await Promise.all([
    homeSettings.showCategories ? getCategoriesRail(homeSettings.maxCategoriesDisplay) : [],
    homeSettings.showCategories ? getCompraPorCategoria(homeSettings.maxCategoriesDisplay) : { casillas: [], mas: null },
    getDepartamentos(),
  ]);
  const vitrinas = await Promise.all(departamentos.map(async (departamento) => ({ departamento, products: await getVitrinaDepartamento(departamento.id, 24) })));

  // C-207: cada producto sale una sola vez, en la primera sección que le toca, en el orden de la página (G-74: configurable)
  const reparto = crearReparto();
  const rate = settings.exchangeRateVES;
  const lowStock = homeSettings.lowStockThreshold;
  const ocultas = new Set<SeccionPortadaId>(homeSettings.homeSectionsConfig.ocultas);
  const bannerHref = safeHotAdLink(homeSettings.homeBannerLink);

  let lanzamientoMarcado = false;
  const asegurarLanzamientoMarcado = () => {
    if (!lanzamientoMarcado && temaLanzamiento) {
      reparto.tomar(temaLanzamiento.productosFila, temaLanzamiento.productosFila.length, 0);
      lanzamientoMarcado = true;
    }
  };

  let featuredVisible = false;
  let greetingInserted = false;
  let shelfToneIndex = 0;
  const bloques: { id: string; node: ReactNode }[] = [];

  for (const seccion of homeSettings.homeSectionsConfig.orden) {
    if (ocultas.has(seccion)) {
      if (seccion === 'featured') asegurarLanzamientoMarcado();
      continue;
    }

    switch (seccion) {
      case 'featured': {
        const showcase = estrellaDelDia(reparto.tomar(featured, featured.length, 1));
        asegurarLanzamientoMarcado();
        if (showcase.length > 0) {
          featuredVisible = true;
          bloques.push({
            id: 'featured',
            node: <FeaturedShowcase key="sec-featured" products={showcase} exchangeRateVES={rate} lowStockThreshold={lowStock} rotar={homeSettings.homeRotateFeatured} />,
          });
          if (saludo && !greetingInserted) {
            greetingInserted = true;
            bloques.push({
              id: 'saludo',
              node: (
                <section key="sec-saludo" aria-label={saludo.titulo} className="bg-white pt-6 lg:pt-8">
                  <Container>
                    <SaludoNavidad titulo={saludo.titulo} mensaje={saludo.mensaje} boton={saludo.boton} enlace={safeHotAdLink(saludo.enlace)} gorro={saludo.gorro} />
                  </Container>
                </section>
              ),
            });
          }
        }
        break;
      }
      case 'categories': {
        if (homeSettings.showCategories) {
          bloques.push({
            id: 'categories',
            node: <CategoryRail key="sec-categories" casillas={compraPorCategoria.casillas} mas={compraPorCategoria.mas} />,
          });
        }
        break;
      }
      case 'deals': {
        asegurarLanzamientoMarcado();
        const ofertas = reparto.tomar(deals, POR_ESTANTE);
        if (ofertas.length > 0) {
          const tone = shelfToneIndex++ % 2 === 0 ? 'surface' : 'white';
          bloques.push({
            id: 'deals',
            node: <ProductSection key="sec-deals" id="ofertas" title="Ofertas" subtitle="Precios rebajados por tiempo limitado" href="/productos?oferta=1" products={ofertas} exchangeRateVES={rate} lowStockThreshold={lowStock} tone={tone} />,
          });
        }
        break;
      }
      case 'bestSellers': {
        asegurarLanzamientoMarcado();
        const masVendidos = reparto.tomar(bestSellers, POR_ESTANTE);
        if (masVendidos.length > 0) {
          const tone = shelfToneIndex++ % 2 === 0 ? 'surface' : 'white';
          bloques.push({
            id: 'bestSellers',
            node: <ProductSection key="sec-bestSellers" id="mas-vendidos" title="Lo más vendido" subtitle="Lo que más compran nuestros clientes" products={masVendidos} exchangeRateVES={rate} lowStockThreshold={lowStock} tone={tone} />,
          });
        }
        break;
      }
      case 'digital': {
        asegurarLanzamientoMarcado();
        const codigosDigitales = reparto.tomar(codigos, POR_ESTANTE);
        if (codigosDigitales.length > 0) {
          const categoriasDigitales = [...new Set(codigosDigitales.map((product) => product.category.slug))];
          const hrefDigitales = categoriasDigitales.length === 1 ? `/categorias/${categoriasDigitales[0]}` : '/productos?tipo=digital';
          bloques.push({
            id: 'digital',
            node: <DigitalStrip key="sec-digital" products={codigosDigitales} href={hrefDigitales} exchangeRateVES={rate} lowStockThreshold={lowStock} />,
          });
        }
        break;
      }
      case 'recent': {
        asegurarLanzamientoMarcado();
        // G-75: "Recién llegados" muestra lo último publicado de toda la tienda aunque ya salga en Destacados/Ofertas
        // o pertenezca a la misma categoría/departamento, sin duplicados internos y marcando sus IDs para las vitrinas inferiores.
        const nuevos = porDiaYDestacado(
          recientes,
          (product) => product.publishedAt ?? product.createdAt,
          (momento) => diaEnCaracas(new Date(momento))
        );
        const vistos = new Set<string>();
        const candidatos = nuevos.filter((product) => !vistos.has(product.id) && (vistos.add(product.id), true)).slice(0, POR_ESTANTE);
        const recienLlegados = candidatos.length >= MIN_SECCION ? candidatos : [];
        if (recienLlegados.length > 0) {
          reparto.marcar(recienLlegados.map((product) => product.id));
          const tone = shelfToneIndex++ % 2 === 0 ? 'surface' : 'white';
          bloques.push({
            id: 'recent',
            node: <ProductSection key="sec-recent" id="recien-llegados" title="Recién llegados" subtitle="Lo último que llegó a la tienda" href="/productos" products={recienLlegados} exchangeRateVES={rate} lowStockThreshold={lowStock} tone={tone} />,
          });
        }
        break;
      }
      case 'departments': {
        asegurarLanzamientoMarcado();
        const vitrinasConProductos = vitrinas
          .map(({ departamento, products }) => ({ departamento, products: reparto.tomar(products, POR_ESTANTE) }))
          .filter(({ products }) => products.length > 0);
        if (vitrinasConProductos.length > 0) {
          bloques.push({
            id: 'departments',
            node: (
              <div key="sec-departments">
                {vitrinasConProductos.map(({ departamento, products }) => (
                  <VitrinaDepartamento key={departamento.id} departamento={departamento} products={products} exchangeRateVES={rate} lowStockThreshold={lowStock} />
                ))}
              </div>
            ),
          });
        }
        break;
      }
      case 'shelves': {
        asegurarLanzamientoMarcado();
        const maxShelves = homeSettings.homeCategoryShelves;
        if (maxShelves > 0) {
          const estantes: typeof topCategories = [];
          for (const { category, products } of topCategories) {
            if (estantes.length === maxShelves) break;
            const elegidos = reparto.tomar(products, POR_ESTANTE);
            if (elegidos.length > 0) estantes.push({ category, products: elegidos });
          }
          if (estantes.length > 0) {
            bloques.push({
              id: 'shelves',
              node: (
                <div key="sec-shelves">
                  {estantes.map(({ category, products }) => {
                    const tone = shelfToneIndex++ % 2 === 0 ? 'surface' : 'white';
                    return (
                      <ProductSection
                        key={category.id}
                        id={`categoria-${category.slug}`}
                        title={category.name}
                        href={`/categorias/${category.slug}`}
                        products={products}
                        exchangeRateVES={rate}
                        lowStockThreshold={lowStock}
                        tone={tone}
                      />
                    );
                  })}
                </div>
              ),
            });
          }
        }
        break;
      }
      case 'trust': {
        bloques.push({
          id: 'trust',
          node: <TrustBar key="sec-trust" whatsapp={settings.whatsapp} paymentMethods={paymentMethods} pagoMovilVerificado={paymentMethods.includes('MOBILE_PAYMENT') && Boolean(process.env.BDV_API_KEY)} />,
        });
        break;
      }
      case 'more': {
        bloques.push({ id: 'more', node: <MoreFromElectroShop key="sec-more" /> });
        break;
      }
    }
  }

  if (saludo && !greetingInserted) {
    bloques.unshift({
      id: 'saludo',
      node: (
        <section key="sec-saludo" aria-label={saludo.titulo} className="bg-white pt-6 lg:pt-8">
          <Container>
            <SaludoNavidad titulo={saludo.titulo} mensaje={saludo.mensaje} boton={saludo.boton} enlace={safeHotAdLink(saludo.enlace)} gorro={saludo.gorro} />
          </Container>
        </section>
      ),
    });
  }

  const videoNode = settings.heroVideoEnabled && settings.heroVideoUrl ? (
    <section key="sec-video" aria-labelledby="videos-title" className="bg-surface py-6 lg:py-8">
      <Container>
        <SectionHeader id="videos-title" title={settings.heroVideoTitle || 'Reviews y novedades'} subtitle={settings.heroVideoDescription || undefined} />
        <div className="mx-auto max-w-4xl">
          <VideoPlayer videoUrl={settings.heroVideoUrl} />
        </div>
      </Container>
    </section>
  ) : null;

  const seccionesFinales = [...bloques];
  if (videoNode) {
    if (homeSettings.homeVideoPosition === 'after-featured') {
      const idx = seccionesFinales.findIndex((b) => b.id === 'featured');
      seccionesFinales.splice(idx >= 0 ? idx + 1 : 0, 0, { id: 'video', node: videoNode });
    } else if (homeSettings.homeVideoPosition === 'middle') {
      seccionesFinales.splice(Math.ceil(seccionesFinales.length / 2), 0, { id: 'video', node: videoNode });
    } else {
      seccionesFinales.push({ id: 'video', node: videoNode });
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      {homeSettings.homeBannerEnabled && homeSettings.homeBannerText && (
        <div className="bg-brand-700 px-3 py-2 text-center text-xs font-semibold text-white sm:text-sm">
          {bannerHref ? (
            <Link href={bannerHref} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <span>{homeSettings.homeBannerText}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span>{homeSettings.homeBannerText}</span>
          )}
        </div>
      )}

      <PublicHeader />
      {/* Datos estructurados (C-149): la tienda como negocio (nombre, RIF, dirección, horario) y el buscador del sitio */}
      <JsonLd data={storeJsonLd(settings)} />
      <JsonLd data={websiteJsonLd(settings)} />

      <main>
        <h1 className="sr-only">{settings.companyName}: {rubrosEnPalabras(rubros)} con envíos a toda Venezuela</h1>

        <CategoryChips categories={railCategories} lanzamiento={settings.lanzamientoPildora} />

        {temaLanzamiento && (
          <TemaLanzamiento tema={temaLanzamiento} exchangeRateVES={rate} lowStockThreshold={lowStock} />
        )}

        {!featuredVisible && recientes.length === 0 ? (
          <section className="bg-surface py-12">
            <Container className="text-center">
              <p className="text-lg font-semibold text-ink">Estamos preparando el catálogo</p>
              <p className="mt-1 text-sm text-muted">Mientras tanto, explora todo lo que tenemos.</p>
              <Link href="/productos" className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
                Ver productos
              </Link>
            </Container>
          </section>
        ) : null}

        {seccionesFinales.map((s) => s.node)}
      </main>

      <Footer />

      {bandera && <BanderaSorteo bandera={bandera} />}
      {hotAd && <HotAdOverlay hotAd={hotAd} />}
    </div>
  );
}
