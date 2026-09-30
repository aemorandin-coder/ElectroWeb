'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    FiBarChart2, FiShoppingCart, FiUsers, FiMousePointer, FiShield, FiTrendingUp, FiPackage, FiAlertTriangle,
    FiEye, FiMonitor, FiSmartphone, FiTablet, FiGlobe, FiClock, FiRefreshCw, FiActivity, FiList,
    FiGift, FiDollarSign, FiCheckCircle, FiAward, FiDownload, FiLock,
} from 'react-icons/fi';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
    adminTab, adminPageHeader, adminPageTitle,
    adminPageSubtitle, adminInput, adminIconButton, adminSecondaryButton, adminBadge, adminChoice, type AdminTone,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { ETIQUETA_GRAVEDAD } from '@/lib/audit-labels';

// Reportes (C-104). Cada número lleva debajo "de dónde sale": la misma regla que usa la API.

interface OverviewData {
    users: { total: number; new: number };
    orders: { created: number; paid: number; pendingPayment: number };
    products: { total: number; published: number };
    productRequests: { pending: number };
    interactions: { pageViews: number; clicks: number; visitors: number };
    security: { events: number; alerts: number; critical: number; failedLogins: number };
    revenue: { total: number; averageTicket: number };
    dailyData: Array<{ date: string; sales: number; paid: number; orders: number; users: number }>;
}
interface ProductsData {
    topSelling: Array<{ id: string; name: string; units: number; revenue: number }>;
    requests: Array<{ status: string; count: number }>;
}
interface InteractionsData {
    visitors: number;
    byType: Array<{ eventType: string; count: number }>;
    byDevice: Array<{ deviceType: string; count: number }>;
    topPages: Array<{ page: string; count: number }>;
    daily: Array<{ date: string; count: number }>;
}
interface SecurityLog {
    id: string;
    action: string;
    label: string;
    severity: string;
    ipAddress: string | null;
    userEmail: string | null;
    summary: string;
    createdAt: string;
}
interface SecurityData {
    byAction: Array<{ action: string; label: string; count: number }>;
    bySeverity: Array<{ severity: string; count: number }>;
    recentLogs: SecurityLog[];
    suspiciousIPs: Array<{ ipAddress: string; count: number; accounts: number; lastSeen: string }>;
}
interface ReferralsData {
    totalInfluencers: number;
    activeInfluencers: number;
    pausedInfluencers: number;
    conversionsByStatus: Array<{ status: string; count: number; commission: number; gross: number }>;
    approvedRevenue: { gross: number; commission: number };
    topInfluencers: Array<{ id: string; name: string; code: string; status: string; totalCommission: number; totalGross: number; conversionsCount: number }>;
}
interface LiveUsersData {
    liveCount: number;
    authenticatedCount: number;
    devices: Record<string, number>;
    topPages: Array<{ page: string; count: number }>;
}
type Tab = 'overview' | 'products' | 'interactions' | 'security' | 'referrals';

