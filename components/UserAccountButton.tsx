'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { FiLogOut, FiUser, FiPackage, FiSettings, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

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
    const buttonClasses = useBlueHeader
      ? "relative px-4 py-2 text-sm font-medium text-[#2a63cd] bg-white hover:bg-gray-100 rounded-lg transition-all duration-300 shadow-md shadow-white/20 hover:shadow-lg hover:shadow-white/30 hover:scale-105"
      : "relative px-4 py-2 text-sm font-medium text-white bg-[#2a63cd] hover:bg-[#1e4ba3] rounded-lg transition-all duration-300 shadow-md shadow-[#2a63cd]/20 hover:shadow-lg hover:shadow-[#2a63cd]/30 hover:scale-105";

    return (
      <Link href="/login" id="login-btn" className={buttonClasses}>
        <svg className="w-5 h-5 md:hidden flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="hidden md:inline">Iniciar Sesión</span>
      </Link>
    );
  }

  const user = session.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const userEmail = user?.email || '';
  const userImage = (user as any)?.image || null;
  const isVerified = (session.user as any)?.emailVerified;
  const isCustomer = (session.user as any)?.userType === 'customer';
  const isAdmin = (session.user as any)?.userType === 'admin';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-2 py-1.5 hover:bg-[#f8f9fa] rounded-lg transition-all duration-300 group hover:scale-105"
      >
        {userImage && !imageError ? (
          <div className={`relative w-10 h-10 rounded-full overflow-hidden border-[3px] shadow-md group-hover:shadow-lg transition-all ${isVerified
            ? 'border-emerald-500 group-hover:border-emerald-400'
            : 'border-amber-500 group-hover:border-amber-400 animate-pulse'
            }`}>
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
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:shadow-lg transition-all border-[3px] ${isVerified
            ? 'border-emerald-500 group-hover:border-emerald-400'
            : 'border-amber-500 group-hover:border-amber-400 animate-pulse'
            }`}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
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

      {/* Dropdown Menu - Mobile Optimized */}
      {isOpen && (
        <div className="profile-dropdown fixed sm:absolute right-3 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-24px)] sm:w-64 max-w-[280px] bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[9999]">
          {/* Header with gradient */}
          <div
            className="p-4 relative overflow-hidden"
            style={{
              background: isVerified
                ? 'linear-gradient(135deg, #2a63cd 0%, #1e4ba3 50%, #1a3d8f 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
            }}
          >
            {isVerified && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            )}

            <div className="flex items-center gap-3 relative z-10">
              {userImage && !imageError ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
                  <Image
                    src={userImage}
                    alt={userName}
                    fill
                    className="object-cover"
                    draggable={false}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-white font-semibold text-sm truncate">{userName}</span>
                <span className="text-white/80 text-xs truncate">{userEmail}</span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {isVerified ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-400/20 rounded-full border border-emerald-300/30">
                      <FiCheckCircle className="w-3 h-3 text-emerald-300" />
                      <span className="text-emerald-300 text-[9px] font-bold">VERIFICADA</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full border border-white/30 animate-pulse">
                      <FiAlertCircle className="w-3 h-3 text-white" />
                      <span className="text-white text-[9px] font-bold">¡SIN VERIFICAR!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2 bg-white">
            {isCustomer && (
              <>
                <Link
                  href="/customer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-black font-medium text-sm">Mi Panel</span>
                </Link>
                <Link
                  href="/customer/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FiPackage className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-black font-medium text-sm">Mis Pedidos</span>
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FiSettings className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-black font-medium text-sm">Panel Admin</span>
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-lg transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <FiLogOut className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-red-600 font-semibold text-sm">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
