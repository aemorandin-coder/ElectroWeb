'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { FiLogOut, FiUser, FiPackage, FiSettings, FiCheckCircle, FiAlertCircle, FiChevronRight } from 'react-icons/fi';
import { FaPowerOff } from "react-icons/fa";

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
      {/* User Button - Enhanced with glow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-1.5 px-1.5 py-1 hover:bg-white/10 rounded-xl transition-all duration-300 group hover:scale-105"
      >
        {userImage && !imageError ? (
          <div className={`relative w-9 h-9 rounded-full overflow-hidden border-2 shadow-lg group-hover:shadow-xl transition-all ${isVerified
            ? 'border-emerald-400 shadow-emerald-500/30'
            : 'border-amber-400 shadow-amber-500/30 animate-pulse'
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
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white text-xs font-black shadow-lg group-hover:shadow-xl transition-all border-2 ${isVerified
            ? 'border-emerald-400 shadow-emerald-500/30'
            : 'border-amber-400 shadow-amber-500/30 animate-pulse'
            }`}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Different styles for Mobile vs Desktop */}
      {isOpen && (
        <>
          {/* ============== MOBILE DROPDOWN (Premium Glassmorphism - Matching Notifications) ============== */}
          <div
            className="sm:hidden profile-dropdown-mobile z-[9999] animate-mobileProfileIn"
            style={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '70px',
              width: '85vw',
              maxWidth: '290px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 20px 60px -15px rgba(42, 99, 205, 0.35), 0 8px 25px -8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Compact Header - Matching Notifications Style */}
            <div
              className="px-3 py-2.5 relative overflow-hidden"
              style={{
                background: isVerified
                  ? 'linear-gradient(135deg, #2a63cd 0%, #1e4ba3 50%, #0ea5e9 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
              }}
            >
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'shimmer 2s infinite',
                }}
              />

              {/* Top Row: Icon + Title + Logout */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/25 backdrop-blur-sm flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm drop-shadow-sm">Mi Cuenta</span>
                </div>

                {/* Logout Button - Compact */}
                <button
                  onClick={handleSignOut}
                  className="w-7 h-7 rounded-lg bg-red-500/80 flex items-center justify-center hover:bg-red-600 transition-all active:scale-95"
                  title="Cerrar Sesión"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                    <path d="M5 21a2 2 0 01-2-2V5a2 2 0 012-2h7v2H5v14h7v2H5z" />
                    <path d="M16.172 11H10v2h6.172l-2.536 2.536 1.414 1.414L20 12l-4.95-4.95-1.414 1.414L16.172 11z" />
                  </svg>
                </button>
              </div>

              {/* User Info Card - Glassmorphism */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  {userImage && !imageError ? (
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white/40 shadow-lg flex-shrink-0">
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
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-base font-black shadow-lg flex-shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* User Info - Matching Notification sizes */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-white font-bold text-sm truncate drop-shadow-sm">{userName}</span>
                    <span className="text-white/80 text-xs truncate">{userEmail}</span>

                    {/* Verification Badge - Compact */}
                    <div className="mt-1.5">
                      {isVerified ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-400/25 rounded-full border border-emerald-300/40 backdrop-blur-sm">
                          <FiCheckCircle className="w-3 h-3 text-emerald-300" />
                          <span className="text-emerald-200 text-[9px] font-bold">VERIFICADA</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full border border-white/30 animate-pulse">
                          <FiAlertCircle className="w-3 h-3 text-white" />
                          <span className="text-white text-[9px] font-bold">SIN VERIFICAR</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items - Matching Notification Style with staggered animations */}
            <div className="py-1.5">
              {isCustomer && (
                <>
                  <div className="animate-mobileItemIn" style={{ animationDelay: '60ms' }}>
                    <Link
                      href="/customer"
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-blue-50/80 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg"
                        style={{ boxShadow: '0 4px 14px -3px rgba(59, 130, 246, 0.5)' }}
                      >
                        <FiUser className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-xs block" style={{ color: '#111827' }}>Mi Panel</span>
                        <span className="text-[10px]" style={{ color: '#374151' }}>Dashboard personal</span>
                      </div>
                      <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </div>

                  <div className="animate-mobileItemIn" style={{ animationDelay: '120ms' }}>
                    <Link
                      href="/customer/orders"
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-purple-50/80 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg"
                        style={{ boxShadow: '0 4px 14px -3px rgba(168, 85, 247, 0.5)' }}
                      >
                        <FiPackage className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-xs block" style={{ color: '#111827' }}>Mis Pedidos</span>
                        <span className="text-[10px]" style={{ color: '#374151' }}>Historial de compras</span>
                      </div>
                      <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </div>
                </>
              )}

              {isAdmin && (
                <div className="animate-mobileItemIn" style={{ animationDelay: '60ms' }}>
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-indigo-50/80 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg"
                      style={{ boxShadow: '0 4px 14px -3px rgba(99, 102, 241, 0.5)' }}
                    >
                      <FiSettings className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-xs block" style={{ color: '#111827' }}>Panel Admin</span>
                      <span className="text-[10px]" style={{ color: '#374151' }}>Administración</span>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ============== DESKTOP DROPDOWN (Simple Git Style) ============== */}
          <div className="hidden sm:block profile-dropdown absolute right-0 mt-2 w-64 max-w-[280px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[9999] animate-dropdown-enter">
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
        </>
      )}

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes dropdown-enter {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes ripple {
          0% { 
            transform: scale(0);
            opacity: 1;
          }
          100% { 
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .animate-dropdown-enter {
          animation: dropdown-enter 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .active\\:animate-ripple:active {
          animation: ripple 0.4s ease-out;
        }
        @keyframes mobileProfileIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.9) translateY(-20px);
          }
          60% {
            opacity: 1;
            transform: translateX(-50%) scale(1.02) translateY(2px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1) translateY(0);
          }
        }
        .animate-mobileProfileIn {
          animation: mobileProfileIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes mobileItemIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-mobileItemIn {
          animation: mobileItemIn 0.25s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
