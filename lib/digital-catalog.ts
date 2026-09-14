// Catálogo de productos digitales (C-60): unidades, plataformas con sus plantillas y proveedores.
// Sin dependencias de servidor ni de React: lo usan el admin, la tienda y el cálculo de órdenes.

export const DIGITAL_UNITS = {
  USD: { name: 'Dólares (USD)', singular: '', plural: '', prefix: '$' },
  EUR: { name: 'Euros (EUR)', singular: '', plural: '', prefix: '€' },
  ROBUX: { name: 'Robux', singular: 'Robux', plural: 'Robux', prefix: '' },
  VBUCKS: { name: 'V-Bucks', singular: 'V-Buck', plural: 'V-Bucks', prefix: '' },
  DIAMONDS: { name: 'Diamantes', singular: 'diamante', plural: 'diamantes', prefix: '' },
  UC: { name: 'UC (PUBG)', singular: 'UC', plural: 'UC', prefix: '' },
  VP: { name: 'Valorant Points', singular: 'VP', plural: 'VP', prefix: '' },
  MONTHS: { name: 'Meses de suscripción', singular: 'mes', plural: 'meses', prefix: '' },
  LICENSES: { name: 'Licencias', singular: 'licencia', plural: 'licencias', prefix: '' },
} as const;
export type DigitalUnit = keyof typeof DIGITAL_UNITS;
export const DIGITAL_UNIT_KEYS = Object.keys(DIGITAL_UNITS) as DigitalUnit[];

export const DIGITAL_PROVIDERS = [
  { value: 'ENEBA', label: 'Eneba' },
  { value: 'COINSBEE', label: 'Coinsbee' },
  { value: 'OTRO', label: 'Otro proveedor' },
] as const;
export type DigitalProvider = (typeof DIGITAL_PROVIDERS)[number]['value'];

/** Modos de entrega (valores guardados en Product.deliveryMethod). */
export const DELIVERY_MODES = {
  // Se guarda como INSTANT por compatibilidad, pero NO es automático: el código se compra al confirmar el pago
  INSTANT: {
    admin: 'Código digital',
    adminHelp: 'Cuando se confirma el pago compras el código a tu proveedor y lo entregas desde el pedido. El cliente lo ve en "Mis pedidos".',
    store: 'Código digital',
    storeHelp: 'Recibes el código en "Mis pedidos" cuando confirmamos tu pago',
  },
  MANUAL: {
    admin: 'Recarga directa a la cuenta',
    adminHelp: 'Recargas el saldo directamente en la cuenta del cliente. Al comprar se le pide el dato de su cuenta.',
    store: 'Recarga directa a tu cuenta',
    storeHelp: 'Recargamos el saldo en tu cuenta cuando confirmamos tu pago',
  },
} as const;
export type DeliveryMode = keyof typeof DELIVERY_MODES;

export interface DigitalPlatform {
  value: string;
  label: string;
  /** Las que más se venden aparecen primero en el admin */
  featured?: boolean;
  unit: DigitalUnit;
  presetValues: number[];
  delivery: DeliveryMode;
  region: string;
  accountFieldLabel: string;
  accountFieldHint: string;
  instructions: string;
}

