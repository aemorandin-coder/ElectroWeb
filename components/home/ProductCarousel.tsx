'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

export default function ProductCarousel({ products, itemsPerPage = 4 }: ProductCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

    // Responsive items per page
    const [visibleItems, setVisibleItems] = useState(itemsPerPage);

    useEffect(() => {
        const handleResize = () => {
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

    // Update displayed products
    useEffect(() => {
        const startIndex = currentIndex * visibleItems;
        setDisplayedProducts(products.slice(startIndex, startIndex + visibleItems));
    }, [currentIndex, visibleItems, products]);

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

    // Animation classes
    const getAnimationClass = () => {
        if (!slideDirection) return 'translate-x-0 opacity-100';
        if (slideDirection === 'left') return '-translate-x-8 opacity-0';
        return 'translate-x-8 opacity-0';
    };

    if (products.length === 0) {
        return (
            <div className="text-center py-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/20 mb-3">
                    <FiClock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Próximamente</h3>
                <p className="text-xs text-white/70">Estamos preparando productos increíbles para ti</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Navigation Arrows */}
            {products.length > visibleItems && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={!canGoPrev || isAnimating}
                        className={`absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${canGoPrev ? 'text-white hover:text-white/80 hover:scale-110' : 'opacity-30 cursor-not-allowed text-white/40'}`}
                        aria-label="Anterior"
                    >
                        <FaArrowAltCircleLeft className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!canGoNext || isAnimating}
                        className={`absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${canGoNext ? 'text-white hover:text-white/80 hover:scale-110' : 'opacity-30 cursor-not-allowed text-white/40'}`}
                        aria-label="Siguiente"
                    >
                        <FaArrowAltCircleRight className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg" />
                    </button>
                </>
            )}

            {/* Products Grid with Slide Animation */}
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

            {/* Dots Indicator */}
            {totalPages > 1 && (
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
                            aria-label={`Ir a página ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
