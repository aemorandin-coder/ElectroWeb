'use client';

import { useState, useEffect } from 'react';
import {
    FiBarChart2, FiShoppingCart, FiUsers, FiMousePointer,
    FiShield, FiTrendingUp, FiPackage, FiAlertTriangle,
    FiEye, FiMonitor, FiSmartphone, FiTablet,
    FiGlobe, FiClock, FiRefreshCw
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

export default function ReportsPage() {
    const [period, setPeriod] = useState('7d');
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [products, setProducts] = useState<{ topSelling: Array<{ id: string; name: string; _count: { orderItems: number; reviews: number } }>; requests: Array<{ status: string; _count: number }> } | null>(null);
    const [interactions, setInteractions] = useState<{ byType: Array<{ eventType: string; _count: number }>; byDevice: Array<{ deviceType: string; _count: number }>; topPages: Array<{ page: string; _count: number }> } | null>(null);
    const [security, setSecurity] = useState<{ byType: Array<{ eventType: string; _count: number }>; bySeverity: Array<{ severity: string; _count: number }>; recentLogs: SecurityLog[]; suspiciousIPs: Array<{ ipAddress: string; _count: number }> } | null>(null);

    useEffect(() => {
        fetchData();
    }, [period, activeTab]);

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
        { value: '24h', label: 'Últimas 24 horas' },
        { value: '7d', label: 'Últimos 7 días' },
        { value: '30d', label: 'Últimos 30 días' },
        { value: '90d', label: 'Últimos 90 días' },
        { value: '1y', label: 'Último año' },
    ];

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: FiBarChart2 },
        { id: 'products', label: 'Productos', icon: FiPackage },
        { id: 'interactions', label: 'Interacciones', icon: FiMousePointer },
        { id: 'security', label: 'Seguridad', icon: FiShield },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <FiBarChart2 className="text-blue-600" />
                    Reportes y Analíticas
                </h1>
                <p className="text-gray-600 mt-2">
                    Métricas y estadísticas de tu tienda en tiempo real
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                {/* Tabs */}
                <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Período:</span>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {periodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={fetchData}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && overview && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Users */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Usuarios</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">{overview.users.total}</p>
                                            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                                <FiTrendingUp className="w-4 h-4" />
                                                +{overview.users.new} nuevos
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <FiUsers className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Orders */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Pedidos</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">{overview.orders.total}</p>
                                            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                                <FiTrendingUp className="w-4 h-4" />
                                                +{overview.orders.recent} recientes
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <FiShoppingCart className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Ingresos</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                                ${Number(overview.revenue.total).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">En el período</p>
                                        </div>
                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                            <FiTrendingUp className="w-6 h-6 text-amber-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Products */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Productos</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">{overview.products.total}</p>
                                            <p className="text-sm text-orange-600 mt-1">
                                                {overview.productRequests.pending} solicitudes pendientes
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                            <FiPackage className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Second Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Interactions */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FiMousePointer className="text-blue-600" />
                                        Interacciones
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                                            <FiEye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-gray-900">{overview.interactions.pageViews}</p>
                                            <p className="text-sm text-gray-600">Vistas de página</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4 text-center">
                                            <FiMousePointer className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-gray-900">{overview.interactions.clicks}</p>
                                            <p className="text-sm text-gray-600">Clics</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FiShield className="text-red-600" />
                                        Seguridad
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-yellow-50 rounded-lg p-4 text-center">
                                            <FiAlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-gray-900">{overview.security.total}</p>
                                            <p className="text-sm text-gray-600">Alertas totales</p>
                                        </div>
                                        <div className={`rounded-lg p-4 text-center ${overview.security.critical > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                            <FiShield className={`w-8 h-8 mx-auto mb-2 ${overview.security.critical > 0 ? 'text-red-600' : 'text-green-600'}`} />
                                            <p className="text-2xl font-bold text-gray-900">{overview.security.critical}</p>
                                            <p className="text-sm text-gray-600">Críticas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Tab */}
                    {activeTab === 'products' && products && (
                        <div className="space-y-6">
                            {/* Top Selling Products */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiTrendingUp className="text-green-600" />
                                    Productos Más Vendidos
                                </h3>
                                {products.topSelling.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                                                    <th className="pb-3 font-medium">Producto</th>
                                                    <th className="pb-3 font-medium text-center">Vendidos</th>
                                                    <th className="pb-3 font-medium text-center">Reseñas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {products.topSelling.map((product, index) => (
                                                    <tr key={product.id} className="border-b border-gray-100">
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {index + 1}
                                                                </span>
                                                                <span className="font-medium text-gray-900">{product.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                                                {product._count.orderItems}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <span className="text-gray-600">{product._count.reviews}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No hay datos de ventas aún</p>
                                )}
                            </div>

                            {/* Product Requests by Status */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiPackage className="text-purple-600" />
                                    Solicitudes de Productos por Estado
                                </h3>
                                {products.requests.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {products.requests.map((req) => (
                                            <div key={req.status} className="bg-gray-50 rounded-lg p-4 text-center">
                                                <p className="text-2xl font-bold text-gray-900">{req._count}</p>
                                                <p className="text-sm text-gray-600 capitalize">{req.status.toLowerCase()}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No hay solicitudes de productos</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interactions Tab */}
                    {activeTab === 'interactions' && (
                        <div className="w-full space-y-6">
                            {!interactions || (interactions.byDevice.length === 0 && interactions.byType.length === 0 && interactions.topPages.length === 0) ? (
                                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                                    <FiMousePointer className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No hay datos de interacciones. Los datos se recopilan automáticamente cuando los usuarios navegan por la tienda.</p>
                                </div>
                            ) : (
                                <>
                                    {/* First Row - Device and Browsers side by side */}
                                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Device Types */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <FiMonitor className="text-blue-600" />
                                                Por Dispositivo
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                {interactions.byDevice.length > 0 ? interactions.byDevice.map((device) => {
                                                    const Icon = device.deviceType === 'mobile' ? FiSmartphone :
                                                        device.deviceType === 'tablet' ? FiTablet : FiMonitor;
                                                    return (
                                                        <div key={device.deviceType} className="bg-gray-50 rounded-lg p-4 text-center">
                                                            <Icon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                                            <p className="text-2xl font-bold text-gray-900">{device._count}</p>
                                                            <p className="text-xs text-gray-600 capitalize">{device.deviceType || 'Otro'}</p>
                                                        </div>
                                                    );
                                                }) : <p className="text-gray-500 text-center py-4 col-span-3">Sin datos</p>}
                                            </div>
                                        </div>

                                        {/* Event Types */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <FiMousePointer className="text-green-600" />
                                                Tipos de Eventos
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {interactions.byType.length > 0 ? interactions.byType.map((event) => (
                                                    <div key={event.eventType} className="bg-gray-50 rounded-lg p-4 text-center">
                                                        <p className="text-2xl font-bold text-gray-900">{event._count}</p>
                                                        <p className="text-xs text-gray-600 capitalize">{event.eventType.replace(/_/g, ' ')}</p>
                                                    </div>
                                                )) : <p className="text-gray-500 text-center py-4 col-span-3">Sin datos</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Second Row - Top Pages full width */}
                                    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <FiGlobe className="text-purple-600" />
                                            Páginas Más Visitadas
                                        </h3>
                                        {interactions.topPages.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {interactions.topPages.map((page, index) => (
                                                    <div key={page.page} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                                                                {index + 1}
                                                            </span>
                                                            <span className="font-mono text-sm text-gray-700">{page.page}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-purple-600">{page._count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">No hay datos de páginas visitadas</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && security && (
                        <div className="space-y-6">
                            {/* Severity Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {['info', 'warning', 'critical'].map((sev) => {
                                    const count = security.bySeverity.find(s => s.severity === sev)?._count || 0;
                                    const colors = {
                                        info: 'bg-blue-50 text-blue-600 border-blue-200',
                                        warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
                                        critical: 'bg-red-50 text-red-600 border-red-200',
                                    };
                                    return (
                                        <div key={sev} className={`rounded-xl p-6 border ${colors[sev as keyof typeof colors]}`}>
                                            <p className="text-3xl font-bold">{count}</p>
                                            <p className="text-sm font-medium capitalize">{sev === 'info' ? 'Información' : sev === 'warning' ? 'Advertencias' : 'Críticos'}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Security Events by Type */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiAlertTriangle className="text-yellow-600" />
                                    Eventos por Tipo
                                </h3>
                                {security.byType.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {security.byType.map((type) => (
                                            <div key={type.eventType} className="bg-gray-50 rounded-lg p-4 text-center">
                                                <p className="text-xl font-bold text-gray-900">{type._count}</p>
                                                <p className="text-xs text-gray-600 capitalize">{type.eventType.replace(/_/g, ' ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No se han detectado eventos de seguridad</p>
                                )}
                            </div>

                            {/* Suspicious IPs */}
                            {security.suspiciousIPs.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                                    <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                                        <FiShield className="text-red-600" />
                                        IPs Sospechosas
                                    </h3>
                                    <div className="space-y-2">
                                        {security.suspiciousIPs.map((ip) => (
                                            <div key={ip.ipAddress} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                                <span className="font-mono text-sm text-gray-700">{ip.ipAddress || 'Desconocida'}</span>
                                                <span className="text-sm font-bold text-red-600">{ip._count} intentos</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Logs */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiClock className="text-gray-600" />
                                    Registros Recientes
                                </h3>
                                {security.recentLogs.length > 0 ? (
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                                    <th className="pb-2 font-medium">Fecha</th>
                                                    <th className="pb-2 font-medium">Tipo</th>
                                                    <th className="pb-2 font-medium">Severidad</th>
                                                    <th className="pb-2 font-medium">IP</th>
                                                    <th className="pb-2 font-medium">Descripción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {security.recentLogs.map((log) => (
                                                    <tr key={log.id} className="border-b border-gray-100">
                                                        <td className="py-2 text-gray-600">
                                                            {new Date(log.createdAt).toLocaleString('es-VE')}
                                                        </td>
                                                        <td className="py-2 font-mono text-xs">
                                                            {log.eventType.replace(/_/g, ' ')}
                                                        </td>
                                                        <td className="py-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                                log.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {log.severity}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 font-mono text-xs text-gray-600">
                                                            {log.ipAddress || '-'}
                                                        </td>
                                                        <td className="py-2 text-gray-700 max-w-xs truncate">
                                                            {log.description}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No hay registros de seguridad recientes</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
