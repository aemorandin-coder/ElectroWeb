import Link from 'next/link';
import Container from '@/components/ui/Container';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import type { TemaLanzamientoHome } from '@/lib/queries/home';
import HeroInteractivoLanzamiento from './HeroInteractivoLanzamiento';

interface TemaLanzamientoProps {
  tema: TemaLanzamientoHome;
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

export default function TemaLanzamiento({ tema, exchangeRateVES, lowStockThreshold }: TemaLanzamientoProps) {
  const zonaClass = tema.paleta === 'vice' ? 'tema-vice-zona' : 'tema-brand-zona';

  return (
    <section id="lanzamiento" aria-labelledby="lanzamiento-title" className={`${zonaClass} py-4 lg:py-9`}>
      <Container className="relative z-10">
        <HeroInteractivoLanzamiento
          eyebrow={tema.eyebrow}
          titulo={tema.titulo}
          subtitulo={tema.subtitulo}
          logo={tema.logo}
          trailerYoutubeId={tema.trailerYoutubeId}
          principal={tema.principal}
          ediciones={tema.ediciones}
          exchangeRateVES={exchangeRateVES}
        />

        {tema.productosFila.length > 0 && (
          <div className="mt-7 lg:mt-9">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-bold text-white lg:text-xl">{tema.tituloFila}</h3>
              {tema.productosFila[0]?.category?.slug && (
                <Link
                  href={`/categorias/${tema.productosFila[0].category.slug}`}
                  className="tema-lanzamiento-eyebrow shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-90"
                >
                  Ver {tema.productosFila[0].category.name} →
                </Link>
              )}
            </div>

            <div className="lg:hidden">
              <ProductShelf label={tema.tituloFila}>
                {tema.productosFila.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    exchangeRateVES={exchangeRateVES}
                    lowStockThreshold={lowStockThreshold}
                    priority={index === 0}
                  />
                ))}
              </ProductShelf>
            </div>

            <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
              {tema.productosFila.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  exchangeRateVES={exchangeRateVES}
                  lowStockThreshold={lowStockThreshold}
                  priority={index < 2}
                />
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
