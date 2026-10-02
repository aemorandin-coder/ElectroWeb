'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import {
  FiBarChart2, FiBox, FiClipboard, FiCreditCard, FiDollarSign, FiExternalLink, FiGift, FiGrid, FiLogOut,
  FiAlertTriangle, FiBell, FiBookOpen, FiChevronDown, FiFileText, FiShoppingBag, FiFilm, FiLifeBuoy, FiLock, FiMenu, FiMessageSquare, FiPercent, FiStar, FiSettings, FiShield, FiTag, FiTool, FiTrendingUp, FiUserCheck, FiUserPlus, FiUsers, FiX,
} from 'react-icons/fi';
import NotificationBell from '@/components/notifications/NotificationBell';
import { MdAdminPanelSettings } from 'react-icons/md';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';
import ControlSesionAdmin, { cerrarSesionAdmin } from '@/components/admin/ControlSesionAdmin';
import { hasPermission, PAGINAS_SOLO_DUENO } from '@/lib/auth-helpers';

interface NavigationItem {
  name: string;
  href: string;
  icon: ReactNode;
  permission?: string;
  countKey?: keyof SidebarCounts;
}

/** C-150: sección del menú que se abre y se cierra (Ventas, Catálogo…) */
interface NavigationGroup {
  id: string;
  name: string;
  icon: ReactNode;
  items: NavigationItem[];
}

