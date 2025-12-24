'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { SettingsFormData, SocialMediaItem, CompanySettings, SettingsValidationErrors } from '@/types/settings';
import { validateSettings } from '@/lib/validations/settings';
import {
  FiSave, FiLayout, FiSmartphone, FiGlobe, FiDollarSign,
  FiTruck, FiShield, FiVideo, FiHome, FiGrid, FiActivity,
  FiSearch, FiAlertTriangle, FiCheck, FiX, FiUpload, FiTrash2,
  FiClock, FiMapPin, FiMail, FiPhone, FiInstagram, FiFacebook, FiTwitter, FiYoutube,
  FiSettings, FiImage, FiMonitor
} from 'react-icons/fi';

const DEFAULT_SOCIAL_MEDIA: SocialMediaItem[] = [
  { name: 'Instagram', url: '', enabled: true, icon: 'instagram' },
  { name: 'Facebook', url: '', enabled: true, icon: 'facebook' },
  { name: 'Twitter/X', url: '', enabled: true, icon: 'twitter' },
  { name: 'YouTube', url: '', enabled: true, icon: 'youtube' },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [formData, setFormData] = useState<SettingsFormData>({
    companyName: '',
    tagline: '',
    rif: '',
    legalName: '',
    foundedYear: '',
    description: '',
    phone: '',
    whatsapp: '+582572511282',
    email: 'electroshopgre@gmail.com',
    address: '',
    logo: null,
    favicon: null,
    primaryColor: '#2a63cd',
    secondaryColor: '#1e4ba3',
    instagram: '',
    facebook: '',
    twitter: '',
    youtube: '',
    telegram: '',
    tiktok: '',
    socialMedia: [...DEFAULT_SOCIAL_MEDIA],
    businessHours: {
      monday: { open: '09:00', close: '18:00', enabled: true },
      tuesday: { open: '09:00', close: '18:00', enabled: true },
      wednesday: { open: '09:00', close: '18:00', enabled: true },
      thursday: { open: '09:00', close: '18:00', enabled: true },
      friday: { open: '09:00', close: '18:00', enabled: true },
      saturday: { open: '10:00', close: '14:00', enabled: true },
      sunday: { open: '00:00', close: '00:00', enabled: false },
    },
    primaryCurrency: 'USD',
    autoExchangeRates: false,
    exchangeRateVES: 36.50,
    exchangeRateEUR: 0.92,
    deliveryEnabled: true,
    deliveryFeeUSD: 0,
    freeDeliveryThresholdUSD: null,
    shippingCostPerKg: 2,
    minConsolidatedShipping: 3,
    packagingFeeUSD: 2.50,
    pickupEnabled: true,
    pickupAddress: '',
    pickupInstructions: '',
    taxEnabled: false,
    taxPercent: 0,
    minOrderAmountUSD: null,
    maxOrderAmountUSD: null,
    maintenanceMode: false,
    maintenanceMessage: '',
    maintenanceStartTime: '',
    maintenanceEndTime: '',
    maintenanceAllowedIPs: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    heroVideoEnabled: false,
    heroVideoUrl: '',
    heroVideoTitle: '',
    heroVideoDescription: '',
    maxFeaturedProducts: 8,
    // HomePage Hero Section
    heroTitle: '',
    heroSubtitle: '',
    heroButtonText: '',
    heroButtonLink: '',
    heroBackgroundImage: null,
    // HomePage Stats Section
    showStats: true,
    stat1Label: '',
    stat1Value: '',
    stat1Icon: '',
    stat2Label: '',
    stat2Value: '',
    stat2Icon: '',
    stat3Label: '',
    stat3Value: '',
    stat3Icon: '',
    stat4Label: '',
    stat4Value: '',
    stat4Icon: '',
    // HomePage Categories Display
    showCategories: true,
    maxCategoriesDisplay: 6,
    // Inventory Configuration
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    autoHideOutOfStock: false,
    notifyLowStock: true,
    notifyOutOfStock: true,
    // HomePage CTA Section
    ctaEnabled: true,
    ctaTitle: '',
    ctaDescription: '',
    ctaButtonText: '',
    ctaButtonLink: '',
    // Hot Ad / Promotional Popup
    hotAdEnabled: false,
    hotAdImage: null,
    hotAdTransparentBg: false,
    hotAdShadowEnabled: true,
    hotAdShadowBlur: 20,
    hotAdShadowOpacity: 50,
    hotAdBackdropOpacity: 70,
    hotAdBackdropColor: '#000000',
    hotAdLink: '',
  });
  const [exchangeRates, setExchangeRates] = useState({ VES: 36.50, EUR: 0.92 });
  const [loadingRates, setLoadingRates] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [initialFormData, setInitialFormData] = useState<SettingsFormData | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (formData.autoExchangeRates) {
      fetchExchangeRates();
    }
  }, [formData.autoExchangeRates, formData.primaryCurrency]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        const loadedData: SettingsFormData = {
          companyName: data.companyName || '',
          tagline: data.tagline || '',
          rif: data.rif || '',
          legalName: data.legalName || '',
          foundedYear: data.foundedYear || '',
          description: data.description || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          address: data.address || '',
          logo: data.logo,
          favicon: data.favicon,
          primaryColor: data.primaryColor || '#2a63cd',
          secondaryColor: data.secondaryColor || '#1e4ba3',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          youtube: data.youtube || '',
          telegram: data.telegram || '',
          tiktok: data.tiktok || '',
          socialMedia: Array.isArray(data.socialMedia) ? data.socialMedia : [...DEFAULT_SOCIAL_MEDIA],
          businessHours: data.businessHours || {
            monday: { open: '09:00', close: '18:00', enabled: true },
            tuesday: { open: '09:00', close: '18:00', enabled: true },
            wednesday: { open: '09:00', close: '18:00', enabled: true },
            thursday: { open: '09:00', close: '18:00', enabled: true },
            friday: { open: '09:00', close: '18:00', enabled: true },
            saturday: { open: '10:00', close: '14:00', enabled: true },
            sunday: { open: '00:00', close: '00:00', enabled: false },
          },
          primaryCurrency: (data.primaryCurrency as 'USD' | 'VES' | 'EUR') || 'USD',
          autoExchangeRates: data.autoExchangeRates || false,
          exchangeRateVES: data.exchangeRateVES ? Number(data.exchangeRateVES) : 36.50,
          exchangeRateEUR: data.exchangeRateEUR ? Number(data.exchangeRateEUR) : 0.92,
          deliveryEnabled: data.deliveryEnabled ?? true,
          deliveryFeeUSD: data.deliveryFeeUSD ? Number(data.deliveryFeeUSD) : 0,
          freeDeliveryThresholdUSD: data.freeDeliveryThresholdUSD ? Number(data.freeDeliveryThresholdUSD) : null,
          shippingCostPerKg: data.shippingCostPerKg ? Number(data.shippingCostPerKg) : 2,
          minConsolidatedShipping: data.minConsolidatedShipping ? Number(data.minConsolidatedShipping) : 3,
          packagingFeeUSD: data.packagingFeeUSD ? Number(data.packagingFeeUSD) : 2.50,
          pickupEnabled: data.pickupEnabled ?? true,
          pickupAddress: data.pickupAddress || '',
          pickupInstructions: data.pickupInstructions || '',
          taxEnabled: data.taxEnabled ?? false,
          taxPercent: data.taxPercent ? Number(data.taxPercent) : 0,
          minOrderAmountUSD: data.minOrderAmountUSD ? Number(data.minOrderAmountUSD) : null,
          maxOrderAmountUSD: data.maxOrderAmountUSD ? Number(data.maxOrderAmountUSD) : null,
          maintenanceMode: data.maintenanceMode ?? false,
          maintenanceMessage: data.maintenanceMessage || '',
          maintenanceStartTime: data.maintenanceStartTime ? new Date(data.maintenanceStartTime).toISOString().slice(0, 16) : '',
          maintenanceEndTime: data.maintenanceEndTime ? new Date(data.maintenanceEndTime).toISOString().slice(0, 16) : '',
          maintenanceAllowedIPs: data.maintenanceAllowedIPs || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          metaKeywords: data.metaKeywords || '',
          heroVideoEnabled: data.heroVideoEnabled ?? false,
          heroVideoUrl: data.heroVideoUrl || '',
          heroVideoTitle: data.heroVideoTitle || '',
          heroVideoDescription: data.heroVideoDescription || '',
          maxFeaturedProducts: data.maxFeaturedProducts || 8,
          // HomePage Hero Section
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || '',
          heroButtonText: data.heroButtonText || '',
          heroButtonLink: data.heroButtonLink || '',
          heroBackgroundImage: data.heroBackgroundImage || null,
          // HomePage Stats Section
          showStats: data.showStats ?? true,
          stat1Label: data.stat1Label || '',
          stat1Value: data.stat1Value || '',
          stat1Icon: data.stat1Icon || '',
          stat2Label: data.stat2Label || '',
          stat2Value: data.stat2Value || '',
          stat2Icon: data.stat2Icon || '',
          stat3Label: data.stat3Label || '',
          stat3Value: data.stat3Value || '',
          stat3Icon: data.stat3Icon || '',
          stat4Label: data.stat4Label || '',
          stat4Value: data.stat4Value || '',
          stat4Icon: data.stat4Icon || '',
          // HomePage Categories Display
          showCategories: data.showCategories ?? true,
          maxCategoriesDisplay: data.maxCategoriesDisplay || 6,
          // Inventory Configuration
          lowStockThreshold: data.lowStockThreshold || 10,
          criticalStockThreshold: data.criticalStockThreshold || 5,
          autoHideOutOfStock: data.autoHideOutOfStock ?? false,
          notifyLowStock: data.notifyLowStock ?? true,
          notifyOutOfStock: data.notifyOutOfStock ?? true,
          // HomePage CTA Section
          ctaEnabled: data.ctaEnabled ?? true,
          ctaTitle: data.ctaTitle || '',
          ctaDescription: data.ctaDescription || '',
          ctaButtonText: data.ctaButtonText || '',
          ctaButtonLink: data.ctaButtonLink || '',
          // Hot Ad / Promotional Popup
          hotAdEnabled: data.hotAdEnabled ?? false,
          hotAdImage: data.hotAdImage || null,
          hotAdTransparentBg: data.hotAdTransparentBg ?? false,
          hotAdShadowEnabled: data.hotAdShadowEnabled ?? true,
          hotAdShadowBlur: data.hotAdShadowBlur ?? 20,
          hotAdShadowOpacity: data.hotAdShadowOpacity ?? 50,
          hotAdBackdropOpacity: data.hotAdBackdropOpacity ?? 70,
          hotAdBackdropColor: data.hotAdBackdropColor || '#000000',
          hotAdLink: data.hotAdLink || '',
        };
        setFormData(loadedData);
        setInitialFormData(loadedData);
        if (data.logo) setLogoPreview(data.logo);
        if (data.favicon) setFaviconPreview(data.favicon);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchExchangeRates = async () => {
    setLoadingRates(true);
    try {
      // Use our internal API route to avoid CORS issues
      const response = await fetch('/api/exchange-rates');
      if (response.ok) {
        const data = await response.json();
        // Handle simplified response { VES: rate, lastUpdated: ... }
        if (data.VES) {
          const rate = data.VES;
          setExchangeRates(prev => ({ ...prev, VES: rate }));
          setFormData(prev => ({ ...prev, exchangeRateVES: rate }));
        }
      } else {
        console.warn('Failed to fetch exchange rates: API response not ok');
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSocialMediaChange = (index: number, field: keyof SocialMediaItem, value: any) => {
    const newSocialMedia = [...formData.socialMedia];
    newSocialMedia[index] = { ...newSocialMedia[index], [field]: value };
    setFormData(prev => ({ ...prev, socialMedia: newSocialMedia }));
  };

  const handleBusinessHoursChange = (day: keyof typeof formData.businessHours, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value }
      }
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 2MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG, WEBP, GIF e ICO.');
      return;
    }

    // Show preview immediately using local URL
    const localPreview = URL.createObjectURL(file);
    if (field === 'logo') setLogoPreview(localPreview);
    else setFaviconPreview(localPreview);

    try {
      // Upload file to server
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', field);

      const response = await fetch('/api/upload/settings', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al subir el archivo');
        // Revert preview
        if (field === 'logo') setLogoPreview(formData.logo);
        else setFaviconPreview(formData.favicon);
        return;
      }

      const result = await response.json();

      // Update form data with the server URL (not base64!)
      setFormData(prev => ({ ...prev, [field]: result.url }));

      // Update preview with server URL
      if (field === 'logo') setLogoPreview(result.url);
      else setFaviconPreview(result.url);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error de conexión al subir el archivo');
      // Revert preview
      if (field === 'logo') setLogoPreview(formData.logo);
      else setFaviconPreview(formData.favicon);
    } finally {
      // Clean up the local preview URL
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const validation = validateSettings(formData);
      if (!validation.valid) {
        setErrors(validation.errors);
        setIsLoading(false);
        // Scroll to top to see errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setInitialFormData(formData); // Reset initial state to current state
        setSuccessMessage('Configuración guardada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setErrors(errorData.errors || { form: errorData.error || 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({ form: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">Administra todos los aspectos de tu tienda desde un solo lugar</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg ${hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} disabled:opacity-50`}
        >
          {isLoading ? <FiLoader className="animate-spin" /> : <FiSave />}
          {isLoading ? 'Guardando...' : hasChanges ? 'Guardar Cambios' : 'Sin Cambios'}
        </button>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2 animate-fadeIn">
          <FiCheck className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {errors.form && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2 animate-fadeIn">
          <FiAlertTriangle className="w-5 h-5" />
          {errors.form}
        </div>
      )}

      {/* Main Grid Layout - 2 Columns for better spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT COLUMN: Identity & Branding */}
        <div className="space-y-6">

          {/* Section Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FiSettings className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">General e Identidad</h2>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiLayout className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Información de la Empresa</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Empresa</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">RIF / ID Legal</label>
                  <input
                    type="text"
                    name="rif"
                    value={formData.rif}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Slogan</label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción Corta</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Branding & Colors */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiGrid className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">Branding y Colores</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Logo Principal</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group hover:border-blue-400 transition-colors">
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Logo" fill className="object-contain p-1" />
                      ) : (
                        <FiImage className="text-gray-400 w-6 h-6" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={(e) => handleFileChange(e, 'logo')}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                      >
                        Subir Imagen
                      </button>
                      <span className="text-[10px] text-gray-400">Max 2MB (PNG, JPG)</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Favicon</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group hover:border-blue-400 transition-colors">
                      {faviconPreview ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain p-2" />
                      ) : (
                        <FiGlobe className="text-gray-400 w-6 h-6" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={faviconInputRef}
                        onChange={(e) => handleFileChange(e, 'favicon')}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => faviconInputRef.current?.click()}
                        className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                      >
                        Subir Icono
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Color Primario</label>
                  <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleInputChange}
                      className="h-8 w-12 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs text-gray-600 font-mono font-medium">{formData.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Color Secundario</label>
                  <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleInputChange}
                      className="h-8 w-12 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs text-gray-600 font-mono font-medium">{formData.secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiPhone className="text-green-600" />
              <h3 className="font-semibold text-gray-900">Información de Contacto</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Público</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
                  <div className="relative">
                    <FiSmartphone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      placeholder="+58 412-1234567"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono de Contacto</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+58 257-2511282"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Número para llamadas (diferente a WhatsApp)</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Física</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="address"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiGlobe className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">Redes Sociales</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Instagram */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 transition-colors">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md">
                  <FiInstagram className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram</label>
                  <input
                    type="url"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    placeholder="https://instagram.com/tu_usuario"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors"
                  />
                </div>
              </div>

              {/* Facebook */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white shadow-md">
                  <FiFacebook className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Facebook</label>
                  <input
                    type="url"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/tu_pagina"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Twitter/X */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-sky-300 transition-colors">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black text-white shadow-md">
                  <FiTwitter className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Twitter / X</label>
                  <input
                    type="url"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/tu_usuario"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              {/* YouTube */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-red-300 transition-colors">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 text-white shadow-md">
                  <FiYoutube className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">YouTube</label>
                  <input
                    type="url"
                    name="youtube"
                    value={formData.youtube}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/@tu_canal"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Telegram */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-md">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.357 8.63-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telegram</label>
                  <input
                    type="url"
                    name="telegram"
                    value={formData.telegram || ''}
                    onChange={handleInputChange}
                    placeholder="https://t.me/tu_canal"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              {/* TikTok */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black text-white shadow-md">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">TikTok</label>
                  <input
                    type="url"
                    name="tiktok"
                    value={formData.tiktok || ''}
                    onChange={handleInputChange}
                    placeholder="https://tiktok.com/@tu_usuario"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition-colors"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 italic mt-2 flex items-center gap-1">
                <FiAlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                Deja vacío los campos de las redes que no utilices. Solo se mostrarán las que tengan URL.
              </p>
            </div>
          </div>


          {/* Business Hours */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiClock className="text-orange-600" />
              <h3 className="font-semibold text-gray-900">Horario de Atención</h3>
            </div>
            <div className="p-6 space-y-3">
              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                const dayNames: Record<string, string> = {
                  monday: 'Lunes',
                  tuesday: 'Martes',
                  wednesday: 'Miércoles',
                  thursday: 'Jueves',
                  friday: 'Viernes',
                  saturday: 'Sábado',
                  sunday: 'Domingo',
                };
                return (
                  <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-24">
                      <span className="text-sm font-medium text-gray-700">{dayNames[day]}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.businessHours[day].enabled}
                        onChange={(e) => handleBusinessHoursChange(day, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                    {formData.businessHours[day].enabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={formData.businessHours[day].open}
                          onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg"
                        />
                        <span className="text-gray-400">a</span>
                        <input
                          type="time"
                          value={formData.businessHours[day].close}
                          onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Cerrado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Section Header - Homepage */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <FiMonitor className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Homepage y Lógica</h2>
          </div>

          {/* Hero Section Configuration */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiHome className="text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Sección Hero (Principal)</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título Principal</label>
                <input
                  type="text"
                  name="heroTitle"
                  value={formData.heroTitle}
                  onChange={handleInputChange}
                  placeholder="Ej: Bienvenido a Electro Shop"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subtítulo</label>
                <textarea
                  name="heroSubtitle"
                  value={formData.heroSubtitle}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Ej: La mejor tecnología al mejor precio"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Texto Botón</label>
                  <input
                    type="text"
                    name="heroButtonText"
                    value={formData.heroButtonText}
                    onChange={handleInputChange}
                    placeholder="Ver Productos"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Link Botón</label>
                  <input
                    type="text"
                    name="heroButtonLink"
                    value={formData.heroButtonLink}
                    onChange={handleInputChange}
                    placeholder="/productos"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Video Toggle nested inside Hero */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiVideo className="text-red-500" />
                    <span className="text-sm font-medium text-gray-700">Video de Fondo</span>
                  </div>
                  <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                    <input
                      type="checkbox"
                      name="heroVideoEnabled"
                      id="heroVideoEnabled"
                      checked={formData.heroVideoEnabled}
                      onChange={handleInputChange}
                      className="opacity-0 w-0 h-0 peer"
                    />
                    <label
                      htmlFor="heroVideoEnabled"
                      className="absolute top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full cursor-pointer peer-checked:bg-blue-600 transition-all duration-300 before:content-[''] before:absolute before:w-3 before:h-3 before:bg-white before:rounded-full before:left-1 before:bottom-1 peer-checked:before:translate-x-5 before:transition-transform"
                    ></label>
                  </div>
                </div>

                {formData.heroVideoEnabled && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-fadeIn">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">URL del Video (YouTube/MP4)</label>
                    <input
                      type="text"
                      name="heroVideoUrl"
                      value={formData.heroVideoUrl}
                      onChange={handleInputChange}
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 italic">
                      * El video se reproducirá automáticamente en bucle y sin sonido.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Categories */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiActivity className="text-cyan-600" />
              <h3 className="font-semibold text-gray-900">Estadísticas y Categorías</h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Stats Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Mostrar Sección de Estadísticas</span>
                <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                  <input
                    type="checkbox"
                    name="showStats"
                    id="showStats"
                    checked={formData.showStats}
                    onChange={handleInputChange}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <label
                    htmlFor="showStats"
                    className="absolute top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full cursor-pointer peer-checked:bg-cyan-600 transition-all duration-300 before:content-[''] before:absolute before:w-3 before:h-3 before:bg-white before:rounded-full before:left-1 before:bottom-1 peer-checked:before:translate-x-5 before:transition-transform"
                  ></label>
                </div>
              </div>

              {/* Categories Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Mostrar Carrusel de Categorías</span>
                <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                  <input
                    type="checkbox"
                    name="showCategories"
                    id="showCategories"
                    checked={formData.showCategories}
                    onChange={handleInputChange}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <label
                    htmlFor="showCategories"
                    className="absolute top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full cursor-pointer peer-checked:bg-cyan-600 transition-all duration-300 before:content-[''] before:absolute before:w-3 before:h-3 before:bg-white before:rounded-full before:left-1 before:bottom-1 peer-checked:before:translate-x-5 before:transition-transform"
                  ></label>
                </div>
              </div>

              {formData.showCategories && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Máximo de Categorías a Mostrar</label>
                  <input
                    type="number"
                    name="maxCategoriesDisplay"
                    value={formData.maxCategoriesDisplay}
                    onChange={handleInputChange}
                    min="1"
                    max="12"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Exchange Rates */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiDollarSign className="text-green-600" />
                <h3 className="font-semibold text-gray-900">Tasas de Cambio</h3>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="autoExchangeRates" className="text-xs text-gray-600 font-medium cursor-pointer">Auto-actualizar</label>
                <input
                  type="checkbox"
                  name="autoExchangeRates"
                  id="autoExchangeRates"
                  checked={formData.autoExchangeRates}
                  onChange={handleInputChange}
                  className="rounded text-green-600 focus:ring-green-500 cursor-pointer"
                />
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tasa VES (BCV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">Bs</span>
                  <input
                    type="number"
                    name="exchangeRateVES"
                    value={formData.exchangeRateVES}
                    onChange={handleInputChange}
                    step="0.01"
                    disabled={formData.autoExchangeRates}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tasa EUR</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">€</span>
                  <input
                    type="number"
                    name="exchangeRateEUR"
                    value={formData.exchangeRateEUR}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Delivery */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FiTruck className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Envío y Entrega</h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Delivery Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Habilitar Envío a Domicilio</span>
                  <p className="text-xs text-gray-500">Permite a los clientes recibir productos en su dirección</p>
                </div>
                <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                  <input
                    type="checkbox"
                    name="deliveryEnabled"
                    id="deliveryEnabled"
                    checked={formData.deliveryEnabled}
                    onChange={handleInputChange}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <label
                    htmlFor="deliveryEnabled"
                    className="absolute top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full cursor-pointer peer-checked:bg-blue-600 transition-all duration-300 before:content-[''] before:absolute before:w-3 before:h-3 before:bg-white before:rounded-full before:left-1 before:bottom-1 peer-checked:before:translate-x-5 before:transition-transform"
                  ></label>
                </div>
              </div>


              {formData.deliveryEnabled && (
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4 animate-fadeIn">
                  {/* Info Banner */}
                  <div className="flex items-start gap-2 p-3 bg-blue-100/50 rounded-lg">
                    <FiTruck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      El envío se calcula por el peso de productos consolidables + tarifa de embalaje.
                      Los productos grandes (no consolidables) tienen su costo fijo definido en cada producto.
                    </p>
                  </div>

                  {/* Tarifas de Envío */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Tarifas por Peso (Productos Consolidables)
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Costo por Kg (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                          <input
                            type="number"
                            name="shippingCostPerKg"
                            value={formData.shippingCostPerKg}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="2.00"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Por cada kg de peso</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Mínimo de Envío (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                          <input
                            type="number"
                            name="minConsolidatedShipping"
                            value={formData.minConsolidatedShipping}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="3.00"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Cargo mínimo de envío</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Embalaje (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                          <input
                            type="number"
                            name="packagingFeeUSD"
                            value={formData.packagingFeeUSD}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="2.50"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Tarifa fija de embalaje</p>
                      </div>
                    </div>
                  </div>

                  {/* Envío Gratis */}
                  <div className="pt-3 border-t border-blue-200 space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Promoción de Envío Gratis
                    </h4>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Envío Gratis desde (USD)</label>
                      <div className="relative max-w-[200px]">
                        <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                        <input
                          type="number"
                          name="freeDeliveryThresholdUSD"
                          value={formData.freeDeliveryThresholdUSD || ''}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          placeholder="100.00"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Si el subtotal supera este monto, solo se cobra la tarifa de embalaje. Dejar vacío para no ofrecer envío gratis.
                      </p>
                    </div>
                  </div>

                  {/* Mini Tutorial */}
                  <div className="pt-3 border-t border-blue-200">
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <FiTruck className="w-4 h-4 text-blue-500" />
                        ¿Cómo funciona el cálculo de envío?
                      </p>

                      <div className="space-y-3 text-xs text-gray-600">
                        {/* Tipo 1: Consolidables */}
                        <div className="flex gap-2">
                          <span className="font-bold text-blue-600 w-4">1.</span>
                          <div>
                            <p className="font-semibold text-gray-700">Productos Consolidables (se envían juntos)</p>
                            <p className="text-gray-500 mt-0.5">
                              Se suman los pesos de todos los productos y se multiplica por el <strong>Costo por Kg</strong>.
                              Si el resultado es menor al <strong>Mínimo de Envío</strong>, se cobra el mínimo.
                            </p>
                            <p className="text-blue-600 mt-1 font-medium">
                              Ejemplo: 2kg × ${formData.shippingCostPerKg}/kg = ${(2 * formData.shippingCostPerKg).toFixed(2)} USD
                            </p>
                          </div>
                        </div>

                        {/* Tipo 2: Grandes */}
                        <div className="flex gap-2">
                          <span className="font-bold text-orange-600 w-4">2.</span>
                          <div>
                            <p className="font-semibold text-gray-700">Productos Grandes (no consolidables)</p>
                            <p className="text-gray-500 mt-0.5">
                              Cada producto tiene su propio costo de envío fijo definido al crearlo.
                              Ideal para artículos voluminosos como monitores, refrigeradores, etc.
                            </p>
                          </div>
                        </div>

                        {/* Tipo 3: Embalaje */}
                        <div className="flex gap-2">
                          <span className="font-bold text-purple-600 w-4">3.</span>
                          <div>
                            <p className="font-semibold text-gray-700">Tarifa de Embalaje</p>
                            <p className="text-gray-500 mt-0.5">
                              Se cobra <strong>${formData.packagingFeeUSD} USD</strong> por la preparación y empaque del pedido.
                              Se aplica siempre que haya productos físicos.
                            </p>
                          </div>
                        </div>

                        {/* Fórmula final */}
                        <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                          <p className="font-semibold text-gray-700 mb-1">Fórmula Total:</p>
                          <p className="text-gray-600 font-mono text-[11px]">
                            (Peso × Costo/kg) + Envío productos grandes + ${formData.packagingFeeUSD} embalaje
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pickup Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <span className="text-sm font-medium text-gray-700">Habilitar Retiro en Tienda</span>
                  <p className="text-xs text-gray-500">Permite a los clientes recoger sus pedidos</p>
                </div>
                <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                  <input
                    type="checkbox"
                    name="pickupEnabled"
                    id="pickupEnabled"
                    checked={formData.pickupEnabled}
                    onChange={handleInputChange}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <label
                    htmlFor="pickupEnabled"
                    className="absolute top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full cursor-pointer peer-checked:bg-blue-600 transition-all duration-300 before:content-[''] before:absolute before:w-3 before:h-3 before:bg-white before:rounded-full before:left-1 before:bottom-1 peer-checked:before:translate-x-5 before:transition-transform"
                  ></label>
                </div>
              </div>

              {formData.pickupEnabled && (
                <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección de Retiro</label>
                    <input
                      type="text"
                      name="pickupAddress"
                      value={formData.pickupAddress}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                      placeholder="Av. Principal, Local #123, Ciudad"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Instrucciones de Retiro</label>
                    <textarea
                      name="pickupInstructions"
                      value={formData.pickupInstructions}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                      placeholder="Horario de atención, documentos requeridos, etc."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Mode - High Visibility */}
          <div className={`rounded-xl shadow-md border overflow-hidden transition-all duration-300 ${formData.maintenanceMode ? 'bg-amber-50 border-amber-300 shadow-amber-100' : 'bg-white border-gray-200'}`}>
            <div className="p-4 border-b border-gray-100/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiAlertTriangle className={formData.maintenanceMode ? 'text-amber-600' : 'text-gray-400'} />
                <h3 className={`font-semibold ${formData.maintenanceMode ? 'text-amber-900' : 'text-gray-900'}`}>Modo Mantenimiento</h3>
              </div>
              <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                <input
                  type="checkbox"
                  name="maintenanceMode"
                  id="maintenanceMode"
                  checked={formData.maintenanceMode}
                  onChange={handleInputChange}
                  className="opacity-0 w-0 h-0 peer"
                />
                <label
                  htmlFor="maintenanceMode"
                  className="absolute top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full cursor-pointer peer-checked:bg-amber-500 transition-all duration-300 before:content-[''] before:absolute before:w-3 before:h-3 before:bg-white before:rounded-full before:left-1 before:bottom-1 peer-checked:before:translate-x-5 before:transition-transform"
                ></label>
              </div>
            </div>
            {formData.maintenanceMode && (
              <div className="p-6 space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mensaje para usuarios</label>
                  <textarea
                    name="maintenanceMessage"
                    value={formData.maintenanceMessage}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-amber-200 bg-white rounded-lg resize-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Estamos realizando mejoras..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Inicio Programado</label>
                    <input
                      type="datetime-local"
                      name="maintenanceStartTime"
                      value={formData.maintenanceStartTime}
                      onChange={handleInputChange}
                      className="w-full px-2 py-2 text-xs border border-amber-200 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Fin Programado</label>
                    <input
                      type="datetime-local"
                      name="maintenanceEndTime"
                      value={formData.maintenanceEndTime}
                      onChange={handleInputChange}
                      className="w-full px-2 py-2 text-xs border border-amber-200 bg-white rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">IPs Permitidas (Separadas por coma)</label>
                  <input
                    type="text"
                    name="maintenanceAllowedIPs"
                    value={formData.maintenanceAllowedIPs}
                    onChange={handleInputChange}
                    placeholder="192.168.1.1, 10.0.0.1"
                    className="w-full px-3 py-2 text-sm border border-amber-200 bg-white rounded-lg font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hot Ad / Promotional Popup */}
          <div className={`rounded-xl shadow-md border overflow-hidden hover:shadow-lg transition-shadow ${formData.hotAdEnabled ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b flex items-center justify-between ${formData.hotAdEnabled ? 'border-orange-200 bg-gradient-to-r from-orange-100 to-red-100' : 'border-gray-100 bg-gray-50/50'}`}>
              <div className="flex items-center gap-2">
                <FiActivity className="w-6 h-6 text-orange-500 animate-pulse" />
                <h3 className="font-semibold text-gray-900">Publicidad Caliente</h3>
                {formData.hotAdEnabled && (
                  <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full font-bold animate-pulse">ACTIVO</span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="hotAdEnabled"
                  checked={formData.hotAdEnabled}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
              </label>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-xs text-gray-600 bg-white/50 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
                <FiActivity className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                Muestra una imagen promocional que cubre toda la página principal cuando los visitantes llegan. Ideal para ofertas especiales, lanzamientos o eventos importantes.
              </p>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Imagen Promocional (PNG o JPG)</label>
                <div className="flex items-start gap-4">
                  <div className={`w-32 h-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden relative group transition-colors ${formData.hotAdImage ? 'border-green-300' : 'border-gray-300 hover:border-orange-400'}`}>
                    {formData.hotAdImage ? (
                      <>
                        <Image src={formData.hotAdImage} alt="Hot Ad Preview" fill className="object-contain p-1" />
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, hotAdImage: null }))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <FiUpload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-400">Subir imagen</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      id="hotAdImageInput"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        if (file.size > 5 * 1024 * 1024) {
                          alert('El archivo es demasiado grande. Máximo 5MB.');
                          return;
                        }

                        try {
                          const formDataUpload = new FormData();
                          formDataUpload.append('file', file);
                          formDataUpload.append('type', 'hotAd');

                          const response = await fetch('/api/upload/settings', {
                            method: 'POST',
                            body: formDataUpload,
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            alert(error.error || 'Error al subir el archivo');
                            return;
                          }

                          const result = await response.json();
                          setFormData(prev => ({ ...prev, hotAdImage: result.url }));
                        } catch (error) {
                          console.error('Error uploading hot ad image:', error);
                          alert('Error de conexión al subir el archivo');
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => document.getElementById('hotAdImageInput')?.click()}
                      className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md transition-colors shadow-sm"
                    >
                      {formData.hotAdImage ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                    </button>
                    <span className="text-[10px] text-gray-400">Max 5MB (PNG, JPG)</span>
                  </div>
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Link al hacer clic (Opcional)</label>
                <input
                  type="url"
                  name="hotAdLink"
                  value={formData.hotAdLink}
                  onChange={handleInputChange}
                  placeholder="https://tu-tienda.com/oferta-especial"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
                <p className="text-[10px] text-gray-500 mt-1">Si se especifica, la imagen será clickeable y redirigirá a esta URL</p>
              </div>

              {/* Visual Options */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800">Opciones Visuales</h4>

                {/* Transparent Background */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Fondo Transparente</span>
                    <p className="text-xs text-gray-500">Muestra la imagen sin borde redondeado</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="hotAdTransparentBg"
                      checked={formData.hotAdTransparentBg}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                  </label>
                </div>

                {/* Shadow Enabled */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Sombra de Imagen</span>
                    <p className="text-xs text-gray-500">Agrega profundidad a la imagen</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="hotAdShadowEnabled"
                      checked={formData.hotAdShadowEnabled}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                  </label>
                </div>

                {/* Shadow Controls */}
                {formData.hotAdShadowEnabled && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Grosor de Sombra: {formData.hotAdShadowBlur}px
                      </label>
                      <input
                        type="range"
                        name="hotAdShadowBlur"
                        value={formData.hotAdShadowBlur}
                        onChange={handleInputChange}
                        min="5"
                        max="100"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Opacidad de Sombra: {formData.hotAdShadowOpacity}%
                      </label>
                      <input
                        type="range"
                        name="hotAdShadowOpacity"
                        value={formData.hotAdShadowOpacity}
                        onChange={handleInputChange}
                        min="10"
                        max="100"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Backdrop Opacity */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Opacidad del Fondo: {formData.hotAdBackdropOpacity}%
                  </label>
                  <input
                    type="range"
                    name="hotAdBackdropOpacity"
                    value={formData.hotAdBackdropOpacity}
                    onChange={handleInputChange}
                    min="30"
                    max="95"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700"
                  />
                </div>

                {/* Backdrop Color */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Color del Fondo
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="hotAdBackdropColor"
                      value={formData.hotAdBackdropColor}
                      onChange={handleInputChange}
                      className="h-10 w-14 rounded-lg cursor-pointer border-2 border-gray-300 p-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-mono text-gray-600">{formData.hotAdBackdropColor}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Color del fondo detrás de la imagen</p>
                    </div>
                    {/* Preview */}
                    <div
                      className="w-16 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-[8px] text-white font-bold"
                      style={{
                        backgroundColor: formData.hotAdBackdropColor,
                        opacity: formData.hotAdBackdropOpacity / 100
                      }}
                    >
                      PREVIEW
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="mt-12 pb-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-8">
        <p>Electro Shop Admin Panel v1.2.0 &bull; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

function FiLoader({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

