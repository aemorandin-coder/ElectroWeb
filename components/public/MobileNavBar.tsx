'use client';

// [MOBILE ONLY] Premium Floating Bottom Navigation Bar
// Features: Floating design with rounded corners, scroll-based opacity transitions,
// premium icons with glow effects, smooth animations, and tactile feedback

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { FiX } from 'react-icons/fi';

// [MOBILE ONLY] Premium SVG Icons with refined design
const PremiumHomeIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <path
            d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <path
            d="M9 21V14H15V21"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PremiumProductsIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <rect
            x="3" y="3" width="7" height="7" rx="1.5"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <rect
            x="14" y="3" width="7" height="7" rx="1.5"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <rect
            x="3" y="14" width="7" height="7" rx="1.5"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <rect
            x="14" y="14" width="7" height="7" rx="1.5"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
    </svg>
);

const PremiumCategoriesIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <circle
            cx="12" cy="7" r="4"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <circle
            cx="6" cy="17" r="3"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <circle
            cx="18" cy="17" r="3"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
    </svg>
);

const PremiumGiftIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <rect
            x="3" y="8" width="18" height="13" rx="2"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <path
            d="M12 8V21"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
        />
        <path
            d="M3 12H21"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
        />
        <path
            d="M7.5 8C7.5 8 7.5 4 10 4C12 4 12 6 12 8"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
        />
        <path
            d="M16.5 8C16.5 8 16.5 4 14 4C12 4 12 6 12 8"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
        />
    </svg>
);

const PremiumMenuIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <circle
            cx="12" cy="5" r="2"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.5)' : 'currentColor'}
        />
        <circle
            cx="12" cy="12" r="2"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.5)' : 'currentColor'}
        />
        <circle
            cx="12" cy="19" r="2"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.5)' : 'currentColor'}
        />
    </svg>
);

// [MOBILE ONLY] Premium icon for Servicios (Gear)
const PremiumServiciosIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <path
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
        <circle
            cx="12" cy="12" r="3"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
    </svg>
);

// [MOBILE ONLY] Premium icon for Cursos (Book)
const PremiumCursosIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <path
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? 'rgba(42, 99, 205, 0.15)' : 'none'}
        />
    </svg>
);

// [MOBILE ONLY] Premium icon for Contacto (Envelope)
const PremiumContactoIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <path
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
    </svg>
);

// [MOBILE ONLY] Premium icon for Solicitar Producto (Package/Box)
const PremiumSolicitarIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <path
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? 'rgba(42, 99, 205, 0.15)' : 'none'}
        />
    </svg>
);

// [MOBILE ONLY] Premium icon for Cart (Shopping Cart)
const PremiumCartIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <path
            d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.07 15.93 4.52 17 5.41 17H17M17 17A2 2 0 1017 21 2 2 0 0017 17ZM9 17A2 2 0 109 21 2 2 0 009 17Z"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'}
        />
    </svg>
);

const mainNavItems = [
    { href: '/', label: 'Inicio', Icon: PremiumHomeIcon },
    { href: '/productos', label: 'Productos', Icon: PremiumProductsIcon },
    { href: '/categorias', label: 'Categorias', Icon: PremiumCategoriesIcon },
    { href: '/carrito', label: 'Carrito', Icon: PremiumCartIcon },
];

const drawerNavItems = [
    { href: '/gift-cards', label: 'Gift Cards', Icon: PremiumGiftIcon },
    { href: '/servicios', label: 'Servicios', Icon: PremiumServiciosIcon },
    { href: '/cursos', label: 'Cursos', Icon: PremiumCursosIcon },
    { href: '/contacto', label: 'Contacto', Icon: PremiumContactoIcon },
    { href: '/solicitar-producto', label: 'Solicitar', Icon: PremiumSolicitarIcon },
];

