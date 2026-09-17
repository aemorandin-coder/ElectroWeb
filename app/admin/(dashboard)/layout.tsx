'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import {
  FiBarChart2, FiBox, FiClipboard, FiCreditCard, FiDollarSign, FiExternalLink, FiGift, FiGrid, FiLogOut,
  FiBell, FiBookOpen, FiMenu, FiMessageSquare, FiPercent, FiSettings, FiShield, FiTag, FiTool, FiTrendingUp, FiUserCheck, FiUsers, FiX,
} from 'react-icons/fi';
import NotificationBell from '@/components/notifications/NotificationBell';
import { MdAdminPanelSettings } from 'react-icons/md';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface NavigationItem {
  name: string;
  href: string;
  icon: ReactNode;
  permission?: string;
  countKey?: keyof SidebarCounts;
}

interface SidebarCounts {
  pendingOrders: number;
  pendingTransactions: number;
  pendingInquiries: number;
  pendingDiscounts: number;
  pendingCreators: number;
  pendingCourses: number;
  unreadNotifications: number;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  // Escritorio: menú fijo que se puede ocultar. Móvil: cajón cerrado por defecto que se cierra al navegar
  // (se guarda la ruta en la que se abrió, así no hace falta un efecto para cerrarlo).
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const isDrawerOpen = drawerPath === pathname;
  useBodyScrollLock(isDrawerOpen);
  const [sidebarCounts, setSidebarCounts] = useState<SidebarCounts>({
    pendingOrders: 0,
    pendingTransactions: 0,
    pendingInquiries: 0,
    pendingDiscounts: 0,
    pendingCreators: 0,
    pendingCourses: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=admin');
    } else if (status === 'authenticated' && session) {
      const userType = (session.user as any)?.userType;
      if (userType !== 'admin') {
        router.push('/login?redirect=admin&error=admin_required');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerPath(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  // Fetch sidebar badge counts — poll every 30 seconds
  const fetchSidebarCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sidebar-counts?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSidebarCounts(data);
      }
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  // Fetch sidebar counts when pathname changes (navigating refreshes counts immediately)
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSidebarCounts();
    }
  }, [status, pathname, fetchSidebarCounts]);

