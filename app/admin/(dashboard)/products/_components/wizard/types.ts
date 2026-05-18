export interface DigitalAmountPricing {
  amount: number;
  cost: number;
  salePrice: number;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface WizardData {
  productType: 'PHYSICAL' | 'DIGITAL' | null;
  // Shared
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  tags: string[];
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  // Physical
  priceUSD: string;
  compareAtPriceUSD: string;
  costPerItem: string;
  stock: string;
  barcode: string;
  weightKg: string;
  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
  isConsolidable: boolean;
  shippingCost: string;
  specifications: Record<string, string>;
  // Digital
  digitalPlatform: string;
  digitalRegion: string;
  deliveryMethod: 'INSTANT' | 'MANUAL';
  digitalPricing: DigitalAmountPricing[];
  digitalMarginPercent: number;
  redemptionInstructions: string;
}

export interface StepProps {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  errors: Record<string, string>;
  categories: Category[];
}

export const DEFAULT_DIGITAL_PRICING: DigitalAmountPricing[] = [
  { amount: 10,  cost: 9.50,   salePrice: 11,    enabled: false },
  { amount: 20,  cost: 19.00,  salePrice: 22,    enabled: false },
  { amount: 25,  cost: 23.75,  salePrice: 27.50, enabled: false },
  { amount: 30,  cost: 28.50,  salePrice: 33,    enabled: false },
  { amount: 50,  cost: 47.50,  salePrice: 55,    enabled: false },
  { amount: 75,  cost: 71.25,  salePrice: 82.50, enabled: false },
  { amount: 100, cost: 95.00,  salePrice: 110,   enabled: false },
  { amount: 150, cost: 142.50, salePrice: 165,   enabled: false },
  { amount: 200, cost: 190.00, salePrice: 220,   enabled: false },
];

export const DEFAULT_WIZARD_DATA: WizardData = {
  productType: null,
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  tags: [],
  images: [],
  isFeatured: false,
  isActive: true,
  seoTitle: '',
  seoDescription: '',
  priceUSD: '',
  compareAtPriceUSD: '',
  costPerItem: '',
  stock: '0',
  barcode: '',
  weightKg: '',
  dimensionLength: '',
  dimensionWidth: '',
  dimensionHeight: '',
  isConsolidable: true,
  shippingCost: '',
  specifications: {},
  digitalPlatform: '',
  digitalRegion: 'GLOBAL',
  deliveryMethod: 'MANUAL',
  digitalPricing: DEFAULT_DIGITAL_PRICING,
  digitalMarginPercent: 10,
  redemptionInstructions: '',
};

// ─── Validation ────────────────────────────────────────────────────────────────

export function validatePhysicalStep1(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (!data.name.trim()) e.name = 'El nombre es obligatorio';
  if (!data.sku.trim()) e.sku = 'El SKU es obligatorio';
  if (!data.categoryId) e.categoryId = 'Selecciona una categoría';
  return e;
}

export function validatePhysicalStep2(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (!data.priceUSD || parseFloat(data.priceUSD) <= 0) e.priceUSD = 'Ingresa un precio válido';
  if (data.stock === '' || parseInt(data.stock) < 0) e.stock = 'El stock no puede ser negativo';
  if (!data.weightKg || parseFloat(data.weightKg) <= 0) e.weightKg = 'El peso es obligatorio';
  if (!data.dimensionLength && !data.dimensionWidth && !data.dimensionHeight) {
    e.dimensions = 'Ingresa al menos una dimensión del producto';
  }
  return e;
}

export function validatePhysicalStep3(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (Object.keys(data.specifications).length < 3) {
    e.specifications = 'Se requieren al menos 3 especificaciones técnicas';
  }
  return e;
}

export function validateDigitalStep1(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (!data.digitalPlatform) e.digitalPlatform = 'Selecciona una plataforma';
  if (!data.name.trim()) e.name = 'El nombre es obligatorio';
  if (!data.sku.trim()) e.sku = 'El SKU es obligatorio';
  if (!data.categoryId) e.categoryId = 'Selecciona una categoría';
  return e;
}

export function validateDigitalStep2(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  const enabled = data.digitalPricing.filter(p => p.enabled);
  if (enabled.length < 2) {
    e.digitalPricing = 'Habilita al menos 2 denominaciones';
  } else if (enabled.some(p => p.cost <= 0 || p.salePrice <= 0 || p.salePrice < p.cost)) {
    e.digitalPricing = 'El precio de venta debe ser mayor al costo en todas las denominaciones';
  }
  return e;
}

export function validatePublish(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (data.images.length === 0) e.images = 'Sube al menos una imagen del producto';
  return e;
}

export const PHYSICAL_STEPS = [
  'Información',
  'Precios',
  'Especificaciones',
  'SEO',
  'Publicar',
];

export const DIGITAL_STEPS = [
  'Plataforma',
  'Denominaciones',
  'Entrega',
  'SEO',
  'Publicar',
];
