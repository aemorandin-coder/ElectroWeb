'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';

import {
  WizardData,
  Category,
  DEFAULT_WIZARD_DATA,
  PHYSICAL_STEPS,
  DIGITAL_STEPS,
  newVariantRow,
  validatePhysicalStep1,
  validatePhysicalStep2,
  validatePhysicalStep3,
  validateDigitalStep1,
  validateDigitalStep2,
  validateDigitalStep3,
  validatePublish,
  type VariantRow,
} from './wizard/types';
import { formatFaceValue, guessLegacyUnit, isDigitalUnit, type DigitalProvider } from '@/lib/digital-catalog';

import { parseProductImages, parseProductTags } from '@/lib/product-utils';
import { digitalMarginFromSpecs, INTERNAL_SPEC_KEYS } from '@/lib/product-specs';
import WizardProgress from './wizard/WizardProgress';
import ImagePanel from './wizard/ImagePanel';
import StepTypeSelector from './wizard/StepTypeSelector';
import PhysicalStep1BasicInfo from './wizard/physical/Step1BasicInfo';
import PhysicalStep2Prices from './wizard/physical/Step2Prices';
import PhysicalStep3Specs from './wizard/physical/Step3Specs';
import DigitalStep1Platform from './wizard/digital/Step1Platform';
import DigitalStep2Variants from './wizard/digital/Step2Variants';
import { wizardPrimaryButton, wizardSecondaryButton } from './wizard/ui';

interface ApiVariant {
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
import DigitalStep3Delivery from './wizard/digital/Step3Delivery';
import StepSEO from './wizard/StepSEO';
import StepPublish from './wizard/StepPublish';

// STEP INDEX (after type selector):
// Physical:  0=Info, 1=Prices, 2=Specs, 3=SEO, 4=Publish
// Digital:   0=Platform, 1=Denominations, 2=Delivery, 3=SEO, 4=Publish
const PUBLISH_STEP = 4;

interface Props {
  productId?: string;
}

export default function ProductWizard({ productId }: Props) {
  const router = useRouter();
  const isEditing = !!productId;

  type WizardStep = -1 | 0 | 1 | 2 | 3 | 4;
  const [step, setStep] = useState<WizardStep>(-1); // -1 = type selector
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(isEditing);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const merge = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    const cleared: Record<string, string> = {};
    Object.keys(updates).forEach((k) => { if (errors[k]) cleared[k] = ''; });
    if (Object.keys(cleared).length > 0) setErrors((prev) => ({ ...prev, ...cleared }));
  };

