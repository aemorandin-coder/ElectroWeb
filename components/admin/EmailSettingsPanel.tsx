'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    FiMail, FiLock, FiServer, FiCheck, FiX, FiRefreshCw,
    FiSend, FiAlertCircle, FiCheckCircle, FiSettings,
    FiEye, FiEyeOff, FiInfo, FiZap, FiShield, FiBell,
    FiGlobe, FiCloud, FiInbox, FiMessageSquare, FiTarget,
    FiAtSign, FiBox
} from 'react-icons/fi';

interface EmailSettingsData {
    provider: string;
    smtpHost: string | null;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPassword: string | null;
    hasPassword: boolean;
    fromName: string | null;
    fromEmail: string | null;
    replyTo: string | null;
    notificationsEnabled: boolean;
    marketingEnabled: boolean;
    transactionalEnabled: boolean;
    isConfigured: boolean;
    lastTestAt: string | null;
    lastTestStatus: string | null;
    lastTestError: string | null;
    dailyLimit: number;
    sentToday: number;
}

interface ProviderPreset {
    host: string;
    port: number;
    secure: boolean;
}

interface ProviderInfoType {
    name: string;
    icon: React.ReactNode;
    description: string;
}

const PROVIDER_INFO: Record<string, ProviderInfoType> = {
    godaddy: {
        name: 'GoDaddy',
        icon: <FiGlobe className="w-5 h-5" />,
        description: 'Email profesional',
    },
    gmail: {
        name: 'Gmail',
        icon: <FiAtSign className="w-5 h-5" />,
        description: 'Google Workspace',
    },
    outlook: {
        name: 'Outlook',
        icon: <FiMessageSquare className="w-5 h-5" />,
        description: 'Microsoft 365',
    },
    yahoo: {
        name: 'Yahoo',
        icon: <FiInbox className="w-5 h-5" />,
        description: 'Yahoo Mail',
    },
    zoho: {
        name: 'Zoho',
        icon: <FiCloud className="w-5 h-5" />,
        description: 'Zoho Mail',
    },
    custom: {
        name: 'Personalizado',
        icon: <FiSettings className="w-5 h-5" />,
        description: 'SMTP Custom',
    },
};

