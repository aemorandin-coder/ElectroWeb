import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Container from '@/components/ui/Container';
import Price from '@/components/ui/Price';
import ProductBadge from '@/components/ui/ProductBadge';
import ProductCard, { type ProductCardData } from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import SectionHeader from '@/components/ui/SectionHeader';

// Página interna de muestra de components/ui (C-12). Solo en desarrollo.
export const metadata: Metadata = { title: 'UI (interno)', robots: { index: false, follow: false } };

const RATE = 36.5;
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const SAMPLE: ProductCardData[] = [
  { id: 'd1', name: 'Laptop Lenovo IdeaPad 3 15" Ryzen 5 7520U 16GB RAM 512GB SSD', slug: 'laptop-lenovo', shortCode: 'LAP1', priceUSD: 1099, compareAtPriceUSD: 1299, stock: 12, images: [], category: { name: 'Laptops' }, brand: { name: 'Lenovo' }, createdAt: daysAgo(3), productType: 'PHYSICAL' },
  { id: 'd2', name: 'Control DualSense PS5', slug: 'dualsense', priceUSD: 69.99, stock: 2, images: [], category: { name: 'Consolas' }, brand: { name: 'Sony' }, createdAt: daysAgo(60), productType: 'PHYSICAL' },
  { id: 'd3', name: 'Gift Card Steam', slug: 'steam', priceUSD: 11, stock: 0, images: [], category: { name: 'Gift Cards' }, createdAt: daysAgo(90), productType: 'DIGITAL', specs: { digitalPricing: [{ amount: 10, salePrice: 11 }] } },
  { id: 'd4', name: 'Monitor Samsung 24" 75Hz', slug: 'monitor', priceUSD: 149, compareAtPriceUSD: 179, stock: 0, images: [], category: { name: 'Monitores' }, brand: { name: 'Samsung' }, createdAt: daysAgo(200), productType: 'PHYSICAL' },
  { id: 'd5', name: 'Audífonos HyperX Cloud II', slug: 'hyperx', priceUSD: 79, stock: 40, images: [], category: { name: 'Audio' }, brand: { name: 'HyperX' }, createdAt: daysAgo(10), productType: 'PHYSICAL' },
];

export default function UiDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="min-h-dvh bg-surface py-8">
      <Container className="space-y-10">
        <section>
          <SectionHeader title="Componentes base" subtitle="Página interna de C-12 (no existe en producción)" href="/productos" />
          <div className="flex flex-wrap items-start gap-6 rounded-xl border border-line bg-white p-4">
            <Price priceUSD={1099} compareAtPriceUSD={1299} exchangeRateVES={RATE} />
            <Price priceUSD={1099} size="lg" exchangeRateVES={RATE} />
            <div className="flex flex-wrap gap-2">
              <ProductBadge variant="deal">-15%</ProductBadge>
              <ProductBadge variant="new">NUEVO</ProductBadge>
              <ProductBadge variant="digital">⚡ DIGITAL</ProductBadge>
              <ProductBadge variant="soldout">AGOTADO</ProductBadge>
              <ProductBadge variant="tag">OFERTA DEL DÍA</ProductBadge>
            </div>
          </div>
        </section>

        <section aria-labelledby="demo-grid">
          <SectionHeader id="demo-grid" title="ProductCard en grilla" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {SAMPLE.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} exchangeRateVES={RATE} priority={i < 2} />)}
          </div>
        </section>

        <section aria-labelledby="demo-shelf">
          <SectionHeader id="demo-shelf" title="ProductShelf" href="/productos" />
          <ProductShelf label="Muestra">
            {SAMPLE.map((p) => <ProductCard key={p.id} product={p} exchangeRateVES={RATE} />)}
          </ProductShelf>
        </section>

        <section aria-labelledby="demo-featured">
          <SectionHeader id="demo-featured" title="ProductShelf destacado" />
          <ProductShelf label="Destacados" variant="featured">
            {SAMPLE.map((p) => <ProductCard key={p.id} product={p} exchangeRateVES={RATE} />)}
          </ProductShelf>
        </section>
      </Container>
    </main>
  );
}
