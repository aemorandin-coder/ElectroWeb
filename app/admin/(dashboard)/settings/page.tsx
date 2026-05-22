'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { SettingsFormData, SettingsValidationErrors } from '@/types/settings';
import {
  FiSave, FiLayout, FiSmartphone, FiGlobe, FiDollarSign,
  FiTruck, FiShield, FiVideo, FiHome, FiActivity,
  FiAlertTriangle, FiCheck, FiX, FiUpload, FiTrash2,
  FiClock, FiMapPin, FiMail, FiPhone, FiInstagram, FiFacebook, FiTwitter, FiYoutube,
  FiSettings, FiImage, FiMonitor, FiRefreshCw, FiSearch, FiExternalLink,
  FiPackage, FiTag, FiBarChart2, FiToggleLeft, FiUsers, FiLock,
  FiCreditCard, FiLink, FiEye,
} from 'react-icons/fi';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'general' | 'tienda' | 'homepage' | 'inventario' | 'seo' | 'sistema';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general',    label: 'General',    icon: <FiSettings /> },
  { id: 'tienda',     label: 'Tienda',     icon: <FiDollarSign /> },
  { id: 'homepage',   label: 'Homepage',   icon: <FiHome /> },
  { id: 'inventario', label: 'Inventario', icon: <FiPackage /> },
  { id: 'seo',        label: 'SEO',        icon: <FiSearch /> },
  { id: 'sistema',    label: 'Sistema',    icon: <FiShield /> },
];

const SECTION_FIELDS: Record<Tab, (keyof SettingsFormData)[]> = {
  general: [
    'companyName', 'tagline', 'rif', 'legalName', 'foundedYear', 'description',
    'logo', 'favicon', 'primaryColor', 'secondaryColor',
    'phone', 'whatsapp', 'email', 'address',
    'instagram', 'facebook', 'twitter', 'youtube', 'telegram', 'tiktok',
    'businessHours',
  ],
  tienda: [
    'primaryCurrency', 'autoExchangeRates', 'exchangeRateVES', 'exchangeRateEUR',
    'deliveryEnabled', 'shippingCostPerKg', 'minConsolidatedShipping', 'packagingFeeUSD',
    'freeDeliveryThresholdUSD', 'pickupEnabled', 'pickupAddress', 'pickupInstructions',
    'taxEnabled', 'taxPercent', 'minOrderAmountUSD', 'maxOrderAmountUSD',
  ],
  homepage: [
    'heroTitle', 'heroSubtitle', 'heroButtonText', 'heroButtonLink', 'heroBackgroundImage',
    'heroVideoEnabled', 'heroVideoUrl',
    'showStats',
    'stat1Label', 'stat1Value', 'stat1Icon',
    'stat2Label', 'stat2Value', 'stat2Icon',
    'stat3Label', 'stat3Value', 'stat3Icon',
    'stat4Label', 'stat4Value', 'stat4Icon',
    'showCategories', 'maxCategoriesDisplay',
    'ctaEnabled', 'ctaTitle', 'ctaDescription', 'ctaButtonText', 'ctaButtonLink',
    'maxFeaturedProducts',
  ],
  inventario: [
    'lowStockThreshold', 'criticalStockThreshold',
    'autoHideOutOfStock', 'notifyLowStock', 'notifyOutOfStock',
  ],
  seo: ['metaTitle', 'metaDescription', 'metaKeywords'],
  sistema: [
    'maintenanceMode', 'maintenanceMessage',
    'maintenanceStartTime', 'maintenanceEndTime', 'maintenanceAllowedIPs', 'adminAlertEmails',
  ],
};

const DEFAULT_FORM: SettingsFormData = {
  companyName: '', tagline: '', rif: '', legalName: '', foundedYear: '', description: '',
  phone: '', whatsapp: '', email: '', address: '',
  logo: null, favicon: null,
  primaryColor: '#2a63cd', secondaryColor: '#1e4ba3',
  instagram: '', facebook: '', twitter: '', youtube: '', telegram: '', tiktok: '',
  socialMedia: [],
  businessHours: {
    monday:    { open: '09:00', close: '18:00', enabled: true },
    tuesday:   { open: '09:00', close: '18:00', enabled: true },
    wednesday: { open: '09:00', close: '18:00', enabled: true },
    thursday:  { open: '09:00', close: '18:00', enabled: true },
    friday:    { open: '09:00', close: '18:00', enabled: true },
    saturday:  { open: '10:00', close: '14:00', enabled: true },
    sunday:    { open: '00:00', close: '00:00', enabled: false },
  },
  primaryCurrency: 'USD', autoExchangeRates: false,
  exchangeRateVES: 36.50, exchangeRateEUR: 0.92,
  deliveryEnabled: true, deliveryFeeUSD: 0, freeDeliveryThresholdUSD: null,
  shippingCostPerKg: 2, minConsolidatedShipping: 3, packagingFeeUSD: 2.5,
  pickupEnabled: true, pickupAddress: '', pickupInstructions: '',
  taxEnabled: false, taxPercent: 0,
  minOrderAmountUSD: null, maxOrderAmountUSD: null,
  maintenanceMode: false, maintenanceMessage: '',
  maintenanceStartTime: '', maintenanceEndTime: '', maintenanceAllowedIPs: '',
  metaTitle: '', metaDescription: '', metaKeywords: '',
  heroVideoEnabled: false, heroVideoUrl: '', heroVideoTitle: '', heroVideoDescription: '',
  maxFeaturedProducts: 8,
  heroTitle: '', heroSubtitle: '', heroButtonText: '', heroButtonLink: '',
  heroBackgroundImage: null,
  showStats: true,
  stat1Label: '', stat1Value: '', stat1Icon: '',
  stat2Label: '', stat2Value: '', stat2Icon: '',
  stat3Label: '', stat3Value: '', stat3Icon: '',
  stat4Label: '', stat4Value: '', stat4Icon: '',
  showCategories: true, maxCategoriesDisplay: 6,
  lowStockThreshold: 10, criticalStockThreshold: 5,
  autoHideOutOfStock: false, notifyLowStock: true, notifyOutOfStock: true,
  ctaEnabled: true, ctaTitle: '', ctaDescription: '', ctaButtonText: '', ctaButtonLink: '',
  hotAdEnabled: false, hotAdImage: null, hotAdTransparentBg: false,
  hotAdShadowEnabled: true, hotAdShadowBlur: 20, hotAdShadowOpacity: 50,
  hotAdBackdropOpacity: 70, hotAdBackdropColor: '#000000', hotAdLink: '',
  adminAlertEmails: '',
  adminAlertEmailList: [],
};

