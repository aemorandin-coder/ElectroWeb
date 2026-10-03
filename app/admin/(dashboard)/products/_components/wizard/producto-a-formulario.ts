import { formatFaceValue, guessLegacyUnit, isDigitalUnit, type DigitalProvider } from '@/lib/digital-catalog';
import type { Condition, Grade, Packaging } from '@/lib/product-condition';
import { digitalMarginFromSpecs, INTERNAL_SPEC_KEYS } from '@/lib/product-specs';
import { parseProductImages, parseProductTags } from '@/lib/product-utils';
import { DEFAULT_WIZARD_DATA, newVariantRow, type VariantRow, type WizardData } from './types';

// El producto como lo devuelve GET /api/products/[id] → el formulario del asistente (WizardData).
// C-169: salió de ProductWizard para usarse también al combinar con lo que otra persona guardó mientras se editaba.

export type EstadoProducto = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export interface ApiVariant {
  id: string;
  faceValue: number;
  unit: string;
  label: string;
  costUSD: number;
  priceUSD: number;
  provider: string | null;
  isActive: boolean;
}
interface LegacyPricing { amount: number; cost?: number; salePrice: number; enabled?: boolean }

type Texto = string | null;
type Numero = number | string | null;

export interface ProductoApi {
  id: string;
  /** Versión del producto (ISO). El editor la devuelve al guardar para que el servidor sepa con cuál se abrió */
  updatedAt: string;
  status: EstadoProducto;
  isActive?: boolean;
  deletedAt?: string | null;
  deletedByName?: string | null;
  statusAntesDePapelera?: EstadoProducto | null;
  productType?: string;
  name?: Texto; sku?: Texto; description?: Texto; categoryId?: Texto;
  brand?: { name: string } | null;
  images?: unknown; tags?: unknown; specs?: unknown; specifications?: unknown; dimensions?: unknown;
  isFeatured?: boolean | null;
  seoTitle?: Texto; seoDescription?: Texto;
  priceUSD?: Numero; compareAtPriceUSD?: Numero; costPerItem?: Numero; stock?: Numero; barcode?: Texto;
  weightKg?: Numero; isConsolidable?: boolean | null; shippingCost?: Numero; freeShipping?: boolean | null;
  condition?: Condition | null; conditionGrade?: Grade | null; packaging?: Packaging | null;
  includedItems?: Texto; missingItems?: Texto; usageHours?: Numero; batteryHealth?: Numero;
  cosmeticNotes?: Texto; testNotes?: Texto; warrantyDays?: Numero; serialNumber?: Texto;
  digitalPlatform?: Texto; digitalRegion?: Texto; deliveryMethod?: Texto; digitalVariants?: ApiVariant[];
  accountFieldLabel?: Texto; accountFieldHint?: Texto; redemptionInstructions?: Texto;
}

const texto = (valor: Numero | undefined): string => (valor === null || valor === undefined ? '' : String(valor));

/** Filas del paso "Montos" desde la API (C-60) o, en productos sin migrar, desde specs.digitalPricing. */
function toVariantRows(apiVariants: ApiVariant[] | undefined, legacy: LegacyPricing[] | null, platform: string): VariantRow[] {
  if (apiVariants && apiVariants.length > 0) {
    return apiVariants.map((v) => ({
      key: v.id,
      id: v.id,
      faceValue: String(v.faceValue),
      unit: isDigitalUnit(v.unit) ? v.unit : 'USD',
      label: v.label,
      labelEdited: isDigitalUnit(v.unit) ? v.label !== formatFaceValue(v.faceValue, v.unit) : true,
      costUSD: v.costUSD ? String(v.costUSD) : '',
      priceUSD: String(v.priceUSD),
      provider: (v.provider as DigitalProvider | null) ?? '',
      isActive: v.isActive,
    }));
  }
  return (legacy ?? []).map((p) => {
    const unit = guessLegacyUnit(platform, Number(p.amount));
    return { ...newVariantRow(unit, Number(p.amount)), costUSD: p.cost ? String(p.cost) : '', priceUSD: String(p.salePrice), isActive: p.enabled !== false };
  });
}

