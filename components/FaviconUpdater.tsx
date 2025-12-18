'use client';

import { useEffect, useRef } from 'react';

interface FaviconUpdaterProps {
    favicon: string | null | undefined;
    companyName: string | null | undefined;
}

// Helper to detect image type from URL
const getImageType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    switch (extension) {
        case 'png': return 'image/png';
        case 'svg': return 'image/svg+xml';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'ico':
        default: return 'image/x-icon';
    }
};

export default function FaviconUpdater({ favicon, companyName }: FaviconUpdaterProps) {
    // Track our own created links to clean up safely
    const createdLinksRef = useRef<HTMLLinkElement[]>([]);
    const isMountedRef = useRef(true);

    // Update page title
    useEffect(() => {
        if (companyName) {
            document.title = companyName;
        }
    }, [companyName]);

    // Safe favicon update - only update href, don't remove/add elements
    useEffect(() => {
        if (!favicon) return;

        isMountedRef.current = true;

        const imageType = getImageType(favicon);
        const cacheBustUrl = favicon.includes('?')
            ? `${favicon}&v=${Date.now()}`
            : `${favicon}?v=${Date.now()}`;

        // Instead of removing existing links, just update their href
        // This avoids the React DOM reconciliation error
        const updateExistingFavicons = () => {
            const existingIcons = document.querySelectorAll<HTMLLinkElement>(
                "link[rel='icon'], link[rel='shortcut icon']"
            );

            if (existingIcons.length > 0) {
                // Update existing favicon links
                existingIcons.forEach(icon => {
                    icon.href = cacheBustUrl;
                    icon.type = imageType;
                });
            } else {
                // Only create a new link if none exist
                // Use a single link to minimize DOM manipulation
                const iconLink = document.createElement('link');
                iconLink.rel = 'icon';
                iconLink.type = imageType;
                iconLink.href = cacheBustUrl;
                iconLink.setAttribute('data-dynamic', 'true');
                document.head.appendChild(iconLink);
                createdLinksRef.current.push(iconLink);
            }
        };

        // Apply favicon after a small delay to ensure React has finished rendering
        const timeoutId = setTimeout(() => {
            if (isMountedRef.current) {
                updateExistingFavicons();
            }
        }, 100);

        // Handle visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMountedRef.current) {
                updateExistingFavicons();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMountedRef.current = false;
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            // Only remove links we created ourselves
            createdLinksRef.current.forEach(link => {
                if (link.parentNode && link.getAttribute('data-dynamic') === 'true') {
                    try {
                        link.parentNode.removeChild(link);
                    } catch (e) {
                        // Silently ignore if the link was already removed
                    }
                }
            });
            createdLinksRef.current = [];
        };
    }, [favicon]);

    return null;
}
