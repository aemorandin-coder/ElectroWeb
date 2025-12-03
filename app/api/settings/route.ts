import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateSettings, normalizeSocialMedia, normalizeExchangeRate } from '@/lib/validations/settings';
import { SettingsFormData } from '@/types/settings';
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

export async function GET() {
  try {
    const settings = await prisma.companySettings.findFirst({
      where: { id: 'default' },
    });

    if (!settings) {
      const defaultSettings = await prisma.companySettings.create({
        data: {
          id: 'default',
          companyName: 'Electro Shop Morandin C.A.',
        },
      });
      return NextResponse.json(safeSerialize(defaultSettings));
    }

    // Parse JSON fields safely
    let socialMedia = [];
    try {
      socialMedia = settings.socialMedia ? JSON.parse(settings.socialMedia) : [];
    } catch (e) {
      console.warn('Error parsing socialMedia JSON:', e);
      socialMedia = [];
    }

    let businessHours = undefined;
    try {
      businessHours = settings.businessHours ? JSON.parse(settings.businessHours) : undefined;
    } catch (e) {
      console.warn('Error parsing businessHours JSON:', e);
    }

    // Construct response with safe serialization
    const responseData = {
      ...settings,
      socialMedia,
      businessHours,
    };

    return NextResponse.json(safeSerialize(responseData));
  } catch (error: any) {
    console.error('[SETTINGS API] CRITICAL ERROR:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any).permissions?.includes('MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json() as Partial<SettingsFormData>;
    const updateData: any = {};

    // Get current settings
    const currentSettings = await prisma.companySettings.findFirst({
      where: { id: 'default' },
    });

    // --- MAPPING FIELDS ---

    // Simple String Fields
    const stringFields = [
      'companyName', 'tagline', 'rif', 'legalName', 'foundedYear', 'description',
      'logo', 'favicon', 'primaryColor', 'secondaryColor',
      'phone', 'whatsapp', 'email', 'address',
      'instagram', 'facebook', 'twitter', 'youtube',
      'pickupAddress', 'pickupInstructions', 'maintenanceMessage', 'maintenanceAllowedIPs',
      'metaTitle', 'metaDescription', 'metaKeywords',
      'heroVideoUrl', 'heroVideoTitle', 'heroVideoDescription',
      'heroTitle', 'heroSubtitle', 'heroButtonText', 'heroButtonLink', 'heroBackgroundImage',
      'stat1Label', 'stat1Value', 'stat1Icon',
      'stat2Label', 'stat2Value', 'stat2Icon',
      'stat3Label', 'stat3Value', 'stat3Icon',
      'stat4Label', 'stat4Value', 'stat4Icon',
      'ctaTitle', 'ctaDescription', 'ctaButtonText', 'ctaButtonLink'
    ];

    stringFields.forEach(field => {
      if (body[field as keyof SettingsFormData] !== undefined) {
        updateData[field] = body[field as keyof SettingsFormData] || null;
      }
    });

    // Boolean Fields
    const booleanFields = [
      'autoExchangeRates', 'deliveryEnabled', 'pickupEnabled', 'taxEnabled',
      'maintenanceMode', 'heroVideoEnabled', 'showStats', 'showCategories',
      'autoHideOutOfStock', 'notifyLowStock', 'notifyOutOfStock', 'ctaEnabled'
    ];

    booleanFields.forEach(field => {
      if (body[field as keyof SettingsFormData] !== undefined) {
        updateData[field] = body[field as keyof SettingsFormData];
      }
    });

    // Number Fields
    const numberFields = [
      'deliveryFeeUSD', 'freeDeliveryThresholdUSD', 'taxPercent',
      'minOrderAmountUSD', 'maxOrderAmountUSD', 'maxFeaturedProducts',
      'maxCategoriesDisplay', 'lowStockThreshold', 'criticalStockThreshold'
    ];

    numberFields.forEach(field => {
      if (body[field as keyof SettingsFormData] !== undefined) {
        const val = body[field as keyof SettingsFormData];
        updateData[field] = val !== null && val !== '' ? Number(val) : null;
      }
    });

    // Enum/Special String Fields
    if (body.primaryCurrency !== undefined) updateData.primaryCurrency = body.primaryCurrency;

    // Date Fields
    if (body.maintenanceStartTime !== undefined) updateData.maintenanceStartTime = body.maintenanceStartTime ? new Date(body.maintenanceStartTime) : null;
    if (body.maintenanceEndTime !== undefined) updateData.maintenanceEndTime = body.maintenanceEndTime ? new Date(body.maintenanceEndTime) : null;

    // JSON Fields (Stringified)
    if (body.socialMedia !== undefined) {
      const processed = normalizeSocialMedia(body.socialMedia);
      if (processed !== undefined) {
        updateData.socialMedia = JSON.stringify(processed);
      }
    }

    if (body.businessHours !== undefined) {
      updateData.businessHours = JSON.stringify(body.businessHours);
    }

    // Exchange Rates (Decimal)
    const vesRate = normalizeExchangeRate(body.exchangeRateVES);
    if (vesRate !== null) updateData.exchangeRateVES = vesRate;

    const eurRate = normalizeExchangeRate(body.exchangeRateEUR);
    if (eurRate !== null) updateData.exchangeRateEUR = eurRate;

    if (body.autoExchangeRates === true) {
      updateData.lastRateUpdate = new Date();
    }

    // --- VALIDATION ---
    const validation = validateSettings({
      companyName: updateData.companyName !== undefined ? updateData.companyName : (body.companyName || currentSettings?.companyName || ''),
      email: updateData.email !== undefined ? updateData.email : body.email,
      exchangeRateVES: updateData.exchangeRateVES !== undefined ? updateData.exchangeRateVES : (body.exchangeRateVES !== undefined ? body.exchangeRateVES : undefined),
    });

    if (!validation.valid) {
      return NextResponse.json({
        error: 'Errores de validación',
        errors: validation.errors,
      }, { status: 400 });
    }

    // --- UPSERT ---
    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        companyName: updateData.companyName || 'Electro Shop Morandin C.A.',
        ...updateData,
      },
    });

    // Return parsed settings
    let socialMedia = [];
    try {
      socialMedia = settings.socialMedia ? JSON.parse(settings.socialMedia) : [];
    } catch (e) {
      console.warn('Error parsing socialMedia JSON:', e);
    }

    let businessHours = undefined;
    try {
      businessHours = settings.businessHours ? JSON.parse(settings.businessHours) : undefined;
    } catch (e) {
      console.warn('Error parsing businessHours JSON:', e);
    }

    const parsedResponse = {
      ...settings,
      socialMedia,
      businessHours,
    };

    return NextResponse.json(safeSerialize(parsedResponse));

  } catch (error: any) {
    console.error('[SETTINGS API] Error:', error);
    return NextResponse.json({
      error: 'Error al actualizar configuración',
      details: error.message,
    }, { status: 500 });
  }
}
