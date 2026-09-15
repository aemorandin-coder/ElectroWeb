'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiHome,
  FiShoppingBag,
  FiMapPin,
  FiUser,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiShield,
  FiGift,
  FiBook,
  FiExternalLink,
} from 'react-icons/fi';
import { FaMoneyCheckAlt } from 'react-icons/fa';
import { PiListHeartBold } from 'react-icons/pi';
import NotificationBell from '@/components/notifications/NotificationBell';
import CustomerMobileNavBar from '@/components/customer/CustomerMobileNavBar';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const MENU = [
  { href: '/customer', icon: FiHome, label: 'Inicio' },
  { href: '/customer/balance', icon: FaMoneyCheckAlt, label: 'Saldo y Pagos' },
  { href: '/customer/orders', icon: FiShoppingBag, label: 'Mis Pedidos' },
  { href: '/customer/wishlist', icon: PiListHeartBold, label: 'Lista de Deseos' },
  { href: '/customer/addresses', icon: FiMapPin, label: 'Direcciones' },
  { href: '/customer/warranty', icon: FiShield, label: 'Garantía' },
  { href: '/customer/mis-cursos', icon: FiBook, label: 'Mis Cursos' },
  { href: '/customer/referrals', icon: FiGift, label: 'Programa de Referidos' },
  { href: '/customer/profile', icon: FiUser, label: 'Mi Perfil' },
  { href: '/customer/settings', icon: FiSettings, label: 'Configuración' },
];

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { settings: companySettings } = useSettings();
  const [userImage, setUserImage] = useState<string | null>(null);

  // Escritorio: menú fijo que se puede ocultar. Móvil: cajón cerrado que se cierra al navegar
  // (se guarda la ruta en la que se abrió, así no hace falta un efecto para cerrarlo). Igual que el admin (C-52).
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const isDrawerOpen = drawerPath === pathname;
  useBodyScrollLock(isDrawerOpen);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/customer');
    }
  }, [status, router]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerPath(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!session?.user) return;
    let cancelado = false;
    fetch('/api/user/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelado && data?.profile?.image) setUserImage(data.profile.image);
      })
      .catch(() => { /* la foto es opcional */ });
    return () => { cancelado = true; };
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userName = session.user?.name || 'Usuario';
  const userInitials = userName.split(' ').map((n) => n.charAt(0).toUpperCase()).slice(0, 2).join('');

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/login', redirect: true });
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      router.push('/login');
      router.refresh();
    }
  };

  const avatar = (size: string) => (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-sm font-semibold text-brand-600`}>
      {userImage ? (
        <Image src={userImage} alt={userName} fill sizes="48px" className="object-cover" />
      ) : (
        userInitials
      )}
    </span>
  );

  return (
    <div className="min-h-dvh bg-surface">
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-[var(--z-drawer)] bg-ink/50 lg:hidden"
          onClick={() => setDrawerPath(null)}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral: cajón en móvil, fijo en escritorio */}
      <aside
        id="customer-sidebar"
        aria-label="Menú de mi panel"
        className={`fixed inset-y-0 left-0 z-[var(--z-drawer)] flex w-72 flex-col border-r border-line bg-white transition-transform duration-200 lg:z-[var(--z-sticky)] lg:w-64 ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-brand-500 text-white">
            {companySettings?.logo ? (
              <span className="relative h-full w-full">
                <Image src={companySettings.logo} alt={companySettings.companyName || 'Electro Shop'} fill sizes="36px" className="object-contain p-1" />
              </span>
            ) : (
              <FiUser className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{companySettings?.companyName || 'Electro Shop'}</span>
            <span className="block text-xs text-muted">Mi panel</span>
          </span>
          <button
            type="button"
            onClick={() => setDrawerPath(null)}
            aria-label="Cerrar menú"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink lg:hidden"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {MENU.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/customer' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-soft hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-brand-500" aria-hidden="true" />}
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-muted'}`} aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line p-4">
          <div className="mb-3 flex items-center gap-3">
            {avatar('h-9 w-9')}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{userName}</span>
              <span className="block truncate text-xs text-muted">{session.user?.email}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-ink-soft transition-colors hover:border-deal/30 hover:bg-deal-bg hover:text-deal"
          >
            <FiLogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${isCollapsed ? '' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-16 items-center gap-2 border-b border-line bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setDrawerPath(pathname)}
            aria-label="Abrir menú"
            aria-controls="customer-sidebar"
            aria-expanded={isDrawerOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink lg:hidden"
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
            aria-controls="customer-sidebar"
            aria-expanded={!isCollapsed}
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink lg:inline-flex"
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>

          <span className="truncate text-sm font-bold text-ink lg:hidden">Mi panel</span>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface">
              <FiExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ir a la tienda</span>
            </Link>
            <NotificationBell />
            <Link href="/customer/profile" aria-label="Mi perfil" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
              {avatar('h-10 w-10')}
            </Link>
          </div>
        </header>

        {/* Sin transform ni backdrop-filter en los contenedores: si no, los modales `fixed` de las páginas quedan encerrados aquí */}
        <main className="p-3 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] sm:p-4 lg:p-6">
          <div className="mx-auto max-w-[1600px] rounded-2xl border border-line bg-white p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Barra inferior del cliente: se pinta en un portal y ya se oculta sola desde lg */}
      <CustomerMobileNavBar />
    </div>
  );
}
