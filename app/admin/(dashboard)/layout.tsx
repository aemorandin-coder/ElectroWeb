'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import NotificationBell from '@/components/notifications/NotificationBell';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

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

  // Handle page transitions with epic animations
  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsTransitioning(true);

      // Reset transition after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevPathname(pathname);
      }, 400); // Match this with CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#2a63cd] mb-4 shadow-lg">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-sm text-[#6a6c6b] font-medium">Cargando panel...</p>
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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Productos',
      href: '/admin/products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      permission: 'MANAGE_PRODUCTS',
    },
    {
      name: 'Categorías',
      href: '/admin/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      permission: 'MANAGE_PRODUCTS',
    },
    {
      name: 'Órdenes',
      href: '/admin/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      permission: 'MANAGE_ORDERS',
    },
    {
      name: 'Transacciones',
      href: '/admin/transactions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      permission: 'MANAGE_ORDERS',
    },
    {
      name: 'Clientes',
      href: '/admin/customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      permission: 'MANAGE_USERS',
    },
    {
      name: 'Métodos de Pago',
      href: '/admin/payments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      permission: 'MANAGE_SETTINGS',
    },
    {
      name: 'Notificaciones',
      href: '/admin/notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      name: 'Centro de Consultas',
      href: '/admin/inquiries',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      permission: 'MANAGE_CONTENT',
    },
    {
      name: 'Marketing y Contenido',
      href: '/admin/marketing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      permission: 'MANAGE_CONTENT',
    },
    {
      name: 'Descuentos',
      href: '/admin/discount-requests',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ),
      permission: 'MANAGE_CONTENT',
    },
    {
      name: 'Documentos Legales',
      href: '/admin/legal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      permission: 'MANAGE_CONTENT',
    },
    {
      name: 'Reportes',
      href: '/admin/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      permission: 'VIEW_REPORTS',
    },
    {
      name: 'Configuración',
      href: '/admin/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#2a63cd] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-40 h-screen transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } bg-white/95 backdrop-blur-xl border-r border-white/30 w-64 shadow-2xl`}
        >
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-[#e9ecef]">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2a63cd] shadow-md shadow-[#2a63cd]/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#212529]">
                  Electro Shop
                </h2>
                <p className="text-xs text-[#6a6c6b]">Admin Panel</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ul className="space-y-1">
                {filteredNavigation.map((item, index) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));

                  return (
                    <li key={item.name} style={{ animationDelay: `${index * 50}ms` }} className="animate-fadeIn">
                      <Link
                        href={item.href}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isActive
                          ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg shadow-[#2a63cd]/30 scale-[1.02]'
                          : 'text-[#6a6c6b] hover:bg-[#f8f9fa] hover:text-[#212529] hover:scale-[1.01]'
                          }`}
                      >
                        <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-[#6a6c6b] group-hover:scale-110'}`}>
                          {item.icon}
                        </span>
                        <span className="relative z-10">{item.name}</span>
                        {isActive && (
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-lg shadow-lg"></span>
                        )}
                        {!isActive && (
                          <span className="absolute inset-0 bg-gradient-to-r from-[#2a63cd]/0 to-[#2a63cd]/0 group-hover:from-[#2a63cd]/5 group-hover:to-[#2a63cd]/0 rounded-lg transition-all duration-300"></span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* User Info & Logout */}
            <div className="border-t border-[#e9ecef] p-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#f8f9fa] border border-[#dee2e6]">
                  <span className="text-sm font-semibold text-[#2a63cd]">
                    {session.user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#212529] truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-[#6a6c6b] truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="group relative w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f8f9fa] hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-[#6a6c6b] hover:text-red-600 text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-md hover:scale-[1.02] overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/10 group-hover:to-red-500/0 transition-all duration-300"></span>
                <svg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-[-2px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="relative z-10">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`${isSidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
          {/* Top Bar */}
          <header className="bg-white border-b border-[#e9ecef] sticky top-0 z-30 shadow-sm backdrop-blur-sm bg-white/95">
            <div className="px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="relative p-2 hover:bg-[#f8f9fa] rounded-lg transition-all duration-300 group hover:scale-110"
              >
                <svg className="w-6 h-6 text-[#6a6c6b] group-hover:text-[#2a63cd] transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="absolute inset-0 rounded-lg bg-[#2a63cd]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></span>
              </button>

              <div className="flex items-center gap-4">
                {/* Home Button */}
                <Link
                  href="/"
                  className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[#2a63cd]/30 transition-all duration-300 hover:scale-105 group overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-[#1e4ba3] to-[#2a63cd] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <svg className="w-4 h-4 relative z-10 group-hover:translate-x-[-2px] transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="relative z-10">Ir a Home</span>
                </Link>

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Role Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#f8f9fa] to-white rounded-full border border-[#e9ecef] shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${session.user.role === 'SUPER_ADMIN' ? 'bg-purple-500 shadow-sm shadow-purple-500/50' : session.user.role === 'ADMIN' ? 'bg-[#2a63cd] shadow-sm shadow-[#2a63cd]/50' : 'bg-[#6a6c6b]'
                    }`} />
                  <span className="text-xs font-semibold text-[#212529]">
                    {session.user.role === 'SUPER_ADMIN' ? 'Super Admin' :
                      session.user.role === 'ADMIN' ? 'Administrador' :
                        session.user.role === 'SUPPORT' ? 'Soporte' : 'Usuario'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content with Smooth Transition */}
          <main className="p-6 overflow-hidden relative">
            {/* Shimmer Effect on Transition */}
            <div
              className="absolute inset-6 rounded-xl pointer-events-none z-10 overflow-hidden"
              style={{
                opacity: isTransitioning ? 1 : 0,
                transition: 'opacity 0.3s ease-out'
              }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2a63cd]/5 to-transparent"
                style={{
                  transform: isTransitioning ? 'translateX(100%)' : 'translateX(-100%)',
                  transition: 'transform 0.5s ease-out'
                }}
              />
            </div>

            {/* Content Container with Smooth Transitions */}
            <div
              className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/30 h-[calc(100vh-8rem)] overflow-y-auto p-6"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(8px) scale(0.99)' : 'translateY(0) scale(1)',
                transition: 'opacity 0.25s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
