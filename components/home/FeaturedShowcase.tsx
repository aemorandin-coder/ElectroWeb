import Container from '@/components/ui/Container';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import SectionHeader from '@/components/ui/SectionHeader';
import type { ProductCardData } from '@/components/ui/productCardData';
import DestacadosRotativos from './DestacadosRotativos';
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
 * C-162: la estrella ocupa 8 de 12 columnas y la fila, 4 (dos tarjetas a la vista). Así la foto de la estrella,
 * que es cuadrada y mide la mitad de su tarjeta, queda del alto de la fila: antes (6 y 6) medía 330 px en una
 * tarjeta de 405 y dejaba una franja blanca arriba.
 * C-172: `products` llega ya girado por día (la estrella del día, `lib/destacados.ts`) y en xl la estrella rota.
 */
export default function FeaturedShowcase({ products, exchangeRateVES, lowStockThreshold }: FeaturedShowcaseProps) {
  if (products.length === 0) return null;

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

        {/* C-172: la estrella rota con el siguiente de la columna (una vuelta y se detiene). Las tarjetas se arman aquí,
            en el servidor, y el componente cliente solo decide cuál se ve */}
        <DestacadosRotativos
          nombres={products.map((product) => product.name)}
          estrellas={products.map((product, index) => (
            <FeaturedHeroCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} priority={index === 0} />
          ))}
          tarjetas={products.map((product) => (
            <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
          ))}
        />
      </Container>
    </section>
  );
}