const PERIODOS = [
    { value: '24h', label: '24 horas' },
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
    { value: '1y', label: '1 año' },
];
const TABS: Array<{ id: Tab; label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }> = [
    { id: 'overview', label: 'Resumen', icon: FiBarChart2 },
    { id: 'products', label: 'Productos', icon: FiPackage },
    { id: 'interactions', label: 'Interacciones', icon: FiMousePointer },
    { id: 'security', label: 'Seguridad', icon: FiShield },
    { id: 'referrals', label: 'Referidos', icon: FiGift },
];
const FILTROS_BITACORA = [
    { value: '', label: 'Todo' },
    { value: 'alertas', label: 'Alertas' },
    { value: 'accesos', label: 'Inicios de sesión' },
    { value: 'precios', label: 'Precios' },
    { value: 'aprobaciones', label: 'Aprobaciones' },
    { value: 'configuracion', label: 'Configuración' },
];
const ESTADO_SOLICITUD: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendientes', color: 'var(--color-warning)' },
    IN_PROGRESS: { label: 'En progreso', color: 'var(--color-info)' },
    FULFILLED: { label: 'Cumplidas', color: 'var(--color-success)' },
    COMPLETED: { label: 'Cumplidas', color: 'var(--color-success)' },
    REJECTED: { label: 'Rechazadas', color: 'var(--color-danger)' },
};
const ESTADO_CONVERSION: Record<string, { label: string; color: string; tone: AdminTone }> = {
    PENDING: { label: 'Pendientes', color: 'var(--color-warning)', tone: 'warning' },
    APPROVED: { label: 'Aprobadas', color: 'var(--color-success)', tone: 'success' },
    REJECTED: { label: 'Rechazadas', color: 'var(--color-danger)', tone: 'danger' },
};
const DISPOSITIVO: Record<string, { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }> = {
    desktop: { label: 'Computadora', icon: FiMonitor },
    mobile: { label: 'Teléfono', icon: FiSmartphone },
    tablet: { label: 'Tableta', icon: FiTablet },
};
const EVENTO: Record<string, string> = { page_view: 'Vistas de página', click: 'Clics', form_submit: 'Formularios enviados' };
const COLORES = ['var(--color-brand-500)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-accent)'];
const TONO_GRAVEDAD: Record<string, AdminTone> = { INFO: 'neutral', WARNING: 'warning', CRITICAL: 'danger' };
const tooltipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-line-strong)', borderRadius: '8px', fontSize: '12px' };

