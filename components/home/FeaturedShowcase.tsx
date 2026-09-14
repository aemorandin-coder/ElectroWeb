import Container from '@/components/ui/Container';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import SectionHeader from '@/components/ui/SectionHeader';
import type { ProductCardData } from '@/components/ui/productCardData';
import FeaturedHeroCard from './FeaturedHeroCard';

interface FeaturedShowcaseProps {
  products: ProductCardData[];
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

/**
 * Vitrina del home (reemplaza al hero de mensaje).
 * Móvil: tarjetas a 78vw con scroll-snap. Desktop: producto estrella + fila deslizable con el resto
 * (2 tarjetas visibles en lg, 3 en xl), todo a la altura de una tarjeta para que quepa en la primera pantalla.
 */
export default function FeaturedShowcase({ products, exchangeRateVES, lowStockThreshold }: FeaturedShowcaseProps) {
  if (products.length === 0) return null;
  const [star, ...rest] = products;

  return (
    <section aria-labelledby="vitrina-title" className="bg-surface pb-6 pt-3 lg:py-8">
      <Container>
        <SectionHeader id="vitrina-title" title="Destacados de la semana" href="/productos" />

        <div className="lg:hidden">
          <ProductShelf label="Destacados de la semana" variant="featured">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} priority={index === 0} />
            ))}
          </ProductShelf>
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-12">
          {/* pb-2: iguala el espacio inferior que deja la fila deslizable */}
          <div className={`pb-2 ${rest.length > 0 ? 'col-span-5 xl:col-span-6' : 'col-span-12'}`}>
            <FeaturedHeroCard product={star} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
          </div>
          {rest.length > 0 && (
            <div className="col-span-7 min-w-0 xl:col-span-6">
              <ProductShelf label="Más destacados" variant="featured">
                {rest.map((product) => (
                  <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
                ))}
              </ProductShelf>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