  // ─── Load categories ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
      .catch(() => {});
  }, []);

  // ─── Load product in edit mode ─────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) return;
    setIsFetching(true);

    fetch(`/api/products/${productId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Product not found');
        return r.json();
      })
      .then((product) => {
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

        setData({
          productType,
          name: product.name || '',
          sku: product.sku || '',
          description: product.description || '',
          categoryId: product.categoryId || '',
          tags: parsedTags,
          images: parsedImages,
          isFeatured: product.isFeatured ?? false,
          isActive: product.status === 'PUBLISHED' || product.isActive === true,
          seoTitle: product.seoTitle || '',
          seoDescription: product.seoDescription || '',
          priceUSD: product.priceUSD?.toString() || '',
          compareAtPriceUSD: product.compareAtPriceUSD?.toString() || '',
          costPerItem: product.costPerItem?.toString() || '',
          stock: product.stock?.toString() || '0',
          barcode: product.barcode || '',
          weightKg: product.weightKg?.toString() || '',
          dimensionLength: dimLength,
          dimensionWidth: dimWidth,
          dimensionHeight: dimHeight,
          isConsolidable: product.isConsolidable !== false,
          shippingCost: product.shippingCost?.toString() || '',
          freeShipping: product.freeShipping === true,
          specifications: parsedSpecs,
          digitalPlatform: product.digitalPlatform || '',
          digitalRegion: product.digitalRegion || 'GLOBAL',
          deliveryMethod: product.deliveryMethod === 'MANUAL' ? 'MANUAL' : 'INSTANT',
          digitalVariants: toVariantRows(product.digitalVariants, Array.isArray(savedDigitalPricing) ? savedDigitalPricing : null, product.digitalPlatform || ''),
          marginPercent: savedMarginPercent,
          accountFieldLabel: product.accountFieldLabel || '',
          accountFieldHint: product.accountFieldHint || '',
          redemptionInstructions: product.redemptionInstructions || '',
        });

        // Skip type selector in edit mode, start at step 0
        setStep(0);
      })
      .catch(() => {
        setErrors({ general: 'No se pudo cargar el producto.' });
        setTimeout(() => router.push('/admin/products'), 2000);
      })
      .finally(() => setIsFetching(false));
  }, [productId]);

  // ─── Step validation ───────────────────────────────────────────────────────
  const validate = (s: number): boolean => {
    let errs: Record<string, string> = {};

    if (data.productType === 'PHYSICAL') {
      if (s === 0) errs = validatePhysicalStep1(data);
      else if (s === 1) errs = validatePhysicalStep2(data);
      else if (s === 2) errs = validatePhysicalStep3(data);
    } else {
      if (s === 0) errs = validateDigitalStep1(data);
      else if (s === 1) errs = validateDigitalStep2(data);
      else if (s === 2) errs = validateDigitalStep3(data);
    }

    if (s === PUBLISH_STEP) errs = { ...errs, ...validatePublish(data) };

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    setStep((prev) => (prev + 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    if (step === 0) { setStep(-1); return; }
    setStep((prev) => (prev - 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (publishStatus: 'PUBLISHED' | 'DRAFT') => {
    // Al editar se puede saltar pasos desde la barra: si alguno quedó incompleto, se vuelve a él
    for (let s = 0; s < PUBLISH_STEP; s++) {
      if (!validate(s)) { setStep(s as WizardStep); return; }
    }
    if (!validate(PUBLISH_STEP)) return;
    setIsLoading(true);
    setErrors({});

    try {
      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        sku: data.sku.trim(),
        description: data.description.trim(),
        categoryId: data.categoryId,
        images: data.images,
        isActive: publishStatus === 'PUBLISHED',
        status: publishStatus,
        isFeatured: data.isFeatured,
        barcode: data.barcode || null,
        tags: data.tags,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        productType: data.productType,
      };

      if (data.productType === 'PHYSICAL') {
        payload.priceUSD = parseFloat(data.priceUSD);
        payload.compareAtPriceUSD = data.compareAtPriceUSD ? parseFloat(data.compareAtPriceUSD) : null;
        payload.costPerItem = data.costPerItem ? parseFloat(data.costPerItem) : null;
        payload.stock = parseInt(data.stock) || 0;
        payload.weightKg = data.weightKg ? parseFloat(data.weightKg) : 0;
        payload.isConsolidable = data.isConsolidable;
        payload.shippingCost = data.isConsolidable ? 0 : (data.shippingCost ? parseFloat(data.shippingCost) : 0);
        payload.freeShipping = data.freeShipping;
        payload.specifications = Object.keys(data.specifications).length > 0 ? data.specifications : null;
        if (data.dimensionLength || data.dimensionWidth || data.dimensionHeight) {
          payload.dimensions = JSON.stringify({
            length: parseFloat(data.dimensionLength) || 0,
            width: parseFloat(data.dimensionWidth) || 0,
            height: parseFloat(data.dimensionHeight) || 0,
          });
        }
      } else {
        // El precio "desde" y la validación final los hace el servidor (C-60)
        payload.stock = 999;
        payload.digitalPlatform = data.digitalPlatform;
        payload.digitalRegion = data.digitalRegion;
        payload.deliveryMethod = data.deliveryMethod;
        payload.redemptionInstructions = data.redemptionInstructions || null;
        payload.accountFieldLabel = data.deliveryMethod === 'MANUAL' ? data.accountFieldLabel.trim() || null : null;
        payload.accountFieldHint = data.deliveryMethod === 'MANUAL' ? data.accountFieldHint.trim() || null : null;
        payload.digitalMarginPercent = data.marginPercent;
        payload.digitalVariants = data.digitalVariants.map((v) => ({
          id: v.id,
          faceValue: Number.parseFloat(v.faceValue.replace(',', '.')),
          unit: v.unit,
          label: v.label.trim(),
          costUSD: Number.parseFloat(v.costUSD.replace(',', '.')) || 0,
          priceUSD: Number.parseFloat(v.priceUSD.replace(',', '.')) || 0,
          provider: v.provider || null,
          isActive: v.isActive,
        }));
      }

      const url = isEditing ? `/api/products/${productId}` : '/api/products';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => router.push('/admin/products'), 2500);
      } else {
        const body = await res.json();
        const msg = body.details ? `${body.error}: ${body.details}` : (body.error || 'Error al guardar el producto.');
        setErrors({ general: msg });
      }
    } catch {
      setErrors({ general: 'Error de conexión. Verifica tu internet.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step labels ────────────────────────────────────────────────────────────
  const steps = data.productType === 'DIGITAL' ? DIGITAL_STEPS : PHYSICAL_STEPS;

  // ─── Render step content ───────────────────────────────────────────────────
  const renderStep = () => {
    const props = { data, onChange: merge, errors, categories };

    if (step === -1) return (
      <StepTypeSelector
        selected={data.productType}
        onSelect={(type) => { merge({ productType: type }); setStep(0); }}
        onSadesImport={(updates) => merge(updates)}
        isEditing={isEditing}
      />
    );

    if (data.productType === 'PHYSICAL') {
      if (step === 0) return <PhysicalStep1BasicInfo {...props} />;
      if (step === 1) return <PhysicalStep2Prices {...props} />;
      if (step === 2) return <PhysicalStep3Specs {...props} />;
      if (step === 3) return <StepSEO {...props} />;
    } else {
      if (step === 0) return <DigitalStep1Platform {...props} />;
      if (step === 1) return <DigitalStep2Variants {...props} />;
      if (step === 2) return <DigitalStep3Delivery {...props} />;
      if (step === 3) return <StepSEO {...props} />;
    }

    if (step === PUBLISH_STEP) return (
      <StepPublish
        data={data}
        errors={errors}
        isLoading={isLoading}
        isEditing={isEditing}
        onPublish={() => handleSubmit('PUBLISHED')}
        onDraft={() => handleSubmit('DRAFT')}
      />
    );

    return null;
  };

  const showSidebar = step >= 0; // Show image panel from step 0 onwards

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="font-medium text-muted">Cargando producto…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24">

      {/* ── Success Modal ──────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-ink/40" role="status">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-line bg-white p-12 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-strong/10">
              <FiCheck className="h-10 w-10 text-success-strong" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-ink">
              {isEditing ? '¡Producto Actualizado!' : '¡Producto Publicado!'}
            </h3>
            <p className="mb-6 text-muted">
              {isEditing ? 'Los cambios han sido guardados.' : 'Tu producto ya está disponible en la tienda.'}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full w-full bg-success-strong" />
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-white">
        <div className="max-w-[1300px] mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Left: back + title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Volver"
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-bold leading-tight text-ink">
                  {isEditing ? 'Editar producto' : 'Nuevo producto'}
                </h1>
                {data.productType && step >= 0 && (
                  <p className="text-xs text-muted">
                    {data.productType === 'PHYSICAL' ? 'Producto físico' : 'Producto digital'}
                  </p>
                )}
              </div>
            </div>

            {/* Center: progress */}
            {step >= 0 && (
              <div className="hidden sm:block">
                <WizardProgress
                  steps={steps}
                  current={step}
                  onStepClick={(i) => { setErrors({}); setStep(i as WizardStep); }}
                  freeNavigation={isEditing}
                />
              </div>
            )}

            {/* Right: discard */}
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
            >
              Descartar
            </button>
          </div>

          {/* Mobile progress */}
          {step >= 0 && (
            <div className="sm:hidden mt-2 pb-1">
              <WizardProgress
                steps={steps}
                current={step}
                onStepClick={(i) => { setErrors({}); setStep(i as WizardStep); }}
                freeNavigation={isEditing}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1300px] mx-auto px-2 sm:px-4 md:px-8 py-6 sm:py-8">

        {errors.general && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-deal/30 bg-deal-bg p-4 text-sm font-semibold text-deal" role="alert">
            <FiAlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {errors.general}
          </div>
        )}

        <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start' : ''}>

          {/* Step content */}
          <div className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-6 md:p-8">
            {renderStep()}

            {/* Navigation — not on publish step (it has its own buttons) */}
            {step >= 0 && step < PUBLISH_STEP && (
              <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className={wizardSecondaryButton}
                >
                  <FiArrowLeft className="w-4 h-4" />
                  {step === 0 ? 'Cambiar tipo' : 'Anterior'}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className={wizardPrimaryButton}
                >
                  {step === steps.length - 2 ? 'Revisar y publicar' : 'Continuar'}
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Back button on publish step */}
            {step === PUBLISH_STEP && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Volver a SEO
                </button>
              </div>
            )}
          </div>

          {/* Sticky image panel */}
          {showSidebar && (
            <div>
              <ImagePanel
                images={data.images}
                onChange={(imgs) => merge({ images: imgs })}
                error={errors.images}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
