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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

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

      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevPathname(pathname);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

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
    { href: '/customer/wishlist', icon: FiHeart, label: 'Lista de Deseos' },
    { href: '/customer/addresses', icon: FiMapPin, label: 'Direcciones' },
    { href: '/customer/warranty', icon: FiShield, label: 'Garantía y Devoluciones' },
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
                {companySettings?.logo ? (
                  <div className="relative w-full h-full">
                    <Image src={companySettings.logo} alt={companySettings.companyName} fill className="object-contain p-1" />
                  </div>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ul className="space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/customer' && pathname.startsWith(item.href));

                  return (
                    <li key={item.label} style={{ animationDelay: `${index * 50}ms` }} className="animate-fadeIn">
                      <Link
                        href={item.href}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isActive
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
            <div className="border-t border-[#e9ecef] p-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="relative w-9 h-9 rounded-full bg-[#f8f9fa] border border-[#dee2e6] overflow-hidden flex items-center justify-center">
                  {userImage ? (
                    <Image
                      src={userImage}
                      alt={session.user?.name || 'Usuario'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#2a63cd]">
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
                <svg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-[-2px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="relative z-10">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          {/* Top Bar */}
          <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-white/30 shadow-lg">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-lg hover:bg-[#f8f9fa] transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-5 h-5 text-[#212529]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-[#212529]">
                  {menuItems.find((item) => item.href === pathname)?.label || 'Mi Cuenta'}
                </h1>
              </div>

              <Link
                href="/"
                className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-medium text-sm transition-all duration-300 hover:shadow-lg hover:shadow-[#2a63cd]/30 hover:scale-105"
              >
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Ir a la Tienda</span>
              </Link>
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
              className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/30 h-[calc(100vh-8rem)] overflow-hidden p-6"
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
