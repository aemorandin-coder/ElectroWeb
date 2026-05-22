'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Declare global window properties for TypeScript
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        fbq?: (...args: any[]) => void;
        dataLayer?: any[];
    }
}

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

// Track an event locally
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

// Dynamic script loader for GA4 and FB Pixel
export default function AnalyticsTracker() {
    const pathname = usePathname();
    const lastPathname = useRef<string>('');

    // Inject scripts on mount
    useEffect(() => {
        const gaId = process.env.NEXT_PUBLIC_GA_ID;
        const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

        // Inject Google Analytics
        if (gaId && !window.gtag) {
            const script = document.createElement('script');
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            script.async = true;
            document.head.appendChild(script);

            const inlineScript = document.createElement('script');
            inlineScript.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                window.gtag = function() { window.dataLayer.push(arguments); };
                window.gtag('js', new Date());
                window.gtag('config', '${gaId}', { page_path: window.location.pathname });
            `;
            document.head.appendChild(inlineScript);
        }

        // Inject Facebook Pixel
        if (pixelId && !window.fbq) {
            const inlinePixelScript = document.createElement('script');
            inlinePixelScript.innerHTML = `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
            `;
            document.head.appendChild(inlinePixelScript);
        }
    }, []);

    // Track page views - exclude admin paths
    useEffect(() => {
        if (pathname && pathname !== lastPathname.current) {
            // Don't track admin panel interactions
            if (pathname.startsWith('/admin')) return;

            lastPathname.current = pathname;
            trackPageView(pathname);

            // Google Analytics pageview
            const gaId = process.env.NEXT_PUBLIC_GA_ID;
            if (gaId && window.gtag) {
                window.gtag('config', gaId, { page_path: pathname });
            }

            // Facebook Pixel pageview
            if (window.fbq) {
                window.fbq('track', 'PageView');
            }
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

// Custom event tracking helper functions
export function trackSignUp(method: string = 'Credentials') {
    // GA4
    if (window.gtag) {
        window.gtag('event', 'sign_up', { method });
    }
    // Facebook Pixel
    if (window.fbq) {
        window.fbq('track', 'CompleteRegistration', { content_name: method });
    }
}

export function trackAddToCart(productId: string, productName: string, value: number, currency: string = 'USD') {
    // GA4
    if (window.gtag) {
        window.gtag('event', 'add_to_cart', {
            currency,
            value,
            items: [{ item_id: productId, item_name: productName, price: value, quantity: 1 }]
        });
    }
    // Facebook Pixel
    if (window.fbq) {
        window.fbq('track', 'AddToCart', {
            content_ids: [productId],
            content_name: productName,
            content_type: 'product',
            value,
            currency
        });
    }
}

export function trackInitiateCheckout(cartTotal: number, itemCount: number, currency: string = 'USD') {
    // GA4
    if (window.gtag) {
        window.gtag('event', 'begin_checkout', {
            currency,
            value: cartTotal,
            num_items: itemCount
        });
    }
    // Facebook Pixel
    if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
            value: cartTotal,
            currency,
            num_items: itemCount
        });
    }
}

export function trackPurchase(orderId: string, total: number, items: Array<{ id: string, name: string, price: number, quantity: number }>, currency: string = 'USD') {
    // GA4
    if (window.gtag) {
        window.gtag('event', 'purchase', {
            transaction_id: orderId,
            value: total,
            currency,
            items: items.map(item => ({
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        });
    }
    // Facebook Pixel
    if (window.fbq) {
        window.fbq('track', 'Purchase', {
            content_ids: items.map(item => item.id),
            content_type: 'product',
            value: total,
            currency
        });
    }
}

// Export helper functions for manual tracking
export { trackEvent, trackClick, trackPageView };