interface SidebarCounts {
  pendingOrders: number;
  pendingTransactions: number;
  pendingInquiries: number;
  pendingReviews: number;
  pendingWarranty: number;
  pendingQuotes: number;
  pendingDiscounts: number;
  pendingCreators: number;
  pendingCourses: number;
  pendingVerifications: number;
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
    pendingReviews: 0,
    pendingWarranty: 0,
    pendingQuotes: 0,
    pendingDiscounts: 0,
    pendingCreators: 0,
    pendingCourses: 0,
    pendingVerifications: 0,
    unreadNotifications: 0,
  });
  // C-150: secciones que el admin abrió o cerró a mano. Sin tocar, está abierta la de la página en la que está
  const [secciones, setSecciones] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=admin');
    } else if (status === 'authenticated' && session) {
      const userType = session.user?.userType;
      if (userType !== 'admin') {
        router.push('/login?redirect=admin&error=admin_required');
      }
    }
  }, [status, session, router]);

  // C-141: sin la verificación en dos pasos el panel solo deja configurarla (el `proxy` hace lo mismo en el servidor)
  const conDosPasos = session?.user?.dosPasos === true;
  const debeConfigurar = status === 'authenticated' && session?.user?.userType === 'admin' && !conDosPasos;
  // Páginas solo del dueño: el `proxy` ya devuelve al Administrador al inicio, pero el navegador puede abrir una
  // copia guardada de la página sin pasar por el servidor (sus APIs responden 403 igual)
  const soloDueno = conDosPasos && session?.user?.role !== 'SUPER_ADMIN' && PAGINAS_SOLO_DUENO.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  useEffect(() => {
    if (debeConfigurar && pathname !== '/admin/seguridad') router.replace('/admin/seguridad');
    else if (soloDueno) router.replace('/admin');
  }, [debeConfigurar, soloDueno, pathname, router]);

  // C-143: una tienda sin super admin (el dueño quedó como Administrador) no tiene quién abra Configuración,
  // Métodos de pago ni Equipo. El panel lo dice, con la salida, en vez de dejar el menú incompleto sin explicación.
  const [sinSuperAdmin, setSinSuperAdmin] = useState(false);
  const esAdministrador = conDosPasos && session?.user?.role === 'ADMIN';
  useCargarAlMontar(async () => {
    if (!esAdministrador) return;
    const res = await fetch('/api/admin/dos-pasos', { cache: 'no-store' }).catch(() => null);
    const datos = res?.ok ? await res.json().catch(() => null) : null;
    setSinSuperAdmin(datos?.sinSuperAdmin === true);
  }, [esAdministrador]);

  const cerrarCajon = useCallback(() => setDrawerPath(null), []);
  useCajonAccesible(isDrawerOpen, 'admin-sidebar', cerrarCajon);

  // Fetch sidebar badge counts — poll every 30 seconds
  const fetchSidebarCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sidebar-counts?t=${Date.now()}`, { cache: 'no-store' });
      // C-140: la sesión se cerró en el servidor (12 h, otra sesión o cerrada por un super admin)
      if (res.status === 401) {
        cerrarSesionAdmin('sesion-cerrada');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSidebarCounts(data);
      }
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  // Fetch sidebar counts when pathname changes (navigating refreshes counts immediately)
  useCargarAlMontar(() => {
    if (status === 'authenticated' && conDosPasos) void fetchSidebarCounts();
  }, [status, conDosPasos, pathname, fetchSidebarCounts]);

  // Listen to custom refresh events and run polling
  useEffect(() => {
    if (status === 'authenticated' && conDosPasos) {
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
  }, [status, conDosPasos, fetchSidebarCounts]);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
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

  const icono = 'h-5 w-5';
  const dashboard: NavigationItem = { name: 'Dashboard', href: '/admin', icon: <FiGrid className={icono} aria-hidden="true" /> };

  // C-150: el menú eran 25 ítems en una sola lista (en el teléfono había que deslizar para llegar a Configuración).
  // Ahora son secciones que se abren y se cierran. Ninguna página cambió de dirección ni de permiso.
  const grupos: NavigationGroup[] = [
    {
      id: 'ventas',
      name: 'Ventas',
      icon: <FiShoppingBag className={icono} aria-hidden="true" />,
      items: [
        { name: 'Órdenes', href: '/admin/orders', icon: <FiClipboard className={icono} aria-hidden="true" />, permission: 'MANAGE_ORDERS', countKey: 'pendingOrders' },
        // C-148: presupuestos para empresas e instituciones
        { name: 'Cotizaciones', href: '/admin/cotizaciones', icon: <FiFileText className={icono} aria-hidden="true" />, permission: 'MANAGE_ORDERS', countKey: 'pendingQuotes' },
        { name: 'Transacciones', href: '/admin/transactions', icon: <FiDollarSign className={icono} aria-hidden="true" />, permission: 'MANAGE_ORDERS', countKey: 'pendingTransactions' },
        // C-122: antes las solicitudes llegaban mezcladas en Mensajes y Solicitudes
        { name: 'Garantías', href: '/admin/garantias', icon: <FiLifeBuoy className={icono} aria-hidden="true" />, permission: 'MANAGE_ORDERS', countKey: 'pendingWarranty' },
        { name: 'Gift Cards', href: '/admin/gift-cards', icon: <FiGift className={icono} aria-hidden="true" />, permission: 'MANAGE_ORDERS' },
      ],
    },
    {
      id: 'catalogo',
      name: 'Catálogo',
      icon: <FiBox className={icono} aria-hidden="true" />,
      items: [
        { name: 'Productos', href: '/admin/products', icon: <FiBox className={icono} aria-hidden="true" />, permission: 'MANAGE_PRODUCTS' },
        { name: 'Categorías', href: '/admin/categories', icon: <FiTag className={icono} aria-hidden="true" />, permission: 'MANAGE_PRODUCTS' },
        { name: 'Descuentos', href: '/admin/discount-requests', icon: <FiPercent className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT', countKey: 'pendingDiscounts' },
        // C-110: antes solo se llegaba desde el Dashboard
        { name: 'Reseñas', href: '/admin/reviews', icon: <FiStar className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT', countKey: 'pendingReviews' },
      ],
    },
    {
      id: 'clientes',
      name: 'Clientes',
      icon: <FiUsers className={icono} aria-hidden="true" />,
      items: [
        { name: 'Clientes', href: '/admin/customers', icon: <FiUsers className={icono} aria-hidden="true" />, permission: 'MANAGE_USERS' },
        { name: 'Mensajes y Solicitudes', href: '/admin/inquiries', icon: <FiMessageSquare className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT', countKey: 'pendingInquiries' },
        // C-150: las empresas por verificar no estaban en el menú (solo se llegaba desde un aviso del Dashboard)
        { name: 'Verificaciones', href: '/admin/verifications', icon: <FiUserCheck className={icono} aria-hidden="true" />, permission: 'MANAGE_USERS', countKey: 'pendingVerifications' },
      ],
    },
    {
      id: 'marketing',
      name: 'Marketing',
      icon: <FiTrendingUp className={icono} aria-hidden="true" />,
      items: [
        { name: 'Marketing y Contenido', href: '/admin/marketing', icon: <FiTrendingUp className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT' },
        // C-112: reemplaza a "Imágenes para redes" de Marketing
        { name: 'ElectroStudio', href: '/admin/studio', icon: <FiFilm className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT' },
        { name: 'Trabajos Realizados', href: '/admin/servicios', icon: <FiTool className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT' },
      ],
    },
    {
      // C-82: no había forma de llegar a los cursos ni a los creadores desde el menú (solo desde una notificación)
      id: 'cursos',
      name: 'Cursos',
      icon: <FiBookOpen className={icono} aria-hidden="true" />,
      items: [
        { name: 'Cursos', href: '/admin/cursos', icon: <FiBookOpen className={icono} aria-hidden="true" />, permission: 'MANAGE_CONTENT', countKey: 'pendingCourses' },
        { name: 'Creadores', href: '/admin/creators', icon: <FiUserPlus className={icono} aria-hidden="true" />, permission: 'MANAGE_USERS', countKey: 'pendingCreators' },
      ],
    },
    {
      id: 'administracion',
      name: 'Administración',
      icon: <FiSettings className={icono} aria-hidden="true" />,
      items: [
        { name: 'Reportes', href: '/admin/reports', icon: <FiBarChart2 className={icono} aria-hidden="true" />, permission: 'VIEW_REPORTS' },
        { name: 'Notificaciones', href: '/admin/notifications', icon: <FiBell className={icono} aria-hidden="true" />, countKey: 'unreadNotifications' },
        { name: 'Documentos Legales', href: '/admin/legal', icon: <FiShield className={icono} aria-hidden="true" />, permission: 'MANAGE_USERS' },
        { name: 'Métodos de Pago', href: '/admin/payments', icon: <FiCreditCard className={icono} aria-hidden="true" />, permission: 'MANAGE_SETTINGS' },
        // C-141: invitar admins, roles, accesos y dos pasos de cada cuenta. Solo el super admin
        { name: 'Equipo', href: '/admin/equipo', icon: <FiUsers className={icono} aria-hidden="true" />, permission: 'MANAGE_TEAM' },
        { name: 'Configuración', href: '/admin/settings', icon: <FiSettings className={icono} aria-hidden="true" />, permission: 'MANAGE_SETTINGS' },
        { name: 'Mi seguridad', href: '/admin/seguridad', icon: <FiLock className={icono} aria-hidden="true" /> },
      ],
    },
  ];

  // Los mismos permisos que revisa el servidor (C-141): antes el menú tenía su propia copia, que le daba todo al Administrador
  const gruposVisibles = grupos
    .map((grupo) => ({ ...grupo, items: grupo.items.filter((item) => !item.permission || hasPermission(session, item.permission)) }))
    .filter((grupo) => grupo.items.length > 0);
  const activo = (item: NavigationItem) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
  const grupoActivo = gruposVisibles.find((grupo) => grupo.items.some(activo))?.id ?? null;

  const enlace = (item: NavigationItem, dentro: boolean) => {
    const isActive = activo(item);
    const badgeCount = item.countKey ? sidebarCounts[item.countKey] : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          className={`relative flex h-11 items-center gap-3 rounded-lg text-sm font-medium transition-colors ${dentro ? 'pl-6 pr-3' : 'px-3'} ${
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
  };

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

  // Sin dos pasos: solo la pantalla para configurarlos, sin menú, campana ni contadores
  if (!conDosPasos) {
    return (
      <div className="min-h-dvh bg-surface">
        <ControlSesionAdmin />
        <header className="flex h-16 items-center gap-3 border-b border-line bg-white px-4 lg:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
            <MdAdminPanelSettings className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">Electro Shop</span>
            <span className="block truncate text-xs text-muted">{session.user.email}</span>
          </span>
          <button type="button" onClick={handleSignOut} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink">
            <FiLogOut className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Cerrar sesión</span>
          </button>
        </header>
        <main className="p-3 sm:p-4 lg:p-6">{pathname === '/admin/seguridad' ? children : null}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      {/* C-140: se cierra tras 1 hora sin uso, con aviso 5 minutos antes */}
      <ControlSesionAdmin />
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] bg-ink/50 lg:hidden" onClick={() => setDrawerPath(null)} aria-hidden="true" />
      )}

      {/* Menú lateral: cajón en móvil, fijo en escritorio */}
      <aside
        id="admin-sidebar"
        aria-label="Menú del panel"
        className={`fixed inset-y-0 left-0 z-[var(--z-drawer)] flex w-72 flex-col border-r border-line bg-white transition-[transform,visibility] duration-200 lg:z-[var(--z-sticky)] lg:w-64 ${
          // Cerrado queda invisible: el foco con Tab ya no entra a un menú que no se ve (C-111)
          isDrawerOpen ? 'visible translate-x-0' : '-translate-x-full max-lg:invisible'
        } ${isCollapsed ? 'lg:invisible lg:-translate-x-full' : 'lg:visible lg:translate-x-0'}`}
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

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {enlace(dashboard, false)}
            {gruposVisibles.map((grupo) => {
              const abierta = secciones[grupo.id] ?? grupo.id === grupoActivo;
              const contiene = grupo.id === grupoActivo;
              // Cerrada, la sección muestra la suma de los avisos de sus páginas
              const avisos = grupo.items.reduce((suma, item) => suma + (item.countKey ? sidebarCounts[item.countKey] : 0), 0);
              return (
                <li key={grupo.id}>
                  <button
                    type="button"
                    onClick={() => setSecciones((prev) => ({ ...prev, [grupo.id]: !abierta }))}
                    aria-expanded={abierta}
                    aria-controls={`menu-${grupo.id}`}
                    className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors hover:bg-surface ${contiene ? 'text-brand-700' : 'text-ink'}`}
                  >
                    <span className={contiene ? 'text-brand-600' : 'text-muted'}>{grupo.icon}</span>
                    <span className="flex-1 truncate">{grupo.name}</span>
                    {!abierta && avisos > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                        {avisos > 99 ? '99+' : avisos}
                        <span className="sr-only"> pendientes</span>
                      </span>
                    )}
                    <FiChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  <ul id={`menu-${grupo.id}`} hidden={!abierta} className="space-y-0.5 pb-1">
                    {grupo.items.map((item) => enlace(item, true))}
                  </ul>
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
            {sinSuperAdmin && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-strong" role="alert">
                <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">Esta tienda no tiene ningún super admin.</p>
                  <p className="mt-1">
                    Por eso nadie ve Configuración, Métodos de Pago ni Equipo: tu cuenta es de Administrador. El dueño lo arregla en el servidor, sin cambiar su contraseña ni sus dos pasos, y después vuelve a entrar:
                  </p>
                  <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-ink">npx tsx scripts/create-master-admin.ts {session.user.email}</code>
                </div>
              </div>
            )}
            {soloDueno ? null : children}
          </div>
        </main>
      </div>
    </div>
  );
}
