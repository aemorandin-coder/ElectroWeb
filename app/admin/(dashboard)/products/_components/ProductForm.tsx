'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import EpicTooltip from '@/components/EpicTooltip';
import {
  FiInfo, FiStar, FiCheck, FiX, FiPlus, FiTrash2,
  FiMonitor, FiSend, FiLayers, FiArrowLeft, FiImage, FiFileText,
} from 'react-icons/fi';
import { MdOutlineLocalShipping } from 'react-icons/md';
import { FaGlobeAmericas, FaFlagUsa } from 'react-icons/fa';
import { BsNintendoSwitch } from 'react-icons/bs';
import { SiRoblox, SiSteam, SiPlaystation, SiNetflix, SiSpotify, SiApple } from 'react-icons/si';
import { parseProductImages, parseProductTags } from '@/lib/product-utils';

const MAX_IMAGES = 8;

interface Category {
  id: string;
  name: string;
}

interface DigitalAmountPricing {
  amount: number;
  cost: number;
  salePrice: number;
  enabled: boolean;
}

const DEFAULT_DIGITAL_PRICING: DigitalAmountPricing[] = [
  { amount: 10,  cost: 9.50,   salePrice: 11,    enabled: false },
  { amount: 20,  cost: 19,     salePrice: 22,    enabled: false },
  { amount: 25,  cost: 23.75,  salePrice: 27.50, enabled: false },
  { amount: 30,  cost: 28.50,  salePrice: 33,    enabled: false },
  { amount: 50,  cost: 47.50,  salePrice: 55,    enabled: false },
  { amount: 75,  cost: 71.25,  salePrice: 82.50, enabled: false },
  { amount: 100, cost: 95,     salePrice: 110,   enabled: false },
  { amount: 150, cost: 142.50, salePrice: 165,   enabled: false },
  { amount: 200, cost: 190,    salePrice: 220,   enabled: false },
];

interface Props {
  productId?: string;
}

