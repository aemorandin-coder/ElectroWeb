// Solo servidor. Sin 'use server': esa directiva convertía cada export en una Server Action
// invocable desde el navegador.

import { cache } from 'react';
import type { Prisma } from '@prisma/client';
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

// ============================================
// SETTINGS PÚBLICOS
// Lo único de CompanySettings que llega al navegador: el layout lo pasa a SettingsProvider
// y /api/settings/public devuelve lo mismo. Nunca: adminAlertEmails, maintenanceAllowedIPs,
// impuestos, límites de compra ni credenciales.
// ============================================

export interface SocialMediaLink {
    name: string;
    url: string;
    enabled: boolean;
    icon?: string;
}

export interface PublicSettings {
    companyName: string;
    tagline: string | null;
    logo: string | null;
    favicon: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    youtube: string | null;
    telegram: string | null;
    tiktok: string | null;
    socialMedia: SocialMediaLink[];
    businessHours: Record<string, { open: string; close: string; enabled: boolean }> | null;
    primaryCurrency: string;
    exchangeRateVES: number;
    exchangeRateEUR: number;
    deliveryEnabled: boolean;
    deliveryFeeUSD: number;
    freeDeliveryThresholdUSD: number | null;
    shippingCostPerKg: number;
    minConsolidatedShipping: number;
    packagingFeeUSD: number;
    pickupEnabled: boolean;
    pickupAddress: string | null;
    pickupInstructions: string | null;
    heroVideoEnabled: boolean;
    heroVideoUrl: string | null;
    heroVideoTitle: string | null;
    heroVideoDescription: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroButtonText: string | null;
    heroButtonLink: string | null;
    heroBackgroundImage: string | null;
    showStats: boolean;
    stat1Label: string | null;
    stat1Value: string | null;
    stat1Icon: string | null;
    stat2Label: string | null;
    stat2Value: string | null;
    stat2Icon: string | null;
    stat3Label: string | null;
    stat3Value: string | null;
    stat3Icon: string | null;
    stat4Label: string | null;
    stat4Value: string | null;
    stat4Icon: string | null;
    showCategories: boolean;
    maxCategoriesDisplay: number;
    ctaEnabled: boolean;
    ctaTitle: string | null;
    ctaDescription: string | null;
    ctaButtonText: string | null;
    ctaButtonLink: string | null;
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    maintenanceStartTime: string | null;
    maintenanceEndTime: string | null;
    rif: string | null;
    legalName: string | null;
    hotAdEnabled: boolean;
    hotAdImage: string | null;
    hotAdTransparentBg: boolean;
    hotAdShadowEnabled: boolean;
    hotAdShadowBlur: number;
    hotAdShadowOpacity: number;
    hotAdBackdropOpacity: number;
    hotAdBackdropColor: string;
    hotAdLink: string | null;
}

const PUBLIC_SETTINGS_SELECT = {
    companyName: true, tagline: true, logo: true, favicon: true, primaryColor: true, secondaryColor: true,
    phone: true, whatsapp: true, email: true, address: true, city: true, state: true,
    instagram: true, facebook: true, twitter: true, youtube: true, telegram: true, tiktok: true,
    socialMedia: true, businessHours: true,
    primaryCurrency: true, exchangeRateVES: true, exchangeRateEUR: true,
    deliveryEnabled: true, deliveryFeeUSD: true, freeDeliveryThresholdUSD: true, shippingCostPerKg: true,
    minConsolidatedShipping: true, packagingFeeUSD: true,
    pickupEnabled: true, pickupAddress: true, pickupInstructions: true,
    heroVideoEnabled: true, heroVideoUrl: true, heroVideoTitle: true, heroVideoDescription: true,
    heroTitle: true, heroSubtitle: true, heroButtonText: true, heroButtonLink: true, heroBackgroundImage: true,
    showStats: true,
    stat1Label: true, stat1Value: true, stat1Icon: true, stat2Label: true, stat2Value: true, stat2Icon: true,
    stat3Label: true, stat3Value: true, stat3Icon: true, stat4Label: true, stat4Value: true, stat4Icon: true,
    showCategories: true, maxCategoriesDisplay: true,
    ctaEnabled: true, ctaTitle: true, ctaDescription: true, ctaButtonText: true, ctaButtonLink: true,
    maintenanceMode: true, maintenanceMessage: true, maintenanceStartTime: true, maintenanceEndTime: true,
    rif: true, legalName: true,
    hotAdEnabled: true, hotAdImage: true, hotAdTransparentBg: true, hotAdShadowEnabled: true, hotAdShadowBlur: true,
    hotAdShadowOpacity: true, hotAdBackdropOpacity: true, hotAdBackdropColor: true, hotAdLink: true,
} satisfies Prisma.CompanySettingsSelect;

