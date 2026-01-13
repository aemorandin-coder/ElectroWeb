'use client';

// [MOBILE ONLY] Premium Scroll Progress Bar
// Displays a thin gradient bar at the top that fills as user scrolls down
// Only visible on mobile devices (< 1024px width)

import { useState, useEffect, useCallback } from 'react';

export default function MobileScrollProgress() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calculate scroll progress
    const handleScroll = useCallback(() => {
        if (!isMobile) return;

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        setScrollProgress(Math.min(progress, 100));
    }, [isMobile]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial calculation
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Only render on mobile
    if (!isMobile) return null;

    return (
        <div
            className="mobile-scroll-progress"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: `${scrollProgress}%`,
                height: '3px',
                background: 'linear-gradient(90deg, #00FF88, #00FFC8, #00FF88)',
                opacity: 0.7,
                zIndex: 10000,
                transition: 'width 0.1s ease-out',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                pointerEvents: 'none',
            }}
            aria-hidden="true"
        />
    );
}