export default function MobileNavBar() {
    const { items } = useCart();
    const cartCount = items.length;
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const pathname = usePathname();
    const navRef = useRef<HTMLElement>(null);

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerOpen]);

    // [MOBILE ONLY] Scroll detection for opacity transition
    const handleScroll = useCallback(() => {
        const scrollY = window.scrollY;
        setIsScrolled(scrollY > 100);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    // [MOBILE ONLY] Tactile feedback on touch
    const handleTouchStart = (href: string) => {
        setActiveItem(href);
    };

    const handleTouchEnd = () => {
        setTimeout(() => setActiveItem(null), 150);
    };

    // [MOBILE ONLY] Don't render on customer or admin routes - they have their own nav
    const isCustomerRoute = pathname?.startsWith('/customer');
    const isAdminRoute = pathname?.startsWith('/admin');
    const shouldHide = isCustomerRoute || isAdminRoute;

    // Always render the fragment but conditionally show content
    // This ensures hooks are always called in the same order
    if (shouldHide) {
        return null;
    }

    return (
        <>
            {/* Backdrop Overlay for Drawer */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[998] transition-opacity duration-300 animate-fadeIn"
                    onClick={() => setIsDrawerOpen(false)}
                />
            )}

            {/* Premium Floating Drawer / Modal Menu */}
            {isDrawerOpen && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] p-6 z-[999] shadow-[0_-15px_30px_rgba(0,0,0,0.5)] safe-area-bottom animate-slideUp">
                    {/* Drag Handle */}
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5" />
                    
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Menú de Navegación</h3>
                        <button
                            onClick={() => setIsDrawerOpen(false)}
                            className="text-white/60 hover:text-white p-1.5 rounded-full bg-white/5 active:scale-90 transition-all cursor-pointer"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3.5 mb-6">
                        {drawerNavItems.map((item) => {
                            const { Icon } = item;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsDrawerOpen(false)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                                        active
                                            ? 'bg-[#2a63cd]/15 border-[#2a63cd]/40 text-[#60a5fa] shadow-[0_4px_15px_rgba(42,99,205,0.15)]'
                                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                    } ${
                                        item.href === '/solicitar-producto'
                                            ? 'col-span-2 flex-row gap-3 py-3 bg-gradient-to-r from-[#2a63cd]/10 to-blue-500/5 border-[#2a63cd]/30 text-white hover:opacity-90'
                                            : ''
                                    }`}
                                >
                                    <Icon active={active} />
                                    <span className={`text-[11px] font-bold tracking-wide ${item.href === '/solicitar-producto' ? 'mt-0' : 'mt-1.5'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* [MOBILE ONLY] Premium Floating Bottom Tab Bar */}
            <nav
                ref={navRef}
                className="lg:hidden fixed z-[999] safe-area-bottom mobile-floating-nav"
                style={{
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    borderRadius: '20px',
                    background: isScrolled
                        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                        : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
                    boxShadow: isScrolled
                        ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 12px rgba(42, 99, 205, 0.08)'
                        : '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    transition: 'all 0.3s ease-in-out',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <div className="flex items-center justify-around h-16 w-full px-2">
                    {/* Main Nav Items */}
                    {mainNavItems.map((item) => {
                        const { Icon } = item;
                        const active = isActive(item.href);
                        const isTouched = activeItem === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onTouchStart={() => handleTouchStart(item.href)}
                                onTouchEnd={handleTouchEnd}
                                className="flex flex-col items-center justify-center h-14 relative flex-1"
                                style={{
                                    color: active ? '#60a5fa' : 'rgba(255, 255, 255, 0.65)',
                                    transform: isTouched ? 'scale(0.92)' : 'scale(1)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                {active && (
                                    <div
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background: 'radial-gradient(ellipse at center, rgba(42, 99, 205, 0.25) 0%, transparent 70%)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )}
                                <div className="relative">
                                    <Icon active={active} />
                                    {item.href === '/carrito' && cartCount > 0 && (
                                        <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#0f172a] shadow-md shadow-red-500/30 animate-pulse">
                                            {cartCount}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className="text-[9.5px] mt-0.5 relative z-10 text-center truncate font-bold"
                                    style={{
                                        letterSpacing: active ? '0.01em' : '0',
                                    }}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More button */}
                    <button
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        onTouchStart={() => handleTouchStart('more')}
                        onTouchEnd={handleTouchEnd}
                        className="flex flex-col items-center justify-center h-14 relative flex-1 cursor-pointer bg-transparent border-0 outline-none"
                        style={{
                            color: isDrawerOpen ? '#60a5fa' : 'rgba(255, 255, 255, 0.65)',
                            transform: activeItem === 'more' ? 'scale(0.92)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        {isDrawerOpen && (
                            <div
                                className="absolute inset-0 rounded-xl"
                                style={{
                                    background: 'radial-gradient(ellipse at center, rgba(42, 99, 205, 0.25) 0%, transparent 70%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                        <div className="relative">
                            <PremiumMenuIcon active={isDrawerOpen} />
                        </div>
                        <span className="text-[9.5px] mt-0.5 relative z-10 text-center truncate font-bold">
                            Más
                        </span>
                    </button>
                </div>
            </nav>

            <style jsx>{`
                /* [MOBILE ONLY] Slide up animation for menu sheet */
                @keyframes slide-up {
                    from { 
                        transform: translateY(100%); 
                        opacity: 0.8;
                    }
                    to { 
                        transform: translateY(0); 
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slideUp {
                    animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                /* [MOBILE ONLY] Safe area for iOS */
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
                
                /* [MOBILE ONLY] Remove tap highlight */
                .mobile-floating-nav a,
                .mobile-floating-nav button {
                    -webkit-tap-highlight-color: transparent;
                }
            `}</style>
        </>
    );
}
