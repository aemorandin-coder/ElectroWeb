import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import CatalogFilters from '@/components/catalog/CatalogFilters';
import CatalogPagination from '@/components/catalog/CatalogPagination';
import FiltersDrawer from '@/components/catalog/FiltersDrawer';
import SortSelect from '@/components/catalog/SortSelect';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import ProductCard from '@/components/ui/ProductCard';
import { formatUSD } from '@/lib/currency';
import { prisma } from '@/lib/prisma';
import {
  CATALOG_PAGE_SIZE,
  catalogHref,
  getCatalog,
  hasActiveFilters,
  parseCatalogParams,
  SORT_OPTIONS,
  type CatalogParams,
} from '@/lib/queries/catalog';
import { getAutoIcon } from '@/lib/category-icons';
import { getHomeSettings } from '@/lib/queries/home';
import { getPublicSettings } from '@/lib/site-settings';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = parseCatalogParams(await searchParams);
  const [settings, category] = await Promise.all([
    prisma.companySettings.findFirst({
      select: { productsMetaTitle: true, productsMetaDescription: true, productsMetaKeywords: true, productsMetaImage: true, logo: true },
    }),
    params.category ? prisma.category.findUnique({ where: { slug: params.category }, select: { name: true } }) : null,
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';
  const description = settings?.productsMetaDescription || 'Tecnología, gaming, gift cards y saldo digital con envíos a toda Venezuela. Precios en dólares y bolívares.';
  const shareImage = settings?.productsMetaImage || settings?.logo || null;
  const absoluteShareImage = shareImage && (shareImage.startsWith('http') ? shareImage : `${baseUrl}${shareImage.startsWith('/') ? '' : '/'}${shareImage}`);

  // El layout agrega " | Empresa": el título propio del admin se usa tal cual para no repetirla
  const title: Metadata['title'] = params.search
    ? `Resultados para "${params.search}"`
    : category
      ? category.name
      : settings?.productsMetaTitle
        ? { absolute: settings.productsMetaTitle }
        : 'Productos';

  // Búsquedas, filtros y páginas siguientes no se indexan; la categoría sí
  const onlyCategory = !params.search && params.min === null && params.max === null && !params.offers && !params.inStock && !params.type && params.page === 1 && params.sort === 'recientes';

  return {
    title,
    description,
    keywords: settings?.productsMetaKeywords ? settings.productsMetaKeywords.split(',').map((k) => k.trim()) : undefined,
    alternates: { canonical: category ? `/productos?category=${params.category}` : '/productos' },
    robots: onlyCategory ? undefined : { index: false, follow: true },
    openGraph: { description, images: absoluteShareImage ? [{ url: absoluteShareImage }] : undefined, type: 'website' },
  };
}

/** Filtros aplicados como chips con enlace para quitar cada uno. */
function activeChips(params: CatalogParams, categoryName: string | null): Array<{ label: string; href: string }> {
  const chips: Array<{ label: string; href: string }> = [];
  if (params.search) chips.push({ label: `"${params.search}"`, href: catalogHref(params, { search: '' }) });
  if (params.category) chips.push({ label: categoryName ?? params.category, href: catalogHref(params, { category: null }) });
  if (params.min !== null) chips.push({ label: `Desde ${formatUSD(params.min)}`, href: catalogHref(params, { min: null }) });
  if (params.max !== null) chips.push({ label: `Hasta ${formatUSD(params.max)}`, href: catalogHref(params, { max: null }) });
  if (params.offers) chips.push({ label: 'Ofertas', href: catalogHref(params, { offers: false }) });
  if (params.inStock) chips.push({ label: 'Disponibles', href: catalogHref(params, { inStock: false }) });
  if (params.type) chips.push({ label: params.type === 'digital' ? 'Digitales' : 'Físicos', href: catalogHref(params, { type: null }) });
  return chips;
}

/**
 * Catálogo (C-30). Todo sale del servidor según la URL: búsqueda (`search`, la usa el buscador del header),
 * `category`, `min`/`max`, `oferta`, `disponible`, `tipo`, `sort` y `page`.
 * Lo primero que se ve en el teléfono son productos, no un mensaje.
 */
export default async function ProductosPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = parseCatalogParams(raw);
  // El formulario de filtros envía también los campos vacíos (max=&tipo=): se redirige a la URL limpia
  if (Object.values(raw).some((value) => value === '' || (Array.isArray(value) && value.includes('')))) {
    redirect(catalogHref(params, { page: params.page }));
  }
  const [settings, homeSettings, catalog] = await Promise.all([getPublicSettings(), getHomeSettings(), getCatalog(params)]);
  const { products, total, page, totalPages, categories, currentCategory } = catalog;
  const current = { ...params, page };

  const heading = params.search ? `Resultados para "${params.search}"` : currentCategory?.name ?? 'Productos';
  const chips = activeChips(current, currentCategory?.name ?? null);
  const filterCount = chips.filter((chip) => !chip.label.startsWith('"')).length;
  const sortOptions = SORT_OPTIONS.map((option) => ({ ...option, href: catalogHref(current, { sort: option.value }) }));
  const rangeStart = total === 0 ? 0 : (page - 1) * CATALOG_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * CATALOG_PAGE_SIZE, total);

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />

      <main>
        <PageHeader
          breadcrumbs={[
            { label: 'Productos', href: currentCategory || params.search ? '/productos' : undefined },
            ...(currentCategory ? [{ label: currentCategory.name }] : []),
          ]}
          icon={
            currentCategory ? <CategoryIconRenderer iconName={currentCategory.icon || getAutoIcon(currentCategory.name)} />
              : params.search ? <FiSearch /> : <FiShoppingBag />
          }
          eyebrow={params.search ? 'Búsqueda' : currentCategory ? 'Categoría' : 'Catálogo'}
          title={heading}
          description={
            params.search ? undefined
              : currentCategory ? currentCategory.description || `Todo lo que tenemos en ${currentCategory.name}, con precios en dólares y bolívares.`
                : 'Tecnología, gaming y gift cards con envíos a toda Venezuela. Precios en dólares y bolívares.'
          }
          meta={
            <p className="text-sm text-muted" aria-live="polite">
              {total === 0 ? 'Sin resultados' : totalPages > 1 ? `${rangeStart}–${rangeEnd} de ${total} productos` : `${total} ${total === 1 ? 'producto' : 'productos'}`}
            </p>
          }
          actions={
            <div className="hidden lg:block">
              <SortSelect id="sort-desktop" value={params.sort} options={sortOptions} />
            </div>
          }
        />
        <Container className="pb-10 pt-3 lg:pt-6">
          {/* Móvil: filtros y orden en una fila, categorías deslizables debajo */}
          <div className="mt-3 flex gap-2 lg:hidden">
            <FiltersDrawer activeCount={filterCount}>
              <CatalogFilters params={current} categories={categories} idPrefix="movil" />
            </FiltersDrawer>
            <SortSelect id="sort-mobile" value={params.sort} options={sortOptions} />
          </div>
          {categories.length > 1 && (
            <ul className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden" aria-label="Categorías">
              <li className="shrink-0">
                <Link
                  href={catalogHref(current, { category: null })}
                  aria-current={!params.category ? 'true' : undefined}
                  className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium ${!params.category ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-ink-soft'}`}
                >
                  Todas
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id} className="shrink-0">
                  <Link
                    href={catalogHref(current, { category: category.slug })}
                    aria-current={params.category === category.slug ? 'true' : undefined}
                    className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium ${params.category === category.slug ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-ink-soft'}`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {chips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Filtros aplicados">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Link
                    href={chip.href}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-50 pl-3 pr-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500"
                    aria-label={`Quitar filtro ${chip.label}`}
                  >
                    {chip.label}
                    <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
            <aside className="hidden lg:block" aria-label="Filtros">
              <div className="sticky top-28 rounded-xl border border-line bg-white p-4">
                <CatalogFilters params={current} categories={categories} idPrefix="escritorio" />
              </div>
            </aside>

            <section aria-label="Resultados">
              {products.length > 0 ? (
                <>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4">
                    {products.map((product, index) => (
                      <li key={product.id}>
                        <ProductCard product={product} exchangeRateVES={settings.exchangeRateVES} lowStockThreshold={homeSettings.lowStockThreshold} priority={index < 4} />
                      </li>
                    ))}
                  </ul>
                  <CatalogPagination params={current} page={page} totalPages={totalPages} />
                </>
              ) : (
                <div className="rounded-xl border border-line bg-white px-6 py-12 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <FiSearch className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-ink">No encontramos productos</h2>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                    {hasActiveFilters(params) ? 'Prueba quitando algún filtro o buscando con otras palabras.' : 'Pronto tendremos productos en esta sección.'}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {hasActiveFilters(params) && (
                      <Link href="/productos" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink-soft hover:bg-surface">
                        Ver todos los productos
                      </Link>
                    )}
                    <Link href="/solicitar-producto" className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
                      Solicitar un producto
                    </Link>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section aria-labelledby="solicitar-title" className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white sm:flex-row sm:items-center lg:p-6">
            <div>
              <h2 id="solicitar-title" className="text-lg font-bold lg:text-xl">¿No encuentras lo que buscas?</h2>
              <p className="mt-1 text-sm text-white/90">Dinos qué producto necesitas y te lo conseguimos al mejor precio.</p>
            </div>
            <Link href="/solicitar-producto" className="inline-flex h-11 shrink-0 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Solicitar un producto
            </Link>
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
