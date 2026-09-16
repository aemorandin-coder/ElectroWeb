// Modelo del formulario de Configuración (C-50b). Solo los campos que tienen efecto en la tienda;
// la validación real está en el servidor (lib/validations/settings.ts).

import type { IconType } from 'react-icons';
import { FiBriefcase, FiDollarSign, FiMail, FiSearch, FiShield, FiShoppingBag, FiTruck } from 'react-icons/fi';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export type DayHours = { open: string; close: string; enabled: boolean };

export const DAY_LABELS: Record<WeekDay, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};

/** Números como texto: el campo puede quedar vacío mientras se escribe. */
export interface SettingsForm {
  companyName: string; tagline: string; legalName: string; rif: string;
  logo: string; favicon: string;
  email: string; phone: string; whatsapp: string; address: string; city: string; state: string;
  instagram: string; facebook: string; twitter: string; youtube: string; telegram: string; tiktok: string;
  businessHours: Record<WeekDay, DayHours>;

  autoExchangeRates: boolean; exchangeRateVES: string;
  taxEnabled: boolean; taxPercent: string;
  minOrderAmountUSD: string; maxOrderAmountUSD: string;

  deliveryEnabled: boolean; shippingCostPerKg: string; minConsolidatedShipping: string; packagingFeeUSD: string;
  freeDeliveryThresholdUSD: string;
  pickupEnabled: boolean; pickupAddress: string; pickupInstructions: string;

  maxFeaturedProducts: string; showCategories: boolean; maxCategoriesDisplay: string;
  heroVideoEnabled: boolean; heroVideoUrl: string; heroVideoTitle: string; heroVideoDescription: string;
  lowStockThreshold: string; autoHideOutOfStock: boolean; notifyLowStock: boolean; notifyOutOfStock: boolean;

  metaTitle: string; metaDescription: string; metaKeywords: string; homeMetaImage: string;
  productsMetaTitle: string; productsMetaDescription: string; productsMetaKeywords: string; productsMetaImage: string;
  servicesMetaTitle: string; servicesMetaDescription: string; servicesMetaKeywords: string; servicesMetaImage: string;
  coursesMetaTitle: string; coursesMetaDescription: string; coursesMetaKeywords: string; coursesMetaImage: string;

  adminAlertEmails: string[]; primaryColor: string; secondaryColor: string;
  maintenanceMode: boolean; maintenanceMessage: string; maintenanceStartTime: string; maintenanceEndTime: string;
  maintenanceAllowedIPs: string;
}

export type SettingsKey = keyof SettingsForm;
export type SetField = <K extends SettingsKey>(key: K, value: SettingsForm[K]) => void;
export type FieldErrors = Partial<Record<SettingsKey | 'form', string>>;

export interface SectionProps {
  form: SettingsForm;
  set: SetField;
  errors: FieldErrors;
}

export type SectionId = 'negocio' | 'precios' | 'envios' | 'tienda' | 'seo' | 'sistema' | 'correo';

