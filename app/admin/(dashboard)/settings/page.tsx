'use client';

import { useState, useEffect, useRef } from 'react';
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
  });
  const [exchangeRates, setExchangeRates] = useState({ VES: 36.50, EUR: 0.92 });
  const [loadingRates, setLoadingRates] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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
        setFormData({
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
        });
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('El archivo es demasiado grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData(prev => ({ ...prev, [field]: result }));
        if (field === 'logo') setLogoPreview(result);
        else setFaviconPreview(result);
      };
      reader.readAsDataURL(file);
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
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
        >
          {isLoading ? <FiLoader className="animate-spin" /> : <FiSave />}
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* LEFT COLUMN: Identity & Branding */}
        <div className="space-y-8">

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
                        <Image src={faviconPreview} alt="Favicon" fill className="object-contain p-2" />
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
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Física</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Homepage & Logic */}
        <div className="space-y-8">

          {/* Section Header */}
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
  return <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
}
