import Link from 'next/link';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import Container from '@/components/ui/Container';
import ProductCard from '@/components/ui/ProductCard';
import ProductShelf from '@/components/ui/ProductShelf';
import type { ProductCardData } from '@/components/ui/productCardData';
import type { Departamento } from '@/lib/queries/home';
import { MIN_SECTION_PRODUCTS } from './ProductSection';

interface VitrinaDepartamentoProps {
  departamento: Departamento;
  products: ProductCardData[];
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

/**
 * C-200: la vitrina de un departamento aparte (Ferretería) en el inicio, que sigue siendo de tecnología. Es la V1 que
 * eligió Andrés:
 * - la cabecera, con el aviso del envío (la descripción que escribe el equipo en Categorías);
 * - los chips de sus subcategorías;
 * - sus productos, que se compran desde ahí con las tarjetas de siempre.
 */
export default function VitrinaDepartamento({ departamento, products, exchangeRateVES, lowStockThreshold }: VitrinaDepartamentoProps) {
  if (products.length < MIN_SECTION_PRODUCTS) return null;
  const id = `departamento-${departamento.slug}`;
  const href = `/categorias/${departamento.slug}`;

  return (
    <section aria-labelledby={id} className="bg-white py-6 lg:py-8">
      <Container>
        <div className="rounded-2xl border border-line bg-surface p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-start gap-3">
              <span className="iconos-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-brand-950">
                <CategoryIconRenderer iconName={departamento.icon} className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 id={id} className="text-xl font-bold text-ink lg:text-2xl">{departamento.name}</h2>
                {departamento.description && <p className="mt-1 text-sm text-ink-soft">{departamento.description}</p>}
              </div>
            </div>
            <Link href={href} className="shrink-0 whitespace-nowrap text-sm font-semibold text-brand-500 hover:text-brand-600">
              Ver {departamento.name.toLocaleLowerCase('es')} <span aria-hidden="true">→</span>
            </Link>
          </div>

          {departamento.hijos.length > 1 && (
            <nav aria-label={`Categorías de ${departamento.name}`} className="mb-4">
              <ul className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                {departamento.hijos.map((hijo) => (
                  <li key={hijo.id} className="shrink-0">
                    <Link
                      href={`/categorias/${hijo.slug}`}
                      className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3.5 text-sm font-medium text-ink-soft hover:border-brand-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
                    >
                      <CategoryIconRenderer iconName={hijo.icon} className="h-4 w-4 text-brand-950" />
                      {hijo.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <ProductShelf label={departamento.name}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} exchangeRateVES={exchangeRateVES} lowStockThreshold={lowStockThreshold} />
            ))}
          </ProductShelf>
        </div>
      </Container>
    </section>
  );
}
