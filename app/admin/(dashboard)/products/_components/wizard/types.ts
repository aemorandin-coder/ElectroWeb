import { formatFaceValue, getPlatform, type DigitalProvider, type DigitalUnit } from '@/lib/digital-catalog';

/** Fila editable de un monto digital (C-60). Los números van como texto mientras se escriben. */
import { isSecondHand, needsGrade, type Condition, type Grade, type Packaging } from '@/lib/product-condition';

export interface VariantRow {
  /** Clave local para React (las filas nuevas aún no tienen id) */
  key: string;
  id?: string;
  faceValue: string;
  unit: DigitalUnit;
  label: string;
  /** Si el admin cambió la etiqueta a mano, ya no se regenera al cambiar el monto */
  labelEdited: boolean;
  costUSD: string;
  priceUSD: string;
  provider: DigitalProvider | '';
  isActive: boolean;
}

let rowCounter = 0;
export function newVariantRow(unit: DigitalUnit, faceValue?: number, provider: DigitalProvider | '' = ''): VariantRow {
  rowCounter += 1;
  return {
    key: `nuevo-${Date.now()}-${rowCounter}`,
    faceValue: faceValue ? String(faceValue) : '',
    unit,
    label: faceValue ? formatFaceValue(faceValue, unit) : '',
    labelEdited: false,
    costUSD: '',
    priceUSD: '',
    provider,
    isActive: true,
  };
}

/** Montos típicos de la plataforma, sin precios (los pone el admin). */
export function rowsFromPlatform(platformValue: string): VariantRow[] {
  const platform = getPlatform(platformValue);
  if (!platform) return [];
  return platform.presetValues.map((value) => newVariantRow(platform.unit, value));
}

const num = (value: string) => Number.parseFloat(value.replace(',', '.'));

/** Margen sobre el costo, en %. null si no hay costo. */
export function rowMargin(row: VariantRow): number | null {
  const cost = num(row.costUSD);
  const price = num(row.priceUSD);
  if (!(cost > 0) || !(price > 0)) return null;
  return ((price - cost) / cost) * 100;
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
  /** C-100: la tienda paga el envío del paquete que lo lleve */
  freeShipping: boolean;
  specifications: Record<string, string>;
  // C-119: condición (solo físicos). Los números van como texto, como el resto del formulario
  condition: Condition;
  conditionGrade: Grade | '';
  packaging: Packaging | '';
  includedItems: string;
  missingItems: string;
  usageHours: string;
  batteryHealth: string;
  cosmeticNotes: string;
  testNotes: string;
  warrantyDays: string;
  serialNumber: string;
  // Digital (C-60)
  digitalPlatform: string;
  digitalRegion: string;
  deliveryMethod: 'INSTANT' | 'MANUAL';
  digitalVariants: VariantRow[];
  marginPercent: number;
  accountFieldLabel: string;
  accountFieldHint: string;
  redemptionInstructions: string;
}

export interface StepProps {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  errors: Record<string, string>;
  categories: Category[];
}

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
  freeShipping: false,
  specifications: {},
  condition: 'NEW',
  conditionGrade: '',
  packaging: '',
  includedItems: '',
  missingItems: '',
  usageHours: '',
  batteryHealth: '',
  cosmeticNotes: '',
  testNotes: '',
  warrantyDays: '',
  serialNumber: '',
  digitalPlatform: '',
  digitalRegion: 'GLOBAL',
  deliveryMethod: 'INSTANT',
  digitalVariants: [],
  marginPercent: 12,
  accountFieldLabel: '',
  accountFieldHint: '',
  redemptionInstructions: '',
};

// ─── Validation ────────────────────────────────────────────────────────────────

export function validatePhysicalStep1(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (!data.name.trim()) e.name = 'El nombre es obligatorio';
  if (!data.sku.trim()) e.sku = 'El SKU es obligatorio';
  if (!data.categoryId) e.categoryId = 'Selecciona una categoría';
  // C-119: lo que el cliente necesita saber de un equipo que no es nuevo
  if (isSecondHand(data.condition)) {
    if (needsGrade(data.condition) && !data.conditionGrade) e.conditionGrade = 'Elige el estado estético';
    if (!data.packaging) e.packaging = 'Elige el empaque';
    if (!data.includedItems.trim()) e.includedItems = 'Escribe qué incluye';
    const battery = data.batteryHealth.trim();
    if (battery && !(Number(battery) >= 1 && Number(battery) <= 100)) e.batteryHealth = 'De 1 a 100';
    const hours = data.usageHours.trim();
    if (hours && !(Number.isInteger(Number(hours)) && Number(hours) >= 0)) e.usageHours = 'Un número entero';
  }
  const days = data.warrantyDays.trim();
  if (days && !(Number.isInteger(Number(days)) && Number(days) >= 0 && Number(days) <= 1095)) e.warrantyDays = 'De 0 a 1095 días';
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
  const active = data.digitalVariants.filter((v) => v.isActive);
  if (active.length === 0) {
    e.digitalVariants = 'Activa al menos un monto';
    return e;
  }
  const seen = new Set<string>();
  for (const v of data.digitalVariants) {
    if (!(num(v.faceValue) > 0)) { e.digitalVariants = 'Todos los montos deben ser mayores a 0'; break; }
    if (v.isActive && !(num(v.priceUSD) > 0)) { e.digitalVariants = `Pon el precio de venta de ${v.label || 'cada monto activo'}`; break; }
    const k = `${num(v.faceValue)}-${v.unit}`;
    if (seen.has(k)) { e.digitalVariants = `El monto ${v.label} está repetido`; break; }
    seen.add(k);
  }
  return e;
}

export function validateDigitalStep3(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (data.deliveryMethod === 'MANUAL' && !data.accountFieldLabel.trim()) {
    e.accountFieldLabel = 'Escribe qué dato de la cuenta le pedimos al cliente';
  }
  return e;
}

export function validatePublish(data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};
  if (data.images.length === 0) e.images = 'Sube al menos una imagen del producto';
  // C-119: de un usado se ven fotos de esa unidad, no de catálogo
  else if (data.productType === 'PHYSICAL' && isSecondHand(data.condition) && data.images.length < 3) {
    e.images = 'Sube al menos 3 fotos reales de esta unidad (frente, atrás y detalles)';
  }
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
  'Montos y precios',
  'Entrega',
  'SEO',
  'Publicar',
];
