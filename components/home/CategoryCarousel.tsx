'use client';

// [MOBILE ONLY] Premium Touch Swipe Category Carousel
// Desktop: Arrow navigation preserved
// Mobile: Finger swipe, no arrows, parallax effect, smooth animations

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowAltCircleLeft, FaArrowAltCircleRight } from 'react-icons/fa';
import { FiGrid } from 'react-icons/fi';

interface Category {
    id: string;
    name: string;
    slug: string;
    image: string | null;
}

interface CategoryCarouselProps {
    categories: Category[];
    itemsPerPage?: number;
}

export default function CategoryCarousel({ categories, itemsPerPage = 6 }: CategoryCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [displayedCategories, setDisplayedCategories] = useState<Category[]>([]);
    const [isMobile, setIsMobile] = useState(false);

    // [MOBILE ONLY] Touch handling refs
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Responsive items per page
    const [visibleItems, setVisibleItems] = useState(itemsPerPage);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (window.innerWidth < 640) {
                setVisibleItems(2);
            } else if (window.innerWidth < 1024) {
                setVisibleItems(3);
            } else {
                setVisibleItems(itemsPerPage);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [itemsPerPage]);

    // Update displayed categories (only for desktop arrow navigation)
    useEffect(() => {
        if (!isMobile) {
            const startIndex = currentIndex * visibleItems;
            setDisplayedCategories(categories.slice(startIndex, startIndex + visibleItems));
        }
    }, [currentIndex, visibleItems, categories, isMobile]);

    const totalPages = Math.ceil(categories.length / visibleItems);
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

    // Gradient for category icons
    const gradient = 'from-[#6b9edd] via-[#5a8ad0] to-[#4a7dc4]';

    // Animation classes (desktop only)
    const getAnimationClass = () => {
        if (!slideDirection) return 'translate-x-0 opacity-100';
        if (slideDirection === 'left') return '-translate-x-8 opacity-0';
        return 'translate-x-8 opacity-0';
    };

    // [MOBILE ONLY] Render category card
    const renderCategoryCard = (category: Category, index: number, forMobile: boolean) => (
        <Link
            key={`${category.id}-${forMobile ? 'mobile' : currentIndex}`}
            href={`/categorias/${category.slug}`}
            className={`group relative flex-shrink-0 bg-[#f8f9fa] hover:bg-white border border-[#e9ecef] rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-[#2a63cd]/40 ${forMobile
                    ? 'p-3 w-[72px] min-w-[72px] scroll-snap-align-start mobile-category-card'
                    : 'p-3 sm:p-4 w-[15%] min-w-[100px] sm:min-w-[120px] hover:-translate-y-2'
                }`}
            style={{
                animationDelay: `${index * 50}ms`,
                // [MOBILE ONLY] Subtle parallax offset based on position
                ...(forMobile && {
                    transform: `translateZ(0)`,
                }),
            }}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}></div>
            <div className="relative flex flex-col items-center gap-2 sm:gap-3">
                {/* 3D Glossy Icon */}
                <div className={`relative ${forMobile ? 'w-10 h-10' : 'w-16 h-16'}`}>
                    <div
                        className={`
                            relative w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center
                            bg-gradient-to-br ${gradient}
                            shadow-lg sm:shadow-xl
                            group-hover:scale-110 transition-all duration-500
                            overflow-hidden
                        `}
                        style={{
                            boxShadow: forMobile
                                ? `0 4px 16px -4px rgba(107, 158, 221, 0.4)`
                                : `0 10px 40px -10px rgba(107, 158, 221, 0.5), 0 6px 16px -6px rgba(74, 125, 196, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.6), inset 0 -2px 0 rgba(0, 0, 0, 0.15)`,
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                        }}
                    >
                        {/* Glossy overlay */}
                        <div
                            className="absolute inset-0 rounded-xl sm:rounded-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)',
                                pointerEvents: 'none'
                            }}
                        />
                        {/* Shine effect on hover */}
                        <div
                            className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                            style={{
                                background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
                                backgroundSize: '200% 200%',
                                animation: 'shine 2s infinite'
                            }}
                        />
                        {/* Icon/Image */}
                        <div className={`relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg w-full h-full p-1.5 sm:p-2 flex items-center justify-center`}>
                            {category.image ? (
                                <Image
                                    src={category.image}
                                    alt={category.name}
                                    width={forMobile ? 32 : 56}
                                    height={forMobile ? 32 : 56}
                                    className="w-full h-full object-cover drop-shadow-md"
                                />
                            ) : (
                                <FiGrid className={`${forMobile ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
                            )}
                        </div>
                        {/* Bottom glow */}
                        <div
                            className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-40"
                            style={{
                                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25) 0%, transparent 50%)',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                </div>
                <h3 className={`font-bold text-[#212529] group-hover:text-[#2a63cd] transition-colors text-center line-clamp-2 ${forMobile ? 'text-[0.6rem] leading-tight max-w-[60px]' : 'text-sm'
                    }`}>{category.name}</h3>
            </div>
        </Link>
    );

    return (
        <div className="relative" ref={containerRef}>
            {/* [DESKTOP ONLY] Navigation Arrows - Hidden on mobile */}
            {!isMobile && categories.length > visibleItems && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={!canGoPrev || isAnimating}
                        className={`absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 hidden lg:block ${canGoPrev ? 'text-[#2a63cd] hover:text-[#1e4ba3] hover:scale-110' : 'opacity-30 cursor-not-allowed text-gray-400'}`}
                        aria-label="Anterior"
                    >
                        <FaArrowAltCircleLeft className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!canGoNext || isAnimating}
                        className={`absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 hidden lg:block ${canGoNext ? 'text-[#2a63cd] hover:text-[#1e4ba3] hover:scale-110' : 'opacity-30 cursor-not-allowed text-gray-400'}`}
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
                    className="overflow-x-auto scrollbar-hide mobile-swipe-carousel"
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
                            // [MOBILE ONLY] Smooth scroll behavior
                            scrollBehavior: 'smooth',
                        }}
                    >
                        {categories.map((category, index) => renderCategoryCard(category, index, true))}
                    </div>
                </div>
            ) : (
                /* [DESKTOP] Arrow Navigation with Slide Animation */
                <div className="overflow-hidden">
                    <div
                        className={`flex justify-center gap-2 sm:gap-4 transition-all duration-300 ease-out transform ${getAnimationClass()}`}
                    >
                        {displayedCategories.map((category, index) => renderCategoryCard(category, index, false))}
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
                                ? 'w-5 sm:w-8 bg-[#2a63cd]'
                                : 'w-1.5 sm:w-2 bg-gray-300 hover:bg-gray-400'
                                }`}
                            aria-label={`Ir a página ${i + 1}`}
                        />
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes shine {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                /* [MOBILE ONLY] Hide scrollbar */
                .mobile-swipe-carousel::-webkit-scrollbar {
                    display: none;
                }
                
                /* [MOBILE ONLY] Scroll snap alignment */
                .mobile-category-card {
                    scroll-snap-align: start;
                }
                
                /* [MOBILE ONLY] Touch feedback */
                .mobile-category-card:active {
                    transform: scale(0.95);
                    transition: transform 0.15s ease;
                }
            `}</style>
        </div>
    );
}
