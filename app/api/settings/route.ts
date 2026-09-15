import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { CompanySettings } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/auth-helpers';
import { crossFieldErrors, fieldErrors, HOT_AD_FIELDS, settingsPatchSchema } from '@/lib/validations/settings';
import { clearSettingsCache } from '@/lib/site-settings';
import { refreshExchangeRate } from '@/lib/exchange-rate';
import { revalidatePath } from 'next/cache';

// Campos que solo ve quien administra la configuración (CLAUDE.md: nunca salen del servidor hacia otros)
const SETTINGS_ONLY_FIELDS = ['adminAlertEmails', 'maintenanceAllowedIPs'] as const;

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Correos de alerta guardados como JSON (actual) o separados por coma (viejo). */
function parseAlertEmails(value: string | null): string[] {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) return parsed.filter((email): email is string => typeof email === 'string' && email.length > 0);
  return (value || '').split(',').map((email) => email.trim()).filter(Boolean);
}

/** Fila → JSON para el panel: Decimals a número, fechas a ISO, JSON parseado y sin campos sensibles si no corresponde. */
function toAdminSettings(row: CompanySettings, canManageSettings: boolean) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) data[key] = value.toISOString();
    else if (value !== null && typeof value === 'object' && 'toNumber' in value) data[key] = Number(value);
    else data[key] = value;
  }
  data.businessHours = parseJson(row.businessHours);
  data.socialMedia = parseJson(row.socialMedia) ?? [];
  data.adminAlertEmails = parseAlertEmails(row.adminAlertEmails);
  if (!canManageSettings) {
    for (const field of SETTINGS_ONLY_FIELDS) delete data[field];
  }
  return data;
}

/**
 * GET /api/settings — configuración completa para el panel admin (C-50a).
 * Productos y Marketing también la leen (tasas, popup): con MANAGE_PRODUCTS o MANAGE_CONTENT
 * se entrega sin los campos sensibles. La tienda usa getPublicSettings() o /api/settings/public.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const canManageSettings = hasPermission(session, 'MANAGE_SETTINGS');
  if (!canManageSettings && !hasPermission(session, 'MANAGE_PRODUCTS') && !hasPermission(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const settings =
      (await prisma.companySettings.findUnique({ where: { id: 'default' } })) ??
      (await prisma.companySettings.create({ data: { id: 'default', companyName: 'Electro Shop Morandin C.A.' } }));
    return NextResponse.json(toAdminSettings(settings, canManageSettings));
  } catch (error) {
    console.error('[SETTINGS API] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * PUT /api/settings — guarda solo los campos que llegan (C-50b).
 * Lista blanca y validación en lib/validations/settings.ts; los campos desconocidos se ignoran.
 * El popup (hotAd*) lo puede guardar Marketing con MANAGE_CONTENT; el resto exige MANAGE_SETTINGS.
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const canManageSettings = hasPermission(session, 'MANAGE_SETTINGS');
  if (!canManageSettings && !hasPermission(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined)) as typeof parsed.data;
  const fields = Object.keys(patch);
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No hay cambios que guardar' }, { status: 400 });
  }
  if (!canManageSettings && fields.some((field) => !HOT_AD_FIELDS.includes(field as (typeof HOT_AD_FIELDS)[number]))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const current = await prisma.companySettings.findUnique({ where: { id: 'default' } });
    const pick = <K extends keyof typeof patch & keyof CompanySettings>(key: K, fallback: NonNullable<CompanySettings[K]> | null) =>
      patch[key] !== undefined ? patch[key] : (current?.[key] ?? fallback);
    const decimal = (value: unknown) => (value === null || value === undefined ? null : Number(value));

    const crossErrors = crossFieldErrors({
      deliveryEnabled: Boolean(pick('deliveryEnabled', true)),
      pickupEnabled: Boolean(pick('pickupEnabled', true)),
      minOrderAmountUSD: decimal(pick('minOrderAmountUSD', null)),
      maxOrderAmountUSD: decimal(pick('maxOrderAmountUSD', null)),
      maintenanceStartTime: (pick('maintenanceStartTime', null) as Date | null) ?? null,
      maintenanceEndTime: (pick('maintenanceEndTime', null) as Date | null) ?? null,
    });
    if (Object.keys(crossErrors).length > 0) {
      return NextResponse.json({ error: 'Revisa los campos marcados', fields: crossErrors }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...patch };
    // Tasa escrita a mano: queda registrada la hora del cambio
    if (patch.exchangeRateVES !== undefined && Number(patch.exchangeRateVES) !== decimal(current?.exchangeRateVES)) {
      data.lastRateUpdate = new Date();
    }

    const saved = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', companyName: 'Electro Shop Morandin C.A.', ...data },
    });

    // Al activar la tasa automática se trae la del BCV en el momento
    let settings = saved;
    if (patch.autoExchangeRates === true && !current?.autoExchangeRates) {
      const result = await refreshExchangeRate({ force: true });
      if (result.status === 'updated') {
        settings = (await prisma.companySettings.findUnique({ where: { id: 'default' } })) ?? saved;
      }
    }

    await clearSettingsCache();
    // Los settings públicos van en el HTML de todas las páginas (layout): regenerarlas ya
    revalidatePath('/', 'layout');

    return NextResponse.json(toAdminSettings(settings, canManageSettings));
  } catch (error) {
    // Sin error.message en la respuesta: puede traer detalles de la BD
    console.error('[SETTINGS API] Error:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
