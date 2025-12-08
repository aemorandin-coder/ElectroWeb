'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  // State for client-side hydration
  const [mounted, setMounted] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(settings || null);

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

  // Render a simple placeholder during SSR to match client
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-[#e9ecef] shadow-sm h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e9ecef] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Enhanced and Larger */}
          <Link href="/" className="flex items-center gap-4 group">
            {companySettings?.logo && (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-105" style={{ boxShadow: `0 10px 15px -3px ${primaryColor}4d` }}>
                <Image
                  src={companySettings.logo}
                  alt={companySettings.companyName}
                  fill
                  className="object-contain"
                  priority
                  quality={100}
                  sizes="56px"
                  unoptimized
                />
              </div>
            )}
            <div>
              <h1
                className="text-2xl font-black text-transparent bg-clip-text tracking-tight"
                style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
              >
                {companySettings?.companyName?.split(' ')[0] || 'ELECTRO SHOP'}
              </h1>
              <p className="text-sm text-[#6a6c6b] font-semibold tracking-wide">
                {companySettings?.companyName?.split(' ').slice(1).join(' ') || 'Morandin C.A.'}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/productos" className="relative text-sm font-medium text-[#6a6c6b] transition-all duration-300 group">
              <span className="relative z-10 group-hover:text-[#2a63cd]">Productos</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}></span>
            </Link>
            <Link href="/categorias" className="relative text-sm font-medium text-[#6a6c6b] transition-all duration-300 group">
              <span className="relative z-10 group-hover:text-[#2a63cd]">Categorías</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}></span>
            </Link>
            <Link href="/servicios" className="relative text-sm font-medium text-[#6a6c6b] transition-all duration-300 group">
              <span className="relative z-10 group-hover:text-[#2a63cd]">Servicios</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}></span>
            </Link>
            <Link href="/cursos" className="relative text-sm font-medium text-[#6a6c6b] transition-all duration-300 group">
              <span className="relative z-10 group-hover:text-[#2a63cd]">Cursos Online</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}></span>
            </Link>
            <Link href="/contacto" className="relative text-sm font-medium text-[#6a6c6b] transition-all duration-300 group">
              <span className="relative z-10 group-hover:text-[#2a63cd]">Contáctanos</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}></span>
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <NotificationBell />
            <CartIcon />
            <UserAccountButton />
          </div>
        </div>
      </div>
    </header>
  );
}
