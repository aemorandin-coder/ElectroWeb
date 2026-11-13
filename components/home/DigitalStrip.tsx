import Link from 'next/link';
import Container from '@/components/ui/Container';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import type { ProductCardData } from '@/components/ui/productCardData';

interface DigitalStripProps {
  products: ProductCardData[];
  /** "Ver todas": su categoría, o el catálogo de lo digital */
  href: string;
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

/**
 * Gift cards y recargas de las plataformas (C-207): su única sección del inicio, cada plataforma con su monto y su botón.
 * Antes la franja tenía enlaces fijos a búsquedas (Google Play y Apple no traían nada) y las mismas tarjetas salían otra
 * vez en "Recién llegados" y en su estante. El inicio decide qué entra (lib/inicio/reparto.ts).
 */
export default function DigitalStrip({ products, href, exchangeRateVES, lowStockThreshold }: DigitalStripProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="digital-title" className="bg-white py-6 lg:py-8">
      <Container>
        {/* Mismos azules de la marca que la franja del header */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h2 id="digital-title" className="text-xl font-bold text-white lg:text-2xl">Gift cards y recargas digitales</h2>
              <p className="mt-1 text-sm text-white/80">Códigos para tus plataformas favoritas, con entrega digital</p>
            </div>
            <Link href={href} className="rounded-md text-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white">
              Ver todas <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ProductShelf label="Gift cards y recargas digitales">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
            ))}
          </ProductShelf>
        </div>
      </Container>
    </section>
  );
}
