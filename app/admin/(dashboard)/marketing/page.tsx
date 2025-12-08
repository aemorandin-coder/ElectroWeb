'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    FiMail, FiSend, FiImage, FiSettings, FiUsers, FiCheck, FiX,
    FiRefreshCw, FiEdit3, FiTrash2, FiPlus, FiEye, FiTarget,
    FiTrendingUp, FiSearch, FiServer, FiCheckCircle,
    FiAlertCircle, FiClock, FiExternalLink
} from 'react-icons/fi';

interface EmailConfig {
    provider: string;
    host: string;
    user: string;
    fromName: string;
    fromEmail: string;
    notificationsEnabled: boolean;
    marketingEnabled: boolean;
}

interface EmailStats {
    subscribers: number;
    emailsSent: number;
    openRate: number;
    clickRate: number;
}

interface Campaign {
    id: string;
    name: string;
    subject: string;
    status: 'draft' | 'scheduled' | 'sent';
    recipients: number;
    openRate?: number;
    clickRate?: number;
    createdAt: string;
    sentAt?: string;
}

interface EmailTemplate {
    id: string;
    name: string;
    description: string;
}

// Preview Tab Component
function PreviewTab() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            fetchPreview(selectedTemplate);
        }
    }, [selectedTemplate]);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/admin/email/preview');
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchPreview = async (templateId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/email/preview?template=${templateId}`);
            const data = await res.json();
            setPreviewHtml(data.html || '');
        } catch (error) {
            console.error('Error fetching preview:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-[#e9ecef] p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center">
                            <FiEye className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-[#212529]">Previsualizar Emails</h2>
                            <p className="text-xs text-[#6a6c6b]">Vista previa de todos los templates con datos de tu empresa</p>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2 bg-[#f8f9fa] p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white shadow text-[#2a63cd]' : 'text-[#6a6c6b]'}`}
                        >
                            Desktop
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white shadow text-[#2a63cd]' : 'text-[#6a6c6b]'}`}
                        >
                            Mobile
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Template Selector */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-[#e9ecef] p-4">
                    <h3 className="font-bold text-sm text-[#212529] mb-3">Seleccionar Template</h3>
                    <div className="space-y-2">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template.id)}
                                className={`w-full text-left p-3 rounded-lg transition-all ${selectedTemplate === template.id
                                    ? 'bg-[#2a63cd]/10 border-[#2a63cd] border'
                                    : 'bg-[#f8f9fa] border border-transparent hover:border-[#e9ecef]'
                                    }`}
                            >
                                <p className={`font-semibold text-sm ${selectedTemplate === template.id ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                                    {template.name}
                                </p>
                                <p className="text-xs text-[#6a6c6b] mt-0.5">{template.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                    <div className="bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] p-3 border-b border-[#e9ecef] flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 text-center">
                            <span className="text-xs text-[#6a6c6b] font-medium">
                                {templates.find(t => t.id === selectedTemplate)?.name || 'Email Preview'}
                            </span>
                        </div>
                    </div>
                    <div className={`bg-[#f4f4f7] p-4 flex justify-center min-h-[600px] overflow-auto`}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-3 border-[#2a63cd] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div
                                className={`bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[650px]'
                                    }`}
                            >
                                <iframe
                                    srcDoc={previewHtml}
                                    className="w-full h-[800px] border-0"
                                    title="Email Preview"
                                    sandbox="allow-same-origin"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-[#2a63cd]/5 to-[#1e4ba3]/5 rounded-xl border border-[#2a63cd]/20 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiAlertCircle className="w-4 h-4 text-[#2a63cd]" />
                    </div>
                    <div>
                        <p className="text-sm text-[#212529] font-medium mb-1">Personalizacion Automatica</p>
                        <p className="text-xs text-[#6a6c6b] leading-relaxed">
                            Los emails utilizan automaticamente la configuracion de tu empresa (logo, colores, contacto)
                            desde Ajustes del panel. Las variables como nombre de usuario y tokens se reemplazan al momento del envio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function MarketingPage() {
    const [activeTab, setActiveTab] = useState<'email' | 'preview' | 'campaigns' | 'settings'>('email');
    const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [campaignForm, setCampaignForm] = useState({
        title: '',
        preheader: '',
        htmlContent: '',
        ctaText: '',
        ctaUrl: '',
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showCampaignModal) {
                setShowCampaignModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showCampaignModal]);

    // Stats computed from real data
    const stats = useMemo<EmailStats>(() => ({
        subscribers: 0, // Will be fetched from API
        emailsSent: 0,
        openRate: 0,
        clickRate: 0,
    }), []);

    useEffect(() => {
        fetchEmailConfig();
    }, []);

    const fetchEmailConfig = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/email');
            if (response.ok) {
                const data = await response.json();
                setEmailConfig(data.config);
            }
        } catch (error) {
            console.error('Error fetching email config:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendTestEmail = async () => {
        if (!testEmail) {
            toast.error('Ingresa un email');
            return;
        }

        setSendingTest(true);
        try {
            const response = await fetch('/api/admin/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'test', email: testEmail }),
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(`Email de prueba enviado a ${testEmail}`);
            } else {
                toast.error(data.error || 'Error al enviar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSendingTest(false);
        }
    };

    const sendCampaign = async () => {
        if (!campaignForm.title || !campaignForm.htmlContent) {
            toast.error('Completa el título y contenido');
            return;
        }

        try {
            const response = await fetch('/api/admin/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'marketing',
                    campaign: campaignForm,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(`Campaña enviada a ${data.recipients} usuarios`);
                setShowCampaignModal(false);
                setCampaignForm({ title: '', preheader: '', htmlContent: '', ctaText: '', ctaUrl: '' });
            } else {
                toast.error(data.error || 'Error al enviar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const tabs = [
        { id: 'email', label: 'Email', icon: FiMail },
        { id: 'preview', label: 'Plantillas', icon: FiEye },
        { id: 'campaigns', label: 'Campanas', icon: FiTarget },
        { id: 'settings', label: 'Configuracion', icon: FiSettings },
    ];

    return (
        <div className="space-y-5">
            {/* Stats Cards - Same style as Orders */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <FiUsers className="w-5 h-5 opacity-80" />
                        <span className="text-xs opacity-70">Suscriptores</span>
                    </div>
                    <p className="text-2xl font-black">{stats.subscribers}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
                    <div className="flex items-center justify-between mb-2">
                        <FiSend className="w-5 h-5 text-[#2a63cd]" />
                        <span className="text-xs text-[#6a6c6b]">Emails Enviados</span>
                    </div>
                    <p className="text-2xl font-black text-[#212529]">{stats.emailsSent}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
                    <div className="flex items-center justify-between mb-2">
                        <FiEye className="w-5 h-5 text-[#2a63cd]" />
                        <span className="text-xs text-[#6a6c6b]">Tasa Apertura</span>
                    </div>
                    <p className="text-2xl font-black text-[#212529]">{stats.openRate}%</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
                    <div className="flex items-center justify-between mb-2">
                        <FiTrendingUp className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs text-[#6a6c6b]">Tasa Clics</span>
                    </div>
                    <p className="text-2xl font-black text-[#212529]">{stats.clickRate}%</p>
                </div>
            </div>

            {/* Tabs & Actions - Same style as Orders */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-[#2a63cd] text-white'
                                    : 'bg-white border border-[#e9ecef] text-[#6a6c6b] hover:border-[#2a63cd]/30'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchEmailConfig}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e9ecef] text-[#6a6c6b] text-sm font-medium rounded-lg hover:border-[#2a63cd]/30 disabled:opacity-50"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowCampaignModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3]"
                    >
                        <FiPlus className="w-4 h-4" />
                        Nueva Campaña
                    </button>
                </div>
            </div>

            {/* EMAIL TAB */}
            {activeTab === 'email' && (
                <div className="space-y-4">
                    {/* Email Config Status - Compact */}
                    <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#e9ecef] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FiServer className="w-4 h-4 text-[#2a63cd]" />
                                <h2 className="font-bold text-sm text-[#212529]">Estado del Servicio</h2>
                            </div>
                            {emailConfig && (
                                <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${emailConfig.host === 'Configurado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {emailConfig.host === 'Configurado' ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
                                    {emailConfig.host === 'Configurado' ? 'Activo' : 'Inactivo'}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-2 border-[#e9ecef]" />
                                    <div className="absolute inset-0 rounded-full border-2 border-[#2a63cd] border-t-transparent animate-spin" />
                                </div>
                            </div>
                        ) : emailConfig ? (
                            <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="text-center p-3 bg-[#f8f9fa] rounded-lg">
                                    <p className="text-[10px] text-[#6a6c6b] uppercase font-semibold mb-0.5">Proveedor</p>
                                    <p className="text-sm font-bold text-[#212529] capitalize">{emailConfig.provider}</p>
                                </div>
                                <div className="text-center p-3 bg-[#f8f9fa] rounded-lg">
                                    <p className="text-[10px] text-[#6a6c6b] uppercase font-semibold mb-0.5">SMTP</p>
                                    <p className="text-sm font-bold text-[#212529]">{emailConfig.host}</p>
                                </div>
                                <div className="text-center p-3 bg-[#f8f9fa] rounded-lg flex items-center justify-center gap-2">
                                    <p className="text-sm font-bold text-[#212529]">Notificaciones</p>
                                    {emailConfig.notificationsEnabled ? (
                                        <FiCheck className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <FiX className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                                <div className="text-center p-3 bg-[#f8f9fa] rounded-lg flex items-center justify-center gap-2">
                                    <p className="text-sm font-bold text-[#212529]">Marketing</p>
                                    {emailConfig.marketingEnabled ? (
                                        <FiCheck className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <FiX className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<FiAlertCircle className="w-6 h-6" />}
                                title="Sin configuración"
                                description="No se pudo cargar la configuración de email"
                            />
                        )}
                    </div>

                    {/* Test Email - Compact */}
                    <div className="bg-white rounded-xl border border-[#e9ecef] p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="Enviar email de prueba a..."
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                            </div>
                            <button
                                onClick={sendTestEmail}
                                disabled={sendingTest || !testEmail}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] disabled:opacity-50 whitespace-nowrap"
                            >
                                {sendingTest ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiSend className="w-4 h-4" />
                                )}
                                Enviar Prueba
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-3">
                        <button className="group bg-white rounded-xl border border-[#e9ecef] p-4 text-left hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FiMail className="w-5 h-5 text-[#2a63cd]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-[#212529]">Notificación</h3>
                                    <p className="text-xs text-[#6a6c6b]">Enviar a usuario</p>
                                </div>
                            </div>
                        </button>
                        <button className="group bg-white rounded-xl border border-[#e9ecef] p-4 text-left hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FiUsers className="w-5 h-5 text-[#2a63cd]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-[#212529]">Email Masivo</h3>
                                    <p className="text-xs text-[#6a6c6b]">A suscriptores</p>
                                </div>
                            </div>
                        </button>
                        <button className="group bg-white rounded-xl border border-[#e9ecef] p-4 text-left hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FiImage className="w-5 h-5 text-[#2a63cd]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-[#212529]">Promoción</h3>
                                    <p className="text-xs text-[#6a6c6b]">Con imágenes</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* PREVIEW TAB */}
            {activeTab === 'preview' && (
                <PreviewTab />
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
                <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                    {campaigns.length === 0 ? (
                        <div className="py-16">
                            <EmptyState
                                icon={<FiTarget className="w-8 h-8" />}
                                title="No hay campañas"
                                description="Crea tu primera campaña de email marketing"
                                action={
                                    <button
                                        onClick={() => setShowCampaignModal(true)}
                                        className="mt-4 px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3]"
                                    >
                                        Crear Campaña
                                    </button>
                                }
                            />
                        </div>
                    ) : (
                        <div className="divide-y divide-[#e9ecef]">
                            {campaigns.map((campaign) => (
                                <div key={campaign.id} className="p-4 hover:bg-[#f8f9fa] transition-colors flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center">
                                        <FiTarget className="w-5 h-5 text-[#2a63cd]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-[#212529]">{campaign.name}</h3>
                                        <p className="text-xs text-[#6a6c6b] truncate">{campaign.subject}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${campaign.status === 'sent' ? 'bg-emerald-50 text-emerald-700' :
                                        campaign.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {campaign.status === 'sent' ? 'Enviado' : campaign.status === 'scheduled' ? 'Programado' : 'Borrador'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button className="p-1.5 hover:bg-[#e9ecef] rounded-lg">
                                            <FiEye className="w-4 h-4 text-[#6a6c6b]" />
                                        </button>
                                        <button className="p-1.5 hover:bg-[#e9ecef] rounded-lg">
                                            <FiEdit3 className="w-4 h-4 text-[#6a6c6b]" />
                                        </button>
                                        <button className="p-1.5 hover:bg-red-50 rounded-lg">
                                            <FiTrash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e9ecef]">
                        <h2 className="font-bold text-sm text-[#212529]">Configuración de Email</h2>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <FiAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                                La configuración SMTP se realiza mediante variables de entorno en el archivo <code className="bg-amber-100 px-1 rounded">.env</code>
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-sm text-[#212529] mb-3">Notificaciones Automáticas</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Al crear pedido', enabled: true },
                                    { label: 'Cambio de estado', enabled: true },
                                    { label: 'Pago confirmado', enabled: true },
                                    { label: 'Envío actualizado', enabled: true },
                                    { label: 'Reseña aprobada', enabled: false },
                                    { label: 'Bienvenida', enabled: true },
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                                        <span className="text-xs font-medium text-[#212529]">{item.label}</span>
                                        <div className={`w-8 h-5 rounded-full relative cursor-pointer transition-colors ${item.enabled ? 'bg-[#2a63cd]' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.enabled ? 'right-0.5' : 'left-0.5'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Modal */}
            {showCampaignModal && mounted && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        padding: '20px',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowCampaignModal(false);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            width: '100%',
                            maxWidth: '700px',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                        }}
                    >
                        <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-white text-lg">Nueva Campana</h2>
                            <button
                                onClick={() => setShowCampaignModal(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            <div>
                                <label className="block text-sm font-semibold text-[#212529] mb-2">Titulo de la Campana</label>
                                <input
                                    type="text"
                                    value={campaignForm.title}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                                    placeholder="Ej: Ofertas de Navidad 2024"
                                    className="w-full px-4 py-3 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#212529] mb-2">Pre-encabezado</label>
                                <input
                                    type="text"
                                    value={campaignForm.preheader}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, preheader: e.target.value })}
                                    placeholder="Texto que aparece junto al asunto en la bandeja"
                                    className="w-full px-4 py-3 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#212529] mb-2">Contenido HTML</label>
                                <textarea
                                    value={campaignForm.htmlContent}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, htmlContent: e.target.value })}
                                    placeholder="<p>Tu contenido aqui...</p>"
                                    rows={6}
                                    className="w-full px-4 py-3 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#212529] mb-2">Texto del Boton</label>
                                    <input
                                        type="text"
                                        value={campaignForm.ctaText}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, ctaText: e.target.value })}
                                        placeholder="Ver Ofertas"
                                        className="w-full px-4 py-3 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#212529] mb-2">URL del Boton</label>
                                    <input
                                        type="url"
                                        value={campaignForm.ctaUrl}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, ctaUrl: e.target.value })}
                                        placeholder="https://tu-sitio.com/ofertas"
                                        className="w-full px-4 py-3 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e9ecef] flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowCampaignModal(false)}
                                className="px-4 py-2 text-sm text-[#6a6c6b] hover:text-[#212529] font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={sendCampaign}
                                className="flex items-center gap-2 px-6 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3]"
                            >
                                <FiSend className="w-4 h-4" />
                                Enviar Campana
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
