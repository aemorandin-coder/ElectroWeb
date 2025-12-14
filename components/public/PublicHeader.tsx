'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import CartIcon from '@/components/CartIcon';
import UserAccountButton from '@/components/UserAccountButton';
import NotificationBell from '@/components/notifications/NotificationBell';

interface CompanySettings {
  companyName: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export default function PublicHeader({ settings }: { settings?: CompanySettings | null }) {
  const [mounted, setMounted] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(settings || null);
  const [isOnDarkSection, setIsOnDarkSection] = useState(true); // Start with dark (hero)
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (settings) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/public', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setCompanySettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, [settings]);

  // Scroll detection to change header style
  const checkSectionUnderHeader = useCallback(() => {
    if (typeof window === 'undefined' || pathname !== '/') {
      setIsOnDarkSection(false); // Other pages always light header
      return;
    }

    const headerHeight = 80; // Header is 80px tall
    const checkPoint = headerHeight / 2; // Check in the middle of the header

    // Find all sections and check which one is under the header
    const sections = document.querySelectorAll('section');
    let isDark = true; // Default: hero is dark

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      // If the section is visible at the header position
      if (rect.top <= checkPoint && rect.bottom >= checkPoint) {
        // Check if section has dark background (contains blue gradient classes)
        const classList = section.className;
        const hasDarkBg = classList.includes('from-[#2a63cd]') ||
          classList.includes('from-[#1e4ba3]') ||
          classList.includes('from-[#1a3b7e]') ||
          classList.includes('bg-gradient-to-br from-[#2a63cd]');
        isDark = hasDarkBg;
      }
    });

    setIsOnDarkSection(isDark);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;

    checkSectionUnderHeader();
    window.addEventListener('scroll', checkSectionUnderHeader, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkSectionUnderHeader);
    };
  }, [mounted, checkSectionUnderHeader]);

  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const primaryColor = companySettings?.primaryColor || '#2a63cd';
      const secondaryColor = companySettings?.secondaryColor || '#1e4ba3';
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    }
  }, [companySettings, mounted]);

  const primaryColor = companySettings?.primaryColor || '#2a63cd';
  const secondaryColor = companySettings?.secondaryColor || '#1e4ba3';

  // Invertido: cuando está sobre sección azul -> header blanco, sobre blanco -> header azul
  // Solo en la página principal
  const useBlueHeader = pathname === '/' && !isOnDarkSection;

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-[#e9ecef] shadow-sm h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full" />
      </header>
    );
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${useBlueHeader
        ? 'bg-gradient-to-r from-[#2a63cd]/95 to-[#1e4ba3]/95 backdrop-blur-md border-b border-white/10 shadow-lg'
        : 'bg-white/95 backdrop-blur-md border-b border-[#e9ecef] shadow-sm'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            {companySettings?.logo && (
              <div className="relative w-12 h-12 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src={companySettings.logo}
                  alt={companySettings.companyName}
                  fill
                  className="object-contain drop-shadow-md"
                  priority
                  quality={100}
                  sizes="48px"
                  unoptimized
                />
              </div>
            )}
            <h1
              className={`text-2xl font-black tracking-wide transition-colors duration-300 ${useBlueHeader ? 'text-white' : 'text-transparent bg-clip-text'
                }`}
              style={{
                backgroundImage: useBlueHeader ? 'none' : `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                fontFamily: 'var(--font-tektrron), sans-serif',
                WebkitBackgroundClip: useBlueHeader ? 'unset' : 'text',
              }}
            >
              {companySettings?.companyName || 'Electro Shop'}
            </h1>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: '/productos', label: 'Productos' },
              { href: '/categorias', label: 'Categorías' },
              { href: '/servicios', label: 'Servicios' },
              { href: '/cursos', label: 'Cursos Online' },
              { href: '/contacto', label: 'Contáctanos' },
            ].map((link) => {
              const isActive = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative text-base font-medium transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 rounded-sm"
                  style={{
                    color: useBlueHeader
                      ? (isActive ? 'white' : 'rgba(255,255,255,0.8)')
                      : (isActive ? primaryColor : '#6a6c6b')
                  }}
                >
                  <span className={`relative z-10 ${useBlueHeader
                    ? 'group-hover:text-white'
                    : (!isActive ? 'group-hover:text-[#2a63cd]' : '')
                    }`}>
                    {link.label}
                  </span>
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}
                    style={{
                      background: useBlueHeader
                        ? 'white'
                        : `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
                    }}
                  ></span>
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-4 ${useBlueHeader ? '[&_*]:text-white [&_svg]:text-white' : ''}`}>
              <NotificationBell />
              <CartIcon />
            </div>
            <UserAccountButton useBlueHeader={useBlueHeader} />
          </div>
        </div>
      </div>
    </header>
  );
}

