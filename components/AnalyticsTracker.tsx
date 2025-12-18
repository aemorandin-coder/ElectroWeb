'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Generate a unique session ID for this browser session
function getSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
}

interface TrackEventOptions {
    eventType: string;
    eventCategory?: string;
    eventAction?: string;
    eventLabel?: string;
    eventValue?: number;
    metadata?: Record<string, unknown>;
}

// Track an event
async function trackEvent(options: TrackEventOptions) {
    try {
        await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...options,
                page: window.location.pathname,
                referrer: document.referrer || null,
                sessionId: getSessionId(),
            }),
        });
    } catch (error) {
        // Silently fail - don't interrupt user experience
        console.debug('Analytics tracking failed:', error);
    }
}

// Track page view
function trackPageView(pathname: string) {
    trackEvent({
        eventType: 'page_view',
        eventCategory: 'navigation',
        eventAction: 'view',
        eventLabel: pathname,
    });
}

// Track click
function trackClick(target: string, category: string = 'interaction') {
    trackEvent({
        eventType: 'click',
        eventCategory: category,
        eventAction: 'click',
        eventLabel: target,
    });
}

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const lastPathname = useRef<string>('');

    // Track page views - exclude admin paths
    useEffect(() => {
        if (pathname && pathname !== lastPathname.current) {
            // Don't track admin panel interactions
            if (pathname.startsWith('/admin')) return;

            lastPathname.current = pathname;
            trackPageView(pathname);
        }
    }, [pathname]);

    // Track clicks on interactive elements - exclude admin paths
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Don't track admin panel clicks
            if (window.location.pathname.startsWith('/admin')) return;

            const target = e.target as HTMLElement;

            // Track button clicks
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                const button = target.closest('button') || target;
                const label = button.getAttribute('aria-label') ||
                    button.textContent?.slice(0, 50) || 'button';
                trackClick(label, 'button');
            }

            // Track link clicks
            if (target.tagName === 'A' || target.closest('a')) {
                const link = target.closest('a') || target;
                const href = (link as HTMLAnchorElement).href;
                const label = link.textContent?.slice(0, 50) || href;
                trackClick(label, 'navigation');
            }

            // Track product card clicks
            if (target.closest('[data-product-id]')) {
                const productCard = target.closest('[data-product-id]');
                const productId = productCard?.getAttribute('data-product-id');
                trackClick(`product_${productId}`, 'product');
            }
        };

        document.addEventListener('click', handleClick, { passive: true });
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Track form submissions - exclude admin paths
    useEffect(() => {
        const handleSubmit = (e: Event) => {
            // Don't track admin form submissions
            if (window.location.pathname.startsWith('/admin')) return;

            const form = e.target as HTMLFormElement;
            const formId = form.id || form.getAttribute('name') || 'unknown_form';
            trackEvent({
                eventType: 'form_submit',
                eventCategory: 'conversion',
                eventAction: 'submit',
                eventLabel: formId,
            });
        };

        document.addEventListener('submit', handleSubmit, { passive: true });
        return () => document.removeEventListener('submit', handleSubmit);
    }, []);

    return null; // This component doesn't render anything
}

// Export helper functions for manual tracking
export { trackEvent, trackClick, trackPageView };
