'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiBookOpen,
  FiGift,
  FiGrid,
  FiHome,
  FiLayers,
  FiMail,
  FiMoreHorizontal,
  FiPackage,
  FiShoppingCart,
  FiTool,
  FiX,
} from 'react-icons/fi';
import { useCart } from '@/contexts/CartContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const MAIN_ITEMS: Array<{ href: string; label: string; Icon: IconType }> = [
  { href: '/', label: 'Inicio', Icon: FiHome },
  { href: '/productos', label: 'Productos', Icon: FiGrid },
  { href: '/categorias', label: 'Categorías', Icon: FiLayers },
  { href: '/carrito', label: 'Carrito', Icon: FiShoppingCart },
];

const DRAWER_ITEMS: Array<{ href: string; label: string; Icon: IconType }> = [
  { href: '/gift-cards', label: 'Gift Cards', Icon: FiGift },
  { href: '/servicios', label: 'Servicios', Icon: FiTool },
  { href: '/cursos', label: 'Cursos', Icon: FiBookOpen },
  { href: '/contacto', label: 'Contacto', Icon: FiMail },
  { href: '/solicitar-producto', label: 'Solicitar un producto', Icon: FiPackage },
];

/**
 * Barra inferior de la tienda (solo < lg, PLAN.md §2). Deja libre `--bottom-nav-h` abajo:
 * globals.css agrega ese espacio al final de la página para que nada quede tapado.
 * "Más" abre un panel accesible: Esc para cerrar, foco atrapado dentro y devuelto al botón.
 */
export default function MobileNavBar() {
  const { totalItems } = useCart();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  // Al cerrar con Esc, la X o el fondo, el foco vuelve a "Más"; al elegir un enlace, no
  const restoreFocusRef = useRef(true);

  useBodyScrollLock(isDrawerOpen);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const drawer = drawerRef.current;
    const moreButton = moreButtonRef.current;
    drawer?.querySelector<HTMLElement>('a[href], button')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsDrawerOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Botón "atrás" del teléfono con el panel abierto: se cierra en vez de quedar abierto en otra página
    const onPopState = () => {
      restoreFocusRef.current = false;
      setIsDrawerOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      if (restoreFocusRef.current) moreButton?.focus({ preventScroll: true });
      restoreFocusRef.current = true;
    };
  }, [isDrawerOpen]);

  // Paneles de cliente y admin tienen su propia navegación
  if (pathname?.startsWith('/customer') || pathname?.startsWith('/admin')) return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));
  const closeDrawer = () => setIsDrawerOpen(false);
  const navigateFromDrawer = () => {
    restoreFocusRef.current = false;
    setIsDrawerOpen(false);
  };
  const itemClass = 'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white';

  return (
    <>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
          <div className="absolute inset-0 bg-ink/60 motion-safe:animate-fadeIn" onClick={closeDrawer} aria-hidden="true" />
          <div
            ref={drawerRef}
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-brand-950 px-4 pt-3 text-white shadow-lg motion-safe:animate-slideInUp pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <h2 id="mobile-more-title" className="text-sm font-semibold text-white/80">Más secciones</h2>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar menú"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <FiX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {DRAWER_ITEMS.map(({ href, label, Icon }, index) => {
                const active = isActive(href);
                const wide = index === DRAWER_ITEMS.length - 1;
                return (
                  <li key={href} className={wide ? 'col-span-2' : undefined}>
                    <Link
                      href={href}
                      onClick={navigateFromDrawer}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-white ${
                        active ? 'bg-brand-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* id="mobile-bottom-nav": globals.css reserva su alto al final de la página */}
      <nav
        id="mobile-bottom-nav"
        aria-label="Navegación inferior"
        className="fixed inset-x-3 z-[var(--z-bottomnav)] rounded-2xl bg-brand-950/95 shadow-lg ring-1 ring-white/10 backdrop-blur-md lg:hidden bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <ul className="flex h-16 items-stretch px-1.5 py-1.5">
          {MAIN_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            const isCart = href === '/carrito';
            return (
              <li key={href} className="flex min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={isCart && totalItems > 0 ? `Carrito, ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}` : undefined}
                  className={`${itemClass} ${active ? 'bg-white/10 text-white' : 'text-white/80 hover:text-white'}`}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden />
                    {isCart && totalItems > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[11px] font-semibold leading-none text-white" aria-hidden="true">
                        {totalItems > 99 ? '99+' : totalItems}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex min-w-0 flex-1">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setIsDrawerOpen((open) => !open)}
              aria-haspopup="dialog"
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-more-menu"
              className={`${itemClass} ${isDrawerOpen ? 'bg-white/10 text-white' : 'text-white/80 hover:text-white'}`}
            >
              <FiMoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