  // Listen to custom refresh events and run polling
  useEffect(() => {
    if (status === 'authenticated') {
      const handleRefresh = () => {
        fetchSidebarCounts();
      };
      
      window.addEventListener('refresh-sidebar-counts', handleRefresh);
      const interval = setInterval(fetchSidebarCounts, 30000);
      
      return () => {
        window.removeEventListener('refresh-sidebar-counts', handleRefresh);
        clearInterval(interval);
      };
    }
  }, [status, fetchSidebarCounts]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-brand-500 mb-4 shadow-lg">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-sm text-muted font-medium">Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: <FiGrid className="h-5 w-5" aria-hidden="true" />,
    },
    {
      name: 'Productos',
      href: '/admin/products',
      icon: <FiBox className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_PRODUCTS',
    },
    {
      name: 'Categorías',
      href: '/admin/categories',
      icon: <FiTag className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_PRODUCTS',
    },
    {
      name: 'Órdenes',
      href: '/admin/orders',
      icon: <FiClipboard className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_ORDERS',
      countKey: 'pendingOrders',
    },
    {
      name: 'Transacciones',
      href: '/admin/transactions',
      icon: <FiDollarSign className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_ORDERS',
      countKey: 'pendingTransactions',
    },
    {
      name: 'Gift Cards',
      href: '/admin/gift-cards',
      icon: <FiGift className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_ORDERS',
    },
    {
      name: 'Clientes',
      href: '/admin/customers',
      icon: <FiUsers className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_USERS',
    },
    {
      name: 'Métodos de Pago',
      href: '/admin/payments',
      icon: <FiCreditCard className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_SETTINGS',
    },
    {
      name: 'Notificaciones',
      href: '/admin/notifications',
      icon: <FiBell className="h-5 w-5" aria-hidden="true" />,
      countKey: 'unreadNotifications',
    },
    {
      name: 'Mensajes y Solicitudes',
      href: '/admin/inquiries',
      icon: <FiMessageSquare className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_CONTENT',
      countKey: 'pendingInquiries',
    },
    {
      name: 'Marketing y Contenido',
      href: '/admin/marketing',
      icon: <FiTrendingUp className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_CONTENT',
    },
    // C-82: no había forma de llegar a los cursos ni a los creadores desde el menú (solo desde una notificación)
    {
      name: 'Cursos',
      href: '/admin/cursos',
      icon: <FiBookOpen className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_CONTENT',
      countKey: 'pendingCourses',
    },
    {
      name: 'Creadores',
      href: '/admin/creators',
      icon: <FiUserCheck className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_USERS',
      countKey: 'pendingCreators',
    },
    {
      name: 'Trabajos Realizados',
      href: '/admin/servicios',
      icon: <FiTool className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_CONTENT',
    },
    {
      name: 'Descuentos',
      href: '/admin/discount-requests',
      icon: <FiPercent className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_CONTENT',
      countKey: 'pendingDiscounts',
    },
    {
      name: 'Documentos Legales',
      href: '/admin/legal',
      icon: <FiShield className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_CONTENT',
    },
    {
      name: 'Reportes',
      href: '/admin/reports',
      icon: <FiBarChart2 className="h-5 w-5" aria-hidden="true" />,
      permission: 'VIEW_REPORTS',
    },
    {
      name: 'Configuración',
      href: '/admin/settings',
      icon: <FiSettings className="h-5 w-5" aria-hidden="true" />,
      permission: 'MANAGE_SETTINGS',
    },
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    // Special permission: only SUPER_ADMIN can access
    if (permission === 'SUPER_ADMIN_ONLY') {
      return session.user.role === 'SUPER_ADMIN';
    }
    // Grant full access to ADMIN and SUPER_ADMIN roles
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') return true;
    return session.user.permissions?.includes(permission as any);
  };

  const filteredNavigation = navigation.filter((item) =>
    hasPermission(item.permission)
  );

  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: '/admin/login',
        redirect: true
      });
      // Force session refresh
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: redirect manually
      router.push('/admin/login');
      router.refresh();
    }
  };

  const roleLabel = session.user.role === 'SUPER_ADMIN' ? 'Super Admin'
    : session.user.role === 'ADMIN' ? 'Administrador'
      : session.user.role === 'SUPPORT' ? 'Soporte' : 'Usuario';

  return (
    <div className="min-h-dvh bg-surface">
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] bg-ink/50 lg:hidden" onClick={() => setDrawerPath(null)} aria-hidden="true" />
      )}

      {/* Menú lateral: cajón en móvil, fijo en escritorio */}
      <aside
        id="admin-sidebar"
        aria-label="Menú del panel"
        className={`fixed inset-y-0 left-0 z-[var(--z-drawer)] flex w-72 flex-col border-r border-line bg-white transition-transform duration-200 lg:z-[var(--z-sticky)] lg:w-64 ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <MdAdminPanelSettings className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">Electro Shop</span>
            <span className="block text-xs text-muted">Panel de administración</span>
          </span>
          <button type="button" onClick={() => setDrawerPath(null)} aria-label="Cerrar menú" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink lg:hidden">
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              const badgeCount = item.countKey ? sidebarCounts[item.countKey] : 0;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-soft hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-brand-500" aria-hidden="true" />}
                    <span className={isActive ? 'text-brand-600' : 'text-muted'}>{item.icon}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    {badgeCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-brand-600">
              {session.user.email?.[0].toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{session.user.name}</span>
              <span className="block truncate text-xs text-muted">{session.user.email}</span>
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
            aria-controls="admin-sidebar"
            aria-expanded={isDrawerOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink lg:hidden"
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
            aria-controls="admin-sidebar"
            aria-expanded={!isCollapsed}
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink lg:inline-flex"
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface">
              <FiExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ver tienda</span>
            </Link>
            <NotificationBell />
            <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink sm:inline-flex">
              <span className={`h-2 w-2 rounded-full ${session.user.role === 'SUPER_ADMIN' ? 'bg-brand-700' : session.user.role === 'ADMIN' ? 'bg-brand-500' : 'bg-subtle'}`} aria-hidden="true" />
              {roleLabel}
            </span>
          </div>
        </header>

        {/* Sin transform ni backdrop-filter en los contenedores: si no, los modales `fixed` de las páginas quedan encerrados aquí */}
        <main className="p-3 sm:p-4 lg:p-6">
          <div className="mx-auto min-w-0 max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
