import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to safely serialize Prisma objects (handle Decimals, Dates, etc.)
function safeSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'object') {
    // Handle Prisma Decimal
    if (obj instanceof Decimal || (obj.s && obj.e && obj.d)) {
      return Number(obj.toString());
    }

    if (Array.isArray(obj)) {
      return obj.map(safeSerialize);
    }

    const result: any = {};
    for (const key in obj) {
      result[key] = safeSerialize(obj[key]);
    }
    return result;
  }

  return obj;
}

// Public endpoint to get company settings (no auth required)
export async function GET() {
  try {
    const settings = await prisma.companySettings.findFirst({
      where: { id: 'default' },
    });

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        companyName: 'Electro Shop Morandin C.A.',
        tagline: 'Tu tienda de tecnología',
        logo: null,
        favicon: null,
        phone: null,
        whatsapp: null,
        email: null,
        address: null,
        instagram: null,
        facebook: null,
        twitter: null,
        youtube: null,
        telegram: null,
        tiktok: null,
        socialMedia: [],
        businessHours: null,
        primaryCurrency: 'USD',
        exchangeRateVES: 36.50,
        exchangeRateEUR: 0.92,
        // Hero Video defaults
        heroVideoEnabled: false,
        heroVideoUrl: null,
        heroVideoTitle: null,
        heroVideoDescription: null,
      });
    }

    // Parse JSON fields safely
    let socialMedia = [];
    try {
      socialMedia = settings.socialMedia ? JSON.parse(settings.socialMedia) : [];
    } catch (e) {
      console.warn('Error parsing socialMedia JSON:', e);
    }

    let businessHours = null;
    try {
      businessHours = settings.businessHours ? JSON.parse(settings.businessHours) : null;
    } catch (e) {
      console.warn('Error parsing businessHours JSON:', e);
    }

    // Return only public fields
    const publicSettings = {
      companyName: settings.companyName,
      tagline: settings.tagline,
      logo: settings.logo,
      favicon: settings.favicon,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      address: settings.address,
      instagram: settings.instagram,
      facebook: settings.facebook,
      twitter: settings.twitter,
      youtube: settings.youtube,
      telegram: settings.telegram,
      tiktok: settings.tiktok,
      socialMedia,
      businessHours,
      primaryCurrency: settings.primaryCurrency || 'USD',
      exchangeRateVES: settings.exchangeRateVES ? Number(settings.exchangeRateVES) : 36.50,
      exchangeRateEUR: settings.exchangeRateEUR ? Number(settings.exchangeRateEUR) : 0.92,
      // Shipping & Delivery Settings
      deliveryEnabled: settings.deliveryEnabled,
      deliveryFeeUSD: settings.deliveryFeeUSD ? Number(settings.deliveryFeeUSD) : 0,
      freeDeliveryThresholdUSD: settings.freeDeliveryThresholdUSD ? Number(settings.freeDeliveryThresholdUSD) : null,
      pickupEnabled: settings.pickupEnabled,
      pickupAddress: settings.pickupAddress,
      pickupInstructions: settings.pickupInstructions,
      // Hero Video Settings
      heroVideoEnabled: settings.heroVideoEnabled,
      heroVideoUrl: settings.heroVideoUrl,
      heroVideoTitle: settings.heroVideoTitle,
      heroVideoDescription: settings.heroVideoDescription,
      // HomePage Settings
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      heroButtonText: settings.heroButtonText,
      heroButtonLink: settings.heroButtonLink,
      heroBackgroundImage: settings.heroBackgroundImage,
      showStats: settings.showStats,
      stat1Label: settings.stat1Label,
      stat1Value: settings.stat1Value,
      stat1Icon: settings.stat1Icon,
      stat2Label: settings.stat2Label,
      stat2Value: settings.stat2Value,
      stat2Icon: settings.stat2Icon,
      stat3Label: settings.stat3Label,
      stat3Value: settings.stat3Value,
      stat3Icon: settings.stat3Icon,
      stat4Label: settings.stat4Label,
      stat4Value: settings.stat4Value,
      stat4Icon: settings.stat4Icon,
      showCategories: settings.showCategories,
      maxCategoriesDisplay: settings.maxCategoriesDisplay,
      ctaEnabled: settings.ctaEnabled,
      ctaTitle: settings.ctaTitle,
      ctaDescription: settings.ctaDescription,
      ctaButtonText: settings.ctaButtonText,
      ctaButtonLink: settings.ctaButtonLink,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      maintenanceStartTime: settings.maintenanceStartTime,
      maintenanceEndTime: settings.maintenanceEndTime,
      // Hot Ad / Promotional Popup
      hotAdEnabled: settings.hotAdEnabled,
      hotAdImage: settings.hotAdImage,
      hotAdTransparentBg: settings.hotAdTransparentBg,
      hotAdShadowEnabled: settings.hotAdShadowEnabled,
      hotAdShadowBlur: settings.hotAdShadowBlur,
      hotAdShadowOpacity: settings.hotAdShadowOpacity,
      hotAdBackdropOpacity: settings.hotAdBackdropOpacity,
      hotAdBackdropColor: settings.hotAdBackdropColor,
      hotAdLink: settings.hotAdLink,
    };

    return NextResponse.json(safeSerialize(publicSettings));
  } catch (error: any) {
    console.error('Error fetching public settings:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // Return defaults on error instead of 500
    return NextResponse.json({
      companyName: 'Electro Shop Morandin C.A.',
      tagline: 'Tu tienda de tecnología',
      logo: null,
      favicon: null,
      phone: null,
      whatsapp: null,
      email: null,
      address: null,
      instagram: null,
      facebook: null,
      twitter: null,
      youtube: null,
      telegram: null,
      tiktok: null,
      socialMedia: [],
      businessHours: null,
      primaryCurrency: 'USD',
      exchangeRateVES: 36.50,
      exchangeRateEUR: 0.92,
      heroVideoEnabled: false,
    });
  }
}
