// Modelo del formulario de Configuración (C-50b). Solo los campos que tienen efecto en la tienda;
// la validación real está en el servidor (lib/validations/settings.ts).

import {
  IconoBaseDeDatos, IconoBillete, IconoBolsa, IconoBuscar, IconoCorreo, IconoEnvio, IconoMaletin, IconoNovedad,
  IconoClientes, IconoEnviar, IconoHerramientas, IconoInicio, IconoNotificaciones, IconoPaquete, IconoPintura, IconoTarjeta,
} from '@/components/iconos';
import type { IconType } from '@/components/iconos';
import { leerReglasEmbalaje, type Empaque } from '@/lib/embalaje';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export type DayHours = { open: string; close: string; enabled: boolean };

export const DAY_LABELS: Record<WeekDay, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};

/** C-153: empaques de la tienda, con los números como texto mientras se escriben */
export interface EmpaqueForm { id: string; nombre: string; largoCm: string; anchoCm: string; altoCm: string; precioUSD: string }
export interface PackagingRulesForm { activo: boolean; bultoAparteUSD: string; empaques: EmpaqueForm[] }

export const empaqueAForm = (e: Empaque): EmpaqueForm => ({
  id: e.id, nombre: e.nombre, largoCm: String(e.largoCm), anchoCm: String(e.anchoCm), altoCm: String(e.altoCm), precioUSD: String(e.precioUSD),
});

/** Números como texto: el campo puede quedar vacío mientras se escribe. */
export interface SettingsForm {
  companyName: string; tagline: string; legalName: string; rif: string;
  logo: string; favicon: string; quoteStamp: string;
  email: string; phone: string; whatsapp: string; address: string; city: string; state: string;
  instagram: string; facebook: string; twitter: string; youtube: string; telegram: string; tiktok: string;
  businessHours: Record<WeekDay, DayHours>;

  autoExchangeRates: boolean; exchangeRateVES: string;
  taxEnabled: boolean; taxPercent: string; taxDigitalProducts: boolean;
  minOrderAmountUSD: string; maxOrderAmountUSD: string;

