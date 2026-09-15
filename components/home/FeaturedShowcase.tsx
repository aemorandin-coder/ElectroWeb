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
 * Vitrina del home (reemplaza al hero de mensaje). Fondo azul suave para separarla del resto del home.
 * Hasta xl: fila deslizable (tarjeta a 78vw en móvil, 3 visibles en lg).
 * Desde xl: producto estrella + fila deslizable con el resto, todo a la altura de una tarjeta
 * para que quepa en la primera pantalla. En lg no hay estrella: a ese ancho su imagen quedaba pequeña.
 */
export default function FeaturedShowcase({ products, exchangeRateVES, lowStockThreshold }: FeaturedShowcaseProps) {
  if (products.length === 0) return null;
  const [star, ...rest] = products;

  return (
    <section aria-labelledby="vitrina-title" className="bg-brand-100 pb-6 pt-3 lg:py-8">
      <Container>
        {/* En móvil, "Destacados" en una línea: el título en dos líneas empujaba el botón de la primera tarjeta bajo la barra */}
        <SectionHeader
          id="vitrina-title"
          title={<>Destacados<span className="hidden sm:inline"> de la semana</span></>}
          href="/productos?sort=destacados"
        />

        <div className="xl:hidden">
          <ProductShelf label="Destacados de la semana" variant="featured">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} priority={index === 0} />
            ))}
          </ProductShelf>
        </div>

        <div className="hidden gap-4 xl:grid xl:grid-cols-12">
          {/* pb-2: iguala el espacio inferior que deja la fila deslizable */}
          <div className={`pb-2 ${rest.length > 0 ? 'col-span-6' : 'col-span-12'}`}>
            <FeaturedHeroCard product={star} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
          </div>
          {rest.length > 0 && (
            <div className="col-span-6 min-w-0">
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