const formatChartDate = (value: string) => format(new Date(`${value.slice(0, 10)}T12:00:00`), 'd MMM', { locale: es });
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Caracas' });
const csv = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Stat({ label, value, detail, source, icon: Icon, wide }: {
    label: string; value: ReactNode; detail?: ReactNode; source: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; wide?: boolean;
}) {
    return (
        <div className={`min-w-0 rounded-xl border border-line bg-white p-3 sm:p-4 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm text-muted">{label}</p>
                    <p className="whitespace-nowrap text-xl font-bold tabular-nums text-ink">{value}</p>
                    {detail && <p className="text-xs text-ink-soft">{detail}</p>}
                </div>
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 sm:flex">
                    <Icon className="h-5 w-5 text-brand-500" aria-hidden />
                </span>
            </div>
            <p className="mt-2 border-t border-line pt-2 text-xs text-muted">{source}</p>
        </div>
    );
}

function Panel({ title, icon: Icon, source, children }: {
    title: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; source?: string; children: ReactNode;
}) {
    return (
        <section className="min-w-0 rounded-xl border border-line bg-white p-4">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <Icon className="h-4 w-4 text-brand-500" aria-hidden />{title}
            </h3>
            {source && <p className="mb-3 text-xs text-muted">{source}</p>}
            {children}
        </section>
    );
}

const Vacio = ({ children }: { children: ReactNode }) => <p className="py-10 text-center text-sm text-muted">{children}</p>;

function Dona({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
            <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value" nameKey="name">
                            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
                {data.map((d) => (
                    <li key={d.name} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                        <span className="text-muted">{d.name}:</span>
                        <span className="font-bold tabular-nums text-ink">{d.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function ReportsPage() {
    const [mounted, setMounted] = useState(false);
    const [period, setPeriod] = useState('7d');
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [grupo, setGrupo] = useState('');
    // "Cargando" se deriva de qué combinación de filtros ya llegó: sin setState síncrono en el efecto
    const [cargada, setCargada] = useState<string | null>(null);
    const [recargas, setRecargas] = useState(0);
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [products, setProducts] = useState<ProductsData | null>(null);
    const [interactions, setInteractions] = useState<InteractionsData | null>(null);
    const [security, setSecurity] = useState<SecurityData | null>(null);
    const [referrals, setReferrals] = useState<ReferralsData | null>(null);
    const [liveUsers, setLiveUsers] = useState<LiveUsersData | null>(null);

    const clave = `${period}|${activeTab}|${grupo}|${recargas}`;
    const loading = cargada !== clave;

    useEffect(() => {
        // Solo vale la última respuesta: cambiar de pestaña rápido no pinta datos de la anterior
        let vigente = true;
        const params = new URLSearchParams({ period, type: activeTab });
        if (activeTab === 'security' && grupo) params.set('grupo', grupo);
        fetch(`/api/admin/reports?${params}`)
            .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) }))
            .catch(() => ({ ok: false, data: null }))
            .then(({ ok, data }) => {
                if (!vigente) return;
                setCargada(clave);
                if (!ok || !data) {
                    toast.error(data?.error || 'No se pudieron cargar los reportes');
                    return;
                }
                if (activeTab === 'overview') setOverview(data.overview);
                if (activeTab === 'products') setProducts(data.products);
                if (activeTab === 'interactions') setInteractions(data.interactions);
                if (activeTab === 'security') setSecurity(data.security);
                if (activeTab === 'referrals') setReferrals(data.referrals);
            });
        return () => { vigente = false; };
    }, [period, activeTab, grupo, clave]);

    useEffect(() => {
        let activo = true;
        const cargarEnVivo = async () => {
            try {
                const response = await fetch('/api/admin/live-users');
                if (response.ok && activo) setLiveUsers(await response.json());
            } catch {
                // El recuadro "en vivo" es secundario: sin aviso cada 30 s si falla la red
            }
        };
        const montar = setTimeout(() => setMounted(true), 0);
        void cargarEnVivo();
        const interval = setInterval(cargarEnVivo, 30000);
        return () => { activo = false; clearTimeout(montar); clearInterval(interval); };
    }, []);

    const exportToCSV = () => {
        let filas: string[] = [];
        if (activeTab === 'overview' && overview) {
            filas = ['Fecha,Ingresos cobrados (USD),Pagos confirmados,Pedidos creados,Clientes nuevos',
                ...overview.dailyData.map((d) => [d.date, d.sales, d.paid, d.orders, d.users].join(','))];
        } else if (activeTab === 'products' && products) {
            filas = ['Producto,Unidades vendidas,Ingresos (USD)', ...products.topSelling.map((p) => [csv(p.name), p.units, p.revenue].join(','))];
        } else if (activeTab === 'interactions' && interactions) {
            filas = ['Pagina,Vistas', ...interactions.topPages.map((p) => [csv(p.page), p.count].join(','))];
        } else if (activeTab === 'security' && security) {
            filas = ['Fecha,Evento,Gravedad,Cuenta,IP,Detalle', ...security.recentLogs.map((l) =>
                [csv(fechaHora(l.createdAt)), csv(l.label), csv(ETIQUETA_GRAVEDAD[l.severity] ?? l.severity), csv(l.userEmail), csv(l.ipAddress), csv(l.summary)].join(','))];
        } else if (activeTab === 'referrals' && referrals) {
            filas = ['Nombre,Codigo,Estado,Comisiones (USD),Ventas brutas (USD),Conversiones', ...referrals.topInfluencers.map((i) =>
                [csv(i.name), csv(i.code), i.status, i.totalCommission, i.totalGross, i.conversionsCount].join(','))];
        }
        if (filas.length === 0) return;
        // BOM para que Excel lea los acentos
        const url = URL.createObjectURL(new Blob(['﻿' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-${activeTab}-${period}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const periodoTexto = PERIODOS.find((p) => p.value === period)?.label.toLowerCase() ?? period;
    const criticas = security?.bySeverity.find((s) => s.severity === 'CRITICAL')?.count ?? 0;

    return (
        <div className="min-w-0 space-y-4">
            <div className={adminPageHeader}>
                <div>
                    <h1 className={adminPageTitle}>Reportes</h1>
                    <p className={adminPageSubtitle}>Ventas, pedidos y actividad de los últimos {periodoTexto}</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="min-w-0 overflow-x-auto border-b border-line pb-2 pr-6" role="tablist" aria-label="Secciones de reportes">
                    <div className="flex w-max gap-1">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                                    role="tab" aria-selected={activeTab === tab.id} className={adminTab(activeTab === tab.id)}>
                                    <Icon className="h-4 w-4 shrink-0" aria-hidden />{tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <p className="text-xs text-muted lg:hidden">Desliza las pestañas para ver más secciones.</p>
                <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="report-period" className="sr-only">Período del reporte</label>
                    <div className="w-36">
                        <select id="report-period" value={period} onChange={(e) => setPeriod(e.target.value)} className={adminInput()}>
                            {PERIODOS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <button type="button" onClick={() => setRecargas((n) => n + 1)} className={`${adminIconButton} h-11 w-11 border border-line bg-white`}
                        aria-label="Actualizar reporte" title="Actualizar reporte">
                        <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={exportToCSV} className={adminSecondaryButton}>
                        <FiDownload className="h-4 w-4" aria-hidden="true" /> Exportar CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando reporte">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand-500" />
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && overview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <Stat wide label="Ingresos cobrados" icon={FiTrendingUp} value={formatUSD(overview.revenue.total)}
                                    detail={overview.orders.paid > 0 ? `${overview.orders.paid} pagos · ticket promedio ${formatUSD(overview.revenue.averageTicket)}` : 'Sin pagos confirmados'}
                                    source="Órdenes con el pago confirmado en el período. No cuenta las canceladas ni las que esperan pago." />
                                <Stat label="Pedidos" icon={FiShoppingCart} value={overview.orders.created}
                                    detail={`${overview.orders.pendingPayment} esperan pago`}
                                    source="Órdenes creadas en el período, sin las canceladas." />
                                <Stat label="Clientes" icon={FiUsers} value={overview.users.total}
                                    detail={`+${overview.users.new} nuevos en el período`}
                                    source="Cuentas de clientes (sin el equipo). Nuevos: registrados en el período." />
                                <Stat wide label="Productos" icon={FiPackage} value={overview.products.total}
                                    detail={`${overview.products.published} publicados · ${overview.productRequests.pending} solicitudes pendientes`}
                                    source="Todo el catálogo, en cualquier estado. Solicitudes: pedidos de productos que aún no se atienden." />
                            </div>

                            {mounted && overview.dailyData.length > 0 && (
                                <Panel title="Tendencias del período" icon={FiTrendingUp} source="Por día, en hora de Venezuela.">
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted">Ingresos cobrados (USD), por día del pago</p>
                                            <div className="h-52 w-full sm:h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={overview.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                        <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} tickFormatter={formatChartDate} />
                                                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatChartDate(String(v))}
                                                            formatter={(value) => [formatUSD(Number(value)), 'Cobrado']} />
                                                        <Area type="monotone" dataKey="sales" stroke="var(--color-brand-500)" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted">Pedidos creados y clientes nuevos</p>
                                            <div className="h-52 w-full sm:h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={overview.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                        <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} tickFormatter={formatChartDate} />
                                                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                                                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatChartDate(String(v))} />
                                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                                        <Line type="monotone" dataKey="orders" name="Pedidos" stroke="var(--color-warning-strong)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                        <Line type="monotone" dataKey="users" name="Clientes nuevos" stroke="var(--color-success-strong)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            )}

                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <Panel title="Interacciones" icon={FiMousePointer} source="Visitas a la tienda (no el panel), sin buscadores ni bots.">
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        {[
                                            { label: 'Visitantes', value: overview.interactions.visitors, icon: FiUsers },
                                            { label: 'Vistas', value: overview.interactions.pageViews, icon: FiEye },
                                            { label: 'Clics', value: overview.interactions.clicks, icon: FiMousePointer },
                                        ].map(({ label, value, icon: Icon }) => (
                                            <div key={label}>
                                                <Icon className="mx-auto mb-1 h-5 w-5 text-brand-500" aria-hidden="true" />
                                                <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
                                                <p className="text-xs text-muted">{label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                                <Panel title="Seguridad" icon={FiShield} source="Bitácora del servidor: inicios de sesión, aprobaciones y cambios de precio.">
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div>
                                            <FiList className="mx-auto mb-1 h-5 w-5 text-brand-500" aria-hidden="true" />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.security.events}</p>
                                            <p className="text-xs text-muted">Registros</p>
                                        </div>
                                        <div>
                                            <FiLock className="mx-auto mb-1 h-5 w-5 text-warning-strong" aria-hidden="true" />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.security.failedLogins}</p>
                                            <p className="text-xs text-muted">Accesos fallidos</p>
                                        </div>
                                        <div>
                                            <FiAlertTriangle className={`mx-auto mb-1 h-5 w-5 ${overview.security.critical > 0 ? 'text-deal' : 'text-success-strong'}`} aria-hidden="true" />
                                            <p className="text-xl font-bold tabular-nums text-ink">{overview.security.critical}</p>
                                            <p className="text-xs text-muted">Críticas</p>
                                        </div>
                                    </div>
                                </Panel>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && products && (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <Panel title="Más vendidos" icon={FiTrendingUp} source="Unidades de órdenes con el pago confirmado en el período.">
                                {mounted && products.topSelling.length > 0 ? (
                                    <>
                                        <div className="h-52 w-full sm:h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={products.topSelling.map((p) => ({ name: p.name.length > 15 ? `${p.name.slice(0, 15)}…` : p.name, unidades: p.units }))}
                                                    layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                                                    <XAxis type="number" stroke="var(--color-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                                                    <YAxis dataKey="name" type="category" stroke="var(--color-muted)" fontSize={11} tickLine={false} width={100} />
                                                    <Tooltip contentStyle={tooltipStyle} />
                                                    <Bar dataKey="unidades" fill="var(--color-success-strong)" radius={[0, 4, 4, 0]} barSize={12} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <ol className="mt-3 space-y-2">
                                            {products.topSelling.slice(0, 5).map((product, index) => (
                                                <li key={product.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface p-2">
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">{index + 1}</span>
                                                        <span className="truncate text-sm text-ink-soft">{product.name}</span>
                                                    </span>
                                                    <span className="shrink-0 text-right text-xs">
                                                        <span className="block font-semibold text-success-strong">{product.units} vendidos</span>
                                                        <span className="text-muted">{formatUSD(product.revenue)}</span>
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    </>
                                ) : <Vacio>Sin ventas pagadas en el período</Vacio>}
                            </Panel>
                            <Panel title="Solicitudes de productos" icon={FiPackage} source="Productos que pidieron los clientes, desde siempre, por estado.">
                                {mounted && products.requests.length > 0 ? (
                                    <Dona data={products.requests.map((r) => ({
                                        name: ESTADO_SOLICITUD[r.status]?.label ?? r.status,
                                        value: r.count,
                                        color: ESTADO_SOLICITUD[r.status]?.color ?? 'var(--color-muted)',
                                    }))} />
                                ) : <Vacio>Sin solicitudes</Vacio>}
                            </Panel>
                        </div>
                    )}

                    {activeTab === 'interactions' && interactions && (
                        interactions.byType.length === 0 ? (
                            <Panel title="Interacciones" icon={FiMousePointer}>
                                <Vacio>No hay visitas registradas en el período. Se cuentan las visitas a la tienda, sin el panel ni los bots.</Vacio>
                            </Panel>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <Stat label="Visitantes" icon={FiUsers} value={interactions.visitors} source="Navegadores distintos (una sesión por pestaña abierta)." />
                                    {interactions.byType.slice(0, 3).map((e) => (
                                        <Stat key={e.eventType} label={EVENTO[e.eventType] ?? e.eventType.replace(/_/g, ' ')} icon={e.eventType === 'click' ? FiMousePointer : e.eventType === 'page_view' ? FiEye : FiList}
                                            value={e.count} source={e.eventType === 'page_view' ? 'Cada página que se abre.' : e.eventType === 'click' ? 'Un clic por botón, enlace o producto.' : 'Registrado por la tienda.'} />
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <Panel title="Actividad por día" icon={FiActivity} source="Todos los eventos, por día en hora de Venezuela.">
                                        {mounted && (
                                            <div className="h-52 w-full sm:h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={interactions.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                        <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} tickFormatter={formatChartDate} />
                                                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                                                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatChartDate(String(v))} formatter={(value) => [value, 'Eventos']} />
                                                        <Area type="monotone" dataKey="count" stroke="var(--color-brand-500)" strokeWidth={2} fillOpacity={1} fill="url(#colorInteractions)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </Panel>
                                    <Panel title="Dispositivos" icon={FiMonitor} source="Visitantes por tipo de equipo (cada visitante cuenta una vez).">
                                        {mounted && interactions.byDevice.length > 0 ? (
                                            <Dona data={interactions.byDevice.map((d, i) => ({
                                                name: DISPOSITIVO[d.deviceType]?.label ?? 'Otro',
                                                value: d.count,
                                                color: COLORES[i % COLORES.length],
                                            }))} />
                                        ) : <Vacio>Sin datos de dispositivos</Vacio>}
                                    </Panel>
                                </div>
                                <Panel title="Páginas más visitadas" icon={FiGlobe} source="Vistas de página en el período.">
                                    {interactions.topPages.length > 0 ? (
                                        <ol className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                            {interactions.topPages.map((page, index) => (
                                                <li key={page.page} className="flex items-center justify-between gap-2 rounded-lg bg-surface p-2">
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">{index + 1}</span>
                                                        <span className="truncate font-mono text-xs text-ink-soft">{page.page}</span>
                                                    </span>
                                                    <span className="text-sm font-bold tabular-nums text-brand-600">{page.count}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    ) : <Vacio>Sin datos</Vacio>}
                                </Panel>
                            </div>
                        )
                    )}

                    {activeTab === 'security' && security && (
                        <div className="space-y-4">
                            {criticas > 0 && (
                                <div className="flex items-start gap-3 rounded-xl border border-deal/30 bg-deal/5 p-4">
                                    <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-deal" aria-hidden="true" />
                                    <div>
                                        <p className="text-sm font-semibold text-deal">{criticas} {criticas === 1 ? 'evento crítico' : 'eventos críticos'} en el período</p>
                                        <p className="text-sm text-ink-soft">
                                            Referencias de pago repetidas, intentos de fraude con Puntos ES o gift cards, cambios de rol y borrado de usuarios.
                                            Filtra por &quot;Alertas&quot; para verlos.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                                {(['INFO', 'WARNING', 'CRITICAL'] as const).map((sev) => (
                                    <div key={sev} className="rounded-xl border border-line bg-white p-3 text-center sm:p-4">
                                        <p className="text-2xl font-bold tabular-nums text-ink">{security.bySeverity.find((s) => s.severity === sev)?.count ?? 0}</p>
                                        <span className={adminBadge(TONO_GRAVEDAD[sev])}>{ETIQUETA_GRAVEDAD[sev]}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted">
                                Normal: trabajo del día (inicios de sesión, precios, aprobaciones). Atención: contraseñas incorrectas, bloqueos, cancelaciones, Puntos ES cargados a mano.
                                Crítica: lo que alguien debe revisar hoy.
                            </p>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Panel title="Eventos por tipo" icon={FiList} source="Todo lo que registró el servidor en el período.">
                                    {security.byAction.length > 0 ? (
                                        <ul className="grid grid-cols-2 gap-2">
                                            {security.byAction.map((a) => (
                                                <li key={a.action} className="rounded-lg bg-surface p-2 text-center">
                                                    <p className="text-lg font-bold tabular-nums text-ink">{a.count}</p>
                                                    <p className="text-xs text-muted">{a.label}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <Vacio>Sin eventos en el período</Vacio>}
                                </Panel>
                                <Panel title="IPs sospechosas" icon={FiShield}
                                    source="Direcciones con más alertas: contraseñas incorrectas, bloqueos y accesos denegados. Muchas cuentas desde una IP es un ataque, no un olvido.">
                                    {security.suspiciousIPs.length > 0 ? (
                                        <ul className="space-y-2">
                                            {security.suspiciousIPs.map((ip) => (
                                                <li key={ip.ipAddress} className="flex items-center justify-between gap-2 rounded-lg bg-surface p-2">
                                                    <span className="min-w-0">
                                                        <span className="block truncate font-mono text-sm text-ink">{ip.ipAddress}</span>
                                                        <span className="text-xs text-muted">Última: {fechaHora(ip.lastSeen)}</span>
                                                    </span>
                                                    <span className="shrink-0 text-right text-xs">
                                                        <span className="block font-semibold text-warning-strong">{ip.count} {ip.count === 1 ? 'alerta' : 'alertas'}</span>
                                                        {ip.accounts > 0 && <span className={ip.accounts > 2 ? 'font-semibold text-deal' : 'text-muted'}>{ip.accounts} {ip.accounts === 1 ? 'cuenta' : 'cuentas'}</span>}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <Vacio>Ninguna IP con alertas en el período</Vacio>}
                                </Panel>
                            </div>

                            <Panel title="Bitácora" icon={FiClock} source="Los 100 registros más recientes del filtro elegido, en hora de Venezuela.">
                                <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar la bitácora">
                                    {FILTROS_BITACORA.map((f) => (
                                        <button key={f.value} type="button" aria-pressed={grupo === f.value} onClick={() => setGrupo(f.value)}
                                            className={`${adminChoice(grupo === f.value)} min-h-11 px-3 text-sm`}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                {security.recentLogs.length > 0 ? (
                                    <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto rounded-xl border border-line">
                                        {security.recentLogs.map((log) => (
                                            <li key={log.id} className="px-3 py-2.5">
                                                <p className="flex flex-wrap items-center gap-2 text-sm">
                                                    <span className="font-medium text-ink">{log.label}</span>
                                                    {log.severity !== 'INFO' && <span className={adminBadge(TONO_GRAVEDAD[log.severity] ?? 'neutral')}>{ETIQUETA_GRAVEDAD[log.severity] ?? log.severity}</span>}
                                                </p>
                                                {log.summary && <p className="break-words text-sm text-ink-soft">{log.summary}</p>}
                                                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                                                    <span>{fechaHora(log.createdAt)}</span>
                                                    {log.userEmail && <span className="break-all">{log.userEmail}</span>}
                                                    {log.ipAddress && <span className="font-mono">IP {log.ipAddress}</span>}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <Vacio>Sin registros para este filtro</Vacio>}
                            </Panel>
                        </div>
                    )}

                    {activeTab === 'referrals' && referrals && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Stat wide label="Promotores" icon={FiUsers} value={referrals.totalInfluencers} source="Todos los promotores registrados." />
                                <Stat label="Activos" icon={FiCheckCircle} value={referrals.activeInfluencers} source="Pueden generar comisiones." />
                                <Stat label="Pausados" icon={FiActivity} value={referrals.pausedInfluencers} source="No generan comisiones nuevas." />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Stat label="Ventas por referidos" icon={FiShoppingCart} value={formatUSD(referrals.approvedRevenue.gross)}
                                    source="Monto de las compras con comisión aprobada en el período." />
                                <Stat label="Comisiones aprobadas" icon={FiDollarSign} value={formatUSD(referrals.approvedRevenue.commission)}
                                    source="Comisiones acreditadas como Puntos ES en el período." />
                            </div>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Panel title="Comisiones por promotor (USD)" icon={FiAward} source="Comisiones aprobadas, desde siempre.">
                                    {mounted && referrals.topInfluencers.length > 0 ? (
                                        <div className="h-52 w-full sm:h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={referrals.topInfluencers.map((i) => ({ name: i.name.length > 12 ? `${i.name.slice(0, 12)}…` : i.name, comision: i.totalCommission }))}
                                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                    <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                                                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatUSD(Number(value)), 'Comisión']} />
                                                    <Bar dataKey="comision" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} barSize={15} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <Vacio>Sin comisiones aprobadas</Vacio>}
                                </Panel>
                                <Panel title="Conversiones por estado" icon={FiList} source="Compras atribuidas a un promotor en el período.">
                                    {referrals.conversionsByStatus.length > 0 ? (
                                        <>
                                            {mounted && (
                                                <Dona data={['PENDING', 'APPROVED', 'REJECTED'].map((status) => ({
                                                    name: ESTADO_CONVERSION[status].label,
                                                    value: referrals.conversionsByStatus.find((c) => c.status === status)?.count ?? 0,
                                                    color: ESTADO_CONVERSION[status].color,
                                                }))} />
                                            )}
                                            <div className="mt-3 grid grid-cols-3 gap-2">
                                                {['PENDING', 'APPROVED', 'REJECTED'].map((status) => {
                                                    const entry = referrals.conversionsByStatus.find((c) => c.status === status);
                                                    return (
                                                        <div key={status} className="rounded-lg bg-surface p-2 text-center">
                                                            <span className={adminBadge(ESTADO_CONVERSION[status].tone)}>{ESTADO_CONVERSION[status].label}</span>
                                                            <p className="mt-1 text-xs text-muted">{formatUSD(entry?.commission ?? 0)} comisión</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : <Vacio>Sin conversiones en el período</Vacio>}
                                </Panel>
                            </div>
                            <Panel title="Mejores promotores" icon={FiAward} source="Por comisión aprobada acumulada.">
                                {referrals.topInfluencers.length === 0 ? <Vacio>Sin conversiones aprobadas aún</Vacio> : (
                                    <ol className="space-y-2">
                                        {referrals.topInfluencers.map((inf, idx) => (
                                            <li key={inf.id} className="flex items-center gap-3 rounded-lg bg-surface p-2">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">{idx + 1}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="flex flex-wrap items-center gap-2">
                                                        <span className="truncate text-sm font-medium text-ink">{inf.name}</span>
                                                        <span className="font-mono text-xs text-muted">{inf.code}</span>
                                                        {inf.status === 'PAUSED' && <span className={adminBadge('warning')}>Pausado</span>}
                                                    </p>
                                                    <p className="text-xs text-muted">{inf.conversionsCount} conversiones · {formatUSD(inf.totalGross)} en ventas</p>
                                                </div>
                                                <span className="shrink-0 text-sm font-bold tabular-nums text-success-strong">{formatUSD(inf.totalCommission)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </Panel>
                        </div>
                    )}
                </>
            )}

            <section className="rounded-xl border border-line bg-white p-3" aria-label="Actividad en vivo">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10"><FiActivity className="h-4 w-4 text-success-strong" aria-hidden="true" /></span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ink">En vivo ahora</h2>
                        <p className="text-xs text-muted">{liveUsers?.liveCount ?? '…'} visitantes en los últimos 5 minutos</p>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                        <span>{liveUsers?.authenticatedCount ?? 0} con sesión</span>
                        <span className="inline-flex items-center gap-1" title="Computadora"><FiMonitor aria-hidden="true" /><span className="sr-only">Computadora:</span>{liveUsers?.devices?.desktop ?? 0}</span>
                        <span className="inline-flex items-center gap-1" title="Teléfono"><FiSmartphone aria-hidden="true" /><span className="sr-only">Teléfono:</span>{liveUsers?.devices?.mobile ?? 0}</span>
                        <span className="inline-flex items-center gap-1" title="Tableta"><FiTablet aria-hidden="true" /><span className="sr-only">Tableta:</span>{liveUsers?.devices?.tablet ?? 0}</span>
                    </div>
                </div>
                {liveUsers?.topPages && liveUsers.topPages.length > 0 && (
                    <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-brand-600">Ver páginas abiertas</summary>
                        <ul className="mt-2 space-y-1">
                            {liveUsers.topPages.slice(0, 4).map((page) => (
                                <li key={page.page} className="flex justify-between gap-2 text-xs">
                                    <span className="truncate font-mono text-ink-soft">{page.page}</span>
                                    <span className="font-semibold tabular-nums">{page.count}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </section>
        </div>
    );
}
