'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    FiMail, FiLock, FiServer, FiCheck, FiX, FiRefreshCw,
    FiSend, FiAlertCircle, FiCheckCircle, FiSettings,
    FiEye, FiEyeOff, FiInfo, FiShield,
    FiGlobe, FiCloud, FiInbox, FiMessageSquare, FiTarget,
    FiAtSign
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
                <FiRefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Status Card - Compact */}
            <div className={`relative overflow-hidden rounded-xl p-4 ${settings?.isConfigured
                ? 'bg-success'
                : 'bg-warning'
                }`}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
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
                        <div className="text-right text-white/70 text-xs">
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
            <div className="bg-white rounded-xl border border-line overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
                    <FiServer className="w-4 h-4 text-brand-500" />
                    <h3 className="font-bold text-sm text-ink">Proveedor de Email</h3>
                </div>
                <div className="p-3">
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                        {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => handleProviderChange(key)}
                                className={`group relative p-3 rounded-lg border-2 transition-all text-center ${formData.provider === key
                                    ? 'border-brand-500 bg-brand-500/5'
                                    : 'border-line hover:border-brand-500/30'
                                    }`}
                            >
                                {formData.provider === key && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                                        <FiCheck className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                                <div className={`mx-auto mb-1.5 w-8 h-8 rounded-lg flex items-center justify-center ${formData.provider === key
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-surface text-brand-500'
                                    }`}>
                                    {info.icon}
                                </div>
                                <h4 className="font-semibold text-xs text-ink">{info.name}</h4>
                                <p className="text-xs text-muted mt-0.5">{info.description}</p>
                            </button>
                        ))}
                    </div>

                    {/* Provider tip */}
                    {formData.provider === 'godaddy' && (
                        <div className="mt-3 bg-brand-50 border border-brand-200 rounded-lg p-2.5 flex items-start gap-2">
                            <FiInfo className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-brand-500">
                                <strong>GoDaddy:</strong> Usa tu correo profesional. Puerto 465 (SSL) o 587 (TLS).
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* SMTP Configuration - Compact */}
            <div className="bg-white rounded-xl border border-line overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
                    <FiSettings className="w-4 h-4 text-brand-500" />
                    <h3 className="font-bold text-sm text-ink">Configuración SMTP</h3>
                </div>
                <div className="p-3 space-y-3">
                    {/* Host, Port, SSL in one row */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6">
                            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                                Servidor SMTP
                            </label>
                            <input
                                type="text"
                                value={formData.smtpHost || ''}
                                onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                                placeholder="smtpout.secureserver.net"
                                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                                Puerto
                            </label>
                            <input
                                type="number"
                                value={formData.smtpPort || 465}
                                onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                        <div className="col-span-4 flex items-end">
                            <button
                                onClick={() => handleInputChange('smtpSecure', !formData.smtpSecure)}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${formData.smtpSecure
                                    ? 'border-brand-500 bg-brand-500/5 text-brand-500'
                                    : 'border-line text-muted'
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
                            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                                Usuario / Email
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    type="email"
                                    value={formData.smtpUser || ''}
                                    onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                                    placeholder="correo@tudominio.com"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.smtpPassword || ''}
                                    onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                                    placeholder={settings?.hasPassword ? '••••••••' : 'Contraseña'}
                                    className="w-full pl-9 pr-10 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                >
                                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* From Details - Compact */}
            <div className="bg-white rounded-xl border border-line overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
                    <FiMail className="w-4 h-4 text-brand-500" />
                    <h3 className="font-bold text-sm text-ink">Remitente</h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={formData.fromName || ''}
                            onChange={(e) => handleInputChange('fromName', e.target.value)}
                            placeholder="Electro Shop"
                            className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.fromEmail || ''}
                            onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                            placeholder="info@dominio.com"
                            className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                            Responder A
                        </label>
                        <input
                            type="email"
                            value={formData.replyTo || ''}
                            onChange={(e) => handleInputChange('replyTo', e.target.value)}
                            placeholder="soporte@dominio.com"
                            className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                </div>
            </div>

            {/* Campañas (C-75). "Notificaciones" y "Transaccionales" se quitaron: el envío nunca los consultaba */}
            <div className="bg-white rounded-xl border border-line overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
                    <FiTarget className="w-4 h-4 text-brand-500" />
                    <h3 className="font-bold text-sm text-ink">Campañas de marketing</h3>
                </div>
                <div className="p-4 grid gap-4 sm:grid-cols-2">
                    <label className="flex items-start justify-between gap-3 rounded-lg border border-line p-3 cursor-pointer">
                        <span>
                            <span className="block text-sm font-semibold text-ink">Correos de marketing</span>
                            <span className="block text-xs text-muted">Permite enviar campañas desde Marketing a los clientes que aceptaron promociones. Los correos de pedidos y contraseñas salen siempre.</span>
                        </span>
                        <input
                            type="checkbox"
                            checked={Boolean(formData.marketingEnabled)}
                            onChange={(e) => handleInputChange('marketingEnabled', e.target.checked)}
                            className="mt-1 h-5 w-5 shrink-0 accent-brand-500"
                        />
                    </label>
                    <div>
                        <label htmlFor="correo-limite" className="block text-xs font-bold text-muted uppercase tracking-wide mb-1">
                            Límite de correos de campaña por día
                        </label>
                        <input
                            id="correo-limite"
                            type="number"
                            min={1}
                            max={10000}
                            value={formData.dailyLimit ?? 500}
                            onChange={(e) => handleInputChange('dailyLimit', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                        <p className="mt-1 text-xs text-muted">Al llegar al límite la campaña se pausa y se reanuda al día siguiente. GoDaddy y Gmail suelen permitir entre 250 y 500.</p>
                    </div>
                </div>
            </div>

            {/* Test Connection - Compact */}
            <div className="bg-surface rounded-xl border border-line p-3">
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Email de prueba (opcional)"
                            className="flex-1 px-3 py-2 text-sm border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                        />
                        <button
                            onClick={handleTest}
                            disabled={testing || !settings?.smtpHost}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                        ? 'bg-success/10'
                        : 'bg-deal/10'
                        }`}>
                        {settings.lastTestStatus === 'success' ? (
                            <FiCheckCircle className="w-4 h-4 text-success-strong" />
                        ) : (
                            <FiX className="w-4 h-4 text-deal" />
                        )}
                        <p className={`text-xs font-medium ${settings.lastTestStatus === 'success' ? 'text-success-strong' : 'text-deal'
                            }`}>
                            {settings.lastTestStatus === 'success' ? 'Conexión exitosa' : settings.lastTestError || 'Error'}
                        </p>
                    </div>
                )}
            </div>

            {/* Save Button - Compact */}
            <div className="flex items-center justify-end gap-3">
                {hasChanges && (
                    <span className="text-xs text-warning-strong bg-warning/10 px-2 py-1 rounded-full">
                        Sin guardar
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
