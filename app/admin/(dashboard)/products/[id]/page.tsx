'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import EpicTooltip from '@/components/EpicTooltip';
import {
  FiPackage, FiTag, FiDollarSign, FiImage, FiFileText,
  FiBarChart2, FiShoppingBag, FiInfo, FiStar, FiTrendingUp,
  FiUploadCloud, FiCheck, FiX, FiPlus, FiTrash2, FiLayers,
  FiZap, FiLayout, FiSave, FiGlobe, FiSearch, FiMoreHorizontal,
  FiArrowLeft, FiEye, FiEdit
} from 'react-icons/fi';
import { MdOutlineLocalShipping } from 'react-icons/md';
import { FaGlobeAmericas, FaFlagUsa } from 'react-icons/fa';
import { SiRoblox, SiSteam, SiPlaystation, SiNintendoswitch, SiNetflix, SiSpotify, SiApple } from 'react-icons/si';

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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Refs for focus management
  const nameRef = useRef<HTMLInputElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const imagesContainerRef = useRef<HTMLDivElement>(null);

  // Estado del formulario
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
    // Digital Product Fields
    productType: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL',
    digitalPlatform: '',
    digitalRegion: 'GLOBAL',
    deliveryMethod: 'MANUAL' as 'MANUAL',
    digitalPricing: [
      { amount: 10, cost: 9.50, salePrice: 11, enabled: false },
      { amount: 20, cost: 19, salePrice: 22, enabled: false },
      { amount: 25, cost: 23.75, salePrice: 27.50, enabled: false },
      { amount: 30, cost: 28.50, salePrice: 33, enabled: false },
      { amount: 50, cost: 47.50, salePrice: 55, enabled: false },
      { amount: 75, cost: 71.25, salePrice: 82.50, enabled: false },
      { amount: 100, cost: 95, salePrice: 110, enabled: false },
      { amount: 150, cost: 142.50, salePrice: 165, enabled: false },
      { amount: 200, cost: 190, salePrice: 220, enabled: false },
    ] as DigitalAmountPricing[],
    digitalMarginPercent: 10,
  });

  // Estados de UI
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProduct();
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const product = await response.json();

        // Parse images safely
        let parsedImages: string[] = [];
        try {
          if (typeof product.images === 'string') {
            parsedImages = JSON.parse(product.images);
          } else if (Array.isArray(product.images)) {
            parsedImages = product.images;
          }
        } catch (e) {
          console.error('Error parsing images:', e);
        }

        // Parse specs safely
        let parsedSpecs: Record<string, any> = {};
        let savedDigitalPricing: any = null;
        try {
          if (typeof product.specs === 'string') {
            parsedSpecs = JSON.parse(product.specs) || {};
          } else if (product.specs && typeof product.specs === 'object') {
            parsedSpecs = product.specs;
          } else if (typeof product.specifications === 'string') {
            // Fallback for old field name
            parsedSpecs = JSON.parse(product.specifications) || {};
          } else if (product.specifications) {
            parsedSpecs = product.specifications;
          }

          // Ensure parsedSpecs is an object
          if (!parsedSpecs || typeof parsedSpecs !== 'object') {
            parsedSpecs = {};
          }

          // Save digitalPricing before removing it
          savedDigitalPricing = parsedSpecs.digitalPricing;

          // Filter out digitalPricing from editable specs (it's a different UI)
          const { digitalPricing, ...cleanSpecs } = parsedSpecs;
          parsedSpecs = cleanSpecs;
        } catch (e) {
          console.error('Error parsing specs:', e);
          parsedSpecs = {};
        }

        // Parse digital pricing from specs
        let digitalPricingFromProduct: DigitalAmountPricing[] = [
          { amount: 10, cost: 9.50, salePrice: 11, enabled: false },
          { amount: 20, cost: 19, salePrice: 22, enabled: false },
          { amount: 25, cost: 23.75, salePrice: 27.50, enabled: false },
          { amount: 30, cost: 28.50, salePrice: 33, enabled: false },
          { amount: 50, cost: 47.50, salePrice: 55, enabled: false },
          { amount: 75, cost: 71.25, salePrice: 82.50, enabled: false },
          { amount: 100, cost: 95, salePrice: 110, enabled: false },
          { amount: 150, cost: 142.50, salePrice: 165, enabled: false },
          { amount: 200, cost: 190, salePrice: 220, enabled: false },
        ];

        // If product has savedDigitalPricing, merge it
        if (savedDigitalPricing && Array.isArray(savedDigitalPricing)) {
          const existingPricing = savedDigitalPricing as DigitalAmountPricing[];
          digitalPricingFromProduct = digitalPricingFromProduct.map(defaultPrice => {
            const found = existingPricing.find(p => p.amount === defaultPrice.amount);
            return found ? { ...found, enabled: true } : defaultPrice;
          });
        }

        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          description: product.description || '',
          categoryId: product.categoryId || '',
          priceUSD: product.priceUSD?.toString() || '',
          compareAtPriceUSD: '',
          costPerItem: '',
          stock: product.stock?.toString() || '0',
          images: parsedImages,
          specifications: parsedSpecs,
          isActive: product.status === 'PUBLISHED' || product.isActive === true,
          isFeatured: product.isFeatured ?? false,
          tags: [],
          barcode: '',
          weight: '',
          seoTitle: '',
          seoDescription: '',
          // Digital Product Fields
          productType: product.productType || 'PHYSICAL',
          digitalPlatform: product.digitalPlatform || '',
          digitalRegion: product.digitalRegion || 'GLOBAL',
          deliveryMethod: product.deliveryMethod || 'MANUAL',
          digitalPricing: digitalPricingFromProduct,
          digitalMarginPercent: 10,
        });
      } else {
        setErrors({ general: 'Producto no encontrado' });
        setTimeout(() => router.push('/admin/products'), 2000);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setErrors({ general: 'Error al cargar el producto' });
    } finally {
      setIsFetching(false);
    }
  };

  // Manejo de Imágenes
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (formData.images.length + files.length > 8) {
      setErrors({ ...errors, images: 'Máximo 8 imágenes permitidas' });
      return;
    }

    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: formDataToSend });
        if (!response.ok) throw new Error('Error al subir imagen');
        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      setErrors(prev => ({ ...prev, images: '' }));
    } catch (error) {
      console.error('Error uploading images:', error);
      setErrors(prev => ({ ...prev, images: 'Error al subir imágenes' }));
    } finally {
      setUploadingImages(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSetMainImage = (index: number) => {
    const newImages = [...formData.images];
    const mainImage = newImages.splice(index, 1)[0];
    newImages.unshift(mainImage);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  // Manejo de Especificaciones
  const handleAddSpecification = () => {
    if (!specKey.trim() || !specValue.trim()) return;
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, [specKey.trim()]: specValue.trim() },
    }));
    setSpecKey('');
    setSpecValue('');
  };

  const handleRemoveSpecification = (key: string) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    setFormData(prev => ({ ...prev, specifications: newSpecs }));
  };

  // Manejo de Tags
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      sku: true,
      categoryId: true,
      priceUSD: true,
      images: true
    });

    // Validaciones
    const validationErrors: Record<string, string> = {};
    if (!formData.name.trim()) validationErrors.name = 'El nombre es obligatorio';
    if (!formData.sku.trim()) validationErrors.sku = 'El SKU es obligatorio';
    if (!formData.categoryId) validationErrors.categoryId = 'Selecciona una categoría';
    if (formData.images.length === 0) validationErrors.images = 'Sube al menos una imagen';

    // Validación de precios según tipo de producto
    if (formData.productType === 'PHYSICAL') {
      if (!formData.priceUSD || parseFloat(formData.priceUSD) <= 0) {
        validationErrors.priceUSD = 'Precio inválido';
      }
    } else {
      // Producto digital: requiere al menos un monto habilitado
      const enabledAmounts = formData.digitalPricing.filter(p => p.enabled);
      if (enabledAmounts.length === 0) {
        validationErrors.digitalPricing = 'Habilita al menos un monto';
      }
      if (!formData.digitalPlatform) {
        validationErrors.digitalPlatform = 'Selecciona una plataforma';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);

      // Auto-focus logic
      if (validationErrors.name) {
        nameRef.current?.focus();
        nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (validationErrors.images) {
        imagesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (validationErrors.priceUSD && formData.productType === 'PHYSICAL') {
        priceRef.current?.focus();
        priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (validationErrors.sku) {
        skuRef.current?.focus();
        skuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (validationErrors.categoryId) {
        categoryRef.current?.focus();
        categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      // Preparar payload
      const enabledDigitalPricing = formData.digitalPricing.filter(p => p.enabled);

      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        priceUSD: formData.productType === 'DIGITAL' && enabledDigitalPricing.length > 0
          ? Math.min(...enabledDigitalPricing.map(p => p.salePrice))
          : parseFloat(formData.priceUSD),
        stock: parseInt(formData.stock) || 0,
        images: formData.images,
        specifications: Object.keys(formData.specifications).length > 0 ? formData.specifications : null,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        brandId: null,
        // Digital Product Fields
        productType: formData.productType,
        ...(formData.productType === 'DIGITAL' && {
          digitalPlatform: formData.digitalPlatform,
          digitalRegion: formData.digitalRegion,
          deliveryMethod: formData.deliveryMethod,
          digitalPricing: enabledDigitalPricing,
        }),
      };

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        // Success Animation
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black/40 backdrop-blur-sm animate-fadeIn';
        successDiv.innerHTML = `
          <div class="bg-white rounded-2xl p-12 shadow-2xl transform scale-100 animate-scaleIn text-center max-w-4xl w-full mx-4 border border-gray-100 relative overflow-hidden">
            <div class="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm relative z-10">
              <svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 class="text-3xl font-bold text-gray-900 mb-4 relative z-10">¡Producto Actualizado!</h3>
            <p class="text-lg text-gray-500 mb-8 relative z-10">Los cambios han sido guardados exitosamente.</p>
            
            <div class="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-emerald-600 w-0 transition-all duration-[3000ms] ease-out" id="progress-bar"></div>
            </div>
            <p class="text-sm text-gray-400 mt-4 animate-pulse">Redirigiendo a la lista de productos...</p>
          </div>
        `;
        document.body.appendChild(successDiv);

        // Trigger animation
        setTimeout(() => {
          const bar = document.getElementById('progress-bar');
          if (bar) bar.style.width = '100%';
        }, 50);

        setTimeout(() => {
          successDiv.remove();
          router.push('/admin/products');
        }, 3000);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Error al actualizar el producto.';
        setErrors({ general: errorMessage });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setErrors({ general: 'Error de conexión. Verifica tu internet.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '', general: '' }));
  };

  // Cálculo de margen (visual)
  const margin = formData.priceUSD && formData.costPerItem
    ? ((parseFloat(formData.priceUSD) - parseFloat(formData.costPerItem)) / parseFloat(formData.priceUSD) * 100).toFixed(1)
    : null;

  const profit = formData.priceUSD && formData.costPerItem
    ? (parseFloat(formData.priceUSD) - parseFloat(formData.costPerItem)).toFixed(2)
    : null;

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f1f2f4]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Cargando producto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f2f4] pb-20">
      {/* Top Bar Sticky */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-4 mb-8 transition-all">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <FiArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-[#1a1a1a]">Editar producto</h1>
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
              Guardar cambios
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

          {/* COLUMNA PRINCIPAL (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Bloque 1: Información Básica */}
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
                  <EpicTooltip
                    message={errors.name || ''}
                    visible={!!(touchedFields.name && errors.name)}
                    position="right"
                  />
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
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><FiFileText /></button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><FiImage /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloque 2: Multimedia */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" ref={imagesContainerRef}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Multimedia</h2>
                {formData.images.length > 0 && (
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 font-medium hover:underline">
                    Agregar nueva
                  </button>
                )}
              </div>

              <div
                className={`border-2 border-dashed rounded-xl transition-all duration-200 relative ${formData.images.length === 0
                  ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 p-10 text-center cursor-pointer'
                  : 'border-transparent p-0'
                  } ${errors.images ? 'border-red-300 bg-red-50/10' : ''}`}
                onClick={() => formData.images.length === 0 && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {formData.images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3 text-gray-400">
                      <FiImage className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Agregar archivos</p>
                    <p className="text-xs text-gray-500 mt-1">Acepta imágenes, videos o modelos 3D</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Main Image (Big) */}
                    <div className="col-span-2 row-span-2 relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                      <Image
                        src={formData.images[0]}
                        alt="Main"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">Principal</div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(0); }} className="bg-white p-2 rounded-full shadow-lg text-red-500 hover:text-red-600 mx-1">
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    {/* Other Images */}
                    {formData.images.slice(1).map((url, idx) => (
                      <div key={idx + 1} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleSetMainImage(idx + 1); }} className="bg-white p-1.5 rounded-full shadow text-blue-500 hover:text-blue-600" title="Hacer principal">
                            <FiStar />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx + 1); }} className="bg-white p-1.5 rounded-full shadow text-red-500 hover:text-red-600" title="Eliminar">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Button */}
                    {formData.images.length < 8 && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-blue-500"
                      >
                        <FiPlus className="w-6 h-6" />
                        <span className="text-xs font-medium mt-1">Agregar</span>
                      </div>
                    )}
                  </div>
                )}
                <EpicTooltip
                  message={errors.images || ''}
                  visible={!!(touchedFields.images && errors.images)}
                  position="top"
                />
              </div>
            </div>

            {/* Bloque 3: Precios (condicional según tipo de producto) */}
            {formData.productType === 'PHYSICAL' ? (
              /* PRECIOS PARA PRODUCTO FÍSICO */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Precios</h2>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        ref={priceRef}
                        type="number"
                        step="0.01"
                        value={formData.priceUSD}
                        onChange={(e) => updateFormData('priceUSD', e.target.value)}
                        onBlur={() => handleBlur('priceUSD')}
                        className={`w-full pl-7 pr-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.priceUSD ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="0.00"
                      />
                    </div>
                    <EpicTooltip
                      message={errors.priceUSD || ''}
                      visible={!!(touchedFields.priceUSD && errors.priceUSD)}
                      position="right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de comparación</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.compareAtPriceUSD}
                        onChange={(e) => updateFormData('compareAtPriceUSD', e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Para mostrar una rebaja</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo por artículo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.costPerItem}
                        onChange={(e) => updateFormData('costPerItem', e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="0.00"
                      />
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
              /* PRECIOS PARA PRODUCTO DIGITAL - Tabla de montos con ganancia */
              <div className={`bg-white rounded-2xl shadow-sm border p-6 ${errors.digitalPricing ? 'border-red-300' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Precios por Denominación <span className="text-red-500">*</span></h2>
                    <p className="text-xs text-gray-500 mt-1">Configura el costo y precio de venta para cada monto</p>
                    {errors.digitalPricing && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{errors.digitalPricing}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Margen global:</span>
                    <div className="flex items-center bg-purple-50 rounded-lg border border-purple-200 overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.digitalMarginPercent}
                        onChange={(e) => {
                          const marginPercent = parseFloat(e.target.value) || 0;
                          updateFormData('digitalMarginPercent', marginPercent);
                        }}
                        className="w-14 px-2 py-1.5 bg-transparent text-center text-sm font-medium text-purple-700 focus:outline-none"
                      />
                      <span className="pr-2 text-sm text-purple-600">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const margin = formData.digitalMarginPercent / 100;
                        const updatedPricing = formData.digitalPricing.map(p => ({
                          ...p,
                          salePrice: parseFloat((p.cost * (1 + margin)).toFixed(2))
                        }));
                        updateFormData('digitalPricing', updatedPricing);
                      }}
                      className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Tabla de precios digitales */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={formData.digitalPricing.every(p => p.enabled)}
                            onChange={(e) => {
                              const updatedPricing = formData.digitalPricing.map(p => ({
                                ...p,
                                enabled: e.target.checked
                              }));
                              updateFormData('digitalPricing', updatedPricing);
                            }}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300 mr-2"
                          />
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
                        const profitAmount = pricing.salePrice - pricing.cost;
                        const marginPercent = pricing.cost > 0 ? ((profitAmount / pricing.cost) * 100).toFixed(1) : '0';
                        return (
                          <tr
                            key={pricing.amount}
                            className={`transition-colors ${pricing.enabled ? 'bg-white hover:bg-purple-50/50' : 'bg-gray-50 opacity-60'}`}
                          >
                            <td className="px-4 py-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={pricing.enabled}
                                  onChange={(e) => {
                                    const updatedPricing = [...formData.digitalPricing];
                                    updatedPricing[index] = { ...pricing, enabled: e.target.checked };
                                    updateFormData('digitalPricing', updatedPricing);
                                  }}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                />
                                <span className={`font-bold text-lg ${pricing.enabled ? 'text-purple-600' : 'text-gray-400'}`}>
                                  ${pricing.amount}
                                </span>
                              </label>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={pricing.cost}
                                  onChange={(e) => {
                                    const updatedPricing = [...formData.digitalPricing];
                                    updatedPricing[index] = { ...pricing, cost: parseFloat(e.target.value) || 0 };
                                    updateFormData('digitalPricing', updatedPricing);
                                  }}
                                  disabled={!pricing.enabled}
                                  className="w-24 pl-5 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={pricing.salePrice}
                                  onChange={(e) => {
                                    const updatedPricing = [...formData.digitalPricing];
                                    updatedPricing[index] = { ...pricing, salePrice: parseFloat(e.target.value) || 0 };
                                    updateFormData('digitalPricing', updatedPricing);
                                  }}
                                  disabled={!pricing.enabled}
                                  className="w-24 pl-5 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${profitAmount > 0 ? 'text-green-600' : profitAmount < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {profitAmount > 0 ? '+' : ''}{profitAmount.toFixed(2)} USD
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${parseFloat(marginPercent) >= 10
                                ? 'bg-green-100 text-green-700'
                                : parseFloat(marginPercent) > 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>
                                {marginPercent}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Resumen de montos habilitados */}
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
                          const avgMargin = enabled.reduce((acc, p) => acc + ((p.salePrice - p.cost) / p.cost * 100), 0) / enabled.length;
                          return `${avgMargin.toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bloque 4: Inventario */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Inventario</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Unidad de mantenimiento de stock)</label>
                  <input
                    ref={skuRef}
                    type="text"
                    value={formData.sku}
                    onChange={(e) => updateFormData('sku', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('sku')}
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.sku ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  <EpicTooltip
                    message={errors.sku || ''}
                    visible={!!(touchedFields.sku && errors.sku)}
                    position="right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras (ISBN, UPC, GTIN)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => updateFormData('barcode', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input type="checkbox" id="trackQuantity" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                <label htmlFor="trackQuantity" className="text-sm text-gray-700">Rastrear cantidad</label>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => updateFormData('stock', e.target.value)}
                    className="w-32 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Bloque 5: Especificaciones */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Especificaciones</h2>
                <span className="text-xs text-gray-500">Detalles técnicos del producto</span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={specKey}
                      onChange={(e) => setSpecKey(e.target.value)}
                      placeholder="Ej: Material"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSpecification()}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                    <input
                      type="text"
                      value={specValue}
                      onChange={(e) => setSpecValue(e.target.value)}
                      placeholder="Ej: 100% Algodón"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSpecification()}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddSpecification}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      <FiPlus />
                    </button>
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
                          <td className="px-4 py-3 text-gray-600">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                          <td className="px-4 py-3 text-right w-10">
                            <button onClick={() => handleRemoveSpecification(key)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bloque 6: SEO Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Vista previa de los resultados del motor de búsqueda</h2>
                <button className="text-sm text-blue-600 hover:underline">Editar SEO del sitio web</button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-[#202124] mb-1">{`https://electroshop.com/products/${formData.name.toLowerCase().replace(/ /g, '-')}`}</div>
                <div className="text-xl text-[#1a0dab] hover:underline cursor-pointer truncate mb-1">{formData.seoTitle || formData.name || 'Título del producto'}</div>
                <div className="text-sm text-[#4d5156] line-clamp-2">{formData.seoDescription || formData.description || 'Descripción del producto...'}</div>
              </div>
            </div>

          </div>

          {/* COLUMNA LATERAL (1/3) */}
          <div className="space-y-6">

            {/* Tipo de Producto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Tipo de producto</h2>

              {/* Physical vs Digital Toggle */}
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => updateFormData('productType', 'PHYSICAL')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${formData.productType === 'PHYSICAL'
                    ? 'border-[#2a63cd] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <MdOutlineLocalShipping className={`w-6 h-6 ${formData.productType === 'PHYSICAL' ? 'text-[#2a63cd]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${formData.productType === 'PHYSICAL' ? 'text-[#2a63cd]' : 'text-gray-600'}`}>Físico</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData('productType', 'DIGITAL')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${formData.productType === 'DIGITAL'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FiZap className={`w-6 h-6 ${formData.productType === 'DIGITAL' ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${formData.productType === 'DIGITAL' ? 'text-purple-500' : 'text-gray-600'}`}>Digital</span>
                  </div>
                </button>
              </div>

              {/* Digital Product Options */}
              {formData.productType === 'DIGITAL' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiZap className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-900">Producto Digital</p>
                        <p className="text-xs text-purple-600 mt-0.5">
                          Códigos, gift cards o licencias. Entrega manual al procesar el pago.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-3">
                      {/* Platform Icon Preview */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center justify-center text-[#2a63cd]">
                        {formData.digitalPlatform === 'ROBLOX' && <SiRoblox className="w-5 h-5" />}
                        {formData.digitalPlatform === 'STEAM' && <SiSteam className="w-5 h-5" />}
                        {formData.digitalPlatform === 'PLAYSTATION' && <SiPlaystation className="w-5 h-5" />}
                        {formData.digitalPlatform === 'NINTENDO' && <SiNintendoswitch className="w-5 h-5" />}
                        {formData.digitalPlatform === 'NETFLIX' && <SiNetflix className="w-5 h-5" />}
                        {formData.digitalPlatform === 'SPOTIFY' && <SiSpotify className="w-5 h-5" />}
                        {formData.digitalPlatform === 'APPLE' && <SiApple className="w-5 h-5" />}
                        {!formData.digitalPlatform && <FiZap className="w-5 h-5 text-gray-300" />}
                        {formData.digitalPlatform && !['ROBLOX', 'STEAM', 'PLAYSTATION', 'NINTENDO', 'NETFLIX', 'SPOTIFY', 'APPLE'].includes(formData.digitalPlatform) && <FiZap className="w-5 h-5" />}
                      </div>
                      <select
                        value={formData.digitalPlatform}
                        onChange={(e) => updateFormData('digitalPlatform', e.target.value)}
                        className={`flex-1 appearance-none bg-white border text-gray-900 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2a63cd] ${errors.digitalPlatform ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                      >
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
                    {errors.digitalPlatform && (
                      <p className="text-xs text-red-600 mt-1">{errors.digitalPlatform}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Región de cuenta</label>
                    <div className="flex items-center gap-3">
                      {/* Region Icon Preview */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center justify-center text-[#2a63cd]">
                        {formData.digitalRegion === 'USA' ? (
                          <FaFlagUsa className="w-5 h-5" />
                        ) : (
                          <FaGlobeAmericas className="w-5 h-5" />
                        )}
                      </div>
                      <select
                        value={formData.digitalRegion}
                        onChange={(e) => updateFormData('digitalRegion', e.target.value)}
                        className="flex-1 appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2a63cd]"
                      >
                        <option value="GLOBAL">Global (Todas las regiones)</option>
                        <option value="USA">Estados Unidos</option>
                        <option value="LATAM">Latinoamérica</option>
                        <option value="EU">Europa</option>
                        <option value="ASIA">Asia</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estado del Producto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Estado del producto</h2>
              <div className="relative">
                <select
                  value={formData.isActive ? 'active' : 'draft'}
                  onChange={(e) => updateFormData('isActive', e.target.value === 'active')}
                  className="w-full appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="draft">Borrador</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.isActive ? 'Este producto estará disponible en tus canales de venta.' : 'Este producto estará oculto de todos los canales.'}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase mb-2">Canales de venta y aplicaciones</h3>
                <div className="flex items-center gap-2 mb-2">
                  <FiCheck className="text-green-500" />
                  <span className="text-sm text-gray-700">Tienda Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheck className="text-green-500" />
                  <span className="text-sm text-gray-700">Punto de Venta (POS)</span>
                </div>
              </div>
            </div>

            {/* Organización */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Organización</h2>

              <div className="space-y-4">
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <div className="relative">
                    <select
                      ref={categoryRef}
                      value={formData.categoryId}
                      onChange={(e) => updateFormData('categoryId', e.target.value)}
                      onBlur={() => handleBlur('categoryId')}
                      className={`w-full appearance-none bg-white border rounded-lg text-gray-900 py-2.5 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.categoryId ? 'border-red-300' : 'border-gray-300'}`}
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                  <EpicTooltip
                    message={errors.categoryId || ''}
                    visible={!!(touchedFields.categoryId && errors.categoryId)}
                    position="right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas</label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ej: Verano, Oferta (Enter)"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-gray-500 hover:text-gray-700"><FiX /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Insignias</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => updateFormData('isFeatured', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
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
    </div>
  );
}