  deliveryEnabled: boolean; packagingFeeUSD: string;
  freeDeliveryThresholdUSD: string;
  freePackagingThresholdUSD: string; packagingRules: PackagingRulesForm;
  localDeliveryEnabled: boolean; deliveryFeeUSD: string;
  pickupEnabled: boolean; pickupAddress: string; pickupInstructions: string;
  horaCorte: string; diasCerrados: string[]; diasAbiertos: string[];

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

// C-293 (AJUSTES.md §3, D1 del 18/11): el mapa nuevo. Los grupos van en el menú de la izquierda, cada sección con su estado en
// una línea; en el teléfono, primero la lista. Cada sección guarda sola. Las direcciones viejas (#negocio, #precios, #tienda)
// llevan a su sección nueva.
export type SectionId =
  | 'datos' | 'marca' | 'tasa' | 'pagos' | 'compras' | 'inventario' | 'envios'
  | 'avisos' | 'telegram' | 'correo' | 'ia' | 'respaldos' | 'mantenimiento';

export type GrupoId = 'negocio' | 'vender' | 'avisos' | 'conexiones' | 'tienda' | 'equipo';

export interface Seccion {
  id: SectionId;
  grupo: GrupoId;
  label: string;
  description: string;
  icon: IconType;
  fields: SettingsKey[];
  /** El estado en una línea, para el menú ("36,50 Bs · IVA 16 %") */
  estado: (form: SettingsForm) => string;
}

export const GRUPOS: { id: GrupoId; label: string }[] = [
  { id: 'negocio', label: 'Tu negocio' },
  { id: 'vender', label: 'Vender' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'conexiones', label: 'Conexiones' },
  { id: 'tienda', label: 'La tienda en línea' },
  { id: 'equipo', label: 'Equipo y acceso' },
];

/** Las direcciones de antes de C-293 y C-294 */
export const SECCION_VIEJA: Record<string, SectionId> = { negocio: 'datos', precios: 'tasa', sistema: 'avisos' };

/** C-294 (D2 del 18/11): Portada y "Google y redes" pasaron a Marketing: sus direcciones viejas van allá */
export const EN_MARKETING: Record<string, string> = { tienda: '/admin/marketing#portada', portada: '/admin/marketing#portada', seo: '/admin/marketing#google' };

/** Lo que está en otra pantalla pero se busca aquí: va en el menú de su grupo, como un enlace */
export const ENLACES: { grupo: GrupoId; href: string; label: string; estado: string; icon: IconType }[] = [
  { grupo: 'tienda', href: '/admin/marketing#portada', label: 'Portada', estado: 'En Marketing: destacados y video', icon: IconoInicio },
  { grupo: 'equipo', href: '/admin/equipo', label: 'Equipo', estado: 'Quién entra al panel y con qué rol', icon: IconoClientes },
  { grupo: 'tienda', href: '/admin/marketing#google', label: 'Google y redes', estado: 'En Marketing: cómo se comparte', icon: IconoBuscar },
];

const bs = (v: string) => (Number(v) > 0 ? `${Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` : 'Sin tasa');
const usd = (v: string) => `$${Number(v).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`;

export const SECTIONS: Seccion[] = [
  {
    id: 'datos', grupo: 'negocio', label: 'Datos y contacto', icon: IconoMaletin,
    description: 'Se ven en el pie de página, en Contacto y en los correos.',
    fields: ['companyName', 'tagline', 'legalName', 'rif', 'email', 'phone', 'whatsapp', 'address', 'city', 'state',
      'instagram', 'facebook', 'twitter', 'youtube', 'telegram', 'tiktok', 'businessHours'],
    estado: (f) => [f.companyName || 'Sin nombre', f.city].filter(Boolean).join(' · '),
  },
  {
    id: 'marca', grupo: 'negocio', label: 'Logo y sello', icon: IconoPintura,
    description: 'El logo, el ícono de la pestaña y el sello de los presupuestos.',
    fields: ['logo', 'favicon', 'quoteStamp'],
    estado: (f) => `${f.logo ? 'Con logo' : 'Sin logo'}${f.quoteStamp ? ' · con sello' : ''}`,
  },
  {
    id: 'tasa', grupo: 'vender', label: 'Tasa e IVA', icon: IconoBillete,
    description: 'La tasa BCV de los precios en bolívares y el IVA.',
    fields: ['autoExchangeRates', 'exchangeRateVES', 'taxEnabled', 'taxPercent', 'taxDigitalProducts'],
    estado: (f) => `${bs(f.exchangeRateVES)} · ${f.taxEnabled ? `IVA ${Number(f.taxPercent)} %` : 'sin IVA'}`,
  },
  // C-293 (D5): Métodos de pago entra a Ajustes. Tiene sus propios guardados (su asistente)
  {
    id: 'pagos', grupo: 'vender', label: 'Métodos de pago', icon: IconoTarjeta,
    description: 'Pago Móvil, transferencias, Zelle, Binance y efectivo: los datos que ve el cliente al pagar.',
    fields: [],
    estado: () => 'Las cuentas de cobro',
  },
  {
    id: 'compras', grupo: 'vender', label: 'Límites de compra', icon: IconoBolsa,
    description: 'El mínimo y el máximo de una compra.',
    fields: ['minOrderAmountUSD', 'maxOrderAmountUSD'],
    estado: (f) => (!Number(f.minOrderAmountUSD) && !Number(f.maxOrderAmountUSD) ? 'Sin límites'
      : [Number(f.minOrderAmountUSD) ? `desde ${usd(f.minOrderAmountUSD)}` : '', Number(f.maxOrderAmountUSD) ? `hasta ${usd(f.maxOrderAmountUSD)}` : ''].filter(Boolean).join(' · ').replace(/^./, (x) => x.toUpperCase())),
  },
  {
    id: 'inventario', grupo: 'vender', label: 'Inventario', icon: IconoPaquete,
    description: 'Cuándo un producto tiene poco stock y qué pasa cuando se agota.',
    fields: ['lowStockThreshold', 'autoHideOutOfStock'],
    estado: (f) => `Poco stock: ${Number(f.lowStockThreshold) || 0} und. · ${f.autoHideOutOfStock ? 'oculta agotados' : 'muestra agotados'}`,
  },
  {
    id: 'envios', grupo: 'vender', label: 'Envíos y retiro', icon: IconoEnvio,
    description: 'Cómo reciben los clientes sus productos físicos y cuánto cuesta.',
    fields: ['deliveryEnabled', 'packagingFeeUSD', 'freeDeliveryThresholdUSD', 'freePackagingThresholdUSD', 'packagingRules', 'localDeliveryEnabled', 'deliveryFeeUSD',
      'pickupEnabled', 'pickupAddress', 'pickupInstructions', 'horaCorte', 'diasCerrados', 'diasAbiertos'],
    estado: (f) => [f.deliveryEnabled ? 'ZOOM y MRW' : 'Sin envíos', f.localDeliveryEnabled ? 'delivery' : '', f.pickupEnabled ? 'retiro' : ''].filter(Boolean).join(' · '),
  },
  // C-294 (D6 del 18/11): "Qué avisar" y Telegram estaban en Notificaciones; ahora van juntos con los correos de alerta
  {
    id: 'avisos', grupo: 'avisos', label: 'Qué avisar', icon: IconoNotificaciones,
    description: 'Lo que te avisa la tienda, por dónde (el panel, el correo o Telegram) y a qué correos.',
    fields: ['adminAlertEmails'],
    estado: (f) => `${f.adminAlertEmails.length} ${f.adminAlertEmails.length === 1 ? 'correo de alerta' : 'correos de alerta'}`,
  },
  {
    id: 'telegram', grupo: 'avisos', label: 'Telegram', icon: IconoEnviar,
    description: 'El bot que manda los avisos y lo que sale de ElectroStudio a tu chat de Telegram.',
    fields: [],
    estado: () => 'El bot de los avisos',
  },
  // C-75: el servidor de correo estaba en Marketing. Tiene su propio guardado (no usa la barra común)
  {
    id: 'correo', grupo: 'conexiones', label: 'Correo', icon: IconoCorreo,
    description: 'El servidor con el que salen los correos de la tienda y el remitente.',
    fields: [],
    estado: () => 'El servidor y el remitente',
  },
  // C-288 y C-292: la IA. Tiene sus propios guardados
  {
    id: 'ia', grupo: 'conexiones', label: 'IA', icon: IconoNovedad,
    description: 'Quién responde, las claves de cada proveedor, las reglas y las instrucciones de cada uso, lo que gasta y lo que falla.',
    fields: [],
    estado: () => 'Quién responde y las claves',
  },
  // C-165: respaldos a Google Drive. Tiene su propio guardado y sus propias acciones
  {
    id: 'respaldos', grupo: 'conexiones', label: 'Respaldos', icon: IconoBaseDeDatos,
    description: 'Copia cifrada de la base de datos y de los archivos en tu Google Drive, cada día y sola.',
    fields: [],
    estado: () => 'Copia diaria a Google Drive',
  },
  {
    id: 'mantenimiento', grupo: 'tienda', label: 'Mantenimiento', icon: IconoHerramientas,
    description: 'Cerrar la tienda un rato, con un aviso para los visitantes.',
    fields: ['maintenanceMode', 'maintenanceMessage', 'maintenanceStartTime', 'maintenanceEndTime', 'maintenanceAllowedIPs'],
    estado: (f) => (f.maintenanceMode ? 'Encendido: la tienda está cerrada' : 'Apagado'),
  },
];

/** C-293: lo que toca dinero o lo que ve el cliente al comprar: se revisa antes → después antes de guardar, con a qué afecta */
export const CAMPOS_DELICADOS: Partial<Record<SettingsKey, { nombre: string; formato: (v: SettingsForm[SettingsKey]) => string; afecta: string }>> = {
  autoExchangeRates: { nombre: 'Cómo se actualiza la tasa', formato: (v) => (v ? 'Automática' : 'A mano'), afecta: 'Todos los precios en bolívares.' },
  exchangeRateVES: { nombre: 'La tasa', formato: (v) => bs(String(v)), afecta: 'Todos los precios en bolívares y los Pagos Móvil nuevos.' },
  taxEnabled: { nombre: 'Los precios incluyen IVA', formato: (v) => (v ? 'Sí' : 'No'), afecta: 'Lo que dicen el carrito, el pago, el recibo y la factura.' },
  taxPercent: { nombre: 'El IVA', formato: (v) => `${Number(v)} %`, afecta: 'Lo que dicen el carrito, el pago, el recibo y la factura.' },
  taxDigitalProducts: { nombre: 'IVA en los digitales', formato: (v) => (v ? 'Sí' : 'No'), afecta: 'Los pedidos nuevos de códigos, gift cards y recargas.' },
  minOrderAmountUSD: { nombre: 'Compra mínima', formato: (v) => (Number(v) > 0 ? usd(String(v)) : 'Sin mínimo'), afecta: 'Los carritos que se pagan desde ahora.' },
  maxOrderAmountUSD: { nombre: 'Compra máxima', formato: (v) => (Number(v) > 0 ? usd(String(v)) : 'Sin máximo'), afecta: 'Los carritos que se pagan desde ahora.' },
  deliveryEnabled: { nombre: 'Envíos nacionales', formato: (v) => (v ? 'Sí' : 'No'), afecta: 'Lo que ofrece el checkout desde ahora.' },
  packagingFeeUSD: { nombre: 'Embalaje', formato: (v) => usd(String(v || 0)), afecta: 'Los pedidos con envío desde ahora.' },
  freeDeliveryThresholdUSD: { nombre: 'Envío gratis desde', formato: (v) => (Number(v) > 0 ? usd(String(v)) : 'Sin envío gratis'), afecta: 'Los pedidos con envío desde ahora.' },
  freePackagingThresholdUSD: { nombre: 'Embalaje gratis desde', formato: (v) => (Number(v) > 0 ? usd(String(v)) : 'Siempre se cobra'), afecta: 'Los pedidos con envío desde ahora.' },
  deliveryFeeUSD: { nombre: 'Tarifa del delivery', formato: (v) => usd(String(v || 0)), afecta: 'Los pedidos con delivery desde ahora.' },
  maintenanceMode: { nombre: 'Modo mantenimiento', formato: (v) => (v ? 'Encendido' : 'Apagado'), afecta: 'Encendido, los clientes no pueden comprar.' },
};

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

function toPackagingRules(value: unknown): PackagingRulesForm {
  const reglas = leerReglasEmbalaje(value);
  return { activo: reglas.activo, bultoAparteUSD: String(reglas.bultoAparteUSD), empaques: reglas.empaques.map(empaqueAForm) };
}

/** Respuesta de GET /api/settings → formulario. */
export function toSettingsForm(data: Record<string, unknown>): SettingsForm {
  return {
    companyName: text(data.companyName), tagline: text(data.tagline), legalName: text(data.legalName), rif: text(data.rif),
    logo: text(data.logo), favicon: text(data.favicon), quoteStamp: text(data.quoteStamp),
    email: text(data.email), phone: text(data.phone), whatsapp: text(data.whatsapp), address: text(data.address),
    city: text(data.city), state: text(data.state),
    instagram: text(data.instagram), facebook: text(data.facebook), twitter: text(data.twitter), youtube: text(data.youtube),
    telegram: text(data.telegram), tiktok: text(data.tiktok),
    businessHours: toHours(data.businessHours),

    autoExchangeRates: bool(data.autoExchangeRates, false), exchangeRateVES: num(data.exchangeRateVES),
    taxEnabled: bool(data.taxEnabled, false), taxPercent: num(data.taxPercent, '0'), taxDigitalProducts: bool(data.taxDigitalProducts, false),
    minOrderAmountUSD: num(data.minOrderAmountUSD), maxOrderAmountUSD: num(data.maxOrderAmountUSD),

    deliveryEnabled: bool(data.deliveryEnabled, true), packagingFeeUSD: num(data.packagingFeeUSD, '2.5'),
    freeDeliveryThresholdUSD: num(data.freeDeliveryThresholdUSD),
    freePackagingThresholdUSD: num(data.freePackagingThresholdUSD), packagingRules: toPackagingRules(data.packagingRules),
    localDeliveryEnabled: bool(data.localDeliveryEnabled, false), deliveryFeeUSD: num(data.deliveryFeeUSD, '0'),
    pickupEnabled: bool(data.pickupEnabled, true), pickupAddress: text(data.pickupAddress), pickupInstructions: text(data.pickupInstructions),
    horaCorte: text(data.horaCorte) || '14:00',
    diasCerrados: Array.isArray(data.diasCerrados) ? data.diasCerrados.filter((d): d is string => typeof d === 'string') : [],
    diasAbiertos: Array.isArray(data.diasAbiertos) ? data.diasAbiertos.filter((d): d is string => typeof d === 'string') : [],

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

/** Solo los campos cambiados, listos para PUT /api/settings. C-293: con `campos`, solo los de esa sección (cada sección guarda sola) */
export function buildPatch(form: SettingsForm, initial: SettingsForm, campos?: readonly SettingsKey[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of (campos ?? Object.keys(form)) as SettingsKey[]) {
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
