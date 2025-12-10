export interface SocialMediaItem {
  name: string;
  url: string;
  enabled: boolean;
  icon?: string;
}

export interface BusinessHours {
  monday: { open: string; close: string; enabled: boolean };
  tuesday: { open: string; close: string; enabled: boolean };
  wednesday: { open: string; close: string; enabled: boolean };
  thursday: { open: string; close: string; enabled: boolean };
  friday: { open: string; close: string; enabled: boolean };
  saturday: { open: string; close: string; enabled: boolean };
  sunday: { open: string; close: string; enabled: boolean };
}

export interface CompanySettings {
  // Company Info
  companyName: string;
  tagline?: string | null;
  rif?: string | null;
  legalName?: string | null;
  foundedYear?: string | null;
  description?: string | null;
  logo?: string | null;
  favicon?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;

  // Contact
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;

  // Social Media
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  telegram?: string | null;
  tiktok?: string | null;
  socialMedia?: SocialMediaItem[] | null;

  // Business Hours
  businessHours?: BusinessHours | null;

  // Exchange Rates
  primaryCurrency: 'USD' | 'VES' | 'EUR';
  autoExchangeRates: boolean;
  exchangeRateVES: number;
  exchangeRateEUR: number;
  lastRateUpdate?: Date | string;

  // Delivery Settings
  deliveryEnabled?: boolean;
  deliveryFeeUSD?: number;
  freeDeliveryThresholdUSD?: number | null;

  // Pickup Settings
  pickupEnabled?: boolean;
  pickupAddress?: string | null;
  pickupInstructions?: string | null;

  // Tax Settings
  taxEnabled?: boolean;
  taxPercent?: number;

  // Cart Settings
  minOrderAmountUSD?: number | null;
  maxOrderAmountUSD?: number | null;

  // Maintenance Mode
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  maintenanceStartTime?: Date | string | null;
  maintenanceEndTime?: Date | string | null;
  maintenanceAllowedIPs?: string | null;

  // SEO Settings
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;

  // Hero Video Settings
  heroVideoEnabled?: boolean;
  heroVideoUrl?: string | null;
  heroVideoTitle?: string | null;
  heroVideoDescription?: string | null;

  // Homepage Display Settings
  maxFeaturedProducts?: number;

  // HomePage Hero Section
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroButtonText?: string | null;
  heroButtonLink?: string | null;
  heroBackgroundImage?: string | null;

  // HomePage Stats Section
  showStats?: boolean;
  stat1Label?: string | null;
  stat1Value?: string | null;
  stat1Icon?: string | null;
  stat2Label?: string | null;
  stat2Value?: string | null;
  stat2Icon?: string | null;
  stat3Label?: string | null;
  stat3Value?: string | null;
  stat3Icon?: string | null;
  stat4Label?: string | null;
  stat4Value?: string | null;
  stat4Icon?: string | null;

  // HomePage Categories Display
  showCategories?: boolean;
  maxCategoriesDisplay?: number;

  // Inventory Configuration
  lowStockThreshold?: number;
  criticalStockThreshold?: number;
  autoHideOutOfStock?: boolean;
  notifyLowStock?: boolean;
  notifyOutOfStock?: boolean;

  // HomePage CTA Section
  ctaEnabled?: boolean;
  ctaTitle?: string | null;
  ctaDescription?: string | null;
  ctaButtonText?: string | null;
  ctaButtonLink?: string | null;

  // Hot Ad / Promotional Popup
  hotAdEnabled?: boolean;
  hotAdImage?: string | null;
  hotAdTransparentBg?: boolean;
  hotAdShadowEnabled?: boolean;
  hotAdShadowBlur?: number;
  hotAdShadowOpacity?: number;
  hotAdBackdropOpacity?: number;
  hotAdBackdropColor?: string | null;
  hotAdLink?: string | null;
}

export interface SettingsFormData {
  companyName: string;
  tagline: string;
  rif: string;
  legalName: string;
  foundedYear: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  instagram: string;
  facebook: string;
  twitter: string;
  youtube: string;
  telegram: string;
  tiktok: string;
  socialMedia: SocialMediaItem[];
  businessHours: BusinessHours;
  primaryCurrency: 'USD' | 'VES' | 'EUR';
  autoExchangeRates: boolean;
  exchangeRateVES: number;
  exchangeRateEUR: number;
  deliveryEnabled: boolean;
  deliveryFeeUSD: number;
  freeDeliveryThresholdUSD: number | null;
  pickupEnabled: boolean;
  pickupAddress: string;
  pickupInstructions: string;
  taxEnabled: boolean;
  taxPercent: number;
  minOrderAmountUSD: number | null;
  maxOrderAmountUSD: number | null;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceStartTime: string;
  maintenanceEndTime: string;
  maintenanceAllowedIPs: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  heroVideoEnabled: boolean;
  heroVideoUrl: string;
  heroVideoTitle: string;
  heroVideoDescription: string;
  maxFeaturedProducts: number;

  // HomePage Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroButtonLink: string;
  heroBackgroundImage: string | null;

  // HomePage Stats Section
  showStats: boolean;
  stat1Label: string;
  stat1Value: string;
  stat1Icon: string;
  stat2Label: string;
  stat2Value: string;
  stat2Icon: string;
  stat3Label: string;
  stat3Value: string;
  stat3Icon: string;
  stat4Label: string;
  stat4Value: string;
  stat4Icon: string;

  // HomePage Categories Display
  showCategories: boolean;
  maxCategoriesDisplay: number;

  // Inventory Configuration
  lowStockThreshold: number;
  criticalStockThreshold: number;
  autoHideOutOfStock: boolean;
  notifyLowStock: boolean;
  notifyOutOfStock: boolean;

  // HomePage CTA Section
  ctaEnabled: boolean;
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;
  ctaButtonLink: string;

  // Hot Ad / Promotional Popup
  hotAdEnabled: boolean;
  hotAdImage: string | null;
  hotAdTransparentBg: boolean;
  hotAdShadowEnabled: boolean;
  hotAdShadowBlur: number;
  hotAdShadowOpacity: number;
  hotAdBackdropOpacity: number;
  hotAdBackdropColor: string;
  hotAdLink: string;
}

export interface SettingsValidationErrors {
  company?: string;
  branding?: string;
  contact?: string;
  socialMedia?: string;
  exchangeRates?: string;
  [key: string]: string | undefined;
}





