import Container from '@/components/ui/Container';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import SectionHeader from '@/components/ui/SectionHeader';
import type { ProductCardData } from '@/components/ui/productCardData';

// Una sección con menos productos que esto no se muestra (PLAN.md §3)
export const MIN_SECTION_PRODUCTS = 4;

interface ProductSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  products: ProductCardData[];
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
  tone?: 'white' | 'surface';
}

/** Estante horizontal de productos con título ("Ofertas", "Lo más vendido"…). */
export default function ProductSection({ id, title, subtitle, href, products, exchangeRateVES, lowStockThreshold, tone = 'white' }: ProductSectionProps) {
  if (products.length < MIN_SECTION_PRODUCTS) return null;

  return (
    <section aria-labelledby={id} className={`py-6 lg:py-8 ${tone === 'surface' ? 'bg-surface' : 'bg-white'}`}>
      <Container>
        <SectionHeader id={id} title={title} subtitle={subtitle} href={href} />
        <ProductShelf label={title}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
          ))}
        </ProductShelf>
      </Container>
    </section>
  );
}