export const DIGITAL_PLATFORMS: DigitalPlatform[] = [
  {
    value: 'PLAYSTATION', label: 'PlayStation', featured: true, unit: 'USD', presetValues: [10, 25, 50, 75, 100], delivery: 'INSTANT', region: 'USA',
    accountFieldLabel: 'Correo de tu cuenta PSN', accountFieldHint: 'El correo con el que entras a PlayStation Network',
    instructions: '1. Entra a PlayStation Store desde tu consola o en store.playstation.com.\n2. Abre tu perfil y elige "Canjear códigos".\n3. Escribe el código de 12 caracteres.\n4. El saldo queda en tu billetera de PSN.',
  },
  {
    value: 'XBOX', label: 'Xbox', featured: true, unit: 'USD', presetValues: [10, 15, 25, 50, 100], delivery: 'INSTANT', region: 'USA',
    accountFieldLabel: 'Correo de tu cuenta Microsoft', accountFieldHint: 'El correo de tu cuenta Xbox / Microsoft',
    instructions: '1. Entra a redeem.microsoft.com con tu cuenta Microsoft.\n2. Escribe el código de 25 caracteres.\n3. Confirma y el saldo queda en tu cuenta.',
  },
  {
    value: 'ROBLOX', label: 'Roblox', featured: true, unit: 'ROBUX', presetValues: [400, 800, 1700, 4500, 10000], delivery: 'INSTANT', region: 'GLOBAL',
    accountFieldLabel: 'Usuario de Roblox', accountFieldHint: 'Tu nombre de usuario, no el nombre visible',
    instructions: '1. Entra a roblox.com/redeem con tu cuenta.\n2. Escribe el código.\n3. Pulsa "Canjear" y los Robux se suman a tu cuenta.',
  },
  {
    value: 'STEAM', label: 'Steam', featured: true, unit: 'USD', presetValues: [5, 10, 20, 50, 100], delivery: 'INSTANT', region: 'USA',
    accountFieldLabel: 'Usuario de Steam', accountFieldHint: 'Tu nombre de cuenta de Steam',
    instructions: '1. Abre Steam y ve a tu nombre de usuario > "Detalles de la cuenta".\n2. Elige "Añadir fondos al monedero" > "Canjear un código de Steam".\n3. Escribe el código y confirma.',
  },
  {
    value: 'NINTENDO', label: 'Nintendo', unit: 'USD', presetValues: [10, 20, 35, 50], delivery: 'INSTANT', region: 'USA',
    accountFieldLabel: 'Correo de tu cuenta Nintendo', accountFieldHint: '',
    instructions: '1. Abre Nintendo eShop en tu consola.\n2. Elige "Canjear código".\n3. Escribe el código de 16 caracteres.',
  },
  {
    value: 'FREEFIRE', label: 'Free Fire', unit: 'DIAMONDS', presetValues: [100, 310, 520, 1060, 2180], delivery: 'MANUAL', region: 'LATAM',
    accountFieldLabel: 'ID de jugador de Free Fire', accountFieldHint: 'Lo ves en tu perfil dentro del juego',
    instructions: 'Recargamos los diamantes directamente en tu ID de jugador. No necesitas canjear nada.',
  },
  {
    value: 'VALORANT', label: 'Valorant', unit: 'VP', presetValues: [475, 1000, 2050, 3650], delivery: 'INSTANT', region: 'LATAM',
    accountFieldLabel: 'Riot ID', accountFieldHint: 'Ejemplo: Jugador#LAN',
    instructions: '1. Abre Valorant y entra a la tienda.\n2. Elige "Canjear código" (Prepaid cards & codes).\n3. Escribe el código.',
  },
  {
    value: 'FORTNITE', label: 'Fortnite', unit: 'VBUCKS', presetValues: [1000, 2800, 5000, 13500], delivery: 'INSTANT', region: 'GLOBAL',
    accountFieldLabel: 'Usuario de Epic Games', accountFieldHint: '',
    instructions: '1. Entra a fortnite.com/vbuckscard con tu cuenta de Epic Games.\n2. Escribe el código y confirma.',
  },
  {
    value: 'PUBG', label: 'PUBG Mobile', unit: 'UC', presetValues: [60, 325, 660, 1800], delivery: 'MANUAL', region: 'GLOBAL',
    accountFieldLabel: 'ID de jugador de PUBG Mobile', accountFieldHint: 'Lo ves en tu perfil dentro del juego',
    instructions: 'Recargamos los UC directamente en tu ID de jugador.',
  },
  { value: 'NETFLIX', label: 'Netflix', unit: 'USD', presetValues: [15, 30, 60], delivery: 'INSTANT', region: 'USA', accountFieldLabel: 'Correo de tu cuenta Netflix', accountFieldHint: '', instructions: '1. Entra a netflix.com/redeem.\n2. Escribe el código y confirma.' },
  { value: 'SPOTIFY', label: 'Spotify', unit: 'USD', presetValues: [10, 30, 60], delivery: 'INSTANT', region: 'USA', accountFieldLabel: 'Correo de tu cuenta Spotify', accountFieldHint: '', instructions: '1. Entra a spotify.com/redeem.\n2. Escribe el código y confirma.' },
  { value: 'APPLE', label: 'Apple / iTunes', unit: 'USD', presetValues: [10, 25, 50, 100], delivery: 'INSTANT', region: 'USA', accountFieldLabel: 'Apple ID', accountFieldHint: '', instructions: '1. Abre App Store y toca tu foto de perfil.\n2. Elige "Canjear tarjeta o código".\n3. Escribe el código.' },
  { value: 'GOOGLE_PLAY', label: 'Google Play', unit: 'USD', presetValues: [10, 25, 50, 100], delivery: 'INSTANT', region: 'USA', accountFieldLabel: 'Correo de tu cuenta Google', accountFieldHint: '', instructions: '1. Abre Google Play y toca tu foto de perfil.\n2. Elige "Pagos y suscripciones" > "Canjear código".\n3. Escribe el código.' },
  { value: 'AMAZON', label: 'Amazon', unit: 'USD', presetValues: [10, 25, 50, 100], delivery: 'INSTANT', region: 'USA', accountFieldLabel: 'Correo de tu cuenta Amazon', accountFieldHint: '', instructions: '1. Entra a amazon.com/redeem.\n2. Escribe el código y confirma.' },
  { value: 'DISNEY', label: 'Disney+', unit: 'MONTHS', presetValues: [1, 3, 12], delivery: 'INSTANT', region: 'LATAM', accountFieldLabel: 'Correo de tu cuenta Disney+', accountFieldHint: '', instructions: '1. Entra a disneyplus.com/redeem.\n2. Escribe el código y confirma.' },
  { value: 'GIFT_CARD', label: 'Otra gift card', unit: 'USD', presetValues: [10, 25, 50], delivery: 'INSTANT', region: 'GLOBAL', accountFieldLabel: 'Cuenta a recargar', accountFieldHint: '', instructions: '' },
  { value: 'SOFTWARE', label: 'Software / licencia', unit: 'LICENSES', presetValues: [1], delivery: 'INSTANT', region: 'GLOBAL', accountFieldLabel: 'Correo para la licencia', accountFieldHint: '', instructions: '' },
  { value: 'OTHER', label: 'Otro', unit: 'USD', presetValues: [10, 25, 50], delivery: 'INSTANT', region: 'GLOBAL', accountFieldLabel: 'Cuenta a recargar', accountFieldHint: '', instructions: '' },
];

