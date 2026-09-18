'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiBookOpen, FiChevronLeft, FiExternalLink, FiHome, FiLogOut, FiMenu, FiUser, FiX } from 'react-icons/fi';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const NAV_ITEMS = [
  { href: '/creator/dashboard', label: 'Dashboard', exact: true, icon: FiHome },
  { href: '/creator/dashboard/cursos', label: 'Mis Cursos', exact: false, icon: FiBookOpen },
  { href: '/creator/dashboard/perfil', label: 'Mi Perfil', exact: false, icon: FiUser },
];

export default function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const isDrawerOpen = drawerPath === pathname;
  useBodyScrollLock(isDrawerOpen);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?redirect=/creator/dashboard');
  }, [status, router]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerPath(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (!session) return null;

  const currentTitle = NAV_ITEMS.find((item) => item.exact ? pathname === item.href : pathname.startsWith(item.href))?.label ?? 'Creator Hub';

  return (
    <div className="min-h-dvh bg-surface">
      {isDrawerOpen && <div className="fixed inset-0 z-[var(--z-drawer)] bg-ink/50 lg:hidden" onClick={() => setDrawerPath(null)} aria-hidden="true" />}
      <aside id="creator-sidebar" aria-label="Menú del creador"
        className={`fixed inset-y-0 left-0 z-[var(--z-drawer)] flex w-72 flex-col border-r border-line bg-white transition-transform duration-200 lg:z-[var(--z-sticky)] ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'lg:w-16' : 'lg:w-60'} lg:translate-x-0`}>
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"><FiBookOpen className="h-5 w-5" aria-hidden="true" /></span>
          <span className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <span className="block text-sm font-bold text-ink">Creator Hub</span>
            <span className="block text-xs text-muted">ElectroShop</span>
          </span>
          <button type="button" onClick={() => setDrawerPath(null)} aria-label="Cerrar menú" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface lg:hidden"><FiX className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} title={isCollapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface hover:text-ink'}`}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </Link>;
          })}
        </nav>
        <div className="shrink-0 space-y-1 border-t border-line p-2">
          <Link href="/creator" title={isCollapsed ? 'Página de Creadores' : undefined} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-ink-soft hover:bg-surface hover:text-ink">
            <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" /><span className={isCollapsed ? 'lg:hidden' : ''}>Página de Creadores</span>
          </Link>
          <Link href="/customer" title={isCollapsed ? 'Mi Panel Cliente' : undefined} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-ink-soft hover:bg-surface hover:text-ink">
            <FiHome className="h-4 w-4 shrink-0" aria-hidden="true" /><span className={isCollapsed ? 'lg:hidden' : ''}>Mi Panel Cliente</span>
          </Link>
          <button type="button" onClick={() => setIsCollapsed((value) => !value)} aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="hidden h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-ink-soft hover:bg-surface lg:flex">
            <FiChevronLeft className={`h-4 w-4 shrink-0 ${isCollapsed ? 'rotate-180' : ''}`} aria-hidden="true" />
            {!isCollapsed && <span>Colapsar</span>}
          </button>
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} title={isCollapsed ? 'Cerrar Sesión' : undefined}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-deal hover:bg-deal-bg">
            <FiLogOut className="h-4 w-4 shrink-0" aria-hidden="true" /><span className={isCollapsed ? 'lg:hidden' : ''}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      <div className={`min-w-0 transition-[padding] duration-200 ${isCollapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-16 items-center gap-2 border-b border-line bg-white px-3 sm:px-4 lg:px-6">
          <button type="button" onClick={() => setDrawerPath(pathname)} aria-label="Abrir menú" aria-controls="creator-sidebar" aria-expanded={isDrawerOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface lg:hidden"><FiMenu className="h-5 w-5" aria-hidden="true" /></button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{currentTitle}</span>
          <Link href="/cursos" target="_blank" className="inline-flex h-10 items-center gap-1 rounded-lg border border-line px-3 text-xs font-medium text-ink-soft hover:bg-surface">
            <span className="hidden sm:inline">Ver catálogo</span><FiExternalLink className="h-4 w-4" aria-label="Ver catálogo" />
          </Link>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white" aria-label={session.user.name ?? 'Creador'}>
            {session.user.name?.[0]?.toUpperCase() ?? 'C'}
          </span>
        </header>
        <main className="mx-auto max-w-[1600px] min-w-0 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