export const SECTIONS: { id: SectionId; label: string; description: string; icon: IconType; fields: SettingsKey[] }[] = [
  {
    id: 'negocio', label: 'Negocio', icon: FiBriefcase,
    description: 'Nombre, logo, contacto, redes y horario. Se ven en el pie de página, Contacto y los correos.',
    fields: ['companyName', 'tagline', 'legalName', 'rif', 'logo', 'favicon', 'email', 'phone', 'whatsapp', 'address', 'city', 'state',
      'instagram', 'facebook', 'twitter', 'youtube', 'telegram', 'tiktok', 'businessHours'],
  },
  {
    id: 'precios', label: 'Precios y pagos', icon: FiDollarSign,
    description: 'Tasa BCV para los precios en bolívares, IVA y montos mínimo y máximo por compra.',
    fields: ['autoExchangeRates', 'exchangeRateVES', 'taxEnabled', 'taxPercent', 'minOrderAmountUSD', 'maxOrderAmountUSD'],
  },
  {
    id: 'envios', label: 'Envíos y retiro', icon: FiTruck,
    description: 'Cómo reciben los clientes sus productos físicos y cuánto cuesta el envío.',
    fields: ['deliveryEnabled', 'shippingCostPerKg', 'minConsolidatedShipping', 'packagingFeeUSD', 'freeDeliveryThresholdUSD',
      'pickupEnabled', 'pickupAddress', 'pickupInstructions'],
  },
  {
    id: 'tienda', label: 'Portada e inventario', icon: FiShoppingBag,
    description: 'Qué muestra la portada y qué pasa cuando un producto se queda sin stock.',
    fields: ['maxFeaturedProducts', 'showCategories', 'maxCategoriesDisplay', 'heroVideoEnabled', 'heroVideoUrl', 'heroVideoTitle',
      'heroVideoDescription', 'lowStockThreshold', 'autoHideOutOfStock', 'notifyLowStock', 'notifyOutOfStock'],
  },
  {
    id: 'seo', label: 'Google y redes', icon: FiSearch,
    description: 'Título, descripción e imagen con que aparecen las páginas en Google, WhatsApp y Facebook.',
    fields: ['metaTitle', 'metaDescription', 'metaKeywords', 'homeMetaImage', 'productsMetaTitle', 'productsMetaDescription',
      'productsMetaKeywords', 'productsMetaImage', 'servicesMetaTitle', 'servicesMetaDescription', 'servicesMetaKeywords',
      'servicesMetaImage', 'coursesMetaTitle', 'coursesMetaDescription', 'coursesMetaKeywords', 'coursesMetaImage'],
  },
  {
    id: 'sistema', label: 'Avisos y mantenimiento', icon: FiShield,
    description: 'Correos que reciben las alertas, colores de los correos y modo mantenimiento.',
    fields: ['adminAlertEmails', 'primaryColor', 'secondaryColor', 'maintenanceMode', 'maintenanceMessage', 'maintenanceStartTime',
      'maintenanceEndTime', 'maintenanceAllowedIPs'],
  },
  // C-75: el servidor de correo estaba en Marketing. Tiene su propio guardado (no usa la barra común)
  {
    id: 'correo', label: 'Correo', icon: FiMail,
    description: 'Servidor con el que salen todos los correos de la tienda, remitente y campañas de marketing.',
    fields: [],
  },
];

export function sectionOf(field: string): SectionId | null {
  return SECTIONS.find((section) => (section.fields as string[]).includes(field))?.id ?? null;
}

const DEFAULT_HOURS: Record<WeekDay, DayHours> = {
  monday: { open: '08:00', close: '18:00', enabled: true },
  tuesday: { open: '08:00', close: '18:00', enabled: true },
  wednesday: { open: '08:00', close: '18:00', enabled: true },
  thursday: { open: '08:00', close: '18:00', enabled: true },
  friday: { open: '08:00', close: '18:00', enabled: true },
  saturday: { open: '08:00', close: '13:00', enabled: true },
  sunday: { open: '09:00', close: '13:00', enabled: false },
};

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const num = (value: unknown, fallback = '') => (value === null || value === undefined || value === '' ? fallback : String(Number(value)));
const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