// ─── Shared primitives ───────────────────────────────────────────────────────

function Toggle({
  id, name, checked, onChange, color = 'blue',
}: {
  id: string; name: string; checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'cyan';
}) {
  const colors: Record<string, string> = {
    blue:  'peer-checked:bg-blue-600',
    green: 'peer-checked:bg-green-500',
    amber: 'peer-checked:bg-amber-500',
    red:   'peer-checked:bg-red-500',
    cyan:  'peer-checked:bg-cyan-600',
  };
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className={`w-10 h-5 bg-gray-300 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 ${colors[color]}`} />
    </label>
  );
}

function Card({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60 ${accent || ''}`}>
        <span className="text-gray-500">{icon}</span>
        <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white';
const inputWithIconCls = `${inputCls} pl-9`;

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [formData, setFormData] = useState<SettingsFormData>(DEFAULT_FORM);
  const [initialFormData, setInitialFormData] = useState<SettingsFormData>(DEFAULT_FORM);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [savedTab, setSavedTab] = useState<Tab | null>(null);
  const [adminUsers, setAdminUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  const logoInputRef    = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const heroBgInputRef  = useRef<HTMLInputElement>(null);

  // Per-tab dirty check
  const hasChanges = useMemo(() => {
    const fields = SECTION_FIELDS[activeTab];
    return fields.some(f => JSON.stringify(formData[f]) !== JSON.stringify(initialFormData[f]));
  }, [formData, initialFormData, activeTab]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    if (activeTab === 'sistema') fetchAdminUsers();
  }, [activeTab]);

  const fetchSettings = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();

      let businessHours = DEFAULT_FORM.businessHours;
      if (data.businessHours) {
        try { businessHours = typeof data.businessHours === 'string'
          ? JSON.parse(data.businessHours) : data.businessHours; } catch {}
      }

      const loaded: SettingsFormData = {
        ...DEFAULT_FORM,
        companyName:   data.companyName  || '',
        tagline:       data.tagline      || '',
        rif:           data.rif          || '',
        legalName:     data.legalName    || '',
        foundedYear:   data.foundedYear  || '',
        description:   data.description  || '',
        phone:         data.phone        || '',
        whatsapp:      data.whatsapp     || '',
        email:         data.email        || '',
        address:       data.address      || '',
        logo:          data.logo         || null,
        favicon:       data.favicon      || null,
        primaryColor:  data.primaryColor  || '#2a63cd',
        secondaryColor:data.secondaryColor|| '#1e4ba3',
        instagram:     data.instagram    || '',
        facebook:      data.facebook     || '',
        twitter:       data.twitter      || '',
        youtube:       data.youtube      || '',
        telegram:      data.telegram     || '',
        tiktok:        data.tiktok       || '',
        socialMedia:   [],
        businessHours,
        primaryCurrency:   (data.primaryCurrency  as 'USD'|'VES'|'EUR') || 'USD',
        autoExchangeRates: data.autoExchangeRates ?? false,
        exchangeRateVES:   data.exchangeRateVES   ? Number(data.exchangeRateVES)   : 36.50,
        exchangeRateEUR:   data.exchangeRateEUR   ? Number(data.exchangeRateEUR)   : 0.92,
        deliveryEnabled:   data.deliveryEnabled   ?? true,
        deliveryFeeUSD:    data.deliveryFeeUSD    ? Number(data.deliveryFeeUSD)    : 0,
        freeDeliveryThresholdUSD: data.freeDeliveryThresholdUSD ? Number(data.freeDeliveryThresholdUSD) : null,
        shippingCostPerKg:     data.shippingCostPerKg     ? Number(data.shippingCostPerKg)     : 2,
        minConsolidatedShipping: data.minConsolidatedShipping ? Number(data.minConsolidatedShipping) : 3,
        packagingFeeUSD:       data.packagingFeeUSD       ? Number(data.packagingFeeUSD)       : 2.5,
        pickupEnabled:         data.pickupEnabled         ?? true,
        pickupAddress:         data.pickupAddress         || '',
        pickupInstructions:    data.pickupInstructions    || '',
        taxEnabled:            data.taxEnabled            ?? false,
        taxPercent:            data.taxPercent            ? Number(data.taxPercent)   : 0,
        minOrderAmountUSD:     data.minOrderAmountUSD     ? Number(data.minOrderAmountUSD) : null,
        maxOrderAmountUSD:     data.maxOrderAmountUSD     ? Number(data.maxOrderAmountUSD) : null,
        maintenanceMode:       data.maintenanceMode       ?? false,
        maintenanceMessage:    data.maintenanceMessage    || '',
        maintenanceStartTime:  data.maintenanceStartTime ? new Date(data.maintenanceStartTime).toISOString().slice(0,16) : '',
        maintenanceEndTime:    data.maintenanceEndTime   ? new Date(data.maintenanceEndTime).toISOString().slice(0,16)   : '',
        maintenanceAllowedIPs: data.maintenanceAllowedIPs || '',
        metaTitle:       data.metaTitle       || '',
        metaDescription: data.metaDescription || '',
        metaKeywords:    data.metaKeywords    || '',
        heroVideoEnabled:     data.heroVideoEnabled     ?? false,
        heroVideoUrl:         data.heroVideoUrl         || '',
        heroVideoTitle:       data.heroVideoTitle       || '',
        heroVideoDescription: data.heroVideoDescription || '',
        maxFeaturedProducts:  data.maxFeaturedProducts  ?? 8,
        heroTitle:            data.heroTitle            || '',
        heroSubtitle:         data.heroSubtitle         || '',
        heroButtonText:       data.heroButtonText       || '',
        heroButtonLink:       data.heroButtonLink       || '',
        heroBackgroundImage:  data.heroBackgroundImage  || null,
        showStats:     data.showStats     ?? true,
        stat1Label:    data.stat1Label    || '', stat1Value: data.stat1Value || '', stat1Icon: data.stat1Icon || '',
        stat2Label:    data.stat2Label    || '', stat2Value: data.stat2Value || '', stat2Icon: data.stat2Icon || '',
        stat3Label:    data.stat3Label    || '', stat3Value: data.stat3Value || '', stat3Icon: data.stat3Icon || '',
        stat4Label:    data.stat4Label    || '', stat4Value: data.stat4Value || '', stat4Icon: data.stat4Icon || '',
        showCategories:       data.showCategories       ?? true,
        maxCategoriesDisplay: data.maxCategoriesDisplay ?? 6,
        lowStockThreshold:    data.lowStockThreshold    ?? 10,
        criticalStockThreshold: data.criticalStockThreshold ?? 5,
        autoHideOutOfStock:   data.autoHideOutOfStock   ?? false,
        notifyLowStock:       data.notifyLowStock       ?? true,
        notifyOutOfStock:     data.notifyOutOfStock     ?? true,
        ctaEnabled:     data.ctaEnabled     ?? true,
        ctaTitle:       data.ctaTitle       || '',
        ctaDescription: data.ctaDescription || '',
        ctaButtonText:  data.ctaButtonText  || '',
        ctaButtonLink:  data.ctaButtonLink  || '',
        hotAdEnabled:         data.hotAdEnabled         ?? false,
        hotAdImage:           data.hotAdImage           || null,
        hotAdTransparentBg:   data.hotAdTransparentBg   ?? false,
        hotAdShadowEnabled:   data.hotAdShadowEnabled   ?? true,
        hotAdShadowBlur:      data.hotAdShadowBlur      ?? 20,
        hotAdShadowOpacity:   data.hotAdShadowOpacity   ?? 50,
        hotAdBackdropOpacity: data.hotAdBackdropOpacity ?? 70,
        hotAdBackdropColor:   data.hotAdBackdropColor   || '#000000',
        hotAdLink:            data.hotAdLink            || '',
        adminAlertEmails:     data.adminAlertEmails     || '',
        adminAlertEmailList:  (() => {
          const raw = data.adminAlertEmails;
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } catch {
            return raw.split(',').map((e: string) => e.trim()).filter(Boolean);
          }
        })(),
      };

      setFormData(loaded);
      setInitialFormData(loaded);
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?role=admin');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users || []);
      }
    } catch {}
  };

  const fetchExchangeRates = async () => {
    setLoadingRates(true);
    try {
      const res = await fetch('/api/exchange-rates');
      if (res.ok) {
        const data = await res.json();
        if (data.VES) {
          set('exchangeRateVES', data.VES);
        }
      }
    } catch (e) {
      console.error('Error fetching rates:', e);
    } finally {
      setLoadingRates(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  const handleHoursChange = useCallback((
    day: keyof SettingsFormData['businessHours'],
    field: 'open' | 'close' | 'enabled',
    value: string | boolean,
  ) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value },
      },
    }));
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'favicon' | 'heroBackgroundImage',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB.'); return; }

    const preview = URL.createObjectURL(file);
    set(field, preview as any);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', field);
      const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      if (!res.ok) { alert('Error al subir archivo'); set(field, null as any); return; }
      const { url } = await res.json();
      set(field, url);
    } catch {
      alert('Error de conexión');
      set(field, null as any);
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    setErrors({});

    const fields = SECTION_FIELDS[activeTab];
    const payload: Partial<SettingsFormData> = {};
    fields.forEach(f => { (payload as any)[f] = formData[f]; });

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setInitialFormData(prev => ({ ...prev, ...payload }));
        setSavedTab(activeTab);
        setTimeout(() => setSavedTab(null), 2500);
      } else {
        const err = await res.json();
        setErrors(err.errors || { form: err.error || 'Error al guardar' });
      }
    } catch {
      setErrors({ form: 'Error de conexión' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="flex gap-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-9 bg-gray-200 rounded-lg w-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!session) return null;

  // ── Tab renders ────────────────────────────────────────────────────────────

  const dayLabels: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
  };
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

  const renderGeneral = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left column */}
      <div className="space-y-5">
        <Card title="Información de la Empresa" icon={<FiLayout />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre Empresa" error={errors.company}>
                <input name="companyName" value={formData.companyName} onChange={handleInput} className={inputCls} />
              </Field>
              <Field label="RIF / ID Legal">
                <input name="rif" value={formData.rif} onChange={handleInput} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razón Social">
                <input name="legalName" value={formData.legalName} onChange={handleInput} className={inputCls} />
              </Field>
              <Field label="Año de Fundación">
                <input name="foundedYear" value={formData.foundedYear} onChange={handleInput} placeholder="2015" className={inputCls} />
              </Field>
            </div>
            <Field label="Slogan">
              <input name="tagline" value={formData.tagline} onChange={handleInput} className={inputCls} />
            </Field>
            <Field label="Descripción Corta">
              <textarea name="description" value={formData.description} onChange={handleInput} rows={2} className={`${inputCls} resize-none`} />
            </Field>
          </div>
        </Card>

        <Card title="Branding y Colores" icon={<FiImage />}>
          <div className="space-y-5">
            <div className="flex gap-6">
              {/* Logo */}
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 mb-2">Logo Principal</p>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    {formData.logo
                      ? <Image src={formData.logo} alt="Logo" fill className="object-contain p-1" />
                      : <FiImage className="text-gray-400 w-6 h-6" />}
                  </div>
                  <div className="space-y-1">
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} className="hidden" />
                    <button onClick={() => logoInputRef.current?.click()} className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md transition-colors">Subir</button>
                    {formData.logo && (
                      <button onClick={() => set('logo', null)} className="text-xs text-red-500 hover:text-red-700 block">Quitar</button>
                    )}
                  </div>
                </div>
              </div>
              {/* Favicon */}
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 mb-2">Favicon</p>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => faviconInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    {formData.favicon
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={formData.favicon} alt="Favicon" className="w-full h-full object-contain p-2" />
                      : <FiGlobe className="text-gray-400 w-6 h-6" />}
                  </div>
                  <div className="space-y-1">
                    <input ref={faviconInputRef} type="file" accept="image/*,.ico" onChange={e => handleFileUpload(e, 'favicon')} className="hidden" />
                    <button onClick={() => faviconInputRef.current?.click()} className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md transition-colors">Subir</button>
                    {formData.favicon && (
                      <button onClick={() => set('favicon', null)} className="text-xs text-red-500 hover:text-red-700 block">Quitar</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Color Primario</p>
                <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input type="color" name="primaryColor" value={formData.primaryColor} onChange={handleInput} className="h-8 w-10 rounded cursor-pointer border-0 p-0" />
                  <span className="text-xs text-gray-600 font-mono">{formData.primaryColor}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Color Secundario</p>
                <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input type="color" name="secondaryColor" value={formData.secondaryColor} onChange={handleInput} className="h-8 w-10 rounded cursor-pointer border-0 p-0" />
                  <span className="text-xs text-gray-600 font-mono">{formData.secondaryColor}</span>
                </div>
              </div>
            </div>

            {/* Color preview */}
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <div className="px-4 py-2 text-white text-xs font-semibold flex items-center justify-between" style={{ backgroundColor: formData.primaryColor }}>
                <span>ElectroShop</span>
                <span className="opacity-80">Preview header</span>
              </div>
              <div className="p-3 bg-gray-50 flex items-center gap-2">
                <button className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: formData.primaryColor }}>
                  Ver Productos
                </button>
                <button className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: formData.secondaryColor }}>
                  Comprar ahora
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Redes Sociales" icon={<FiGlobe />}>
          <div className="space-y-3">
            {[
              { name: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/usuario', color: 'from-pink-500 to-purple-600', icon: <FiInstagram /> },
              { name: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/pagina',   color: 'bg-blue-600',                   icon: <FiFacebook /> },
              { name: 'twitter',   label: 'Twitter/X', placeholder: 'https://x.com/usuario',          color: 'bg-black',                      icon: <FiTwitter /> },
              { name: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@canal',     color: 'bg-red-600',                    icon: <FiYoutube /> },
              { name: 'telegram',  label: 'Telegram',  placeholder: 'https://t.me/canal',             color: 'from-cyan-400 to-blue-500',     icon: null },
              { name: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@usuario',    color: 'bg-black',                      icon: null },
            ].map(({ name, label, placeholder, color, icon: SIcon }) => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0 ${color.startsWith('from') ? `bg-gradient-to-br ${color}` : color}`}>
                  {SIcon || <FiGlobe className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{label}</p>
                  <input
                    type="url"
                    name={name}
                    value={(formData as any)[name]}
                    onChange={handleInput}
                    placeholder={placeholder}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                {(formData as any)[name] && (
                  <a href={(formData as any)[name]} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 flex-shrink-0">
                    <FiExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 italic flex items-center gap-1 mt-1">
              <FiAlertTriangle className="w-3 h-3 text-yellow-500" />
              Deja vacío las redes que no uses — solo se muestran las que tengan URL.
            </p>
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        <Card title="Información de Contacto" icon={<FiPhone />}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email Público" error={errors.contact}>
                <div className="relative">
                  <FiMail className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input type="email" name="email" value={formData.email} onChange={handleInput} className={inputWithIconCls} />
                </div>
              </Field>
              <Field label="WhatsApp" hint="+58 412-1234567">
                <div className="relative">
                  <FiSmartphone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleInput} placeholder="+58 412-1234567" className={inputWithIconCls} />
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <div className="relative">
                  <FiPhone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input type="text" name="phone" value={formData.phone} onChange={handleInput} placeholder="+58 257-2511282" className={inputWithIconCls} />
                </div>
              </Field>
              <Field label="Dirección Física">
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input type="text" name="address" value={formData.address} onChange={handleInput} className={inputWithIconCls} />
                </div>
              </Field>
            </div>
            {formData.whatsapp && (
              <a
                href={`https://wa.me/${formData.whatsapp.replace(/\D/g,'')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-green-600 hover:text-green-800 font-medium"
              >
                <FiExternalLink className="w-3.5 h-3.5" />
                Probar número de WhatsApp
              </a>
            )}
          </div>
        </Card>

        <Card title="Horario de Atención" icon={<FiClock />}>
          <div className="space-y-2">
            {days.map(day => (
              <div key={day} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-gray-700 w-24">{dayLabels[day]}</span>
                <Toggle
                  id={`hours-${day}`}
                  name={`hours-${day}`}
                  checked={formData.businessHours[day].enabled}
                  onChange={e => handleHoursChange(day, 'enabled', e.target.checked)}
                  color="green"
                />
                {formData.businessHours[day].enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={formData.businessHours[day].open}
                      onChange={e => handleHoursChange(day, 'open', e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg flex-1"
                    />
                    <span className="text-gray-400 text-xs">—</span>
                    <input
                      type="time"
                      value={formData.businessHours[day].close}
                      onChange={e => handleHoursChange(day, 'close', e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg flex-1"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderTienda = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        <Card title="Monedas y Tasas de Cambio" icon={<FiDollarSign />}>
          <div className="space-y-4">
            <Field label="Moneda Principal">
              <select name="primaryCurrency" value={formData.primaryCurrency} onChange={handleInput} className={inputCls}>
                <option value="USD">USD — Dólar americano</option>
                <option value="VES">VES — Bolívar venezolano</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </Field>

            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto-actualizar tasas</p>
                <p className="text-xs text-gray-500">Usa la API del BCV para la tasa VES</p>
              </div>
              <div className="flex items-center gap-2">
                {formData.autoExchangeRates && (
                  <button
                    onClick={fetchExchangeRates}
                    disabled={loadingRates}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <FiRefreshCw className={`w-3 h-3 ${loadingRates ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                )}
                <Toggle id="autoExchangeRates" name="autoExchangeRates" checked={formData.autoExchangeRates} onChange={handleInput} color="green" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tasa VES (Bs/USD)" error={errors.exchangeRates}>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">Bs</span>
                  <input
                    type="number" name="exchangeRateVES"
                    value={formData.exchangeRateVES} onChange={handleInput}
                    step="0.01" disabled={formData.autoExchangeRates}
                    className={`${inputCls} pl-8 disabled:bg-gray-50 disabled:text-gray-500`}
                  />
                </div>
              </Field>
              <Field label="Tasa EUR">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">€</span>
                  <input type="number" name="exchangeRateEUR" value={formData.exchangeRateEUR} onChange={handleInput} step="0.01" className={`${inputCls} pl-8`} />
                </div>
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Impuestos y Límites" icon={<FiTag />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Habilitar Impuestos (IVA)</p>
                <p className="text-xs text-gray-500">Se aplica al total de la orden</p>
              </div>
              <Toggle id="taxEnabled" name="taxEnabled" checked={formData.taxEnabled} onChange={handleInput} color="blue" />
            </div>

            {formData.taxEnabled && (
              <Field label="Porcentaje de impuesto (%)">
                <input type="number" name="taxPercent" value={formData.taxPercent} onChange={handleInput} min="0" max="30" step="0.01" className={inputCls} />
              </Field>
            )}

            <div className="pt-3 border-t border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Límites de Orden</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monto mínimo (USD)" hint="Vacío = sin límite">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                    <input type="number" name="minOrderAmountUSD" value={formData.minOrderAmountUSD ?? ''} onChange={handleInput} step="0.01" min="0" className={`${inputCls} pl-8`} />
                  </div>
                </Field>
                <Field label="Monto máximo (USD)" hint="Vacío = sin límite">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                    <input type="number" name="maxOrderAmountUSD" value={formData.maxOrderAmountUSD ?? ''} onChange={handleInput} step="0.01" min="0" className={`${inputCls} pl-8`} />
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </Card>

        {/* Link to payments page */}
        <a href="/admin/payments" className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-400 transition-colors group">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
            <FiCreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Métodos de Pago</p>
            <p className="text-xs text-gray-500">Configura Pago Móvil, Zelle, transferencias bancarias y más</p>
          </div>
          <FiExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
        </a>
      </div>

      <div className="space-y-5">
        <Card title="Envío a Domicilio" icon={<FiTruck />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Habilitar envío</p>
                <p className="text-xs text-gray-500">Permite entrega en la dirección del cliente</p>
              </div>
              <Toggle id="deliveryEnabled" name="deliveryEnabled" checked={formData.deliveryEnabled} onChange={handleInput} color="blue" />
            </div>

            {formData.deliveryEnabled && (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Costo/kg (USD)">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                      <input type="number" name="shippingCostPerKg" value={formData.shippingCostPerKg} onChange={handleInput} step="0.01" min="0" className={`${inputCls} pl-6`} />
                    </div>
                  </Field>
                  <Field label="Mínimo (USD)">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                      <input type="number" name="minConsolidatedShipping" value={formData.minConsolidatedShipping} onChange={handleInput} step="0.01" min="0" className={`${inputCls} pl-6`} />
                    </div>
                  </Field>
                  <Field label="Embalaje (USD)">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                      <input type="number" name="packagingFeeUSD" value={formData.packagingFeeUSD} onChange={handleInput} step="0.01" min="0" className={`${inputCls} pl-6`} />
                    </div>
                  </Field>
                </div>

                <Field label="Envío gratis desde (USD)" hint="Vacío = no ofrecer envío gratis">
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">$</span>
                    <input type="number" name="freeDeliveryThresholdUSD" value={formData.freeDeliveryThresholdUSD ?? ''} onChange={handleInput} step="0.01" min="0" placeholder="100.00" className={`${inputCls} pl-8`} />
                  </div>
                </Field>

                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Fórmula de cálculo:</p>
                  <p className="font-mono">(Peso total × ${formData.shippingCostPerKg}/kg) + Envío fijo productos grandes + ${formData.packagingFeeUSD} embalaje</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Retiro en Tienda" icon={<FiMapPin />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Habilitar retiro</p>
                <p className="text-xs text-gray-500">Clientes recogen en el local</p>
              </div>
              <Toggle id="pickupEnabled" name="pickupEnabled" checked={formData.pickupEnabled} onChange={handleInput} color="green" />
            </div>

            {formData.pickupEnabled && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <Field label="Dirección de Retiro">
                  <input type="text" name="pickupAddress" value={formData.pickupAddress} onChange={handleInput} placeholder="Av. Principal, Local #123" className={inputCls} />
                </Field>
                <Field label="Instrucciones de Retiro">
                  <textarea name="pickupInstructions" value={formData.pickupInstructions} onChange={handleInput} rows={2} className={`${inputCls} resize-none`} placeholder="Horario, documentos necesarios, etc." />
                </Field>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderHomepage = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        <Card title="Sección Hero (Portada)" icon={<FiHome />}>
          <div className="space-y-3">
            <Field label="Título Principal">
              <input type="text" name="heroTitle" value={formData.heroTitle} onChange={handleInput} placeholder="Ej: Bienvenido a Electro Shop" className={inputCls} />
            </Field>
            <Field label="Subtítulo">
              <textarea name="heroSubtitle" value={formData.heroSubtitle} onChange={handleInput} rows={2} placeholder="La mejor tecnología al mejor precio" className={`${inputCls} resize-none`} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto del Botón">
                <input type="text" name="heroButtonText" value={formData.heroButtonText} onChange={handleInput} placeholder="Ver Productos" className={inputCls} />
              </Field>
              <Field label="Link del Botón">
                <input type="text" name="heroButtonLink" value={formData.heroButtonLink} onChange={handleInput} placeholder="/productos" className={inputCls} />
              </Field>
            </div>
            <Field label="Imagen de Fondo" hint="PNG/JPG, máx 5MB">
              <div className="flex items-center gap-3">
                {formData.heroBackgroundImage ? (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <Image src={formData.heroBackgroundImage} alt="Hero BG" fill className="object-cover" />
                    <button onClick={() => set('heroBackgroundImage', null)} className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full">
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <input ref={heroBgInputRef} type="file" accept="image/*" onChange={e => handleFileUpload(e, 'heroBackgroundImage')} className="hidden" />
                <button onClick={() => heroBgInputRef.current?.click()} className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md transition-colors">
                  <FiUpload className="w-3.5 h-3.5 inline mr-1" />
                  {formData.heroBackgroundImage ? 'Cambiar' : 'Subir imagen'}
                </button>
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Video de Fondo" icon={<FiVideo />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Activar video</p>
                <p className="text-xs text-gray-500">Se reproduce en bucle sin sonido en el hero</p>
              </div>
              <Toggle id="heroVideoEnabled" name="heroVideoEnabled" checked={formData.heroVideoEnabled} onChange={handleInput} color="blue" />
            </div>
            {formData.heroVideoEnabled && (
              <Field label="URL del Video (YouTube o MP4)" hint="El video reemplaza la imagen de fondo">
                <input type="url" name="heroVideoUrl" value={formData.heroVideoUrl} onChange={handleInput} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
              </Field>
            )}
          </div>
        </Card>

        <Card title="Sección CTA (Llamada a la acción)" icon={<FiLink />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Mostrar sección CTA</p>
              <Toggle id="ctaEnabled" name="ctaEnabled" checked={formData.ctaEnabled} onChange={handleInput} color="blue" />
            </div>
            {formData.ctaEnabled && (
              <>
                <Field label="Título CTA">
                  <input type="text" name="ctaTitle" value={formData.ctaTitle} onChange={handleInput} className={inputCls} />
                </Field>
                <Field label="Descripción">
                  <textarea name="ctaDescription" value={formData.ctaDescription} onChange={handleInput} rows={2} className={`${inputCls} resize-none`} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Texto Botón">
                    <input type="text" name="ctaButtonText" value={formData.ctaButtonText} onChange={handleInput} className={inputCls} />
                  </Field>
                  <Field label="Link Botón">
                    <input type="text" name="ctaButtonLink" value={formData.ctaButtonLink} onChange={handleInput} placeholder="/productos" className={inputCls} />
                  </Field>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Estadísticas del Homepage" icon={<FiBarChart2 />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Mostrar sección de estadísticas</p>
              <Toggle id="showStats" name="showStats" checked={formData.showStats} onChange={handleInput} color="cyan" />
            </div>
            {formData.showStats && (
              <div className="space-y-4 pt-2">
                {([1,2,3,4] as const).map(n => (
                  <div key={n} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Stat {n}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Valor">
                        <input type="text" name={`stat${n}Value`} value={(formData as any)[`stat${n}Value`]} onChange={handleInput} placeholder="500+" className={inputCls} />
                      </Field>
                      <Field label="Etiqueta">
                        <input type="text" name={`stat${n}Label`} value={(formData as any)[`stat${n}Label`]} onChange={handleInput} placeholder="Clientes" className={inputCls} />
                      </Field>
                      <Field label="Ícono" hint="Ej: FiUsers">
                        <input type="text" name={`stat${n}Icon`} value={(formData as any)[`stat${n}Icon`]} onChange={handleInput} placeholder="FiUsers" className={inputCls} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Categorías y Productos" icon={<FiActivity />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Mostrar carrusel de categorías</p>
              <Toggle id="showCategories" name="showCategories" checked={formData.showCategories} onChange={handleInput} color="cyan" />
            </div>
            {formData.showCategories && (
              <Field label="Máximo categorías a mostrar">
                <input type="number" name="maxCategoriesDisplay" value={formData.maxCategoriesDisplay} onChange={handleInput} min="1" max="12" className={inputCls} />
              </Field>
            )}
            <div className="pt-3 border-t border-gray-100">
              <Field label="Máximo productos destacados en portada">
                <input type="number" name="maxFeaturedProducts" value={formData.maxFeaturedProducts} onChange={handleInput} min="2" max="24" className={inputCls} />
              </Field>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderInventario = () => (
    <div className="max-w-xl space-y-5">
      <Card title="Umbrales de Stock" icon={<FiPackage />}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock bajo (alerta amarilla)" hint="Unidades mínimas para mostrar aviso">
              <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleInput} min="1" className={inputCls} />
            </Field>
            <Field label="Stock crítico (alerta roja)" hint="Unidades para mostrar aviso crítico">
              <input type="number" name="criticalStockThreshold" value={formData.criticalStockThreshold} onChange={handleInput} min="1" className={inputCls} />
            </Field>
          </div>

          {formData.lowStockThreshold <= formData.criticalStockThreshold && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
              El umbral crítico debe ser menor al de stock bajo.
            </div>
          )}
        </div>
      </Card>

      <Card title="Comportamiento de Productos" icon={<FiToggleLeft />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Ocultar productos sin stock</p>
              <p className="text-xs text-gray-500">Los productos agotados no aparecen en la tienda</p>
            </div>
            <Toggle id="autoHideOutOfStock" name="autoHideOutOfStock" checked={formData.autoHideOutOfStock} onChange={handleInput} color="amber" />
          </div>
        </div>
      </Card>

      <Card title="Notificaciones de Inventario" icon={<FiActivity />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Notificar stock bajo</p>
              <p className="text-xs text-gray-500">Alerta cuando un producto llega al umbral</p>
            </div>
            <Toggle id="notifyLowStock" name="notifyLowStock" checked={formData.notifyLowStock} onChange={handleInput} color="blue" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Notificar producto agotado</p>
              <p className="text-xs text-gray-500">Alerta cuando el stock llega a 0</p>
            </div>
            <Toggle id="notifyOutOfStock" name="notifyOutOfStock" checked={formData.notifyOutOfStock} onChange={handleInput} color="red" />
          </div>

          {(formData.notifyLowStock || formData.notifyOutOfStock) && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              Las notificaciones aparecerán en el panel admin. Las alertas por email requieren configuración de SMTP en las variables de entorno.
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderSeo = () => {
    const previewTitle = formData.metaTitle || formData.companyName || 'Electro Shop';
    const previewDesc  = formData.metaDescription || 'Tu tienda de tecnología en Venezuela.';
    return (
      <div className="max-w-2xl space-y-5">
        <Card title="Meta Etiquetas SEO" icon={<FiSearch />}>
          <div className="space-y-4">
            <Field label="Meta Título" hint={`${previewTitle.length}/60 caracteres`}>
              <input type="text" name="metaTitle" value={formData.metaTitle} onChange={handleInput} maxLength={60} placeholder={`${formData.companyName} — Tu tienda de tecnología`} className={inputCls} />
            </Field>
            <Field label="Meta Descripción" hint={`${previewDesc.length}/160 caracteres`}>
              <textarea name="metaDescription" value={formData.metaDescription} onChange={handleInput} rows={3} maxLength={160} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Keywords (separadas por coma)" hint="Poco usadas por Google, útiles para Bing">
              <input type="text" name="metaKeywords" value={formData.metaKeywords} onChange={handleInput} placeholder="electrónica, tecnología, venezuela, laptops" className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card title="Vista previa en Google" icon={<FiEye />}>
          <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-1 font-sans">
            <p className="text-[13px] text-gray-500 truncate">electroshopve.com</p>
            <p className="text-[18px] text-blue-700 font-medium leading-tight hover:underline cursor-pointer truncate">{previewTitle}</p>
            <p className="text-[13px] text-gray-600 leading-snug line-clamp-2">{previewDesc}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic">Vista aproximada — Google puede reescribir el título y descripción.</p>
        </Card>
      </div>
    );
  };

  const renderSistema = () => (
    <div className="space-y-5">
      {/* Modo Mantenimiento - Ancho completo */}
      <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${formData.maintenanceMode ? 'bg-amber-50 border-amber-300 shadow-amber-100 shadow-md' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${formData.maintenanceMode ? 'border-amber-200 bg-amber-100/50' : 'border-gray-100 bg-gray-50/60'}`}>
          <div className="flex items-center gap-2">
            <FiAlertTriangle className={`w-5 h-5 ${formData.maintenanceMode ? 'text-amber-600 animate-pulse' : 'text-gray-400'}`} />
            <h3 className={`font-semibold text-sm ${formData.maintenanceMode ? 'text-amber-900' : 'text-gray-800'}`}>
              Modo Mantenimiento
            </h3>
            {formData.maintenanceMode && (
              <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">ACTIVO</span>
            )}
          </div>
          <Toggle
            id="maintenanceMode" name="maintenanceMode"
            checked={formData.maintenanceMode} onChange={handleInput}
            color="amber"
          />
        </div>
        <div className="p-5">
          {!formData.maintenanceMode ? (
            <p className="text-xs text-gray-500">Activa este modo para mostrar una página de mantenimiento a los visitantes. Los administradores siempre pueden acceder al panel.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-100/60 rounded-lg text-xs text-amber-800">
                <FiAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>La tienda está en mantenimiento. Los visitantes verán el mensaje configurado abajo. Los administradores pueden acceder normalmente.</p>
              </div>
              <Field label="Mensaje para visitantes">
                <textarea
                  name="maintenanceMessage" value={formData.maintenanceMessage} onChange={handleInput}
                  rows={3} className={`${inputCls} border-amber-200 resize-none`}
                  placeholder="Estamos realizando mejoras. Volveremos pronto..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inicio programado">
                  <input type="datetime-local" name="maintenanceStartTime" value={formData.maintenanceStartTime} onChange={handleInput} className={`${inputCls} border-amber-200`} />
                </Field>
                <Field label="Fin programado">
                  <input type="datetime-local" name="maintenanceEndTime" value={formData.maintenanceEndTime} onChange={handleInput} className={`${inputCls} border-amber-200`} />
                </Field>
              </div>
              <Field label="IPs permitidas (separadas por coma)" hint="Además de los admins logueados">
                <input type="text" name="maintenanceAllowedIPs" value={formData.maintenanceAllowedIPs} onChange={handleInput} placeholder="192.168.1.1, 10.0.0.1" className={`${inputCls} border-amber-200 font-mono`} />
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* Grid de 2 columnas para el resto de elementos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Columna Izquierda - Administradores del Sistema + Información del Sistema */}
        <div className="space-y-5">
          <Card title="Administradores del Sistema" icon={<FiUsers />}>
            <div className="space-y-3">
              {adminUsers.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No se encontraron administradores</p>
                  <a href="/admin/customers" className="text-xs text-blue-500 hover:underline mt-1 inline-block">Ver todos los usuarios →</a>
                </div>
              ) : (
                <>
                  {adminUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                      </span>
                    </div>
                  ))}
                  <a href="/admin/customers?filter=admin" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                    <FiExternalLink className="w-3 h-3" />
                    Gestionar permisos desde Clientes
                  </a>
                </>
              )}
            </div>
          </Card>

          <Card title="Información del Sistema" icon={<FiSettings />}>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Versión del panel</span>
                <span className="font-mono font-medium">v2.0.0</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Última actualización de settings</span>
                <span className="font-mono">{new Date().toLocaleDateString('es-VE')}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Usuario actual</span>
                <span className="font-medium">{session?.user?.name || session?.user?.email}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna Derecha - Alertas por Email */}
        <div className="space-y-5">
          <Card title="Alertas por Email al Administrador" icon={<FiMail />}>
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Agrega los correos que recibirán alertas en tiempo real cuando ocurran eventos importantes (nueva orden, recarga, solicitud de creador, etc.).
                Todos los correos de esta lista reciben las mismas notificaciones.
              </p>
              <div className="space-y-2">
                {((formData as any).adminAlertEmailList || []).map((email: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <FiMail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...((formData as any).adminAlertEmailList || [])];
                        list.splice(index, 1);
                        setFormData((prev: any) => ({
                          ...prev,
                          adminAlertEmailList: list,
                          adminAlertEmails: JSON.stringify(list),
                        }));
                      }}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    id="newAdminEmail"
                    type="email"
                    placeholder="nuevo@correo.com"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#2a63cd] bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && val.includes('@')) {
                          const list = [...((formData as any).adminAlertEmailList || [])];
                          if (!list.includes(val)) {
                            list.push(val);
                            setFormData((prev: any) => ({
                              ...prev,
                              adminAlertEmailList: list,
                              adminAlertEmails: JSON.stringify(list),
                            }));
                          }
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newAdminEmail') as HTMLInputElement;
                      const val = input?.value.trim();
                      if (val && val.includes('@')) {
                        const list = [...((formData as any).adminAlertEmailList || [])];
                        if (!list.includes(val)) {
                          list.push(val);
                          setFormData((prev: any) => ({
                            ...prev,
                            adminAlertEmailList: list,
                            adminAlertEmails: JSON.stringify(list),
                          }));
                        }
                        if (input) input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                {((formData as any).adminAlertEmailList || []).length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <FiAlertTriangle className="w-3 h-3" />
                    Sin correos configurados. No se enviarán alertas por email.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const tabContent: Record<Tab, React.ReactNode> = {
    general:    renderGeneral(),
    tienda:     renderTienda(),
    homepage:   renderHomepage(),
    inventario: renderInventario(),
    seo:        renderSeo(),
    sistema:    renderSistema(),
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controla todos los aspectos de tu tienda desde aquí</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {isSaving
            ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Guardando...</>
            : savedTab === activeTab
            ? <><FiCheck className="w-4 h-4" /> Guardado</>
            : <><FiSave className="w-4 h-4" /> {hasChanges ? 'Guardar cambios' : 'Sin cambios'}</>
          }
        </button>
      </div>

      {/* Error banner */}
      {errors.form && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2 text-sm">
          <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {errors.form}
        </div>
      )}

      {/* Maintenance active banner */}
      {formData.maintenanceMode && activeTab !== 'sistema' && (
        <div
          onClick={() => setActiveTab('sistema')}
          className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-300 flex items-center gap-2 text-sm cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <FiAlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
          <strong>La tienda está en modo mantenimiento.</strong>
          <span className="text-amber-600 underline ml-auto text-xs">Ver configuración →</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => {
          const tabFields = SECTION_FIELDS[tab.id];
          const isDirty = initialFormData
            ? tabFields.some(f => JSON.stringify(formData[f]) !== JSON.stringify(initialFormData[f]))
            : false;

          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setErrors({}); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <span className="w-4 h-4">{tab.icon}</span>
              {tab.label}
              {isDirty && activeTab !== tab.id && (
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full absolute top-1.5 right-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