export const DIGITAL_REGIONS = [
  { value: 'GLOBAL', label: 'Global (cualquier país)' },
  { value: 'USA', label: 'Estados Unidos' },
  { value: 'LATAM', label: 'Latinoamérica' },
  { value: 'EU', label: 'Europa' },
  { value: 'ASIA', label: 'Asia' },
] as const;

export function getPlatform(value: string | null | undefined): DigitalPlatform | undefined {
  return DIGITAL_PLATFORMS.find((p) => p.value === value);
}

export function isDigitalUnit(value: unknown): value is DigitalUnit {
  return typeof value === 'string' && value in DIGITAL_UNITS;
}

const numberFormat = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });

/** "$25", "€10", "800 Robux", "1 mes", "3 meses", "10.000 Robux". */
export function formatFaceValue(value: number, unit: DigitalUnit): string {
  const info = DIGITAL_UNITS[unit];
  const n = numberFormat.format(value);
  if (info.prefix) return `${info.prefix}${n}`;
  const word = value === 1 ? info.singular : info.plural;
  return `${n} ${word}`;
}

/**
 * Unidad para datos viejos (specs.digitalPricing guardaba solo "amount" sin unidad):
 * en Roblox, montos de 400 o más son Robux; en el resto se asume dólares.
 */
export function guessLegacyUnit(platform: string | null | undefined, amount: number): DigitalUnit {
  const preset = getPlatform(platform);
  if (preset && preset.unit !== 'USD') {
    if (preset.value === 'ROBLOX') return amount >= 400 ? 'ROBUX' : 'USD';
    return preset.unit;
  }
  return 'USD';
}
