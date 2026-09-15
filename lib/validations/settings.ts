// Configuración de la tienda (C-50b): lo único de CompanySettings que el panel puede guardar.
// Lista blanca: cualquier otro campo del body se ignora. Los campos que no tienen efecto en la tienda
// (textos del hero viejo, estadísticas, bloque CTA, año de fundación, moneda principal, tasa EUR,
// stock crítico) ya no se aceptan: siguen en la base de datos, pero nadie los lee.

import { z } from 'zod';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]{2,39}$/;

/** '' o null → null; texto recortado con tope. */
const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).nullable().transform((value) => value || null);

const optionalUrl = (max = 300) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .refine((value) => value === '' || /^https?:\/\/[^\s]+$/i.test(value), 'Debe ser un enlace que empiece por https://')
    .nullable()
    .transform((value) => value || null);

/** Imagen subida (/uploads/…) o enlace https. Sin rutas relativas raras ni "..". */
const optionalImage = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === '' || (/^\/(?!\/)[^\s]*$/.test(value) && !value.includes('..')) || /^https:\/\/[^\s]+$/i.test(value),
    'Imagen inválida'
  )
  .nullable()
  .transform((value) => value || null);

const toNumber = (value: unknown) => (value === '' || value === null || value === undefined ? null : Number(value));

const money = (max = 100_000) => z.preprocess(toNumber, z.number({ error: 'Escribe un monto' }).min(0, 'No puede ser negativo').max(max, `Máximo ${max}`));
const optionalMoney = (max = 1_000_000) =>
  z.preprocess(toNumber, z.number({ error: 'Monto inválido' }).min(0, 'No puede ser negativo').max(max, `Máximo ${max}`).nullable());
