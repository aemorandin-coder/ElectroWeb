'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { FiLogOut, FiUser, FiPackage, FiSettings, FiCheckCircle, FiAlertCircle, FiChevronRight } from 'react-icons/fi';

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

  // Prevent background scroll when dropdown is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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
      ? "relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-[#2a63cd] bg-white hover:bg-gray-100 rounded-lg transition-all duration-300 shadow-md shadow-white/20 hover:shadow-lg hover:shadow-white/30 hover:scale-105"
      : "relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-[#2a63cd] hover:bg-[#1e4ba3] rounded-lg transition-all duration-300 shadow-md shadow-[#2a63cd]/20 hover:shadow-lg hover:shadow-[#2a63cd]/30 hover:scale-105";

    return (
      <Link href="/login" id="login-btn" className={buttonClasses}>
        <FiUser className="w-4 h-4 sm:hidden flex-shrink-0" />
        <span className="hidden sm:inline">Iniciar Sesión</span>
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
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-20 bg-black/40 backdrop-blur-sm z-40 sm:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-1.5 px-1.5 py-1 hover:bg-white/10 rounded-xl transition-all duration-300 group hover:scale-105 z-[60] sm:z-auto"
      >
        {userImage && !imageError ? (
          <div className={`relative w-9 h-9 rounded-full overflow-hidden border-2 shadow-md group-hover:shadow-lg transition-all animate-periodic-wave ${isVerified
            ? 'border-emerald-400 shadow-emerald-500/20'
            : 'border-amber-400 shadow-amber-500/20 animate-pulse'
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
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-xs font-black shadow-md group-hover:shadow-lg transition-all border-2 animate-periodic-wave ${isVerified
            ? 'border-emerald-400 shadow-emerald-500/20'
            : 'border-amber-400 shadow-amber-500/20 animate-pulse'
            }`}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {/* Unified Dropdown Menu (Responsive: Slide-up on mobile, Dropdown on Desktop) */}
      {isOpen && (
        <div 
          className={`
            fixed sm:absolute z-[60] sm:z-50
            top-20 sm:top-full
            left-4 right-4 sm:left-auto sm:right-0 sm:mt-3
            w-auto sm:w-[300px] 
            bg-white rounded-2xl
            shadow-2xl 
            border border-gray-100 overflow-hidden 
            animate-fade-in sm:animate-dropdown-enter
            pb-safe sm:pb-0
          `}
        >

          {/* Premium Header Profile Section */}
          <div className="px-5 py-4 bg-gradient-to-b from-[#f8f9fa] to-white border-b border-gray-100">
            <div className="flex items-center gap-4">
              {userImage && !imageError ? (
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0 border-2 border-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[#1a1a1a] font-black text-base truncate leading-tight">{userName}</span>
                <span className="text-[#6a6c6b] text-xs truncate mt-0.5">{userEmail}</span>
                
                {/* Status Badge */}
                <div className="mt-2">
                  {isVerified ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                      <FiCheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-700 text-[10px] font-bold tracking-wide">CUENTA VERIFICADA</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-100 animate-pulse">
                      <FiAlertCircle className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-700 text-[10px] font-bold tracking-wide">SIN VERIFICAR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="p-2.5 space-y-1 bg-white">
              <>
                <Link
                  href="/customer"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between px-3 py-3 rounded-xl hover:bg-blue-50 transition-colors duration-200 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100/50 flex items-center justify-center text-[#2a63cd] group-hover:bg-[#2a63cd] group-hover:text-white transition-colors">
                      <FiUser className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[#1a1a1a] font-bold text-sm block">Mi Panel</span>
                      <span className="text-[#6a6c6b] text-xs">Gestión de cuenta</span>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#2a63cd] group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  href="/customer/orders"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between px-3 py-3 rounded-xl hover:bg-purple-50 transition-colors duration-200 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100/50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <FiPackage className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[#1a1a1a] font-bold text-sm block">Mis Pedidos</span>
                      <span className="text-[#6a6c6b] text-xs">Historial de compras</span>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </Link>
              </>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between px-3 py-3 rounded-xl hover:bg-indigo-50 transition-colors duration-200 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <FiSettings className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#1a1a1a] font-bold text-sm block">Panel Admin</span>
                    <span className="text-[#6a6c6b] text-xs">Administración del sitio</span>
                  </div>
                </div>
                <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </Link>
            )}
          </div>

          {/* Logout Section */}
          <div className="p-3 border-t border-gray-100 bg-[#f8f9fa] sm:rounded-b-2xl mb-safe sm:mb-0">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all duration-200 group shadow-sm active:scale-95"
            >
              <FiLogOut className="w-4 h-4 text-[#6a6c6b] group-hover:text-red-600 transition-colors" />
              <span className="text-[#1a1a1a] group-hover:text-red-600 font-bold text-sm transition-colors">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes dropdown-enter {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-dropdown-enter {
          animation: dropdown-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .mb-safe {
          margin-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
