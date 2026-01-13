'use client';

// [MOBILE ONLY] Cliente Panel - Premium Floating Bottom Navigation Bar
// Uses Portal to render outside the layout DOM tree for proper fixed positioning
// Same style as homepage MobileNavBar

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// [MOBILE ONLY] Premium SVG Icons with BLUE theme (same as homepage)
const PremiumDashboardIcon = ({ active }: { active: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}
    >
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
    </svg>
);

const PremiumBalanceIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
        <path d="M2 10h20" stroke="currentColor" strokeWidth={active ? 2.5 : 2} />
        <circle cx="17" cy="14" r="2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.5)' : 'currentColor'} />
    </svg>
);

const PremiumOrdersIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" fill={active ? 'rgba(42, 99, 205, 0.15)' : 'none'} />
    </svg>
);

const PremiumWishlistIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
    </svg>
);

const PremiumProfileIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
    </svg>
);

const PremiumAddressIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" fill={active ? 'rgba(42, 99, 205, 0.15)' : 'none'} />
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
    </svg>
);

const PremiumWarrantyIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
    </svg>
);

const PremiumSettingsIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(42,99,205,0.8)]' : ''}`}>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" fill={active ? 'rgba(42, 99, 205, 0.15)' : 'none'} />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'rgba(42, 99, 205, 0.25)' : 'none'} />
    </svg>
);

const PremiumLogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 transition-all duration-300">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Navigation items
const customerNavItems = [
    { href: '/customer', label: 'Panel', Icon: PremiumDashboardIcon },
    { href: '/customer/balance', label: 'Saldo', Icon: PremiumBalanceIcon },
    { href: '/customer/orders', label: 'Pedidos', Icon: PremiumOrdersIcon },
    { href: '/customer/wishlist', label: 'Deseos', Icon: PremiumWishlistIcon },
    { href: '/customer/addresses', label: 'Dirección', Icon: PremiumAddressIcon },
    { href: '/customer/warranty', label: 'Garantía', Icon: PremiumWarrantyIcon },
    { href: '/customer/profile', label: 'Perfil', Icon: PremiumProfileIcon },
    { href: '/customer/settings', label: 'Ajustes', Icon: PremiumSettingsIcon },
];

export default function CustomerMobileNavBar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const navRef = useRef<HTMLElement>(null);
    const router = useRouter();

    // Mount state for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Scroll detection
    const handleScroll = useCallback(() => {
        setIsScrolled(window.scrollY > 100);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const isActive = (href: string) => {
        if (href === '/customer') return pathname === '/customer';
        return pathname.startsWith(href);
    };

    const handleTouchStart = (href: string) => setActiveItem(href);
    const handleTouchEnd = () => setTimeout(() => setActiveItem(null), 150);

    const handleLogout = async () => {
        try {
            await signOut({ callbackUrl: '/', redirect: true });
        } catch (error) {
            console.error('Error signing out:', error);
            router.push('/');
        }
    };

    // Don't render until mounted (for portal)
    if (!mounted) return null;

    // The actual nav bar content
    const navContent = (
        <nav
            ref={navRef}
            id="customer-floating-nav"
            className="lg:hidden"
            style={{
                position: 'fixed',
                bottom: '12px',
                left: '12px',
                right: '12px',
                zIndex: 99999,
                borderRadius: '20px',
                background: isScrolled
                    ? 'linear-gradient(135deg, #0D1B2A 0%, #1B263B 50%, #0D1B2A 100%)'
                    : 'linear-gradient(135deg, rgba(13, 27, 42, 0.95) 0%, rgba(27, 38, 59, 0.95) 50%, rgba(13, 27, 42, 0.95) 100%)',
                boxShadow: isScrolled
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                transition: 'all 0.3s ease-in-out',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
        >
            <div
                className="flex items-center h-16 overflow-x-auto"
                style={{
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                }}
            >
                {/* Left fade */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none z-10"
                    style={{
                        background: 'linear-gradient(to right, rgba(13, 27, 42, 0.9), transparent)',
                        borderRadius: '20px 0 0 20px',
                    }}
                />

                {/* Nav items */}
                <div className="flex items-center gap-0 px-2" style={{ minWidth: 'max-content' }}>
                    {customerNavItems.map((item) => {
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
                                    width: '70px',
                                    minWidth: '70px',
                                    scrollSnapAlign: 'center',
                                    color: active ? '#5a9cff' : 'rgba(255, 255, 255, 0.7)',
                                    transform: isTouched ? 'scale(0.9)' : 'scale(1)',
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
                                </div>
                                <span
                                    className="text-[9px] mt-0.5 relative z-10 text-center truncate"
                                    style={{ fontWeight: active ? 700 : 500, letterSpacing: active ? '0.02em' : '0', maxWidth: '60px' }}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        onTouchStart={() => handleTouchStart('logout')}
                        onTouchEnd={handleTouchEnd}
                        className="flex flex-col items-center justify-center h-14 relative"
                        style={{
                            width: '70px',
                            minWidth: '70px',
                            scrollSnapAlign: 'center',
                            color: 'rgba(239, 68, 68, 0.9)',
                            transform: activeItem === 'logout' ? 'scale(0.9)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <div className="relative">
                            <PremiumLogoutIcon />
                        </div>
                        <span className="text-[9px] mt-0.5 relative z-10 text-center" style={{ fontWeight: 600, color: 'rgba(239, 68, 68, 0.9)' }}>
                            Salir
                        </span>
                    </button>
                </div>

                {/* Right fade */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-10"
                    style={{
                        background: 'linear-gradient(to left, rgba(13, 27, 42, 0.9), transparent)',
                        borderRadius: '0 20px 20px 0',
                    }}
                />
            </div>
        </nav>
    );

    // Use Portal to render outside the layout's DOM tree
    return createPortal(navContent, document.body);
}
