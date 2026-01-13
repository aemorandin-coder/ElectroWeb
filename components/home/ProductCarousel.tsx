'use client';

// [MOBILE ONLY] Premium Touch Swipe Product Carousel
// Desktop: Arrow navigation preserved
// Mobile: Finger swipe, no arrows, scale on touch, fade-in slide-up animations

import { useState, useEffect, useCallback, useRef } from 'react';
import { FaArrowAltCircleLeft, FaArrowAltCircleRight } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';
import ProductCard from '@/components/ui/ProductCard';

interface Product {
    id: string;
    name: string;
    priceUSD: number;
    priceVES?: number | null;
    images: string[];
    slug: string;
    status: string;
    description?: string | null;
    stock?: number;
    category?: { id: string; name: string; slug: string } | null;
    brand?: { id: string; name: string } | null;
    productType?: string;
    isFeatured?: boolean;
}

interface ProductCarouselProps {
    products: Product[];
    itemsPerPage?: number;
    autoShuffleInterval?: number; // in milliseconds
}

export default function ProductCarousel({
    products,
    itemsPerPage = 4,
    autoShuffleInterval = 60000 // 1 minute default
}: ProductCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // [MOBILE ONLY] Touch handling refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const [touchedProduct, setTouchedProduct] = useState<string | null>(null);

    // Fisher-Yates shuffle function
    const shuffleArray = (arr: Product[]): Product[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Shuffled products state - starts with original order for SSR
    const [shuffledProducts, setShuffledProducts] = useState<Product[]>(products);

    // Mark as mounted and do initial shuffle (client-side only)
    useEffect(() => {
        setIsMounted(true);
        setShuffledProducts(shuffleArray(products));
    }, [products]);

    // Auto-shuffle every interval (client-side only)
    useEffect(() => {
        if (!isMounted || products.length <= 1) return;

        const interval = setInterval(() => {
            setShuffledProducts(shuffleArray(products));
            setCurrentIndex(0); // Reset to first page on shuffle
        }, autoShuffleInterval);

        return () => clearInterval(interval);
    }, [products, autoShuffleInterval, isMounted]);

    // Responsive items per page
    const [visibleItems, setVisibleItems] = useState(itemsPerPage);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (window.innerWidth < 640) {
                setVisibleItems(1);
            } else if (window.innerWidth < 1024) {
                setVisibleItems(2);
            } else if (window.innerWidth < 1280) {
                setVisibleItems(3);
            } else {
                setVisibleItems(itemsPerPage);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [itemsPerPage]);

    // Displayed products - use original products for SSR, shuffled for client
    const displayedProducts = (() => {
        const source = isMounted ? shuffledProducts : products;
        if (isMobile) {
            return source; // Show all for mobile scroll
        }
        const startIndex = currentIndex * visibleItems;
        return source.slice(startIndex, startIndex + visibleItems);
    })();

    const totalPages = Math.ceil(products.length / visibleItems);
    const canGoNext = currentIndex < totalPages - 1;
    const canGoPrev = currentIndex > 0;

    const handleNext = useCallback(() => {
        if (!canGoNext || isAnimating) return;
        setSlideDirection('left');
        setIsAnimating(true);

        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setSlideDirection(null);
            setIsAnimating(false);
        }, 300);
    }, [canGoNext, isAnimating]);

    const handlePrev = useCallback(() => {
        if (!canGoPrev || isAnimating) return;
        setSlideDirection('right');
        setIsAnimating(true);

        setTimeout(() => {
            setCurrentIndex(prev => prev - 1);
            setSlideDirection(null);
            setIsAnimating(false);
        }, 300);
    }, [canGoPrev, isAnimating]);

    const handleDotClick = useCallback((index: number) => {
        if (isAnimating || index === currentIndex) return;
        setSlideDirection(index > currentIndex ? 'left' : 'right');
        setIsAnimating(true);

        setTimeout(() => {
            setCurrentIndex(index);
            setSlideDirection(null);
            setIsAnimating(false);
        }, 300);
    }, [currentIndex, isAnimating]);

    // Animation classes (desktop only)
    const getAnimationClass = () => {
        if (!slideDirection) return 'translate-x-0 opacity-100';
        if (slideDirection === 'left') return '-translate-x-8 opacity-0';
        return 'translate-x-8 opacity-0';
    };

    // [MOBILE ONLY] Touch feedback handlers
    const handleTouchStart = (productId: string) => {
        setTouchedProduct(productId);
    };

    const handleTouchEnd = () => {
        setTimeout(() => setTouchedProduct(null), 150);
    };

    if (products.length === 0) {
        return (
            <div className="text-center py-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/20 mb-3">
                    <FiClock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Proximamente</h3>
                <p className="text-xs text-white/70">Estamos preparando productos increibles para ti</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* [DESKTOP ONLY] Navigation Arrows - Hidden on mobile */}
            {!isMobile && products.length > visibleItems && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={!canGoPrev || isAnimating}
                        className={`absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 hidden lg:block ${canGoPrev ? 'text-white hover:text-white/80 hover:scale-110' : 'opacity-30 cursor-not-allowed text-white/40'}`}
                        aria-label="Anterior"
                    >
                        <FaArrowAltCircleLeft className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!canGoNext || isAnimating}
                        className={`absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 hidden lg:block ${canGoNext ? 'text-white hover:text-white/80 hover:scale-110' : 'opacity-30 cursor-not-allowed text-white/40'}`}
                        aria-label="Siguiente"
                    >
                        <FaArrowAltCircleRight className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg" />
                    </button>
                </>
            )}

            {/* [MOBILE ONLY] Touch Swipe Carousel */}
            {isMobile ? (
                <div
                    ref={scrollRef}
                    className="overflow-x-auto scrollbar-hide mobile-product-carousel"
                    style={{
                        // [MOBILE ONLY] Smooth scroll snap
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    <div
                        className="flex gap-3 px-4 py-2"
                        style={{
                            scrollBehavior: 'smooth',
                        }}
                    >
                        {displayedProducts.map((product, index) => (
                            <div
                                key={`${product.id}-mobile`}
                                className="flex-shrink-0 mobile-product-card"
                                onTouchStart={() => handleTouchStart(product.id)}
                                onTouchEnd={handleTouchEnd}
                                style={{
                                    // [MOBILE ONLY] Fixed width for mobile cards
                                    width: '150px',
                                    minWidth: '150px',
                                    scrollSnapAlign: 'start',
                                    // [MOBILE ONLY] Touch scale effect
                                    transform: touchedProduct === product.id ? 'scale(0.95)' : 'scale(1)',
                                    transition: 'transform 0.15s ease',
                                    // [MOBILE ONLY] Staggered fade-in animation
                                    animation: `mobileSlideIn 0.5s ease-out ${index * 0.05}s both`,
                                }}
                            >
                                <ProductCard product={product as any} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* [DESKTOP] Arrow Navigation with Slide Animation */
                <div className="overflow-hidden">
                    <div
                        className={`flex flex-wrap justify-center gap-4 transition-all duration-300 ease-out transform ${getAnimationClass()}`}
                    >
                        {displayedProducts.map((product, index) => (
                            <div
                                key={`${product.id}-${currentIndex}`}
                                className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)]"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                }}
                            >
                                <ProductCard product={product as any} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* [DESKTOP ONLY] Dots Indicator - Hidden on mobile */}
            {!isMobile && totalPages > 1 && (
                <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => handleDotClick(i)}
                            disabled={isAnimating}
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${currentIndex === i
                                ? 'w-5 sm:w-8 bg-white'
                                : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/60'
                                }`}
                            aria-label={`Ir a pagina ${i + 1}`}
                        />
                    ))}
                </div>
            )}

            <style jsx>{`
                /* [MOBILE ONLY] Hide scrollbar */
                .mobile-product-carousel::-webkit-scrollbar {
                    display: none;
                }
                
                /* [MOBILE ONLY] Slide in animation */
                @keyframes mobileSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                /* [MOBILE ONLY] Card hover/touch effect */
                .mobile-product-card {
                    -webkit-tap-highlight-color: transparent;
                }
                
                .mobile-product-card:active {
                    transform: scale(0.98) !important;
                }
            `}</style>
        </div>
    );
}