export default function ProductForm({ productId }: Props) {
  const router = useRouter();
  const isEditing = !!productId;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [showSuccess, setShowSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const imagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    priceUSD: '',
    compareAtPriceUSD: '',
    costPerItem: '',
    stock: '0',
    images: [] as string[],
    specifications: {} as Record<string, any>,
    isActive: true,
    isFeatured: false,
    tags: [] as string[],
    barcode: '',
    weight: '',
    seoTitle: '',
    seoDescription: '',
    productType: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL',
    digitalPlatform: '',
    digitalRegion: 'GLOBAL',
    deliveryMethod: 'INSTANT' as 'INSTANT' | 'MANUAL',
    digitalPricing: DEFAULT_DIGITAL_PRICING as DigitalAmountPricing[],
    digitalMarginPercent: 10,
    redemptionInstructions: '',
    weightKg: '',
    dimensionLength: '',
    dimensionWidth: '',
    dimensionHeight: '',
    isConsolidable: true,
    shippingCost: '',
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (isEditing) fetchProduct();
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setIsFetching(true);
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) {
        setErrors({ general: 'Producto no encontrado' });
        setTimeout(() => router.push('/admin/products'), 2000);
        return;
      }

      const product = await res.json();
      const parsedImages = parseProductImages(product.images);
      const parsedTags = parseProductTags(product.tags);

      let parsedSpecs: Record<string, any> = {};
      let savedDigitalPricing: any = null;
      try {
        const rawSpecs = product.specs || product.specifications;
        parsedSpecs = typeof rawSpecs === 'string' ? JSON.parse(rawSpecs) || {} : (rawSpecs ?? {});
        if (typeof parsedSpecs !== 'object') parsedSpecs = {};
        savedDigitalPricing = parsedSpecs.digitalPricing;
        const { digitalPricing: _dp, ...cleanSpecs } = parsedSpecs;
        parsedSpecs = cleanSpecs;
      } catch {
        parsedSpecs = {};
      }

      const mergedDigitalPricing = savedDigitalPricing && Array.isArray(savedDigitalPricing)
        ? DEFAULT_DIGITAL_PRICING.map(def => {
            const saved = (savedDigitalPricing as DigitalAmountPricing[]).find(p => p.amount === def.amount);
            return saved ? { ...saved, enabled: true } : def;
          })
        : DEFAULT_DIGITAL_PRICING;

      let parsedDimensions = { length: '', width: '', height: '' };
      if (product.dimensions) {
        try {
          const dims = typeof product.dimensions === 'string' ? JSON.parse(product.dimensions) : product.dimensions;
          parsedDimensions = {
            length: dims.length?.toString() || '',
            width: dims.width?.toString() || '',
            height: dims.height?.toString() || '',
          };
        } catch { /* keep empty */ }
      }

      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        categoryId: product.categoryId || '',
        priceUSD: product.priceUSD?.toString() || '',
        compareAtPriceUSD: product.compareAtPriceUSD?.toString() || '',
        costPerItem: product.costPerItem?.toString() || '',
        stock: product.stock?.toString() || '0',
        images: parsedImages,
        specifications: parsedSpecs,
        isActive: product.status === 'PUBLISHED' || product.isActive === true,
        isFeatured: product.isFeatured ?? false,
        tags: parsedTags,
        barcode: product.barcode || '',
        weight: product.weightKg?.toString() || '',
        seoTitle: product.seoTitle || '',
        seoDescription: product.seoDescription || '',
        productType: product.productType || 'PHYSICAL',
        digitalPlatform: product.digitalPlatform || '',
        digitalRegion: product.digitalRegion || 'GLOBAL',
        deliveryMethod: product.deliveryMethod || 'INSTANT',
        digitalPricing: mergedDigitalPricing,
        digitalMarginPercent: 10,
        redemptionInstructions: product.redemptionInstructions || '',
        weightKg: product.weightKg?.toString() || '',
        dimensionLength: parsedDimensions.length,
        dimensionWidth: parsedDimensions.width,
        dimensionHeight: parsedDimensions.height,
        isConsolidable: product.isConsolidable !== false,
        shippingCost: product.shippingCost?.toString() || '',
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      setErrors({ general: 'Error al cargar el producto' });
    } finally {
      setIsFetching(false);
    }
  };

  // ─── Image Handlers ────────────────────────────────────────────────────────
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (formData.images.length + files.length > MAX_IMAGES) {
      setErrors(prev => ({ ...prev, images: `Máximo ${MAX_IMAGES} imágenes permitidas` }));
      return;
    }

    setUploadingImages(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map(async (file) => {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Error al subir imagen');
          return (await res.json()).url as string;
        })
      );
      setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      setErrors(prev => ({ ...prev, images: '' }));
    } catch {
      setErrors(prev => ({ ...prev, images: 'Error al subir imágenes' }));
    } finally {
      setUploadingImages(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSetMainImage = (index: number) => {
    const imgs = [...formData.images];
    const [main] = imgs.splice(index, 1);
    setFormData(prev => ({ ...prev, images: [main, ...imgs] }));
  };

  // ─── Spec / Tag Handlers ───────────────────────────────────────────────────
  const handleAddSpecification = () => {
    if (!specKey.trim() || !specValue.trim()) return;
    setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, [specKey.trim()]: specValue.trim() } }));
    setSpecKey('');
    setSpecValue('');
  };

  const handleRemoveSpecification = (key: string) => {
    const next = { ...formData.specifications };
    delete next[key];
    setFormData(prev => ({ ...prev, specifications: next }));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !tagInput.trim()) return;
    e.preventDefault();
    if (!formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // ─── Form ──────────────────────────────────────────────────────────────────
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '', general: '' }));
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setTouchedFields({ name: true, sku: true, categoryId: true, priceUSD: true, images: true });

    const validationErrors: Record<string, string> = {};
    if (!formData.name.trim()) validationErrors.name = 'El nombre es obligatorio';
    if (!formData.sku.trim()) validationErrors.sku = 'El SKU es obligatorio';
    if (!formData.categoryId) validationErrors.categoryId = 'Selecciona una categoría';
    if (formData.images.length === 0) validationErrors.images = 'Sube al menos una imagen';

    if (formData.productType === 'PHYSICAL') {
      if (!formData.priceUSD || parseFloat(formData.priceUSD) <= 0) validationErrors.priceUSD = 'Precio inválido';
    } else {
      const enabled = formData.digitalPricing.filter(p => p.enabled);
      if (enabled.length < 2) validationErrors.digitalPricing = 'Debes habilitar al menos 2 denominaciones';
      if (enabled.some(p => p.cost <= 0 || p.salePrice <= 0 || p.salePrice < p.cost)) validationErrors.digitalPricing = 'Revisa los precios de las denominaciones';
      if (!formData.digitalPlatform) validationErrors.digitalPlatform = 'Selecciona una plataforma';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      if (validationErrors.name) { nameRef.current?.focus(); nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (validationErrors.images) { imagesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (validationErrors.priceUSD) { priceRef.current?.focus(); priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (validationErrors.sku) { skuRef.current?.focus(); skuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (validationErrors.categoryId) { categoryRef.current?.focus(); categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }

    try {
      const enabledPricing = formData.digitalPricing.filter(p => p.enabled);

      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        priceUSD: formData.productType === 'DIGITAL' && enabledPricing.length > 0
          ? Math.min(...enabledPricing.map(p => p.salePrice))
          : parseFloat(formData.priceUSD),
        stock: formData.productType === 'DIGITAL'
          ? (parseInt(formData.stock) || 999)
          : (parseInt(formData.stock) || 0),
        images: formData.images,
        specifications: Object.keys(formData.specifications).length > 0 ? formData.specifications : null,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        barcode: formData.barcode || null,
        tags: formData.tags,
        compareAtPriceUSD: formData.compareAtPriceUSD ? parseFloat(formData.compareAtPriceUSD) : null,
        costPerItem: formData.costPerItem ? parseFloat(formData.costPerItem) : null,
        seoTitle: formData.seoTitle || null,
        seoDescription: formData.seoDescription || null,
        brandId: null,
        productType: formData.productType,
        ...(formData.productType === 'DIGITAL' && {
          digitalPlatform: formData.digitalPlatform,
          digitalRegion: formData.digitalRegion,
          deliveryMethod: formData.deliveryMethod,
          redemptionInstructions: formData.redemptionInstructions || null,
          digitalPricing: enabledPricing,
        }),
        ...(formData.productType === 'PHYSICAL' && {
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : 0,
          dimensions: (formData.dimensionLength || formData.dimensionWidth || formData.dimensionHeight)
            ? JSON.stringify({
                length: parseFloat(formData.dimensionLength) || 0,
                width: parseFloat(formData.dimensionWidth) || 0,
                height: parseFloat(formData.dimensionHeight) || 0,
              })
            : null,
          isConsolidable: formData.isConsolidable,
          shippingCost: formData.isConsolidable ? 0 : (formData.shippingCost ? parseFloat(formData.shippingCost) : 0),
        }),
      };

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
        const data = await res.json();
        const msg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Error al guardar el producto.');
        setErrors({ general: msg });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setErrors({ general: 'Error de conexión. Verifica tu internet.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Computed ──────────────────────────────────────────────────────────────
  const margin = formData.priceUSD && formData.costPerItem
    ? ((parseFloat(formData.priceUSD) - parseFloat(formData.costPerItem)) / parseFloat(formData.priceUSD) * 100).toFixed(1)
    : null;

  const profit = formData.priceUSD && formData.costPerItem
    ? (parseFloat(formData.priceUSD) - parseFloat(formData.costPerItem)).toFixed(2)
    : null;

  // ─── Loading skeleton (edit mode while fetching) ───────────────────────────
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
    <div className="min-h-screen bg-[#f1f2f4] pb-20">

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-12 shadow-2xl text-center max-w-md w-full mx-4 border border-gray-100">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <FiCheck className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              {isEditing ? '¡Producto Actualizado!' : '¡Producto Creado!'}
            </h3>
            <p className="text-lg text-gray-500 mb-8">
              {isEditing ? 'Los cambios han sido guardados exitosamente.' : 'Tu producto ha sido guardado exitosamente.'}
            </p>
            <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-emerald-600 w-full transition-all duration-[2500ms] ease-out" />
            </div>
            <p className="text-sm text-gray-400 mt-4 animate-pulse">Redirigiendo a la lista de productos...</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-4 mb-8">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <FiArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-[#1a1a1a]">
              {isEditing ? 'Editar producto' : 'Agregar producto'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.back()} className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Descartar
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              className="bg-[#1a1a1a] hover:bg-[#333] text-white text-sm font-medium px-6 py-2 rounded-lg shadow-lg shadow-black/10 transition-transform active:scale-95"
            >
              {isEditing ? 'Guardar cambios' : 'Guardar producto'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8">

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 animate-shake shadow-sm">
            <FiInfo className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{errors.general}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── COLUMNA PRINCIPAL (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Información Básica */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Ej: Camiseta de algodón orgánico"
                  />
                  <EpicTooltip message={errors.name || ''} visible={!!(touchedFields.name && errors.name)} position="right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <div className="relative">
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                      placeholder="Describe tu producto..."
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><FiFileText /></button>
                      <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><FiImage /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multimedia */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" ref={imagesContainerRef}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Multimedia</h2>
                {formData.images.length > 0 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 font-medium hover:underline">
                    Agregar nueva
                  </button>
                )}
              </div>

              <div
                className={`border-2 border-dashed rounded-xl transition-all duration-200 relative ${formData.images.length === 0 ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 p-10 text-center cursor-pointer' : 'border-transparent p-0'} ${errors.images ? 'border-red-300 bg-red-50/10' : ''}`}
                onClick={() => formData.images.length === 0 && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

                {uploadingImages && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {formData.images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3 text-gray-400">
                      <FiImage className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Agregar archivos</p>
                    <p className="text-xs text-gray-500 mt-1">Soporta JPG, PNG, WEBP (máx. {MAX_IMAGES})</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 row-span-2 relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                      <Image src={formData.images[0]} alt="Principal" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">Principal</div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(0); }} className="bg-white p-2 rounded-full shadow-lg text-red-500 hover:text-red-600">
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    {formData.images.slice(1).map((url, idx) => (
                      <div key={idx + 1} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                        <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSetMainImage(idx + 1); }} className="bg-white p-1.5 rounded-full shadow text-blue-500 hover:text-blue-600" title="Hacer principal"><FiStar /></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx + 1); }} className="bg-white p-1.5 rounded-full shadow text-red-500 hover:text-red-600" title="Eliminar"><FiTrash2 /></button>
                        </div>
                      </div>
                    ))}
                    {formData.images.length < MAX_IMAGES && (
                      <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-blue-500">
                        <FiPlus className="w-6 h-6" />
                        <span className="text-xs font-medium mt-1">Agregar</span>
                      </div>
                    )}
                  </div>
                )}
                <EpicTooltip message={errors.images || ''} visible={!!(touchedFields.images && errors.images)} position="top" />
              </div>
            </div>

            {/* Precios */}
            {formData.productType === 'PHYSICAL' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Precios</h2>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input ref={priceRef} type="number" step="0.01" value={formData.priceUSD} onChange={(e) => updateFormData('priceUSD', e.target.value)} onBlur={() => handleBlur('priceUSD')} className={`w-full pl-7 pr-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.priceUSD ? 'border-red-300' : 'border-gray-300'}`} placeholder="0.00" />
                    </div>
                    <EpicTooltip message={errors.priceUSD || ''} visible={!!(touchedFields.priceUSD && errors.priceUSD)} position="right" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de comparación</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" step="0.01" value={formData.compareAtPriceUSD} onChange={(e) => updateFormData('compareAtPriceUSD', e.target.value)} className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Para mostrar una rebaja</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo por artículo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" step="0.01" value={formData.costPerItem} onChange={(e) => updateFormData('costPerItem', e.target.value)} className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Los clientes no verán esto</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-8 pt-6">
                    <div>
                      <span className="block text-xs text-gray-500">Margen</span>
                      <span className="text-sm font-medium text-gray-900">{margin ? `${margin}%` : '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Ganancia</span>
                      <span className="text-sm font-medium text-gray-900">{profit ? `$${profit}` : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Precios Digitales */
              <div className={`bg-white rounded-2xl shadow-sm border p-6 ${errors.digitalPricing ? 'border-red-300' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Precios por Denominación <span className="text-red-500">*</span></h2>
                    <p className="text-xs text-gray-500 mt-1">Configura el costo y precio de venta para cada monto</p>
                    {errors.digitalPricing && <p className="text-xs text-red-600 mt-1 font-medium">{errors.digitalPricing}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Margen global:</span>
                    <div className="flex items-center bg-purple-50 rounded-lg border border-purple-200 overflow-hidden">
                      <input type="number" min="0" max="100" value={formData.digitalMarginPercent} onChange={(e) => updateFormData('digitalMarginPercent', parseFloat(e.target.value) || 0)} className="w-14 px-2 py-1.5 bg-transparent text-center text-sm font-medium text-purple-700 focus:outline-none" />
                      <span className="pr-2 text-sm text-purple-600">%</span>
                    </div>
                    <button type="button" onClick={() => {
                      const m = formData.digitalMarginPercent / 100;
                      updateFormData('digitalPricing', formData.digitalPricing.map(p => ({ ...p, salePrice: parseFloat((p.cost * (1 + m)).toFixed(2)) })));
                    }} className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition-colors">
                      Aplicar
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                          <input type="checkbox" checked={formData.digitalPricing.every(p => p.enabled)} onChange={(e) => updateFormData('digitalPricing', formData.digitalPricing.map(p => ({ ...p, enabled: e.target.checked })))} className="w-4 h-4 text-purple-600 rounded border-gray-300 mr-2" />
                          Monto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Costo (USD)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Precio Venta</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Ganancia</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.digitalPricing.map((pricing, index) => {
                        const rowProfit = pricing.salePrice - pricing.cost;
                        const rowMargin = pricing.cost > 0 ? ((rowProfit / pricing.cost) * 100).toFixed(1) : '0';
                        return (
                          <tr key={pricing.amount} className={`transition-colors ${pricing.enabled ? 'bg-white hover:bg-purple-50/50' : 'bg-gray-50 opacity-60'}`}>
                            <td className="px-4 py-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={pricing.enabled} onChange={(e) => { const next = [...formData.digitalPricing]; next[index] = { ...pricing, enabled: e.target.checked }; updateFormData('digitalPricing', next); }} className="w-4 h-4 text-purple-600 rounded border-gray-300" />
                                <span className={`font-bold text-lg ${pricing.enabled ? 'text-purple-600' : 'text-gray-400'}`}>${pricing.amount}</span>
                              </label>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input type="number" step="0.01" min="0" value={pricing.cost} onChange={(e) => { const next = [...formData.digitalPricing]; next[index] = { ...pricing, cost: parseFloat(e.target.value) || 0 }; updateFormData('digitalPricing', next); }} disabled={!pricing.enabled} className="w-24 pl-5 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400" />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input type="number" step="0.01" min="0" value={pricing.salePrice} onChange={(e) => { const next = [...formData.digitalPricing]; next[index] = { ...pricing, salePrice: parseFloat(e.target.value) || 0 }; updateFormData('digitalPricing', next); }} disabled={!pricing.enabled} className="w-24 pl-5 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400" />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${rowProfit > 0 ? 'text-green-600' : rowProfit < 0 ? 'text-red-600' : 'text-gray-400'}`}>{rowProfit > 0 ? '+' : ''}{rowProfit.toFixed(2)} USD</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${parseFloat(rowMargin) >= 10 ? 'bg-green-100 text-green-700' : parseFloat(rowMargin) > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{rowMargin}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-purple-900">Montos habilitados: </span>
                      <span className="text-sm text-purple-600">
                        {formData.digitalPricing.filter(p => p.enabled).length > 0
                          ? formData.digitalPricing.filter(p => p.enabled).map(p => `$${p.amount}`).join(', ')
                          : 'Ninguno seleccionado'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-purple-600">Ganancia promedio: </span>
                      <span className="text-sm font-bold text-purple-900">
                        {(() => {
                          const enabled = formData.digitalPricing.filter(p => p.enabled);
                          if (enabled.length === 0) return '-';
                          const avg = enabled.reduce((acc, p) => acc + ((p.salePrice - p.cost) / p.cost * 100), 0) / enabled.length;
                          return `${avg.toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inventario */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Inventario</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-red-500">*</span></label>
                  <input ref={skuRef} type="text" value={formData.sku} onChange={(e) => updateFormData('sku', e.target.value.toUpperCase())} onBlur={() => handleBlur('sku')} className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.sku ? 'border-red-300' : 'border-gray-300'}`} />
                  <EpicTooltip message={errors.sku || ''} visible={!!(touchedFields.sku && errors.sku)} position="right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras (ISBN, UPC, GTIN)</label>
                  <input type="text" value={formData.barcode} onChange={(e) => updateFormData('barcode', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Cantidad</label>
                  <input type="number" value={formData.stock} onChange={(e) => updateFormData('stock', e.target.value)} className="w-32 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right" placeholder="0" />
                </div>
              </div>
            </div>

            {/* Especificaciones */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Especificaciones</h2>
                <span className="text-xs text-gray-500">Detalles técnicos del producto</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                    <input type="text" value={specKey} onChange={(e) => setSpecKey(e.target.value)} placeholder="Ej: Material" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" onKeyPress={(e) => e.key === 'Enter' && handleAddSpecification()} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                    <input type="text" value={specValue} onChange={(e) => setSpecValue(e.target.value)} placeholder="Ej: 100% Algodón" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" onKeyPress={(e) => e.key === 'Enter' && handleAddSpecification()} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={handleAddSpecification} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"><FiPlus /></button>
                  </div>
                </div>
              </div>
              {Object.keys(formData.specifications).length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(formData.specifications).map(([key, value]) => (
                        <tr key={key} className="bg-white hover:bg-gray-50 group">
                          <td className="px-4 py-3 font-medium text-gray-900 w-1/3">{key}</td>
                          <td className="px-4 py-3 text-gray-600">{value as string}</td>
                          <td className="px-4 py-3 text-right w-10">
                            <button type="button" onClick={() => handleRemoveSpecification(key)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><FiTrash2 /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SEO */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">SEO</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título SEO</label>
                  <input type="text" value={formData.seoTitle} onChange={(e) => updateFormData('seoTitle', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder={formData.name || 'Título del producto'} />
                  <p className="text-xs text-gray-400 mt-1">{(formData.seoTitle || formData.name).length}/70 caracteres</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción SEO</label>
                  <textarea value={formData.seoDescription} onChange={(e) => updateFormData('seoDescription', e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" placeholder={formData.description?.substring(0, 160) || 'Descripción del producto...'} />
                  <p className="text-xs text-gray-400 mt-1">{(formData.seoDescription || formData.description || '').substring(0, 160).length}/160 caracteres</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Vista previa en Google</p>
                  <div className="text-sm text-[#1a0dab] hover:underline cursor-pointer truncate">{formData.seoTitle || formData.name || 'Título del producto'} | Electro Shop</div>
                  <div className="text-xs text-[#006621] mt-0.5">{process.env.NEXT_PUBLIC_APP_URL || 'https://electroshop.com'}/productos/...</div>
                  <div className="text-xs text-[#4d5156] mt-0.5 line-clamp-2">{formData.seoDescription || formData.description || 'Descripción del producto...'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* ── COLUMNA LATERAL (1/3) ── */}
          <div className="space-y-6">

            {/* Tipo de Producto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Tipo de producto</h2>
              <div className="flex gap-3 mb-4">
                <button type="button" onClick={() => updateFormData('productType', 'PHYSICAL')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${formData.productType === 'PHYSICAL' ? 'border-[#2a63cd] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex flex-col items-center gap-2">
                    <MdOutlineLocalShipping className={`w-6 h-6 ${formData.productType === 'PHYSICAL' ? 'text-[#2a63cd]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${formData.productType === 'PHYSICAL' ? 'text-[#2a63cd]' : 'text-gray-600'}`}>Físico</span>
                  </div>
                </button>
                <button type="button" onClick={() => { updateFormData('productType', 'DIGITAL'); if (parseInt(formData.stock) === 0) updateFormData('stock', '999'); }} className={`flex-1 p-4 rounded-xl border-2 transition-all ${formData.productType === 'DIGITAL' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex flex-col items-center gap-2">
                    <FiMonitor className={`w-6 h-6 ${formData.productType === 'DIGITAL' ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${formData.productType === 'DIGITAL' ? 'text-purple-500' : 'text-gray-600'}`}>Digital</span>
                  </div>
                </button>
              </div>

              {formData.productType === 'DIGITAL' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><FiMonitor className="w-4 h-4 text-purple-600" /></div>
                      <div>
                        <p className="text-sm font-medium text-purple-900">Producto Digital</p>
                        <p className="text-xs text-purple-600 mt-0.5">Códigos, gift cards o licencias. Entrega manual al procesar el pago.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center justify-center text-[#2a63cd]">
                        {formData.digitalPlatform === 'ROBLOX' && <SiRoblox className="w-5 h-5" />}
                        {formData.digitalPlatform === 'STEAM' && <SiSteam className="w-5 h-5" />}
                        {formData.digitalPlatform === 'PLAYSTATION' && <SiPlaystation className="w-5 h-5" />}
                        {formData.digitalPlatform === 'NINTENDO' && <BsNintendoSwitch className="w-5 h-5" />}
                        {formData.digitalPlatform === 'NETFLIX' && <SiNetflix className="w-5 h-5" />}
                        {formData.digitalPlatform === 'SPOTIFY' && <SiSpotify className="w-5 h-5" />}
                        {formData.digitalPlatform === 'APPLE' && <SiApple className="w-5 h-5" />}
                        {!formData.digitalPlatform && <FiMonitor className="w-5 h-5 text-gray-300" />}
                        {formData.digitalPlatform && !['ROBLOX','STEAM','PLAYSTATION','NINTENDO','NETFLIX','SPOTIFY','APPLE'].includes(formData.digitalPlatform) && <FiMonitor className="w-5 h-5" />}
                      </div>
                      <select value={formData.digitalPlatform} onChange={(e) => updateFormData('digitalPlatform', e.target.value)} className={`flex-1 appearance-none bg-white border text-gray-900 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2a63cd] ${errors.digitalPlatform ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                        <option value="">Seleccionar plataforma...</option>
                        <option value="STEAM">Steam</option>
                        <option value="PLAYSTATION">PlayStation</option>
                        <option value="XBOX">Xbox</option>
                        <option value="NINTENDO">Nintendo eShop</option>
                        <option value="ROBLOX">Roblox</option>
                        <option value="FREEFIRE">Free Fire</option>
                        <option value="VALORANT">Valorant</option>
                        <option value="FORTNITE">Fortnite</option>
                        <option value="PUBG">PUBG Mobile</option>
                        <option value="NETFLIX">Netflix</option>
                        <option value="SPOTIFY">Spotify</option>
                        <option value="DISNEY">Disney+</option>
                        <option value="AMAZON">Amazon</option>
                        <option value="GOOGLE_PLAY">Google Play</option>
                        <option value="APPLE">Apple / iTunes</option>
                        <option value="SOFTWARE">Software / Licencia</option>
                        <option value="GIFT_CARD">Gift Card Genérica</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>
                    {errors.digitalPlatform && <p className="text-xs text-red-600 mt-1">{errors.digitalPlatform}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Región de cuenta</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center justify-center text-[#2a63cd]">
                        {formData.digitalRegion === 'USA' ? <FaFlagUsa className="w-5 h-5" /> : <FaGlobeAmericas className="w-5 h-5" />}
                      </div>
                      <select value={formData.digitalRegion} onChange={(e) => updateFormData('digitalRegion', e.target.value)} className="flex-1 appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2a63cd]">
                        <option value="GLOBAL">Global (Todas las regiones)</option>
                        <option value="USA">Estados Unidos</option>
                        <option value="LATAM">Latinoamérica</option>
                        <option value="EU">Europa</option>
                        <option value="ASIA">Asia</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Método de entrega digital</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button type="button" onClick={() => updateFormData('deliveryMethod', 'INSTANT')} className={`p-3 rounded-xl border-2 text-left transition-all ${formData.deliveryMethod === 'INSTANT' ? 'border-[#2a63cd] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-bold flex items-center gap-1.5 ${formData.deliveryMethod === 'INSTANT' ? 'text-[#1e4ba3]' : 'text-gray-700'}`}><FiSend className="w-4 h-4" /> Envío Instantáneo</span>
                          <span className="text-xs text-gray-500">Código automático al pagar.</span>
                        </div>
                      </button>
                      <button type="button" onClick={() => updateFormData('deliveryMethod', 'MANUAL')} className={`p-3 rounded-xl border-2 text-left transition-all ${formData.deliveryMethod === 'MANUAL' ? 'border-purple-500 bg-purple-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-bold flex items-center gap-1.5 ${formData.deliveryMethod === 'MANUAL' ? 'text-purple-700' : 'text-gray-700'}`}><FiLayers className="w-4 h-4" /> Recarga Directa</span>
                          <span className="text-xs text-gray-500">Admin recarga en la plataforma.</span>
                        </div>
                      </button>
                    </div>
                    {formData.deliveryMethod === 'MANUAL' && (
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-700">
                        <strong>Nota:</strong> Al cliente se le exigirá ingresar su Username o Tag de cuenta antes de añadir al carrito.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instrucciones de canje <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <textarea value={formData.redemptionInstructions} onChange={(e) => updateFormData('redemptionInstructions', e.target.value)} rows={4} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y text-sm" placeholder={`1. Abre la tienda de ${formData.digitalPlatform || 'la plataforma'}\n2. Ve a "Canjear código"\n3. Ingresa el código\n4. ¡Listo!`} />
                  </div>
                </div>
              )}
            </div>

            {/* Envío (solo físico) */}
            {formData.productType === 'PHYSICAL' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <MdOutlineLocalShipping className="w-5 h-5 text-[#2a63cd]" />
                  <h2 className="text-base font-bold text-gray-900">Envío</h2>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><FiInfo className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Cálculo de envío inteligente</p>
                      <p className="text-xs text-blue-600 mt-0.5">Los costos son manejados por ZOOM, MRW, TEALCA. Solo cobramos <strong>$2.50</strong> por embalaje.</p>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso del producto (kg)</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" value={formData.weightKg} onChange={(e) => updateFormData('weightKg', e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dimensiones (cm)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[['dimensionLength', 'Largo', 'L'], ['dimensionWidth', 'Ancho', 'A'], ['dimensionHeight', 'Alto', 'H']].map(([field, placeholder, label]) => (
                      <div key={field} className="relative">
                        <input type="number" step="0.1" min="0" value={formData[field as keyof typeof formData] as string} onChange={(e) => updateFormData(field, e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de envío</label>
                  {[
                    { consolidable: true, label: 'Consolidable (Recomendado)', desc: 'Productos pequeños que se envían junto con otros en la misma caja.', color: 'green' },
                    { consolidable: false, label: 'Envío individual (Producto grande)', desc: 'Para TVs, electrodomésticos. Se envía por separado.', color: 'amber' },
                  ].map(({ consolidable, label, desc, color }) => (
                    <div key={String(consolidable)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${formData.isConsolidable === consolidable ? `border-${color}-500 bg-${color}-50` : 'border-gray-200 hover:border-gray-300'}`} onClick={() => updateFormData('isConsolidable', consolidable)}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${formData.isConsolidable === consolidable ? `border-${color}-500 bg-${color}-500` : 'border-gray-300'}`}>
                          {formData.isConsolidable === consolidable && <FiCheck className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                          {!consolidable && !formData.isConsolidable && (
                            <div className="mt-3 animate-fadeIn">
                              <label className="block text-xs font-medium text-amber-700 mb-1">Costo de envío fijo (USD)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600">$</span>
                                <input type="number" step="0.01" min="0" value={formData.shippingCost} onChange={(e) => updateFormData('shippingCost', e.target.value)} placeholder="15.00" className="w-full pl-7 pr-4 py-2 bg-white border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" onClick={(e) => e.stopPropagation()} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado del Producto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Estado del producto</h2>
              <div className="relative">
                <select value={formData.isActive ? 'active' : 'draft'} onChange={(e) => updateFormData('isActive', e.target.value === 'active')} className="w-full appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="active">Activo</option>
                  <option value="draft">Borrador</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{formData.isActive ? 'Este producto estará disponible en tus canales de venta.' : 'Este producto estará oculto de todos los canales.'}</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase mb-2">Canales de venta</h3>
                <div className="flex items-center gap-2 mb-2"><FiCheck className="text-green-500" /><span className="text-sm text-gray-700">Tienda Online</span></div>
                <div className="flex items-center gap-2"><FiCheck className="text-green-500" /><span className="text-sm text-gray-700">Punto de Venta (POS)</span></div>
              </div>
            </div>

            {/* Organización */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Organización</h2>
              <div className="space-y-4">
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select ref={categoryRef} value={formData.categoryId} onChange={(e) => updateFormData('categoryId', e.target.value)} onBlur={() => handleBlur('categoryId')} className={`w-full appearance-none bg-white border rounded-lg text-gray-900 py-2.5 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.categoryId ? 'border-red-300' : 'border-gray-300'}`}>
                      <option value="">Seleccionar...</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                  <EpicTooltip message={errors.categoryId || ''} visible={!!(touchedFields.categoryId && errors.categoryId)} position="right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas</label>
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="Escribe y presiona Enter" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-gray-500 hover:text-gray-700"><FiX /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Insignias */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Insignias</h2>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={formData.isFeatured} onChange={(e) => updateFormData('isFeatured', e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <div className="flex-1">
                  <span className="block text-sm font-medium text-gray-900">Producto Destacado</span>
                  <span className="block text-xs text-gray-500">Aparecerá en la sección principal</span>
                </div>
                <FiStar className={`w-5 h-5 ${formData.isFeatured ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
              </label>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
