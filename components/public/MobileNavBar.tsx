'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiBox, FiGrid, FiGift, FiUser, FiMenu, FiX } from 'react-icons/fi';

const mainNavItems = [
    { href: '/', label: 'Inicio', icon: FiHome },
    { href: '/productos', label: 'Productos', icon: FiBox },
    { href: '/categorias', label: 'Categorías', icon: FiGrid },
    { href: '/gift-cards', label: 'Gift Cards', icon: FiGift },
];

const moreNavItems = [
    { href: '/servicios', label: 'Servicios' },
    { href: '/cursos', label: 'Cursos' },
    { href: '/contacto', label: 'Contacto' },
    { href: '/solicitar-producto', label: 'Solicitar Producto' },
];

export default function MobileNavBar() {
    const [showMore, setShowMore] = useState(false);
    const pathname = usePathname();

    // Close menu when navigating
    useEffect(() => {
        setShowMore(false);
    }, [pathname]);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (showMore) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showMore]);

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Bottom Tab Bar - Dark Theme - CSS-based responsive (hidden on lg+) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[999] bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] border-t border-white/10 safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${active
                                    ? 'text-cyan-400'
                                    : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 mb-0.5 ${active ? 'stroke-[2.5]' : ''}`} />
                                <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={() => setShowMore(true)}
                        className="flex flex-col items-center justify-center flex-1 h-full text-white/70 hover:text-white transition-colors"
                    >
                        <FiMenu className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-medium">Más</span>
                    </button>
                </div>
            </nav>

            {/* More Menu Overlay */}
            {showMore && (
                <div className="lg:hidden fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm" onClick={() => setShowMore(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Más opciones</h2>
                            <button
                                onClick={() => setShowMore(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="p-4 space-y-1">
                            {moreNavItems.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center px-4 py-3 rounded-xl transition-colors ${active
                                            ? 'bg-[#2a63cd] text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        onClick={() => setShowMore(false)}
                                    >
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Safe area padding for bottom */}
                        <div className="h-8"></div>
                    </div>
                </div>
            )}


            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
            `}</style>
        </>
    );
}
