'use client';

import { useState, useEffect } from 'react';
import {
    FiBarChart2, FiShoppingCart, FiUsers, FiMousePointer,
    FiShield, FiTrendingUp, FiPackage, FiAlertTriangle,
    FiEye, FiMonitor, FiSmartphone, FiTablet,
    FiGlobe, FiClock, FiRefreshCw, FiActivity, FiZap
} from 'react-icons/fi';

interface OverviewData {
    users: { total: number; new: number };
    orders: { total: number; recent: number };
    products: { total: number };
    productRequests: { total: number; pending: number };
    interactions: { pageViews: number; clicks: number };
    security: { total: number; critical: number };
    revenue: { total: number };
}

interface SecurityLog {
    id: string;
    eventType: string;
    severity: string;
    ipAddress: string | null;
    description: string;
    createdAt: string;
}

interface LiveUsersData {
    liveCount: number;
    authenticatedCount: number;
    devices: Record<string, number>;
    topPages: Array<{ page: string; count: number }>;
}

export default function ReportsPage() {
    const [period, setPeriod] = useState('7d');
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [products, setProducts] = useState<{ topSelling: Array<{ id: string; name: string; _count: { orderItems: number; reviews: number } }>; requests: Array<{ status: string; _count: number }> } | null>(null);
    const [interactions, setInteractions] = useState<{ byType: Array<{ eventType: string; _count: number }>; byDevice: Array<{ deviceType: string; _count: number }>; topPages: Array<{ page: string; _count: number }> } | null>(null);
    const [security, setSecurity] = useState<{ byType: Array<{ eventType: string; _count: number }>; bySeverity: Array<{ severity: string; _count: number }>; recentLogs: SecurityLog[]; suspiciousIPs: Array<{ ipAddress: string; _count: number }> } | null>(null);
    const [liveUsers, setLiveUsers] = useState<LiveUsersData | null>(null);

    useEffect(() => {
        fetchData();
    }, [period, activeTab]);

    useEffect(() => {
        fetchLiveUsers();
        const interval = setInterval(fetchLiveUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchLiveUsers = async () => {
        try {
            const response = await fetch('/api/admin/live-users');
            if (response.ok) {
                const data = await response.json();
                setLiveUsers(data);
            }
        } catch (error) {
            console.error('Error fetching live users:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/reports?period=${period}&type=${activeTab}`);
            if (response.ok) {
                const data = await response.json();
                if (activeTab === 'overview') setOverview(data.overview);
                if (activeTab === 'products') setProducts(data.products);
                if (activeTab === 'interactions') setInteractions(data.interactions);
                if (activeTab === 'security') setSecurity(data.security);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const periodOptions = [
        { value: '24h', label: '24h' },
        { value: '7d', label: '7 días' },
        { value: '30d', label: '30 días' },
        { value: '90d', label: '90 días' },
        { value: '1y', label: '1 año' },
    ];

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: FiBarChart2 },
        { id: 'products', label: 'Productos', icon: FiPackage },
        { id: 'interactions', label: 'Interacciones', icon: FiMousePointer },
        { id: 'security', label: 'Seguridad', icon: FiShield },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {/* Header - Compact */}
            <div className="mb-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center shadow-md">
                        <FiBarChart2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Reportes y Analíticas</h1>
                        <p className="text-xs text-gray-500">Métricas en tiempo real</p>
                    </div>
                </div>
            </div>

            {/* Live Users Counter - Compact */}
            <div className="mb-4 animate-slideInRight">
                <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-3 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FiActivity className="w-5 h-5 text-white" />
                                </div>
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                            </div>
                            <div>
                                <p className="text-blue-100 text-[10px] font-medium uppercase tracking-wide">En vivo ahora</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-white">
                                        {liveUsers?.liveCount ?? '...'}
                                    </span>
                                    <span className="text-emerald-200 text-xs">activos</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            <div className="text-center px-3 border-l border-white/20">
                                <p className="text-lg font-bold text-white">{liveUsers?.authenticatedCount ?? 0}</p>
                                <p className="text-[10px] text-blue-200">Logueados</p>
                            </div>
                            <div className="flex items-center gap-2 px-3 border-l border-white/20">
                                <div className="text-center">
                                    <FiMonitor className="w-3.5 h-3.5 text-blue-200 mx-auto" />
                                    <p className="text-xs font-bold text-white">{liveUsers?.devices?.desktop ?? 0}</p>
                                </div>
                                <div className="text-center">
                                    <FiSmartphone className="w-3.5 h-3.5 text-blue-200 mx-auto" />
                                    <p className="text-xs font-bold text-white">{liveUsers?.devices?.mobile ?? 0}</p>
                                </div>
                                <div className="text-center">
                                    <FiTablet className="w-3.5 h-3.5 text-blue-200 mx-auto" />
                                    <p className="text-xs font-bold text-white">{liveUsers?.devices?.tablet ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {liveUsers?.topPages && liveUsers.topPages.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                            <div className="flex flex-wrap gap-1.5">
                                {liveUsers.topPages.slice(0, 4).map((page, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/15 rounded text-[10px] text-white font-mono">
                                        {page.page} <span className="text-emerald-300">({page.count})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls - Compact */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                <div className="flex gap-0.5 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-gray-200">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="text-xs bg-transparent border-0 focus:ring-0 text-gray-600 pr-6"
                    >
                        {periodOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchData}
                        className="p-1 text-gray-400 hover:text-[#2a63cd] rounded transition-colors"
                    >
                        <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 rounded-full border-3 border-gray-200 border-t-[#2a63cd] animate-spin" />
                </div>
            ) : (
                <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && overview && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Users */}
                                <div className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">Clientes</p>
                                            <p className="text-2xl font-bold text-gray-800">{overview.users.total}</p>
                                            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                                <FiTrendingUp className="w-3 h-3" />+{overview.users.new} nuevos
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FiUsers className="w-5 h-5 text-[#2a63cd]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Orders */}
                                <div className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">Pedidos</p>
                                            <p className="text-2xl font-bold text-gray-800">{overview.orders.total}</p>
                                            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                                <FiTrendingUp className="w-3 h-3" />+{overview.orders.recent} recientes
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FiShoppingCart className="w-5 h-5 text-[#2a63cd]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue */}
                                <div className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">Ingresos</p>
                                            <p className="text-xl font-bold text-gray-800">
                                                ${Number(overview.revenue.total).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[10px] text-gray-400">En el período</p>
                                        </div>
                                        <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FiTrendingUp className="w-5 h-5 text-[#2a63cd]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Products */}
                                <div className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#2a63cd]/30 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">Productos</p>
                                            <p className="text-2xl font-bold text-gray-800">{overview.products.total}</p>
                                            <p className="text-[10px] text-amber-600">{overview.productRequests.pending} solicitudes</p>
                                        </div>
                                        <div className="w-10 h-10 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FiPackage className="w-5 h-5 text-[#2a63cd]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Interactions */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                            <FiMousePointer className="w-3 h-3 text-[#2a63cd]" />
                                        </div>
                                        Interacciones
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-lg p-3 text-center group hover:bg-[#2a63cd]/5 transition-colors">
                                            <FiEye className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
                                            <p className="text-xl font-bold text-gray-800">{overview.interactions.pageViews}</p>
                                            <p className="text-[10px] text-gray-500">Vistas</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center group hover:bg-[#2a63cd]/5 transition-colors">
                                            <FiMousePointer className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
                                            <p className="text-xl font-bold text-gray-800">{overview.interactions.clicks}</p>
                                            <p className="text-[10px] text-gray-500">Clics</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                            <FiShield className="w-3 h-3 text-[#2a63cd]" />
                                        </div>
                                        Seguridad
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <FiAlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                                            <p className="text-xl font-bold text-gray-800">{overview.security.total}</p>
                                            <p className="text-[10px] text-gray-500">Alertas</p>
                                        </div>
                                        <div className={`rounded-lg p-3 text-center ${overview.security.critical > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                            <FiShield className={`w-5 h-5 mx-auto mb-1 ${overview.security.critical > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                                            <p className="text-xl font-bold text-gray-800">{overview.security.critical}</p>
                                            <p className="text-[10px] text-gray-500">Críticas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Tab */}
                    {activeTab === 'products' && products && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                                        <FiTrendingUp className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    Top Productos
                                </h3>
                                {products.topSelling.length > 0 ? (
                                    <div className="space-y-2">
                                        {products.topSelling.slice(0, 5).map((product, index) => (
                                            <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-[#2a63cd]/5 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 bg-[#2a63cd] text-white rounded text-[10px] font-bold flex items-center justify-center">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{product.name}</span>
                                                </div>
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                    {product._count.orderItems} vendidos
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>
                                )}
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                        <FiPackage className="w-3 h-3 text-[#2a63cd]" />
                                    </div>
                                    Solicitudes por Estado
                                </h3>
                                {products.requests.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {products.requests.map((req) => (
                                            <div key={req.status} className="bg-gray-50 rounded-lg p-3 text-center hover:bg-[#2a63cd]/5 transition-colors">
                                                <p className="text-lg font-bold text-gray-800">{req._count}</p>
                                                <p className="text-[10px] text-gray-500 capitalize">{req.status.toLowerCase()}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-4">Sin solicitudes</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interactions Tab */}
                    {activeTab === 'interactions' && (
                        <div className="space-y-4 animate-fadeIn">
                            {!interactions || (interactions.byDevice.length === 0 && interactions.byType.length === 0 && interactions.topPages.length === 0) ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                                    <FiMousePointer className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">No hay datos de interacciones aún</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                                    <FiMonitor className="w-3 h-3 text-[#2a63cd]" />
                                                </div>
                                                Dispositivos
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                {interactions.byDevice.length > 0 ? interactions.byDevice.map((device) => {
                                                    const Icon = device.deviceType === 'mobile' ? FiSmartphone :
                                                        device.deviceType === 'tablet' ? FiTablet : FiMonitor;
                                                    return (
                                                        <div key={device.deviceType} className="bg-gray-50 rounded-lg p-3 text-center hover:bg-[#2a63cd]/5 transition-colors">
                                                            <Icon className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
                                                            <p className="text-lg font-bold text-gray-800">{device._count}</p>
                                                            <p className="text-[10px] text-gray-500 capitalize">{device.deviceType || 'Otro'}</p>
                                                        </div>
                                                    );
                                                }) : <p className="text-xs text-gray-400 text-center col-span-3">Sin datos</p>}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                                    <FiZap className="w-3 h-3 text-[#2a63cd]" />
                                                </div>
                                                Eventos
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                {interactions.byType.length > 0 ? interactions.byType.slice(0, 6).map((event) => (
                                                    <div key={event.eventType} className="bg-gray-50 rounded-lg p-2 text-center hover:bg-[#2a63cd]/5 transition-colors">
                                                        <p className="text-lg font-bold text-gray-800">{event._count}</p>
                                                        <p className="text-[10px] text-gray-500 capitalize truncate">{event.eventType.replace(/_/g, ' ')}</p>
                                                    </div>
                                                )) : <p className="text-xs text-gray-400 text-center col-span-3">Sin datos</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                                <FiGlobe className="w-3 h-3 text-[#2a63cd]" />
                                            </div>
                                            Páginas Más Visitadas
                                        </h3>
                                        {interactions.topPages.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {interactions.topPages.map((page, index) => (
                                                    <div key={page.page} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-[#2a63cd]/5 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 bg-[#2a63cd] text-white rounded text-[10px] font-bold flex items-center justify-center">
                                                                {index + 1}
                                                            </span>
                                                            <span className="font-mono text-[10px] text-gray-600 truncate max-w-[120px]">{page.page}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-[#2a63cd]">{page._count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && security && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-3 gap-3">
                                {['info', 'warning', 'critical'].map((sev) => {
                                    const count = security.bySeverity.find(s => s.severity === sev)?._count || 0;
                                    const config = {
                                        info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-[#2a63cd]', label: 'Info' },
                                        warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', label: 'Advertencias' },
                                        critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', label: 'Críticos' },
                                    };
                                    const c = config[sev as keyof typeof config];
                                    return (
                                        <div key={sev} className={`${c.bg} rounded-xl p-4 border ${c.border} hover:scale-105 transition-transform`}>
                                            <p className={`text-2xl font-bold ${c.text}`}>{count}</p>
                                            <p className="text-[10px] text-gray-600">{c.label}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center">
                                        <FiAlertTriangle className="w-3 h-3 text-amber-600" />
                                    </div>
                                    Eventos por Tipo
                                </h3>
                                {security.byType.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {security.byType.map((type) => (
                                            <div key={type.eventType} className="bg-gray-50 rounded-lg p-3 text-center hover:bg-[#2a63cd]/5 transition-colors">
                                                <p className="text-lg font-bold text-gray-800">{type._count}</p>
                                                <p className="text-[10px] text-gray-500 capitalize truncate">{type.eventType.replace(/_/g, ' ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-4">Sin eventos</p>
                                )}
                            </div>

                            {security.suspiciousIPs.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
                                    <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                                            <FiShield className="w-3 h-3 text-red-600" />
                                        </div>
                                        IPs Sospechosas
                                    </h3>
                                    <div className="space-y-1.5">
                                        {security.suspiciousIPs.slice(0, 5).map((ip) => (
                                            <div key={ip.ipAddress} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                                <span className="font-mono text-[10px] text-gray-700">{ip.ipAddress || 'Desconocida'}</span>
                                                <span className="text-[10px] font-bold text-red-600">{ip._count} intentos</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-[#2a63cd]/10 rounded flex items-center justify-center">
                                        <FiClock className="w-3 h-3 text-[#2a63cd]" />
                                    </div>
                                    Registros Recientes
                                </h3>
                                {security.recentLogs.length > 0 ? (
                                    <div className="overflow-x-auto max-h-64">
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                                    <th className="pb-2 font-medium">Fecha</th>
                                                    <th className="pb-2 font-medium">Tipo</th>
                                                    <th className="pb-2 font-medium">Nivel</th>
                                                    <th className="pb-2 font-medium">IP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {security.recentLogs.slice(0, 10).map((log) => (
                                                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="py-2 text-gray-600">
                                                            {new Date(log.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </td>
                                                        <td className="py-2 font-mono">{log.eventType.replace(/_/g, ' ')}</td>
                                                        <td className="py-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                                log.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-[#2a63cd]'
                                                                }`}>{log.severity}</span>
                                                        </td>
                                                        <td className="py-2 font-mono text-gray-500">{log.ipAddress || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-4">Sin registros</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(-15px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                .animate-slideInRight { animation: slideInRight 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
}
