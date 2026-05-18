'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';

import {
  WizardData,
  Category,
  DEFAULT_WIZARD_DATA,
  DEFAULT_DIGITAL_PRICING,
  PHYSICAL_STEPS,
  DIGITAL_STEPS,
  validatePhysicalStep1,
  validatePhysicalStep2,
  validatePhysicalStep3,
  validateDigitalStep1,
  validateDigitalStep2,
  validatePublish,
} from './wizard/types';

import { parseProductImages, parseProductTags } from '@/lib/product-utils';
import WizardProgress from './wizard/WizardProgress';
import ImagePanel from './wizard/ImagePanel';
import StepTypeSelector from './wizard/StepTypeSelector';
import PhysicalStep1BasicInfo from './wizard/physical/Step1BasicInfo';
import PhysicalStep2Prices from './wizard/physical/Step2Prices';
import PhysicalStep3Specs from './wizard/physical/Step3Specs';
import DigitalStep1Platform from './wizard/digital/Step1Platform';
import DigitalStep2Denominations from './wizard/digital/Step2Denominations';
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

  const [step, setStep] = useState<-1 | 0 | 1 | 2 | 3 | 4>(-1); // -1 = type selector
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
        let savedDigitalPricing: any = null;
        try {
          const raw = product.specs || product.specifications;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
          savedDigitalPricing = parsed?.digitalPricing ?? null;
          const { digitalPricing: _dp, ...cleanSpecs } = parsed ?? {};
          parsedSpecs = cleanSpecs;
        } catch { parsedSpecs = {}; }

        const mergedDigitalPricing = Array.isArray(savedDigitalPricing)
          ? DEFAULT_DIGITAL_PRICING.map((def) => {
              const saved = savedDigitalPricing.find((p: any) => p.amount === def.amount);
              return saved ? { ...saved, enabled: true } : def;
            })
          : DEFAULT_DIGITAL_PRICING;

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
          specifications: parsedSpecs,
          digitalPlatform: product.digitalPlatform || '',
          digitalRegion: product.digitalRegion || 'GLOBAL',
          deliveryMethod: product.deliveryMethod || 'MANUAL',
          digitalPricing: mergedDigitalPricing,
          digitalMarginPercent: 10,
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
    }

    if (s === PUBLISH_STEP) errs = { ...errs, ...validatePublish(data) };

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    setStep((prev) => (prev + 1) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    if (step === 0) { setStep(-1); return; }
    setStep((prev) => (prev - 1) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (publishStatus: 'PUBLISHED' | 'DRAFT') => {
    if (!validate(PUBLISH_STEP)) return;
    setIsLoading(true);
    setErrors({});

    try {
      const enabledPricing = data.digitalPricing.filter((p) => p.enabled);

      const payload: any = {
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
        payload.specifications = Object.keys(data.specifications).length > 0 ? data.specifications : null;
        if (data.dimensionLength || data.dimensionWidth || data.dimensionHeight) {
          payload.dimensions = JSON.stringify({
            length: parseFloat(data.dimensionLength) || 0,
            width: parseFloat(data.dimensionWidth) || 0,
            height: parseFloat(data.dimensionHeight) || 0,
          });
        }
      } else {
        payload.priceUSD = enabledPricing.length > 0 ? Math.min(...enabledPricing.map((p) => p.salePrice)) : 0;
        payload.stock = parseInt(data.stock) || 999;
        payload.digitalPlatform = data.digitalPlatform;
        payload.digitalRegion = data.digitalRegion;
        payload.deliveryMethod = data.deliveryMethod;
        payload.redemptionInstructions = data.redemptionInstructions || null;
        payload.digitalPricing = enabledPricing;
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
      if (step === 1) return <DigitalStep2Denominations {...props} />;
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
      <div className="flex items-center justify-center h-screen bg-[#f1f2f4]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Cargando producto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f2f4] pb-24">

      {/* ── Success Modal ──────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-12 shadow-2xl text-center max-w-sm w-full mx-4 border border-gray-100">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <FiCheck className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {isEditing ? '¡Producto Actualizado!' : '¡Producto Publicado!'}
            </h3>
            <p className="text-gray-500 mb-6">
              {isEditing ? 'Los cambios han sido guardados.' : 'Tu producto ya está disponible en la tienda.'}
            </p>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 w-full transition-all duration-[2500ms] ease-out" />
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1300px] mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Left: back + title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  {isEditing ? 'Editar producto' : 'Nuevo producto'}
                </h1>
                {data.productType && step >= 0 && (
                  <p className="text-xs text-gray-400">
                    {data.productType === 'PHYSICAL' ? '📦 Producto Físico' : '⚡ Producto Digital'}
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
                  onStepClick={(i) => { setErrors({}); setStep(i as any); }}
                />
              </div>
            )}

            {/* Right: discard */}
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
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
                onStepClick={(i) => { setErrors({}); setStep(i as any); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1300px] mx-auto px-4 md:px-8 py-8">

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-3">
            <span className="w-5 h-5 flex-shrink-0">⚠</span>
            {errors.general}
          </div>
        )}

        <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start' : ''}>

          {/* Step content */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            {renderStep()}

            {/* Navigation — not on publish step (it has its own buttons) */}
            {step >= 0 && step < PUBLISH_STEP && (
              <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  {step === 0 ? 'Cambiar tipo' : 'Anterior'}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white font-semibold rounded-xl hover:bg-[#333] transition-all shadow-sm shadow-black/10"
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
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
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
