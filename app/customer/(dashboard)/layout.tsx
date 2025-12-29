'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiHome,
  FiShoppingBag,
  FiMapPin,
  FiCreditCard,
  FiUser,
  FiHeart,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiShield
} from 'react-icons/fi';
import { FaMoneyCheckAlt } from 'react-icons/fa';
import { PiListHeartBold } from 'react-icons/pi';

interface CompanySettings {
  companyName: string;
  logo: string | null;
}

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default on mobile
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      // Auto-open sidebar on desktop
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/public');
        if (response.ok) {
          const data = await response.json();
          setCompanySettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // Fetch user profile image
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.profile?.image) {
            setUserImage(data.profile.image);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  // Handle page transitions with epic animations
  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsTransitioning(true);
      // Close sidebar on mobile when navigating
      if (isMobile) {
        setIsSidebarOpen(false);
      }

      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevPathname(pathname);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname, isMobile]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const menuItems = [
    { href: '/customer', icon: FiHome, label: 'Inicio' },
    { href: '/customer/balance', icon: FaMoneyCheckAlt, label: 'Saldo y Pagos' },
    { href: '/customer/orders', icon: FiShoppingBag, label: 'Mis Pedidos' },
    { href: '/customer/wishlist', icon: PiListHeartBold, label: 'Lista de Deseos' },
    { href: '/customer/addresses', icon: FiMapPin, label: 'Direcciones' },
    { href: '/customer/warranty', icon: FiShield, label: 'Garantía' },
    { href: '/customer/profile', icon: FiUser, label: 'Mi Perfil' },
    { href: '/customer/settings', icon: FiSettings, label: 'Configuración' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: '/auth/signin',
        redirect: true
      });
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      router.push('/auth/signin');
      router.refresh();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
        {/* Mobile Overlay Backdrop */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } bg-white/95 backdrop-blur-xl border-r border-white/30 w-64 shadow-2xl overflow-hidden`}
        >
          <div className="h-full flex flex-col">
            {/* Logo & Close Button */}
            <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 lg:py-5 border-b border-[#e9ecef]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-[#2a63cd] shadow-md shadow-[#2a63cd]/20">
                  {companySettings?.logo ? (
                    <div className="relative w-full h-full">
                      <Image src={companySettings.logo} alt={companySettings.companyName} fill className="object-contain p-1" />
                    </div>
                  ) : (
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#212529]">
                    {companySettings?.companyName || 'Electro Shop'}
                  </h2>
                  <p className="text-xs text-[#6a6c6b]">Mi Panel</p>
                </div>
              </div>
              {/* Close button - Mobile only */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 lg:px-3 py-3 lg:py-4 overflow-y-auto">
              <ul className="space-y-0.5 lg:space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/customer' && pathname.startsWith(item.href));

                  return (
                    <li key={item.label} style={{ animationDelay: `${index * 50}ms` }} className="animate-fadeIn">
                      <Link
                        href={item.href}
                        onClick={() => isMobile && setIsSidebarOpen(false)}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 lg:py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isActive
                          ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg shadow-[#2a63cd]/30 scale-[1.02]'
                          : 'text-[#6a6c6b] hover:bg-[#f8f9fa] hover:text-[#212529] hover:scale-[1.01]'
                          }`}
                      >
                        <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-[#6a6c6b] group-hover:scale-110'}`}>
                          <item.icon className="w-5 h-5" />
                        </span>
                        <span className="relative z-10">{item.label}</span>
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
            <div className="border-t border-[#e9ecef] p-3 lg:p-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="relative w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#f8f9fa] border border-[#dee2e6] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {userImage ? (
                    <Image
                      src={userImage}
                      alt={session.user?.name || 'Usuario'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xs lg:text-sm font-semibold text-[#2a63cd]">
                      {session.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#212529] truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-[#6a6c6b] truncate">
                    {session.user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="group relative w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f8f9fa] hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-[#6a6c6b] hover:text-red-600 text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-md hover:scale-[1.02] overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/10 group-hover:to-red-500/0 transition-all duration-300"></span>
                <FiLogOut className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-[-2px]" />
                <span className="relative z-10">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${isSidebarOpen && !isMobile ? 'lg:ml-64' : 'ml-0'}`}>
          {/* Top Bar - Responsive */}
          <header className="bg-white border-b border-[#e9ecef] sticky top-0 z-30 shadow-sm">
            <div className="px-3 lg:px-6 py-2 lg:py-4 flex items-center justify-between">
              {/* Menu Toggle */}
              <button
                onClick={toggleSidebar}
                className="relative p-2 hover:bg-[#f8f9fa] rounded-lg transition-all duration-300 group"
              >
                {isSidebarOpen && isMobile ? (
                  <FiX className="w-5 h-5 text-[#6a6c6b] group-hover:text-[#2a63cd] transition-colors" />
                ) : (
                  <FiMenu className="w-5 h-5 text-[#6a6c6b] group-hover:text-[#2a63cd] transition-colors" />
                )}
              </button>

              {/* Center - Email Verification Status */}
              <div className="flex-1 flex justify-center">
                {(session?.user as any)?.emailVerified ? (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#dcfce7', border: '2px solid #22c55e' }}
                  >
                    <svg className="w-4 h-4" style={{ color: '#15803d' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span style={{ color: '#14532d' }}>Verificado</span>
                  </div>
                ) : (
                  <Link
                    href="/customer/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Verificar</span>
                  </Link>
                )}
              </div>

              {/* Home Button */}
              <Link
                href="/"
                className="flex items-center justify-center w-9 h-9 lg:w-auto lg:h-auto lg:px-4 lg:py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-full lg:rounded-lg hover:shadow-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden lg:inline ml-2 text-sm font-semibold">Tienda</span>
              </Link>
            </div>
          </header>

          {/* Page Content with Smooth Transition */}
          <main className="p-3 lg:p-6 overflow-hidden relative pb-20 lg:pb-6">
            {/* Shimmer Effect on Transition */}
            <div
              className="absolute inset-3 lg:inset-6 rounded-xl pointer-events-none z-10 overflow-hidden"
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
              className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-xl shadow-xl border border-white/30 min-h-[calc(100vh-10rem)] lg:h-[calc(100vh-8rem)] overflow-y-auto p-4 lg:p-6"
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

