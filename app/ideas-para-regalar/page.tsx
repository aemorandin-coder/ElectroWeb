import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { IconoFlechaDerecha, IconoGiftCard, IconoRegalo } from '@/components/iconos';
import Footer from '@/components/Footer';
import FechaLimiteNavidad from '@/components/navidad/FechaLimiteNavidad';
import SelloNavidad from '@/components/navidad/SelloNavidad';
import PublicHeader from '@/components/public/PublicHeader';
import JsonLd from '@/components/seo/JsonLd';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import ProductCard from '@/components/ui/ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { compartirPagina } from '@/lib/og/datos';
import { getHomeSettings } from '@/lib/queries/home';
import { catalogoDelTramo, getIdeasParaRegalar, POR_TRAMO, TRAMOS } from '@/lib/queries/regalos';
import { breadcrumbJsonLd } from '@/lib/seo';
import { getPublicSettings } from '@/lib/site-settings';

// C-190: la página de regalos por presupuesto. Existe todo el año; con el tema navideño (Marketing → Navidad) lleva el
// adorno de la temporada: el sello con el gorro, los lazos en rojo y la fecha límite para que llegue antes del 24.
// El botón "Ver ideas para regalar" de la tarjeta navideña lleva aquí.

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Ideas para regalar',
    description: 'Ideas para regalar en Electro Shop, por presupuesto: hasta $20, de $20 a $50 y más de $50. Precios en dólares y bolívares.',
    alternates: { canonical: '/ideas-para-regalar' },
    ...(await compartirPagina('ideas-para-regalar', '/ideas-para-regalar')),
  };
}

// El lazo del regalo, con el acento de la marca (azul) o, con el tema, el rojo navideño. El trazo sigue azul marino
const LAZO_MARCA = { '--es-acento': 'var(--color-brand-500)', '--es-acento-opacidad': 1 } as CSSProperties;
const LAZO_NAVIDAD = { '--es-acento': 'var(--color-navidad)', '--es-acento-opacidad': 1 } as CSSProperties;
/** Un regalo más grande por cada tramo de TRAMOS: se entiende el presupuesto antes de leerlo */
const TAMANO_REGALO = ['h-6 w-6', 'h-8 w-8', 'h-10 w-10'];
/** Las columnas de los botones de presupuesto: los tramos vacíos no salen */
const COLUMNAS = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'];

const ideas = (n: number) => `${n} ${n === 1 ? 'idea' : 'ideas'}`;

export default async function IdeasParaRegalarPage() {
  const [settings, homeSettings, tramos] = await Promise.all([getPublicSettings(), getHomeSettings(), getIdeasParaRegalar()]);
  const navidad = settings.gorroNavidad;
  const lazo = navidad ? LAZO_NAVIDAD : LAZO_MARCA;

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Inicio', path: '/' }, { name: 'Ideas para regalar', path: '/ideas-para-regalar' }])} />

      <main>
        <PageHeader
          breadcrumbs={[{ label: 'Ideas para regalar' }]}
          icon={<IconoRegalo />}
          eyebrow={navidad ? 'Navidad' : 'Regalos'}
          title="Ideas para regalar"
          description="Regalos que caben en tu presupuesto. Precios en dólares y bolívares."
          // El sello con el gorro solo en la computadora: en el teléfono, la primera pantalla es para los presupuestos
          actions={navidad ? <SelloNavidad gorro={navidad} animado={false} className="-my-4 h-32 w-32" /> : undefined}
          actionsClassName="hidden lg:flex"
        />

        <Container className="pb-10 pt-4 lg:pt-8">
          {tramos.length > 0 ? (
            <>
              <nav aria-label="Elige tu presupuesto">
                <ul className={`grid gap-2 lg:gap-4 ${COLUMNAS[tramos.length - 1] ?? COLUMNAS[2]}`}>
                  {tramos.map(({ tramo, total }) => (
                    <li key={tramo.id}>
                      <a
                        href={`#${tramo.id}`}
                        className="flex h-full flex-col rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 lg:flex-row lg:items-center lg:gap-4 lg:p-5"
                      >
                        <span className="flex h-10 items-end text-brand-900 lg:order-2 lg:ml-auto lg:h-auto" style={lazo}>
                          <IconoRegalo className={TAMANO_REGALO[TRAMOS.findIndex((t) => t.id === tramo.id)] ?? TAMANO_REGALO[2]} aria-hidden="true" />
                        </span>
                        <span className="mt-2 block min-w-0 lg:order-1 lg:mt-0">
                          <span className="block text-xs font-medium text-muted lg:text-sm">{tramo.rotulo}</span>
                          <span className="block text-2xl font-bold leading-tight text-brand-700 lg:text-3xl">{tramo.monto}</span>
                          <span className="mt-0.5 block text-xs text-ink-soft lg:text-sm">{ideas(total)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <FechaLimiteNavidad nota="Las gift cards y recargas digitales no dependen del envío." className="mt-4 lg:mt-6" />

              {tramos.map(({ tramo, productos, total }, i) => (
                <section key={tramo.id} id={tramo.id} aria-labelledby={`${tramo.id}-titulo`} className="mt-8 scroll-mt-28 lg:mt-12">
                  <SectionHeader
                    id={`${tramo.id}-titulo`}
                    title={tramo.titulo}
                    subtitle={total > productos.length ? `${productos.length} de ${ideas(total)}` : ideas(total)}
                    href={total > POR_TRAMO ? catalogoDelTramo(tramo) : undefined}
                    linkLabel="Ver todas"
                  />
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4">
                    {productos.map((producto, j) => (
                      <li key={producto.id}>
                        <ProductCard product={producto} exchangeRateVES={settings.exchangeRateVES} lowStockThreshold={homeSettings.lowStockThreshold} priority={i === 0 && j < 4} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          ) : (
            <div className="rounded-xl border border-line bg-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <IconoRegalo className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink">Pronto tendremos ideas para regalar</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">Mientras tanto, mira todo el catálogo.</p>
              <Link href="/productos" className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
                Ver productos
              </Link>
            </div>
          )}

          <section aria-labelledby="gift-card-titulo" className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white sm:flex-row sm:items-center lg:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden="true">
                <IconoGiftCard className="h-6 w-6" />
              </span>
              <div>
                <h2 id="gift-card-titulo" className="text-lg font-bold lg:text-xl">¿No sabes cuál elegir?</h2>
                <p className="mt-1 text-sm text-white/90">Regala una gift card de Electro Shop: eliges el diseño y el monto, y llega al correo de quien la recibe.</p>
              </div>
            </div>
            <Link href="/gift-cards" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Ver gift cards
              <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
