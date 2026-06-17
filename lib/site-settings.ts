'use server';

import { prisma } from '@/lib/prisma';

export interface SiteSettings {
    companyName: string;
    tagline: string | null;
    favicon: string | null;
    logo: string | null;
    primaryColor: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    homeMetaImage: string | null;
}

// Cache for server-side settings (revalidated every 60 seconds)
let cachedSettings: SiteSettings | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function getSiteSettings(): Promise<SiteSettings> {
    const now = Date.now();

    // Return cached if valid
    if (cachedSettings && (now - cacheTime) < CACHE_DURATION) {
        return cachedSettings;
    }

    try {
        const settings = await prisma.companySettings.findFirst({
            where: { id: 'default' },
            select: {
                companyName: true,
                tagline: true,
                favicon: true,
                logo: true,
                primaryColor: true,
                metaTitle: true,
                metaDescription: true,
                metaKeywords: true,
                homeMetaImage: true,
            }
        });

        cachedSettings = {
            companyName: settings?.companyName || 'Electro Shop Morandin C.A.',
            tagline: settings?.tagline || 'Tu tienda de tecnología',
            favicon: settings?.favicon || null,
            logo: settings?.logo || null,
            primaryColor: settings?.primaryColor || '#2a63cd',
            metaTitle: settings?.metaTitle || null,
            metaDescription: settings?.metaDescription || null,
            metaKeywords: settings?.metaKeywords || null,
            homeMetaImage: settings?.homeMetaImage || null,
        };
        cacheTime = now;

        return cachedSettings;
    } catch (error) {
        console.error('Error fetching site settings:', error);
        return {
            companyName: 'Electro Shop Morandin C.A.',
            tagline: 'Tu tienda de tecnología',
            favicon: null,
            logo: null,
            primaryColor: '#2a63cd',
            metaTitle: null,
            metaDescription: null,
            metaKeywords: null,
            homeMetaImage: null,
        };
    }
}

// Clear cache (call this after settings update)
export async function clearSettingsCache() {
    cachedSettings = null;
    cacheTime = 0;
}
