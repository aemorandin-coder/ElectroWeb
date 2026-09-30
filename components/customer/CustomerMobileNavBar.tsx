'use client';

// Barra inferior del panel del cliente (solo teléfono y tablet: se oculta desde lg).
// C-128: Inicio, Pedidos, Saldo, Favoritos y "Más", que abre el menú completo (Direcciones, Garantía, Referidos,
// Perfil…). Antes eran Inicio, Pedidos, Favoritos, Referidos y Perfil: el saldo, lo que más se consulta, no estaba.
// Colores con tokens (antes hex y rgba dentro de `style`).

import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { IconType } from 'react-icons';
import { FiCreditCard, FiHeart, FiHome, FiMenu, FiPackage } from 'react-icons/fi';
import { useMontado } from '@/lib/hooks/useMontado';

const ITEMS: Array<{ href: string; label: string; Icono: IconType }> = [
  { href: '/customer', label: 'Inicio', Icono: FiHome },
  { href: '/customer/orders', label: 'Pedidos', Icono: FiPackage },
  { href: '/customer/balance', label: 'Puntos ES', Icono: FiCreditCard },
  { href: '/customer/wishlist', label: 'Favoritos', Icono: FiHeart },
];

const base = 'flex h-14 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl text-xs font-semibold transition-colors';

export default function CustomerMobileNavBar() {
  const mounted = useMontado();
  const pathname = usePathname();

  if (!mounted) return null;

  const activo = (href: string) => (href === '/customer' ? pathname === '/customer' : pathname.startsWith(href));

  return createPortal(
    <nav
      id="customer-floating-nav"
      aria-label="Mi panel"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[var(--z-bottomnav)] rounded-2xl border border-line bg-white/95 shadow-lg lg:hidden"
    >
      <ul className="grid h-16 grid-cols-5 items-center px-1">
        {ITEMS.map(({ href, label, Icono }) => {
          const esActivo = activo(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={esActivo ? 'page' : undefined}
                className={`${base} ${esActivo ? 'bg-brand-50 text-brand-600' : 'text-ink-soft active:bg-surface'}`}
              >
                <Icono className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('abrir-menu-cliente'))}
            aria-controls="customer-sidebar"
            className={`${base} w-full text-ink-soft active:bg-surface`}
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
            Más
          </button>
        </li>
      </ul>
    </nav>,
    document.body,
  );
}