const integer = (min: number, max: number) =>
  z.preprocess(toNumber, z.number({ error: 'Escribe un número' }).int('Debe ser un número entero').min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`));

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida');

const optionalDate = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Fecha inválida' });
      return z.NEVER;
    }
    return date;
  });

const dayHours = z.object({ open: time, close: time, enabled: z.boolean() });

export const settingsUpdateSchema = z.object({
  // Negocio
  companyName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  tagline: optionalText(120),
  legalName: optionalText(150),
  rif: optionalText(20),
  logo: optionalImage,
  favicon: optionalImage,
  email: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === '' || EMAIL.test(value), 'Correo inválido')
    .nullable()
    .transform((value) => value || null),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  address: optionalText(250),
  city: optionalText(80),
  state: optionalText(80),
  instagram: optionalUrl(),
  facebook: optionalUrl(),
  twitter: optionalUrl(),
  youtube: optionalUrl(),
  telegram: optionalUrl(),
  tiktok: optionalUrl(),
  businessHours: z
    .object(Object.fromEntries(WEEK_DAYS.map((day) => [day, dayHours])) as Record<WeekDay, typeof dayHours>)
    .transform((hours) => JSON.stringify(hours)),

  // Precios y pagos
  autoExchangeRates: z.boolean(),
  exchangeRateVES: z.preprocess(toNumber, z.number({ error: 'Escribe la tasa' }).gt(0, 'Debe ser mayor a 0').max(10_000_000)),
  taxEnabled: z.boolean(),
  taxPercent: z.preprocess(toNumber, z.number({ error: 'Escribe el porcentaje' }).min(0, 'No puede ser negativo').max(100, 'Máximo 100%')),
  minOrderAmountUSD: optionalMoney(),
  maxOrderAmountUSD: optionalMoney(),

  // Envíos y retiro
  deliveryEnabled: z.boolean(),
  shippingCostPerKg: money(1000),
  minConsolidatedShipping: money(1000),
  packagingFeeUSD: money(1000),
  freeDeliveryThresholdUSD: optionalMoney(),
  pickupEnabled: z.boolean(),
  pickupAddress: optionalText(250),
  pickupInstructions: optionalText(500),

  // Tienda
  heroVideoEnabled: z.boolean(),
  heroVideoUrl: optionalUrl(500),
  heroVideoTitle: optionalText(80),
  heroVideoDescription: optionalText(200),
  maxFeaturedProducts: integer(2, 24),
  showCategories: z.boolean(),
  maxCategoriesDisplay: integer(1, 12),
  lowStockThreshold: integer(0, 1000),
  autoHideOutOfStock: z.boolean(),
  notifyLowStock: z.boolean(),
  notifyOutOfStock: z.boolean(),

  // SEO
  metaTitle: optionalText(70),
  metaDescription: optionalText(170),
  metaKeywords: optionalText(300),
  homeMetaImage: optionalImage,
  productsMetaTitle: optionalText(70),
  productsMetaDescription: optionalText(170),
  productsMetaKeywords: optionalText(300),
  productsMetaImage: optionalImage,
  servicesMetaTitle: optionalText(70),
  servicesMetaDescription: optionalText(170),
  servicesMetaKeywords: optionalText(300),
  servicesMetaImage: optionalImage,
  coursesMetaTitle: optionalText(70),
  coursesMetaDescription: optionalText(170),
  coursesMetaKeywords: optionalText(300),
  coursesMetaImage: optionalImage,

  // Correos y seguridad
  primaryColor: color,
  secondaryColor: color,
  adminAlertEmails: z
    .array(z.string().trim().toLowerCase().regex(EMAIL, 'Correo inválido'))
    .max(20, 'Máximo 20 correos')
    .transform((emails) => (emails.length > 0 ? JSON.stringify([...new Set(emails)]) : null)),
  maintenanceMode: z.boolean(),
  maintenanceMessage: optionalText(500),
  maintenanceStartTime: optionalDate,
  maintenanceEndTime: optionalDate,
  maintenanceAllowedIPs: z
    .string()
    .nullable()
    .transform((value, ctx) => {
      const ips = (value || '').split(/[\s,]+/).filter(Boolean);
      const invalid = ips.find((ip) => !IPV4.test(ip) && !(ip.includes(':') && IPV6.test(ip)));
      if (invalid) {
        ctx.addIssue({ code: 'custom', message: `IP inválida: ${invalid.slice(0, 45)}` });
        return z.NEVER;
      }
      if (ips.length > 50) {
        ctx.addIssue({ code: 'custom', message: 'Máximo 50 IPs' });
        return z.NEVER;
      }
      return ips.length > 0 ? [...new Set(ips)].join(', ') : null;
    }),

  // Popup promocional (lo guarda Marketing)
  hotAdEnabled: z.boolean(),
  // Archivo subido, https o el base64 viejo que Marketing reenvía sin cambios
  hotAdImage: z
    .string()
    .max(8_000_000)
    .refine(
      (value) =>
        value === '' ||
        /^data:image\/(png|jpeg|webp|gif);base64,/.test(value) ||
        (/^\/(?!\/)[^\s]*$/.test(value) && !value.includes('..')) ||
        /^https:\/\/[^\s]+$/i.test(value),
      'Imagen inválida'
    )
    .nullable()
    .transform((value) => value || null),
  hotAdLink: optionalText(500),
  hotAdTransparentBg: z.boolean(),
  hotAdShadowEnabled: z.boolean(),
  hotAdShadowBlur: integer(0, 100),
  hotAdShadowOpacity: integer(0, 100),
  hotAdBackdropOpacity: integer(0, 100),
  hotAdBackdropColor: color,
});

export const settingsPatchSchema = settingsUpdateSchema.partial();
export type SettingsPatch = z.output<typeof settingsPatchSchema>;
export type SettingsField = keyof z.input<typeof settingsUpdateSchema>;

/** Lo que Marketing (MANAGE_CONTENT) puede guardar sin MANAGE_SETTINGS. */
export const HOT_AD_FIELDS: readonly SettingsField[] = [
  'hotAdEnabled', 'hotAdImage', 'hotAdLink', 'hotAdTransparentBg', 'hotAdShadowEnabled',
  'hotAdShadowBlur', 'hotAdShadowOpacity', 'hotAdBackdropOpacity', 'hotAdBackdropColor',
];

/** Errores de zod como { campo: mensaje } (el primero de cada campo). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    if (!result[field]) result[field] = issue.message;
  }
  return result;
}

type MergedRules = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  minOrderAmountUSD: number | null;
  maxOrderAmountUSD: number | null;
  maintenanceStartTime: Date | null;
  maintenanceEndTime: Date | null;
};

/** Reglas entre campos, con los valores ya combinados (lo guardado + lo que llega). */
export function crossFieldErrors(merged: MergedRules): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!merged.deliveryEnabled && !merged.pickupEnabled) {
    errors.deliveryEnabled = 'Deja activo el envío o el retiro en tienda: sin ninguno no se pueden comprar productos físicos.';
  }
  if (merged.minOrderAmountUSD !== null && merged.maxOrderAmountUSD !== null && merged.minOrderAmountUSD > merged.maxOrderAmountUSD) {
    errors.maxOrderAmountUSD = 'El máximo debe ser mayor que el mínimo';
  }
  if (merged.maintenanceStartTime && merged.maintenanceEndTime && merged.maintenanceEndTime <= merged.maintenanceStartTime) {
    errors.maintenanceEndTime = 'El fin debe ser después del inicio';
  }
  return errors;
}
