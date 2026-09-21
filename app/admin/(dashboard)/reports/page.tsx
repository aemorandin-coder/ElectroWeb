'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    FiBarChart2, FiShoppingCart, FiUsers, FiMousePointer,
    FiShield, FiTrendingUp, FiPackage, FiAlertTriangle,
    FiEye, FiMonitor, FiSmartphone, FiTablet,
    FiGlobe, FiClock, FiRefreshCw, FiActivity, FiList,
    FiGift, FiDollarSign, FiCheckCircle, FiAward, FiDownload
} from 'react-icons/fi';
import { adminTab, adminTableWrap, adminTable, adminTh, adminTd, adminRowHover, adminPageHeader, adminPageTitle, adminPageSubtitle, adminInput, adminIconButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, PieChart, Pie, Cell
} from 'recharts';

interface OverviewData {
    users: { total: number; new: number };
    orders: { total: number; recent: number };
    products: { total: number };
    productRequests: { total: number; pending: number };
    interactions: { pageViews: number; clicks: number };
    security: { total: number; critical: number };
    revenue: { total: number };
    dailyData: Array<{ date: string; sales: number; orders: number; users: number }>;
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

const formatChartDate = (value: string) => format(new Date(`${value.slice(0, 10)}T12:00:00`), 'd MMM', { locale: es });

export default function ReportsPage() {
    const [mounted, setMounted] = useState(false);
    const [period, setPeriod] = useState('7d');
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [products, setProducts] = useState<{ topSelling: Array<{ id: string; name: string; _count: { orderItems: number; reviews: number } }>; requests: Array<{ status: string; _count: number }> } | null>(null);
    const [interactions, setInteractions] = useState<{ byType: Array<{ eventType: string; _count: number }>; byDevice: Array<{ deviceType: string; _count: number }>; topPages: Array<{ page: string; _count: number }>; daily: Array<{ date: string; count: number }> } | null>(null);
    const [security, setSecurity] = useState<{ byType: Array<{ eventType: string; _count: number }>; bySeverity: Array<{ severity: string; _count: number }>; recentLogs: SecurityLog[]; suspiciousIPs: Array<{ ipAddress: string; _count: number }> } | null>(null);
    const [referrals, setReferrals] = useState<{
        totalInfluencers: number;
        activeInfluencers: number;
        pausedInfluencers: number;
        conversionsByStatus: Array<{ status: string; _count: number; _sum: { commission: number; grossAmount: number } }>;
        approvedRevenue: { gross: number; commission: number };
        topInfluencers: Array<{ id: string; name: string; code: string; status: string; totalCommission: number; totalGross: number; conversionsCount: number }>;
    } | null>(null);
    const [liveUsers, setLiveUsers] = useState<LiveUsersData | null>(null);

    useEffect(() => {
        fetchData();
    }, [period, activeTab]);

    useEffect(() => {
        setMounted(true);
        fetchLiveUsers();
        const interval = setInterval(fetchLiveUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    async function fetchLiveUsers() {
        try {
            const response = await fetch('/api/admin/live-users');
            if (response.ok) {
                const data = await response.json();
                setLiveUsers(data);
            }
        } catch (error) {
            console.error('Error fetching live users:', error);
            toast.error('No se pudieron cargar los usuarios en vivo');
        }
    }

    async function fetchData() {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/reports?period=${period}&type=${activeTab}`);
            if (response.ok) {
                const data = await response.json();
                if (activeTab === 'overview') setOverview(data.overview);
                if (activeTab === 'products') setProducts(data.products);
                if (activeTab === 'interactions') setInteractions(data.interactions);
                if (activeTab === 'security') setSecurity(data.security);
                if (activeTab === 'referrals') setReferrals(data.referrals);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('No se pudieron cargar los reportes');
        } finally {
            setLoading(false);
        }
    }

    const exportToCSV = () => {
        let csvContent = "";
        const fileName = `reporte-${activeTab}-${period}.csv`;

        if (activeTab === 'overview' && overview) {
            csvContent = "Fecha,Ventas (USD),Pedidos,Nuevos Clientes\n" + 
                (overview.dailyData || []).map(d => `${d.date},${d.sales},${d.orders},${d.users}`).join("\n");
        } else if (activeTab === 'products' && products) {
            csvContent = "Producto,Ventas Realizadas\n" + 
                products.topSelling.map(p => `"${p.name.replace(/"/g, '""')}",${p._count.orderItems}`).join("\n");
        } else if (activeTab === 'interactions' && interactions) {
            csvContent = "Pagina,Vistas\n" + 
                interactions.topPages.map(p => `"${p.page.replace(/"/g, '""')}",${p._count}`).join("\n");
        } else if (activeTab === 'security' && security) {
            csvContent = "Fecha,Evento,Severidad,IP,Descripcion\n" + 
                security.recentLogs.map(l => `${new Date(l.createdAt).toISOString()},${l.eventType},${l.severity},${l.ipAddress || ''},"${(l.description || '').replace(/"/g, '""')}"`).join("\n");
        } else if (activeTab === 'referrals' && referrals) {
            csvContent = "Nombre,Codigo,Estado,Comisiones Acumuladas (USD),Ventas Brutas (USD),Conversiones\n" + 
                referrals.topInfluencers.map(i => `"${i.name.replace(/"/g, '""')}",${i.code},${i.status},${i.totalCommission},${i.totalGross},${i.conversionsCount}`).join("\n");
        }

        if (!csvContent) return;

        // Add BOM for Excel compatibility with UTF-8
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        { id: 'referrals', label: 'Referidos', icon: FiGift },
    ];

    return (
        <div className="min-w-0 space-y-4">
            <div className={adminPageHeader}>
                <div>
                    <h1 className={adminPageTitle}>Reportes</h1>
                    <p className={adminPageSubtitle}>Ventas, pedidos y actividad del período</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="min-w-0 overflow-x-auto border-b border-line pb-2 pr-6" role="tablist" aria-label="Secciones de reportes">
                    <div className="flex w-max gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                                    role="tab" aria-selected={activeTab === tab.id}
                                    className={adminTab(activeTab === tab.id)}>
                                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <p className="text-xs text-muted lg:hidden">Desliza las pestañas para ver más secciones.</p>
                <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="report-period" className="sr-only">Período del reporte</label>
                    <select id="report-period" value={period} onChange={(e) => setPeriod(e.target.value)}
                        className={`${adminInput()} w-32`}>
                        {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <button type="button" onClick={fetchData} className={`${adminIconButton} h-11 w-11 border border-line bg-white`}
                        aria-label="Actualizar reporte" title="Actualizar reporte">
                        <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={exportToCSV} className={adminSecondaryButton} aria-label="Exportar reporte a CSV">
                        <FiDownload className="h-4 w-4" aria-hidden="true" /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 rounded-full border-3 border-line border-t-brand-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && overview && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {/* Revenue */}
                                <div className="col-span-2 min-w-0 rounded-xl border border-line bg-white p-3 sm:p-4 lg:col-span-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted">Ingresos</p>
                                            <p className="whitespace-nowrap text-base font-bold tabular-nums text-ink sm:text-xl">
                                                {formatUSD(Number(overview.revenue.total))}
                                            </p>
                                            <p className="text-xs text-subtle">En el período</p>
                                        </div>
                                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 sm:flex">
                                            <FiTrendingUp className="w-5 h-5 text-brand-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Users */}
                                <div className="min-w-0 rounded-xl border border-line bg-white p-3 sm:p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted">Clientes</p>
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.users.total}</p>
                                            <p className="text-xs text-success-strong flex items-center gap-0.5">
                                                <FiTrendingUp className="w-3 h-3" />+{overview.users.new} nuevos
                                            </p>
                                        </div>
                                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 sm:flex">
                                            <FiUsers className="w-5 h-5 text-brand-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Orders */}
                                <div className="min-w-0 rounded-xl border border-line bg-white p-3 sm:p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted">Pedidos</p>
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.orders.total}</p>
                                            <p className="text-xs text-success-strong flex items-center gap-0.5">
                                                <FiTrendingUp className="w-3 h-3" />+{overview.orders.recent} recientes
                                            </p>
                                        </div>
                                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 sm:flex">
                                            <FiShoppingCart className="w-5 h-5 text-brand-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Products */}
                                <div className="col-span-2 min-w-0 rounded-xl border border-line bg-white p-3 sm:p-4 lg:col-span-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted">Productos</p>
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.products.total}</p>
                                            <p className="text-xs text-warning-strong">{overview.productRequests.pending} solicitudes</p>
                                        </div>
                                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 sm:flex">
                                            <FiPackage className="w-5 h-5 text-brand-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Visualizations Card */}
                            {mounted && overview.dailyData && overview.dailyData.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-line p-5 space-y-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-ink-soft mb-1 flex items-center gap-2">
                                            <FiTrendingUp className="w-4 h-4 text-brand-500" />
                                            Tendencias del Período
                                        </h3>
                                        <p className="text-xs text-muted">Visualización de ingresos, pedidos y nuevos registros de clientes</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Sales Area Chart */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted">Ventas e Ingresos (USD)</p>
                                            <div className="h-52 w-full sm:h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={overview.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.2}/>
                                                                <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                        <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} tickFormatter={formatChartDate} />
                                                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                        <Tooltip 
                                                            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                            formatter={(value) => [`${formatUSD(Number(value))}`, 'Ventas']}
                                                        />
                                                        <Area type="monotone" dataKey="sales" stroke="var(--color-brand-500)" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Orders and Users Line Chart */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted">Pedidos y Nuevos Clientes</p>
                                            <div className="h-52 w-full sm:h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={overview.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                        <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} tickFormatter={formatChartDate} />
                                                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                        <Tooltip 
                                                            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                        />
                                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                                        <Line type="monotone" dataKey="orders" name="Pedidos" stroke="var(--color-warning-strong)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                        <Line type="monotone" dataKey="users" name="Nuevos Clientes" stroke="var(--color-success-strong)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Interactions */}
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                            <FiMousePointer className="w-3 h-3 text-brand-500" />
                                        </div>
                                        Interacciones
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="border-r border-line pr-3 text-center last:border-r-0">
                                            <FiEye className="w-5 h-5 text-brand-500 mx-auto mb-1" />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.interactions.pageViews}</p>
                                            <p className="text-xs text-muted">Vistas</p>
                                        </div>
                                        <div className="border-r border-line pr-3 text-center last:border-r-0">
                                            <FiMousePointer className="w-5 h-5 text-brand-500 mx-auto mb-1" />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.interactions.clicks}</p>
                                            <p className="text-xs text-muted">Clics</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                            <FiShield className="w-3 h-3 text-brand-500" />
                                        </div>
                                        Seguridad
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="border-r border-line pr-3 text-center last:border-r-0">
                                            <FiAlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.security.total}</p>
                                            <p className="text-xs text-muted">Alertas</p>
                                        </div>
                                        <div className={`pr-3 text-center ${overview.security.critical > 0 ? 'text-deal' : 'text-success-strong'}`}>
                                            <FiShield className={`w-5 h-5 mx-auto mb-1 ${overview.security.critical > 0 ? 'text-deal' : 'text-success'}`} />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.security.critical}</p>
                                            <p className="text-xs text-muted">Críticas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Tab */}
                    {activeTab === 'products' && products && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Top Selling Products Chart */}
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-success/10 rounded flex items-center justify-center">
                                            <FiTrendingUp className="w-3 h-3 text-success-strong" />
                                        </div>
                                        Top Productos Vendidos
                                    </h3>
                                    {mounted && products.topSelling.length > 0 ? (
                                        <div className="h-52 w-full sm:h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart 
                                                    data={products.topSelling.map(p => ({
                                                        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
                                                        ventas: p._count.orderItems
                                                    }))}
                                                    layout="vertical"
                                                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                                                    <XAxis type="number" stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                    <YAxis dataKey="name" type="category" stroke="var(--color-muted)" fontSize={11} tickLine={false} width={100} />
                                                    <Tooltip 
                                                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                    />
                                                    <Bar dataKey="ventas" fill="var(--color-success-strong)" radius={[0, 4, 4, 0]} barSize={12} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-subtle text-center py-12">Sin datos de ventas</p>
                                    )}
                                </div>

                                {/* Request Status Pie Chart */}
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                            <FiPackage className="w-3 h-3 text-brand-500" />
                                        </div>
                                        Solicitudes de Creadores por Estado
                                    </h3>
                                    {mounted && products.requests.length > 0 ? (
                                        <div className="h-64 flex flex-col md:flex-row items-center justify-center gap-6">
                                            <div className="h-48 w-48">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={products.requests}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={4}
                                                            dataKey="_count"
                                                            nameKey="status"
                                                        >
                                                            {products.requests.map((entry, index) => {
                                                                const colors = {
                                                                    PENDING: 'var(--color-warning)',
                                                                    APPROVED: 'var(--color-success)',
                                                                    REJECTED: 'var(--color-danger)'
                                                                };
                                                                const color = colors[entry.status as keyof typeof colors] || 'var(--color-muted)';
                                                                return <Cell key={`cell-${index}`} fill={color} />;
                                                            })}
                                                        </Pie>
                                                        <Tooltip 
                                                            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="space-y-2">
                                                {products.requests.map((entry) => {
                                                    const labels = {
                                                        PENDING: 'Pendientes',
                                                        APPROVED: 'Aprobadas',
                                                        REJECTED: 'Rechazadas'
                                                    };
                                                    const colors = {
                                                        PENDING: 'bg-warning',
                                                        APPROVED: 'bg-success',
                                                        REJECTED: 'bg-deal'
                                                    };
                                                    const label = labels[entry.status as keyof typeof labels] || entry.status;
                                                    const colorCls = colors[entry.status as keyof typeof colors] || 'bg-muted';
                                                    return (
                                                        <div key={entry.status} className="flex items-center gap-2 text-xs">
                                                            <span className={`w-3 h-3 rounded-full ${colorCls}`} />
                                                            <span className="font-medium text-muted">{label}:</span>
                                                            <span className="font-bold text-ink">{entry._count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-subtle text-center py-12">Sin solicitudes</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3">Detalle de Ventas</h3>
                                    {products.topSelling.length > 0 ? (
                                        <div className="space-y-2">
                                            {products.topSelling.slice(0, 5).map((product, index) => (
                                                <div key={product.id} className="flex items-center justify-between p-2 bg-surface rounded-lg hover:bg-brand-500/5 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 bg-brand-500 text-white rounded text-xs font-bold flex items-center justify-center">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-xs font-medium text-ink-soft truncate max-w-[180px]">{product.name}</span>
                                                    </div>
                                                    <span className="bg-success/10 text-success-strong px-2 py-0.5 rounded text-xs font-semibold">
                                                        {product._count.orderItems} vendidos
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-subtle text-center py-4">Sin datos</p>
                                    )}
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3">Solicitudes por Estado</h3>
                                    {products.requests.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {products.requests.map((req) => (
                                                <div key={req.status} className="bg-surface rounded-lg p-3 text-center hover:bg-brand-500/5 transition-colors">
                                                    <p className="text-lg font-bold text-ink">{req._count}</p>
                                                    {(() => {
    const statusLabels: Record<string, string> = {
        PENDING: 'Pendiente',
        IN_PROGRESS: 'En progreso',
        FULFILLED: 'Cumplida',
        REJECTED: 'Rechazada',
    };
    return <p className="text-xs text-muted">{statusLabels[req.status] || req.status}</p>;
})()}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-subtle text-center py-4">Sin solicitudes</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Interactions Tab */}
                    {activeTab === 'interactions' && (
                        <div className="space-y-4 animate-fadeIn">
                            {!interactions || (interactions.byDevice.length === 0 && interactions.byType.length === 0 && interactions.topPages.length === 0) ? (
                                <div className="bg-white rounded-xl shadow-sm border border-line p-6 text-center">
                                    <FiMousePointer className="w-8 h-8 text-subtle mx-auto mb-2" />
                                    <p className="text-xs text-subtle">No hay datos de interacciones aún</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Daily Interactions Trend Chart */}
                                        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                            <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                                <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                                    <FiActivity className="w-3 h-3 text-brand-500" />
                                                </div>
                                                Tendencia de Interacciones Diarias
                                            </h3>
                                            {mounted && interactions.daily && interactions.daily.length > 0 ? (
                                                <div className="h-52 w-full sm:h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={interactions.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.2}/>
                                                                    <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                            <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} tickFormatter={formatChartDate} />
                                                            <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                            <Tooltip 
                                                                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                            />
                                                            <Area type="monotone" dataKey="count" stroke="var(--color-brand-500)" strokeWidth={2} fillOpacity={1} fill="url(#colorInteractions)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-subtle text-center py-12">Sin datos diarios</p>
                                            )}
                                        </div>

                                        {/* Device Distribution Pie Chart */}
                                        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                            <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                                <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                                    <FiMonitor className="w-3 h-3 text-brand-500" />
                                                </div>
                                                Distribución por Dispositivos
                                            </h3>
                                            {mounted && interactions.byDevice.length > 0 ? (
                                                <div className="h-64 flex flex-col md:flex-row items-center justify-center gap-6">
                                                    <div className="h-48 w-48">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={interactions.byDevice}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={60}
                                                                    outerRadius={80}
                                                                    paddingAngle={4}
                                                                    dataKey="_count"
                                                                    nameKey="deviceType"
                                                                >
                                                                    {interactions.byDevice.map((entry, index) => {
                                                                        const colors = ['var(--color-brand-500)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-accent)'];
                                                                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                                    })}
                                                                </Pie>
                                                                <Tooltip 
                                                                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                                />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {interactions.byDevice.map((entry, index) => {
                                                            const colors = ['bg-brand-500', 'bg-success', 'bg-warning', 'bg-info'];
                                                            const labels: Record<string, string> = {
                                                                desktop: 'Computadora',
                                                                mobile: 'Móvil',
                                                                tablet: 'Tableta'
                                                            };
                                                            return (
                                                                <div key={entry.deviceType} className="flex items-center gap-2 text-xs">
                                                                    <span className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                                                                    <span className="font-medium text-muted capitalize">{labels[entry.deviceType] || entry.deviceType || 'Otro'}:</span>
                                                                    <span className="font-bold text-ink">{entry._count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-subtle text-center py-12">Sin datos de dispositivos</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                            <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                                <FiMonitor className="w-3 h-3 text-brand-500" />
                                                Dispositivos (Detalle)
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                {interactions.byDevice.length > 0 ? interactions.byDevice.map((device) => {
                                                    const Icon = device.deviceType === 'mobile' ? FiSmartphone :
                                                        device.deviceType === 'tablet' ? FiTablet : FiMonitor;
                                                    return (
                                                        <div key={device.deviceType} className="bg-surface rounded-lg p-3 text-center hover:bg-brand-500/5 transition-colors">
                                                            <Icon className="w-5 h-5 text-brand-500 mx-auto mb-1" />
                                                            <p className="text-lg font-bold text-ink">{device._count}</p>
                                                            <p className="text-xs text-muted capitalize">{device.deviceType || 'Otro'}</p>
                                                        </div>
                                                    );
                                                }) : <p className="text-xs text-subtle text-center col-span-3">Sin datos</p>}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                            <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                                <FiList className="w-3 h-3 text-brand-500" />
                                                Eventos
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                {interactions.byType.length > 0 ? interactions.byType.slice(0, 6).map((event) => (
                                                    <div key={event.eventType} className="bg-surface rounded-lg p-2 text-center hover:bg-brand-500/5 transition-colors">
                                                        <p className="text-lg font-bold text-ink">{event._count}</p>
                                                        <p className="text-xs text-muted capitalize truncate">{event.eventType.replace(/_/g, ' ')}</p>
                                                    </div>
                                                )) : <p className="text-xs text-subtle text-center col-span-3">Sin datos</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                        <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                            <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                                <FiGlobe className="w-3 h-3 text-brand-500" />
                                            </div>
                                            Páginas Más Visitadas
                                        </h3>
                                        {interactions.topPages.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {interactions.topPages.map((page, index) => (
                                                    <div key={page.page} className="flex items-center justify-between p-2 bg-surface rounded-lg hover:bg-brand-500/5 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 bg-brand-500 text-white rounded text-xs font-bold flex items-center justify-center">
                                                                {index + 1}
                                                            </span>
                                                            <span className="font-mono text-xs text-muted truncate max-w-[120px]">{page.page}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-brand-500">{page._count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-subtle text-center py-4">Sin datos</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Referrals Tab */}
                    {activeTab === 'referrals' && referrals && (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Influencer counts */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Influencers Totales', value: referrals.totalInfluencers, Icon: FiUsers, color: 'text-brand-500', bg: 'bg-brand-500/10' },
                                    { label: 'Activos', value: referrals.activeInfluencers, Icon: FiCheckCircle, color: 'text-success-strong', bg: 'bg-success/5' },
                                    { label: 'Pausados', value: referrals.pausedInfluencers, Icon: FiActivity, color: 'text-warning-strong', bg: 'bg-warning/10' },
                                ].map((card) => (
                                    <div key={card.label} className={`min-w-0 rounded-xl border border-line bg-white p-3 sm:p-4 ${card.label === 'Influencers Totales' ? 'col-span-2 sm:col-span-1' : ''}`}>
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                                                <card.Icon className={`w-3.5 h-3.5 ${card.color}`} />
                                            </div>
                                            <span className="text-xs text-subtle uppercase font-medium">{card.label}</span>
                                        </div>
                                        <p className="text-xl font-bold tabular-nums text-ink">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Revenue cards */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FiShoppingCart className="w-4 h-4 text-success-strong" />
                                        <span className="text-xs text-success-strong uppercase font-semibold">Ventas por referidos</span>
                                    </div>
                                    <p className="whitespace-nowrap text-xl font-bold tabular-nums text-success-strong">
                                        {formatUSD(Number(referrals.approvedRevenue.gross))}
                                    </p>
                                    <p className="text-xs text-success-strong mt-0.5">Monto bruto · período seleccionado</p>
                                </div>
                                <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FiDollarSign className="w-4 h-4 text-brand-500" />
                                        <span className="text-xs text-brand-500 uppercase font-semibold">Comisiones pagadas</span>
                                    </div>
                                    <p className="whitespace-nowrap text-xl font-bold tabular-nums text-brand-600">
                                        {formatUSD(Number(referrals.approvedRevenue.commission))}
                                    </p>
                                    <p className="text-xs text-brand-500/70 mt-0.5">Comisiones aprobadas · período seleccionado</p>
                                </div>
                            </div>

                            {/* Visualizations Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Influencer Commission Comparison Chart */}
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-warning/15 rounded flex items-center justify-center">
                                            <FiAward className="w-3 h-3 text-warning-strong" />
                                        </div>
                                        Comisiones de Influencers (USD)
                                    </h3>
                                    {mounted && referrals.topInfluencers.length > 0 ? (
                                        <div className="h-52 w-full sm:h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart 
                                                    data={referrals.topInfluencers.map(i => ({
                                                        name: i.name.length > 12 ? i.name.substring(0, 12) + '...' : i.name,
                                                        comision: i.totalCommission
                                                    }))}
                                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                    <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                    <Tooltip 
                                                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                        formatter={(value) => [`${formatUSD(Number(value))}`, 'Comisión']}
                                                    />
                                                    <Bar dataKey="comision" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} barSize={15} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-subtle text-center py-12">Sin conversiones aprobadas</p>
                                    )}
                                </div>

                                {/* Conversions Pie Chart */}
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                            <FiList className="w-3 h-3 text-brand-500" />
                                        </div>
                                        Distribución de Conversiones
                                    </h3>
                                    {mounted && referrals.conversionsByStatus.length > 0 ? (
                                        <div className="h-64 flex flex-col md:flex-row items-center justify-center gap-6">
                                            <div className="h-48 w-48">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={referrals.conversionsByStatus}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={4}
                                                            dataKey="_count"
                                                            nameKey="status"
                                                        >
                                                            {referrals.conversionsByStatus.map((entry, index) => {
                                                                const colors = {
                                                                    PENDING: 'var(--color-warning)',
                                                                    APPROVED: 'var(--color-success)',
                                                                    REJECTED: 'var(--color-danger)'
                                                                };
                                                                const color = colors[entry.status as keyof typeof colors] || 'var(--color-muted)';
                                                                return <Cell key={`cell-${index}`} fill={color} />;
                                                            })}
                                                        </Pie>
                                                        <Tooltip 
                                                            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '11px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="space-y-2">
                                                {['PENDING', 'APPROVED', 'REJECTED'].map((status) => {
                                                    const entry = referrals.conversionsByStatus.find(c => c.status === status);
                                                    const count = entry?._count || 0;
                                                    const colors = { PENDING: 'bg-warning', APPROVED: 'bg-success', REJECTED: 'bg-danger' };
                                                    const labels = { PENDING: 'Pendientes', APPROVED: 'Aprobadas', REJECTED: 'Rechazadas' };
                                                    return (
                                                        <div key={status} className="flex items-center gap-2 text-xs">
                                                            <span className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors]}`} />
                                                            <span className="font-medium text-muted">{labels[status as keyof typeof labels]}:</span>
                                                            <span className="font-bold text-ink">{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-subtle text-center py-12">Sin conversiones</p>
                                    )}
                                </div>
                            </div>

                            {/* Conversions by status */}
                            {referrals.conversionsByStatus.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                    <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                            <FiList className="w-3 h-3 text-brand-500" />
                                        </div>
                                        Conversiones por Estado (Detalle)
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => {
                                            const entry = referrals.conversionsByStatus.find(c => c.status === status);
                                            const styles: Record<string, string> = {
                                                PENDING: 'bg-warning/10 border-warning/30 text-warning-strong',
                                                APPROVED: 'bg-success/5 border-success/20 text-success-strong',
                                                REJECTED: 'bg-deal/5 border-deal/30 text-deal',
                                            };
                                            const labels: Record<string, string> = { PENDING: 'Pendientes', APPROVED: 'Aprobadas', REJECTED: 'Rechazadas' };
                                            return (
                                                <div key={status} className={`rounded-lg border p-3 text-center ${styles[status]}`}>
                                                    <p className="text-xl font-bold">{entry?._count || 0}</p>
                                                    <p className="text-xs font-medium mt-0.5">{labels[status]}</p>
                                                    {entry && (
                                                        <p className="text-[11px] opacity-70 mt-0.5">
                                                            {formatUSD(Number(entry._sum.commission || 0))} comisión
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Top influencers */}
                            <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-warning/15 rounded flex items-center justify-center">
                                        <FiAward className="w-3 h-3 text-warning-strong" />
                                    </div>
                                    Top Influencers (comisión acumulada)
                                </h3>
                                {referrals.topInfluencers.length === 0 ? (
                                    <p className="text-xs text-subtle text-center py-4">Sin conversiones aprobadas aún</p>
                                ) : (
                                    <div className="space-y-2">
                                        {referrals.topInfluencers.map((inf, idx) => (
                                            <div key={inf.id} className="flex items-center gap-3 p-2.5 bg-surface rounded-lg hover:bg-brand-500/5 transition-colors">
                                                <span className="w-6 h-6 bg-brand-500 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-semibold text-ink truncate">{inf.name}</span>
                                                        <span className="text-[11px] font-mono text-subtle bg-line px-1 rounded">{inf.code}</span>
                                                        {inf.status === 'PAUSED' && (
                                                            <span className="text-[11px] bg-warning/15 text-warning-strong px-1 rounded">Pausado</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted">{inf.conversionsCount} conversiones · {formatUSD(inf.totalGross)} bruto</p>
                                                </div>
                                                <span className="text-sm font-bold text-brand-500 flex-shrink-0">
                                                    {formatUSD(inf.totalCommission)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && security && (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Banner de Alertas Críticas */}
                            {(security.bySeverity.find(s => s.severity === 'CRITICAL')?._count ?? 0) > 0 && (
                                <div className="bg-deal rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <FiAlertTriangle className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-sm inline-flex items-center gap-1.5"><FiAlertTriangle className="inline h-4 w-4 shrink-0" aria-hidden="true" />Alertas Críticas de Seguridad</h3>
                                            <p className="text-white/70 text-xs">
                                                {security.bySeverity.find(s => s.severity === 'CRITICAL')?._count || 0} eventos críticos detectados -
                                                Incluye intentos de fraude, referencias duplicadas e intentos IDOR
                                            </p>
                                        </div>
                                    </div>
                                    {/* Eventos críticos recientes */}
                                    {security.recentLogs.filter(log => log.severity === 'critical').length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/20">
                                            <p className="text-white/70 text-xs uppercase tracking-wider mb-2">Últimos eventos críticos:</p>
                                            <div className="space-y-1">
                                                {security.recentLogs
                                                    .filter(log => log.severity === 'critical')
                                                    .slice(0, 3)
                                                    .map((log) => (
                                                        <div key={log.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-1.5">
                                                            <span className="text-white text-xs font-mono truncate max-w-[200px]">
                                                                {log.eventType.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-white/70 text-xs">
                                                                {new Date(log.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                                {['INFO', 'WARNING', 'CRITICAL'].map((sev) => {
                                    const count = security.bySeverity.find(s => s.severity === sev)?._count || 0;
                                    const config = {
                                        INFO: { bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-500', label: 'Info' },
                                        WARNING: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning-strong', label: 'Advertencias' },
                                        CRITICAL: { bg: 'bg-deal/5', border: 'border-deal/30', text: 'text-deal', label: 'Críticos' },
                                    };
                                    const c = config[sev as keyof typeof config];
                                    return (
                                        <div key={sev} className={`${c.bg} rounded-xl p-4 border ${c.border} hover:scale-105 transition-transform`}>
                                            <p className={`text-2xl font-bold ${c.text}`}>{count}</p>
                                            <p className="text-xs text-muted">{c.label}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-warning/15 rounded flex items-center justify-center">
                                        <FiAlertTriangle className="w-3 h-3 text-warning-strong" />
                                    </div>
                                    Eventos por Tipo
                                </h3>
                                {security.byType.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {security.byType.map((type) => (
                                            <div key={type.eventType} className="bg-surface rounded-lg p-3 text-center hover:bg-brand-500/5 transition-colors">
                                                <p className="text-lg font-bold text-ink">{type._count}</p>
                                                <p className="text-xs text-muted capitalize truncate">{type.eventType.replace(/_/g, ' ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-subtle text-center py-4">Sin eventos</p>
                                )}
                            </div>

                            {security.suspiciousIPs.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-deal/30 p-4">
                                    <h3 className="text-sm font-semibold text-deal mb-3 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-deal/10 rounded flex items-center justify-center">
                                            <FiShield className="w-3 h-3 text-deal" />
                                        </div>
                                        IPs Sospechosas
                                    </h3>
                                    <div className="space-y-1.5">
                                        {security.suspiciousIPs.slice(0, 5).map((ip) => (
                                            <div key={ip.ipAddress} className="flex items-center justify-between p-2 bg-deal/5 rounded-lg">
                                                <span className="font-mono text-xs text-ink-soft">{ip.ipAddress || 'Desconocida'}</span>
                                                <span className="text-xs font-bold text-deal">{ip._count} intentos</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-xl shadow-sm border border-line p-4">
                                <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-brand-500/10 rounded flex items-center justify-center">
                                        <FiClock className="w-3 h-3 text-brand-500" />
                                    </div>
                                    Registros Recientes
                                </h3>
                                {security.recentLogs.length > 0 ? (
                                    <div className={`${adminTableWrap} max-h-64`}>
                                        <table className={adminTable}>
                                            <thead>
                                                <tr>
                                                    <th className={adminTh}>Fecha</th>
                                                    <th className={adminTh}>Tipo</th>
                                                    <th className={adminTh}>Nivel</th>
                                                    <th className={adminTh}>IP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {security.recentLogs.slice(0, 10).map((log) => (
                                                    <tr key={log.id} className={adminRowHover}>
                                                        <td className={`${adminTd} text-muted`}>
                                                            {new Date(log.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </td>
                                                        <td className={`${adminTd} font-mono`}>{log.eventType.replace(/_/g, ' ')}</td>
                                                        <td className={adminTd}>
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${log.severity === 'critical' ? 'bg-deal/10 text-deal' :
                                                                log.severity === 'warning' ? 'bg-warning/15 text-warning-strong' : 'bg-brand-100 text-brand-500'
                                                                }`}>{log.severity}</span>
                                                        </td>
                                                        <td className={`${adminTd} font-mono text-muted`}>{log.ipAddress || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-subtle text-center py-4">Sin registros</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
            <section className="rounded-xl border border-line bg-white p-4" aria-label="Actividad en vivo">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FiActivity className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-ink">En vivo ahora</h2>
                        <p className="text-xs text-muted">{liveUsers?.liveCount ?? '...'} activos</p>
                    </div>
                    <div className="hidden items-center gap-3 text-xs text-muted md:flex">
                        <span>{liveUsers?.authenticatedCount ?? 0} logueados</span>
                        <span className="inline-flex items-center gap-1"><FiMonitor aria-hidden="true" />{liveUsers?.devices?.desktop ?? 0}</span>
                        <span className="inline-flex items-center gap-1"><FiSmartphone aria-hidden="true" />{liveUsers?.devices?.mobile ?? 0}</span>
                        <span className="inline-flex items-center gap-1"><FiTablet aria-hidden="true" />{liveUsers?.devices?.tablet ?? 0}</span>
                    </div>
                </div>
                {liveUsers?.topPages && liveUsers.topPages.length > 0 && (
                    <details className="mt-3 border-t border-line pt-2">
                        <summary className="cursor-pointer text-xs font-medium text-brand-600">Ver rutas activas</summary>
                        <ul className="mt-2 space-y-1 text-xs text-muted">
                            {liveUsers.topPages.slice(0, 4).map((page, i) => (
                                <li key={i} className="flex min-w-0 items-start justify-between gap-3">
                                    <span className="min-w-0 break-all font-mono">{page.page}</span>
                                    <span className="shrink-0 tabular-nums">{page.count}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </section>

        </div>
    );
}