type PublicSettingsRow = Prisma.CompanySettingsGetPayload<{ select: typeof PUBLIC_SETTINGS_SELECT }>;

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
    companyName: 'Electro Shop Morandin C.A.',
    tagline: 'Tu tienda de tecnología',
    logo: null, favicon: null, primaryColor: null, secondaryColor: null,
    phone: null, whatsapp: null, email: null, address: null, city: null, state: null,
    instagram: null, facebook: null, twitter: null, youtube: null, telegram: null, tiktok: null,
    socialMedia: [], businessHours: null,
    primaryCurrency: 'USD', exchangeRateVES: 36.5, exchangeRateEUR: 0.92,
    deliveryEnabled: false, deliveryFeeUSD: 0, freeDeliveryThresholdUSD: null, shippingCostPerKg: 2,
    minConsolidatedShipping: 3, packagingFeeUSD: 2.5,
    pickupEnabled: false, pickupAddress: null, pickupInstructions: null,
    heroVideoEnabled: false, heroVideoUrl: null, heroVideoTitle: null, heroVideoDescription: null,
    heroTitle: null, heroSubtitle: null, heroButtonText: null, heroButtonLink: null, heroBackgroundImage: null,
    showStats: false,
    stat1Label: null, stat1Value: null, stat1Icon: null, stat2Label: null, stat2Value: null, stat2Icon: null,
    stat3Label: null, stat3Value: null, stat3Icon: null, stat4Label: null, stat4Value: null, stat4Icon: null,
    showCategories: true, maxCategoriesDisplay: 6,
    ctaEnabled: false, ctaTitle: null, ctaDescription: null, ctaButtonText: null, ctaButtonLink: null,
    maintenanceMode: false, maintenanceMessage: null, maintenanceStartTime: null, maintenanceEndTime: null,
    rif: null, legalName: null,
    hotAdEnabled: false, hotAdImage: null, hotAdTransparentBg: false, hotAdShadowEnabled: true, hotAdShadowBlur: 20,
    hotAdShadowOpacity: 50, hotAdBackdropOpacity: 70, hotAdBackdropColor: '#000000', hotAdLink: null,
};

function parseJson<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

// Mismos valores por defecto que usaba la API pública (un Decimal vacío o 0 toma el default)
function toPublicSettings(row: PublicSettingsRow): PublicSettings {
    const num = (value: Prisma.Decimal | null, fallback: number) => (value ? Number(value) : fallback);
    const socialMedia = parseJson<unknown>(row.socialMedia, []);

    return {
        ...row,
        socialMedia: Array.isArray(socialMedia) ? (socialMedia as SocialMediaLink[]) : [],
        businessHours: parseJson<PublicSettings['businessHours']>(row.businessHours, null),
        primaryCurrency: row.primaryCurrency || 'USD',
        exchangeRateVES: num(row.exchangeRateVES, 36.5),
        exchangeRateEUR: num(row.exchangeRateEUR, 0.92),
        deliveryFeeUSD: num(row.deliveryFeeUSD, 0),
        freeDeliveryThresholdUSD: row.freeDeliveryThresholdUSD ? Number(row.freeDeliveryThresholdUSD) : null,
        shippingCostPerKg: num(row.shippingCostPerKg, 2),
        minConsolidatedShipping: num(row.minConsolidatedShipping, 3),
        packagingFeeUSD: num(row.packagingFeeUSD, 2.5),
        maintenanceStartTime: row.maintenanceStartTime ? row.maintenanceStartTime.toISOString() : null,
        maintenanceEndTime: row.maintenanceEndTime ? row.maintenanceEndTime.toISOString() : null,
    };
}

/** Settings públicos, una sola consulta por request (React cache). */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
    try {
        const row = await prisma.companySettings.findUnique({
            where: { id: 'default' },
            select: PUBLIC_SETTINGS_SELECT,
        });
        return row ? toPublicSettings(row) : DEFAULT_PUBLIC_SETTINGS;
    } catch (error) {
        console.error('Error fetching public settings:', error);
        return DEFAULT_PUBLIC_SETTINGS;
    }
});
