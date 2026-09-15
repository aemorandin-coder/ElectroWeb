'use client';

import { Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu } from 'react-icons/fi';
import CartIcon from '@/components/CartIcon';
import UserAccountButton from '@/components/UserAccountButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import Container from '@/components/ui/Container';
import { useNavCategories } from '@/contexts/CatalogNavContext';
import { useSettings } from '@/contexts/SettingsContext';
import { formatVES } from '@/lib/currency';
import HeaderDropdown from './header/HeaderDropdown';
import HeaderSearch, { SearchForm } from './header/HeaderSearch';
import { useHideOnScroll } from './header/useHideOnScroll';

// El panel de categorías (con sus íconos) solo se descarga al abrir el menú
const CategoriesMenuPanel = dynamic(() => import('./header/CategoriesMenuPanel'), {
  loading: () => <p className="p-4 text-sm text-muted">Cargando categorías…</p>,
});

/**
 * Header de la tienda (PLAN.md §2).
 * - Fila 1 (blanca): logo, buscador (desde lg) y notificaciones, carrito y cuenta.
 * - Móvil: buscador en una segunda fila que se esconde al bajar y reaparece al subir.
 * - Desde lg: franja brand-600 con Categorías (mega menú), accesos y tasa BCV.
 * Alturas: 56px + 40px en desktop (96px, igual que los `sticky top-24` existentes); 56px + 48px en móvil.
 */
function PublicHeader() {
  const { settings } = useSettings();
  const categories = useNavCategories();
  const pathname = usePathname();
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const hideMobileSearch = useHideOnScroll(mobileSearchRef);

  const companyName = settings?.companyName || 'Electro Shop';
  // En móvil el nombre legal completo empujaba los íconos fuera de la pantalla
  const shortName = companyName.split(/\s+/).slice(0, 2).join(' ');
  const exchangeRate = settings?.exchangeRateVES;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const navLinkClass = (href: string) =>
    `flex h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${isActive(href) ? 'bg-brand-700' : ''}`;

  return (
    // pointer-events-none: cuando el buscador móvil se esconde, la franja vacía no bloquea los toques
    <header className="pointer-events-none sticky top-0 z-[var(--z-header)]">
      {/* Sin backdrop-blur: crearía un contenedor para los "fixed" de adentro y los menús móviles de carrito y cuenta quedarían recortados */}
      <div className="pointer-events-auto relative z-10 border-b border-line bg-white">
        <Container className="flex h-14 items-center gap-3 lg:gap-6">
          <Link href="/" aria-label={`${companyName}, ir al inicio`} className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-brand-500 lg:shrink-0">
            {settings?.logo && (
              <span className="relative h-9 w-9 shrink-0">
                <Image src={settings.logo} alt="" fill sizes="36px" className="object-contain" priority />
              </span>
            )}
            <span className="font-brand min-w-0 truncate bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-xl">
              <span className="sm:hidden">{shortName}</span>
              <span className="hidden sm:inline">{companyName}</span>
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <Suspense fallback={<SearchForm id="header-search" />}>
              <HeaderSearch id="header-search" />
            </Suspense>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 text-ink-soft sm:gap-2 lg:ml-0">
            <NotificationBell />
            {/* id="cart-icon" y id="user-menu": objetivos del tour guiado */}
            <span id="cart-icon">
              <CartIcon />
            </span>
            <span id="user-menu">
              <UserAccountButton />
            </span>
          </div>
        </Container>
      </div>

      {/* Móvil: buscador que se esconde al bajar (se desliza detrás de la fila 1) */}
      <div
        ref={mobileSearchRef}
        inert={hideMobileSearch || undefined}
        className={`pointer-events-auto flex h-12 items-center border-b border-line bg-white px-4 transition-transform duration-200 lg:hidden ${hideMobileSearch ? '-translate-y-full' : ''}`}
      >
        <Suspense fallback={<SearchForm id="header-search-mobile" compact />}>
          <HeaderSearch id="header-search-mobile" compact />
        </Suspense>
      </div>

      <nav aria-label="Principal" className="pointer-events-auto hidden bg-brand-600 lg:block">
        <Container className="flex h-10 items-center gap-1">
          <HeaderDropdown
            label={<><FiMenu className="h-4 w-4" aria-hidden="true" /> Categorías</>}
            panelClassName="w-[min(56rem,calc(100vw-4rem))]"
          >
            {(close) => <CategoriesMenuPanel categories={categories} onNavigate={close} />}
          </HeaderDropdown>

          {/* id="nav-productos": objetivo del tour guiado */}
          <Link href="/productos" id="nav-productos" className={navLinkClass('/productos')} aria-current={isActive('/productos') ? 'page' : undefined}>
            Productos
          </Link>
          <Link href="/gift-cards" className={navLinkClass('/gift-cards')} aria-current={isActive('/gift-cards') ? 'page' : undefined}>
            Gift Cards
          </Link>
          <Link href="/servicios" className={navLinkClass('/servicios')} aria-current={isActive('/servicios') ? 'page' : undefined}>
            Servicios
          </Link>
          <HeaderDropdown label="Cursos" panelClassName="w-72 p-2">
            {(close) => (
              <ul>
                <li>
                  <Link href="/cursos" onClick={close} className="block rounded-lg px-3 py-2 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500">
                    <span className="block text-sm font-semibold text-ink">Ver cursos</span>
                    <span className="block text-xs text-muted">Catálogo de formación online</span>
                  </Link>
                </li>
                <li>
                  <Link href="/creator" onClick={close} className="block rounded-lg px-3 py-2 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      Enseña aquí
                      <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">Gana 90%</span>
                    </span>
                    <span className="block text-xs text-muted">Crea cursos y monetiza tu conocimiento</span>
                  </Link>
                </li>
              </ul>
            )}
          </HeaderDropdown>
          <Link href="/contacto" className={navLinkClass('/contacto')} aria-current={isActive('/contacto') ? 'page' : undefined}>
            Contáctanos
          </Link>

          {/* Compacto entre lg y xl para que la franja no se desborde */}
          <p className="ml-auto whitespace-nowrap pl-2 text-xs font-medium text-white/80">
            {exchangeRate ? (
              <>
                <span className="hidden xl:inline">Tasa BCV </span>
                {formatVES(exchangeRate)}
                <span className="hidden xl:inline"> · </span>
              </>
            ) : null}
            <span className="hidden xl:inline">Envíos a toda Venezuela</span>
          </p>
        </Container>
      </nav>
    </header>
  );
}

// La prop `settings` ya no se usa (C-03): se acepta para no romper las páginas que todavía la pasan.
export default PublicHeader as (props: { settings?: unknown }) => React.ReactElement;