/** El estado que tiene (o tendrá al restaurarlo, si está en la papelera) */
export function estadoDeProducto(product: ProductoApi): EstadoProducto {
  const estado = product.deletedAt ? product.statusAntesDePapelera ?? 'DRAFT' : product.status;
  return estado === 'PUBLISHED' || estado === 'ARCHIVED' ? estado : 'DRAFT';
}

export function productoAFormulario(product: ProductoApi): WizardData {
  const parsedImages = parseProductImages(product.images);
  const parsedTags = parseProductTags(product.tags);

  let parsedSpecs: Record<string, string> = {};
  let savedDigitalPricing: LegacyPricing[] | null = null;
  const rawSpecs = product.specs || product.specifications;
  // Último margen usado en este producto (C-95); si nunca se guardó, el de siempre
  const savedMarginPercent = digitalMarginFromSpecs(rawSpecs) ?? DEFAULT_WIZARD_DATA.marginPercent;
  try {
    const parsed = typeof rawSpecs === 'string' ? JSON.parse(rawSpecs) : (rawSpecs ?? {});
    savedDigitalPricing = parsed?.digitalPricing ?? null;
    const cleanSpecs = { ...(parsed ?? {}) };
    for (const key of INTERNAL_SPEC_KEYS) delete cleanSpecs[key];
    parsedSpecs = cleanSpecs;
  } catch { parsedSpecs = {}; }

  let dimLength = '', dimWidth = '', dimHeight = '';
  if (product.dimensions) {
    try {
      const d = typeof product.dimensions === 'string' ? JSON.parse(product.dimensions) : product.dimensions;
      dimLength = d.length?.toString() || '';
      dimWidth = d.width?.toString() || '';
      dimHeight = d.height?.toString() || '';
    } catch { /* empty */ }
  }

  const productType: 'PHYSICAL' | 'DIGITAL' = product.productType === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL';

  return {
    productType,
    name: product.name || '',
    sku: product.sku || '',
    description: product.description || '',
    categoryId: product.categoryId || '',
    brand: product.brand?.name || '',
    tags: parsedTags,
    images: parsedImages,
    isFeatured: product.isFeatured ?? false,
    isActive: product.status === 'PUBLISHED' || product.isActive === true,
    seoTitle: product.seoTitle || '',
    seoDescription: product.seoDescription || '',
    priceUSD: texto(product.priceUSD),
    compareAtPriceUSD: texto(product.compareAtPriceUSD),
    costPerItem: texto(product.costPerItem),
    stock: texto(product.stock) || '0',
    barcode: product.barcode || '',
    weightKg: texto(product.weightKg),
    dimensionLength: dimLength,
    dimensionWidth: dimWidth,
    dimensionHeight: dimHeight,
    medidasEstimadas: false,
    isConsolidable: product.isConsolidable !== false,
    shippingCost: texto(product.shippingCost),
    freeShipping: product.freeShipping === true,
    specifications: parsedSpecs,
    condition: product.condition || 'NEW',
    conditionGrade: product.conditionGrade || '',
    packaging: product.packaging || '',
    includedItems: product.includedItems || '',
    missingItems: product.missingItems || '',
    usageHours: texto(product.usageHours),
    batteryHealth: texto(product.batteryHealth),
    cosmeticNotes: product.cosmeticNotes || '',
    testNotes: product.testNotes || '',
    warrantyDays: texto(product.warrantyDays),
    serialNumber: product.serialNumber || '',
    digitalPlatform: product.digitalPlatform || '',
    digitalRegion: product.digitalRegion || 'GLOBAL',
    deliveryMethod: product.deliveryMethod === 'MANUAL' ? 'MANUAL' : 'INSTANT',
    digitalVariants: toVariantRows(product.digitalVariants, Array.isArray(savedDigitalPricing) ? savedDigitalPricing : null, product.digitalPlatform || ''),
    marginPercent: savedMarginPercent,
    accountFieldLabel: product.accountFieldLabel || '',
    accountFieldHint: product.accountFieldHint || '',
    redemptionInstructions: product.redemptionInstructions || '',
  };
}