export default function EmailSettingsPanel() {
    const [settings, setSettings] = useState<EmailSettingsData | null>(null);
    const [presets, setPresets] = useState<Record<string, ProviderPreset>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [formData, setFormData] = useState<Partial<EmailSettingsData>>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/email/settings');
            if (response.ok) {
                const data = await response.json();
                setSettings(data.settings);
                setPresets(data.presets);
                setFormData(data.settings);
            }
        } catch (error) {
            console.error('Error fetching email settings:', error);
            toast.error('Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (provider: string) => {
        const preset = presets[provider];
        if (preset) {
            setFormData({
                ...formData,
                provider,
                smtpHost: preset.host,
                smtpPort: preset.port,
                smtpSecure: preset.secure,
            });
        } else {
            setFormData({ ...formData, provider });
        }
        setHasChanges(true);
    };

    const handleInputChange = (field: keyof EmailSettingsData, value: any) => {
        setFormData({ ...formData, [field]: value });
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!hasChanges) return;

        setSaving(true);
        try {
            const response = await fetch('/api/admin/email/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data.settings);
                setFormData(data.settings);
                setHasChanges(false);
                toast.success('Configuración guardada exitosamente');
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const response = await fetch('/api/admin/email/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test', testEmail }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchSettings();
            } else {
                toast.error(data.error || 'Error en la prueba');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <FiRefreshCw className="w-6 h-6 text-[#2a63cd] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Status Card - Compact */}
            <div className={`relative overflow-hidden rounded-xl p-4 ${settings?.isConfigured
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        {settings?.isConfigured ? (
                            <FiCheckCircle className="w-5 h-5 text-white" />
                        ) : (
                            <FiAlertCircle className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-white">
                            {settings?.isConfigured ? 'Email Configurado' : 'Configuración Pendiente'}
                        </h2>
                        <p className="text-white/80 text-xs truncate">
                            {settings?.isConfigured
                                ? `${PROVIDER_INFO[settings.provider]?.name || settings.provider} • ${settings.lastTestStatus === 'success' ? 'Test OK' : 'Sin verificar'}`
                                : 'Configura tu servidor SMTP'
                            }
                        </p>
                    </div>
                    {settings?.isConfigured && settings.lastTestAt && (
                        <div className="text-right text-white/70 text-[10px]">
                            <p className="font-medium text-white">
                                {new Date(settings.lastTestAt).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                })}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Provider Selection - Compact Grid */}
            <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e9ecef] flex items-center gap-2">
                    <FiServer className="w-4 h-4 text-[#2a63cd]" />
                    <h3 className="font-bold text-sm text-[#212529]">Proveedor de Email</h3>
                </div>
                <div className="p-3">
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                        {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => handleProviderChange(key)}
                                className={`group relative p-3 rounded-lg border-2 transition-all text-center ${formData.provider === key
                                    ? 'border-[#2a63cd] bg-[#2a63cd]/5'
                                    : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                                    }`}
                            >
                                {formData.provider === key && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#2a63cd] rounded-full flex items-center justify-center">
                                        <FiCheck className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                                <div className={`mx-auto mb-1.5 w-8 h-8 rounded-lg flex items-center justify-center ${formData.provider === key
                                    ? 'bg-[#2a63cd] text-white'
                                    : 'bg-[#f8f9fa] text-[#2a63cd]'
                                    }`}>
                                    {info.icon}
                                </div>
                                <h4 className="font-semibold text-xs text-[#212529]">{info.name}</h4>
                                <p className="text-[10px] text-[#6a6c6b] mt-0.5">{info.description}</p>
                            </button>
                        ))}
                    </div>

                    {/* Provider tip */}
                    {formData.provider === 'godaddy' && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                            <FiInfo className="w-4 h-4 text-[#2a63cd] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[#2a63cd]">
                                <strong>GoDaddy:</strong> Usa tu correo profesional. Puerto 465 (SSL) o 587 (TLS).
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* SMTP Configuration - Compact */}
            <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e9ecef] flex items-center gap-2">
                    <FiSettings className="w-4 h-4 text-[#2a63cd]" />
                    <h3 className="font-bold text-sm text-[#212529]">Configuración SMTP</h3>
                </div>
                <div className="p-3 space-y-3">
                    {/* Host, Port, SSL in one row */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6">
                            <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                                Servidor SMTP
                            </label>
                            <input
                                type="text"
                                value={formData.smtpHost || ''}
                                onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                                placeholder="smtpout.secureserver.net"
                                className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                                Puerto
                            </label>
                            <input
                                type="number"
                                value={formData.smtpPort || 465}
                                onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                                className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                            />
                        </div>
                        <div className="col-span-4 flex items-end">
                            <button
                                onClick={() => handleInputChange('smtpSecure', !formData.smtpSecure)}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${formData.smtpSecure
                                    ? 'border-[#2a63cd] bg-[#2a63cd]/5 text-[#2a63cd]'
                                    : 'border-[#e9ecef] text-[#6a6c6b]'
                                    }`}
                            >
                                <FiShield className="w-4 h-4" />
                                <span className="text-sm font-medium">SSL/TLS</span>
                                {formData.smtpSecure && <FiCheck className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Credentials */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                                Usuario / Email
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
                                <input
                                    type="email"
                                    value={formData.smtpUser || ''}
                                    onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                                    placeholder="correo@tudominio.com"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.smtpPassword || ''}
                                    onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                                    placeholder={settings?.hasPassword ? '••••••••' : 'Contraseña'}
                                    className="w-full pl-9 pr-10 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6c6b] hover:text-[#212529]"
                                >
                                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* From Details - Compact */}
            <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e9ecef] flex items-center gap-2">
                    <FiMail className="w-4 h-4 text-[#2a63cd]" />
                    <h3 className="font-bold text-sm text-[#212529]">Remitente</h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={formData.fromName || ''}
                            onChange={(e) => handleInputChange('fromName', e.target.value)}
                            placeholder="Electro Shop"
                            className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.fromEmail || ''}
                            onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                            placeholder="info@dominio.com"
                            className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide mb-1">
                            Responder A
                        </label>
                        <input
                            type="email"
                            value={formData.replyTo || ''}
                            onChange={(e) => handleInputChange('replyTo', e.target.value)}
                            placeholder="soporte@dominio.com"
                            className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                        />
                    </div>
                </div>
            </div>

            {/* Email Types Toggle - Compact Horizontal */}
            <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e9ecef] flex items-center gap-2">
                    <FiZap className="w-4 h-4 text-[#2a63cd]" />
                    <h3 className="font-bold text-sm text-[#212529]">Tipos de Email</h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2">
                    {[
                        { key: 'notificationsEnabled', icon: FiBell, title: 'Notificaciones', desc: 'Pedidos y envíos' },
                        { key: 'transactionalEnabled', icon: FiShield, title: 'Transaccionales', desc: 'Contraseñas' },
                        { key: 'marketingEnabled', icon: FiTarget, title: 'Marketing', desc: 'Promociones' },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isEnabled = formData[item.key as keyof EmailSettingsData];
                        return (
                            <button
                                key={item.key}
                                onClick={() => handleInputChange(item.key as keyof EmailSettingsData, !isEnabled)}
                                className={`relative p-3 rounded-lg border-2 transition-all text-left ${isEnabled
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-[#e9ecef] hover:border-[#e9ecef]'
                                    }`}
                            >
                                {isEnabled && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <FiCheck className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-emerald-500 text-white' : 'bg-[#f8f9fa] text-[#2a63cd]'
                                        }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-xs text-[#212529]">{item.title}</h4>
                                        <p className="text-[10px] text-[#6a6c6b]">{item.desc}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Test Connection - Compact */}
            <div className="bg-[#f8f9fa] rounded-xl border border-[#e9ecef] p-3">
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Email de prueba (opcional)"
                            className="flex-1 px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] bg-white"
                        />
                        <button
                            onClick={handleTest}
                            disabled={testing || !settings?.smtpHost}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {testing ? (
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <FiSend className="w-4 h-4" />
                            )}
                            Probar
                        </button>
                    </div>
                </div>

                {/* Test Result */}
                {settings?.lastTestStatus && (
                    <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${settings.lastTestStatus === 'success'
                        ? 'bg-emerald-100'
                        : 'bg-red-100'
                        }`}>
                        {settings.lastTestStatus === 'success' ? (
                            <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <FiX className="w-4 h-4 text-red-600" />
                        )}
                        <p className={`text-xs font-medium ${settings.lastTestStatus === 'success' ? 'text-emerald-800' : 'text-red-800'
                            }`}>
                            {settings.lastTestStatus === 'success' ? 'Conexión exitosa' : settings.lastTestError || 'Error'}
                        </p>
                    </div>
                )}
            </div>

            {/* Save Button - Compact */}
            <div className="flex items-center justify-end gap-3">
                {hasChanges && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        Sin guardar
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <FiCheck className="w-4 h-4" />
                    )}
                    Guardar
                </button>
            </div>
        </div>
    );
}
