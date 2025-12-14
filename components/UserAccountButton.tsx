'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';

interface UserAccountButtonProps {
  useBlueHeader?: boolean;
}

export default function UserAccountButton({ useBlueHeader = false }: UserAccountButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);


  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      clearCart();
      await signOut({ callbackUrl: '/', redirect: true });
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      clearCart();
      router.push('/');
      router.refresh();
    }
  };

  if (status === 'loading') {
    return (
      <button className="relative p-2 hover:bg-[#f8f9fa] rounded-lg transition-all duration-300 group hover:scale-110">
        <svg className="w-5 h-5 text-[#6a6c6b] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
    );
  }

  if (!session) {
    // Colores dinámicos según el scroll
    // Cuando useBlueHeader es true (header azul), el botón debe ser blanco con texto azul
    // Cuando useBlueHeader es false (header blanco), el botón debe ser azul con texto blanco
    const buttonClasses = useBlueHeader
      ? "relative px-4 py-2 text-sm font-medium text-[#2a63cd] bg-white hover:bg-gray-100 rounded-lg transition-all duration-300 shadow-md shadow-white/20 hover:shadow-lg hover:shadow-white/30 hover:scale-105"
      : "relative px-4 py-2 text-sm font-medium text-white bg-[#2a63cd] hover:bg-[#1e4ba3] rounded-lg transition-all duration-300 shadow-md shadow-[#2a63cd]/20 hover:shadow-lg hover:shadow-[#2a63cd]/30 hover:scale-105";

    return (
      <Link href="/login" className={buttonClasses}>
        Iniciar Sesión
      </Link>
    );
  }

  const user = session.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const userEmail = user?.email || '';
  const userImage = (user as any)?.image || null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-3 py-2 hover:bg-[#f8f9fa] rounded-lg transition-all duration-300 group hover:scale-105"
      >
        {userImage && !imageError ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#2a63cd]/30 group-hover:border-[#2a63cd] transition-colors select-none">
            <Image
              src={userImage}
              alt={userName}
              fill
              className="object-cover"
              draggable={false}
              unoptimized
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:shadow-lg transition-shadow">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="hidden md:flex flex-col items-start">
          <span className="text-xs font-semibold text-[#212529]">{userName}</span>
          <span className="text-xs text-[#6a6c6b]">{userEmail}</span>
        </div>
        <svg
          className={`w-4 h-4 text-[#6a6c6b] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="absolute inset-0 rounded-lg bg-[#2a63cd]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#e9ecef] overflow-hidden z-50 animate-fadeIn">
          {/* User Info Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#f8f9fa] to-white border-b border-[#e9ecef]">
            <div className="flex items-center gap-3">
              {userImage && !imageError ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#2a63cd]/30">
                  <Image
                    src={userImage}
                    alt={userName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#212529] truncate">{userName}</p>
                <p className="text-xs text-[#6a6c6b] truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Panel de Cliente - Solo para clientes */}
            {(session.user as any)?.userType === 'customer' && (
              <Link
                href="/customer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#212529] hover:bg-[#f8f9fa] transition-colors group"
              >
                <svg className="w-5 h-5 text-[#6a6c6b] group-hover:text-[#2a63cd] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Mi Panel</span>
              </Link>
            )}

            {/* Mis Pedidos - Solo para clientes */}
            {(session.user as any)?.userType === 'customer' && (
              <Link
                href="/customer/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#212529] hover:bg-[#f8f9fa] transition-colors group"
              >
                <svg className="w-5 h-5 text-[#6a6c6b] group-hover:text-[#2a63cd] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Mis Pedidos</span>
              </Link>
            )}

            {/* Panel Admin - Solo para admins */}
            {(session.user as any)?.userType === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#212529] hover:bg-[#f8f9fa] transition-colors group"
              >
                <svg className="w-5 h-5 text-[#6a6c6b] group-hover:text-[#2a63cd] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span>Panel Admin</span>
              </Link>
            )}
          </div>

          {/* Logout Button */}
          <div className="border-t border-[#e9ecef] p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