/** ISO → valor de <input type="datetime-local"> en la hora del navegador. */
export function isoToLocalInput(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toHours(value: unknown): Record<WeekDay, DayHours> {
  const source = value && typeof value === 'object' ? (value as Record<string, Partial<DayHours>>) : {};
  const valid = (time: unknown, fallback: string) => (typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : fallback);
  return Object.fromEntries(
    WEEK_DAYS.map((day) => [day, {
      open: valid(source[day]?.open, DEFAULT_HOURS[day].open),
      close: valid(source[day]?.close, DEFAULT_HOURS[day].close),
      enabled: bool(source[day]?.enabled, DEFAULT_HOURS[day].enabled),
    }])
  ) as Record<WeekDay, DayHours>;
}

/** Respuesta de GET /api/settings → formulario. */
export function toSettingsForm(data: Record<string, unknown>): SettingsForm {
  return {
    companyName: text(data.companyName), tagline: text(data.tagline), legalName: text(data.legalName), rif: text(data.rif),
    logo: text(data.logo), favicon: text(data.favicon),
    email: text(data.email), phone: text(data.phone), whatsapp: text(data.whatsapp), address: text(data.address),
    city: text(data.city), state: text(data.state),
    instagram: text(data.instagram), facebook: text(data.facebook), twitter: text(data.twitter), youtube: text(data.youtube),
    telegram: text(data.telegram), tiktok: text(data.tiktok),
    businessHours: toHours(data.businessHours),

    autoExchangeRates: bool(data.autoExchangeRates, false), exchangeRateVES: num(data.exchangeRateVES),
    taxEnabled: bool(data.taxEnabled, false), taxPercent: num(data.taxPercent, '0'),
    minOrderAmountUSD: num(data.minOrderAmountUSD), maxOrderAmountUSD: num(data.maxOrderAmountUSD),

    deliveryEnabled: bool(data.deliveryEnabled, true), shippingCostPerKg: num(data.shippingCostPerKg, '2'),
    minConsolidatedShipping: num(data.minConsolidatedShipping, '3'), packagingFeeUSD: num(data.packagingFeeUSD, '2.5'),
    freeDeliveryThresholdUSD: num(data.freeDeliveryThresholdUSD),
    pickupEnabled: bool(data.pickupEnabled, true), pickupAddress: text(data.pickupAddress), pickupInstructions: text(data.pickupInstructions),

    maxFeaturedProducts: num(data.maxFeaturedProducts, '8'), showCategories: bool(data.showCategories, true),
    maxCategoriesDisplay: num(data.maxCategoriesDisplay, '6'),
    heroVideoEnabled: bool(data.heroVideoEnabled, false), heroVideoUrl: text(data.heroVideoUrl),
    heroVideoTitle: text(data.heroVideoTitle), heroVideoDescription: text(data.heroVideoDescription),
    lowStockThreshold: num(data.lowStockThreshold, '10'), autoHideOutOfStock: bool(data.autoHideOutOfStock, false),
    notifyLowStock: bool(data.notifyLowStock, true), notifyOutOfStock: bool(data.notifyOutOfStock, true),

    metaTitle: text(data.metaTitle), metaDescription: text(data.metaDescription), metaKeywords: text(data.metaKeywords),
    homeMetaImage: text(data.homeMetaImage),
    productsMetaTitle: text(data.productsMetaTitle), productsMetaDescription: text(data.productsMetaDescription),
    productsMetaKeywords: text(data.productsMetaKeywords), productsMetaImage: text(data.productsMetaImage),
    servicesMetaTitle: text(data.servicesMetaTitle), servicesMetaDescription: text(data.servicesMetaDescription),
    servicesMetaKeywords: text(data.servicesMetaKeywords), servicesMetaImage: text(data.servicesMetaImage),
    coursesMetaTitle: text(data.coursesMetaTitle), coursesMetaDescription: text(data.coursesMetaDescription),
    coursesMetaKeywords: text(data.coursesMetaKeywords), coursesMetaImage: text(data.coursesMetaImage),

    adminAlertEmails: Array.isArray(data.adminAlertEmails) ? data.adminAlertEmails.filter((email): email is string => typeof email === 'string') : [],
    primaryColor: text(data.primaryColor) || '#2a63cd', secondaryColor: text(data.secondaryColor) || '#1e4ba3',
    maintenanceMode: bool(data.maintenanceMode, false), maintenanceMessage: text(data.maintenanceMessage),
    maintenanceStartTime: isoToLocalInput(data.maintenanceStartTime), maintenanceEndTime: isoToLocalInput(data.maintenanceEndTime),
    maintenanceAllowedIPs: text(data.maintenanceAllowedIPs),
  };
}

export function isDirty(form: SettingsForm, initial: SettingsForm, field: SettingsKey): boolean {
  return JSON.stringify(form[field]) !== JSON.stringify(initial[field]);
}

/** Solo los campos cambiados, listos para PUT /api/settings. */
export function buildPatch(form: SettingsForm, initial: SettingsForm): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of Object.keys(form) as SettingsKey[]) {
    if (!isDirty(form, initial, field)) continue;
    const value = form[field];
    if ((field === 'maintenanceStartTime' || field === 'maintenanceEndTime') && typeof value === 'string') {
      patch[field] = value ? new Date(value).toISOString() : null;
    } else {
      patch[field] = value;
    }
  }
  return patch;
}
