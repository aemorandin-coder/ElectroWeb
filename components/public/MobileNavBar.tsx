'use client';

// [MOBILE ONLY] Premium Floating Bottom Navigation Bar
// Features: Floating design with rounded corners, scroll-based opacity transitions,
// premium icons with glow effects, smooth animations, and tactile feedback

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

// [MOBILE ONLY] All navigation items in carousel order
const allNavItems = [
    { href: '/', label: 'Inicio', Icon: PremiumHomeIcon },
    { href: '/productos', label: 'Productos', Icon: PremiumProductsIcon },
    { href: '/categorias', label: 'Categorias', Icon: PremiumCategoriesIcon },
    { href: '/gift-cards', label: 'Gift Cards', Icon: PremiumGiftIcon },
    { href: '/servicios', label: 'Servicios', Icon: PremiumServiciosIcon },
    { href: '/cursos', label: 'Cursos', Icon: PremiumCursosIcon },
    { href: '/contacto', label: 'Contacto', Icon: PremiumContactoIcon },
    { href: '/solicitar-producto', label: 'Solicitar', Icon: PremiumSolicitarIcon },
];

export default function MobileNavBar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const pathname = usePathname();
    const navRef = useRef<HTMLElement>(null);

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
            {/* [MOBILE ONLY] Premium Floating Bottom Tab Bar */}
            <nav
                ref={navRef}
                className="lg:hidden fixed z-[999] safe-area-bottom mobile-floating-nav"
                style={{
                    // [MOBILE ONLY] Floating positioning with margins
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    // [MOBILE ONLY] Rounded corners - 20px as requested
                    borderRadius: '20px',
                    // [MOBILE ONLY] Dynamic background opacity based on scroll
                    background: isScrolled
                        ? 'linear-gradient(135deg, #0D1B2A 0%, #1B263B 50%, #0D1B2A 100%)'
                        : 'linear-gradient(135deg, rgba(13, 27, 42, 0.95) 0%, rgba(27, 38, 59, 0.95) 50%, rgba(13, 27, 42, 0.95) 100%)',
                    // [MOBILE ONLY] Premium shadow with blue glow
                    boxShadow: isScrolled
                        ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                        : '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                    // [MOBILE ONLY] Backdrop blur for glass effect
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    // [MOBILE ONLY] Smooth transition for all properties
                    transition: 'all 0.3s ease-in-out',
                    // [MOBILE ONLY] Border for definition
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                {/* [MOBILE ONLY] Carousel Container - Horizontal scroll */}
                <div
                    className="flex items-center h-16 overflow-x-auto scrollbar-hide"
                    style={{
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        scrollBehavior: 'smooth',
                        // Hide scrollbar
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                    }}
                >
                    {/* Left fade indicator */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none z-10"
                        style={{
                            background: 'linear-gradient(to right, rgba(13, 27, 42, 0.9), transparent)',
                            borderRadius: '20px 0 0 20px',
                        }}
                    />

                    {/* Navigation Items */}
                    <div className="flex items-center gap-0 px-2" style={{ minWidth: 'max-content' }}>
                        {allNavItems.map((item) => {
                            const { Icon } = item;
                            const active = isActive(item.href);
                            const isTouched = activeItem === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onTouchStart={() => handleTouchStart(item.href)}
                                    onTouchEnd={handleTouchEnd}
                                    className="flex flex-col items-center justify-center h-14 relative"
                                    style={{
                                        // Fixed width for each item in carousel
                                        width: '70px',
                                        minWidth: '70px',
                                        // Scroll snap for smooth carousel
                                        scrollSnapAlign: 'center',
                                        // [MOBILE ONLY] Color transitions - Blue theme
                                        color: active ? '#5a9cff' : 'rgba(255, 255, 255, 0.7)',
                                        // [MOBILE ONLY] Scale transform for touch feedback
                                        transform: isTouched ? 'scale(0.9)' : 'scale(1)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    {/* [MOBILE ONLY] Active indicator glow */}
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
                                    </div>
                                    <span
                                        className="text-[9px] mt-0.5 relative z-10 text-center truncate"
                                        style={{
                                            fontWeight: active ? 700 : 500,
                                            letterSpacing: active ? '0.02em' : '0',
                                            maxWidth: '60px',
                                        }}
                                    >
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right fade indicator */}
                    <div
                        className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-10"
                        style={{
                            background: 'linear-gradient(to left, rgba(13, 27, 42, 0.9), transparent)',
                            borderRadius: '0 20px 20px 0',
                        }}
                    />
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
