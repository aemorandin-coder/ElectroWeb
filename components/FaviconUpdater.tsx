'use client';

import { useEffect } from 'react';

interface FaviconUpdaterProps {
    favicon: string | null | undefined;
    companyName: string | null | undefined;
}

export default function FaviconUpdater({ favicon, companyName }: FaviconUpdaterProps) {
    useEffect(() => {
        // Update page title with company name
        if (companyName) {
            document.title = companyName;
        }
    }, [companyName]);

    useEffect(() => {
        if (!favicon) return;

        // Find existing favicon link or create one
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");

        if (link) {
            link.href = favicon;
        } else {
            link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = favicon;
            document.head.appendChild(link);
        }

        // Also set apple-touch-icon if not exists
        let appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
        if (!appleIcon) {
            appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            appleIcon.href = favicon;
            document.head.appendChild(appleIcon);
        } else {
            appleIcon.href = favicon;
        }

    }, [favicon]);

    return null;
}
