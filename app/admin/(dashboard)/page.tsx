'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
// Removed ReviewsWidget import
import {
  FiUsers,
  FiPercent,
  FiLayers,
  FiMail,
  FiShare2,
  FiStar,
  FiShield,
  FiAlertTriangle,
  FiClock,
  FiCheckCircle,
  FiBell,
  FiChevronRight
} from 'react-icons/fi';

// Dynamic import for charts to reduce initial bundle size
const AreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import('recharts').then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

interface Stats {
  products: {
    total: number;
    published: number;
    draft: number;
    outOfStock: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  customers: {
    total: number;
  };
  sales: {
    total: number;
    history: { date: string; amount: number }[];
  };
  pendingActions?: {
    creators: number;
    discounts: number;
    productRequests: number;
    contactMessages: number;
    referrals: number;
    reviews: number;
    businessVerifications: number;
  };
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const dashboardStats = [
    {
      name: 'Ventas Totales',
      value: isLoading ? '...' : `$${(stats?.sales?.total || 0).toFixed(2)}`,
      change: '+0%',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
    {
      name: 'Órdenes',
      value: isLoading ? '...' : (stats?.orders.total.toString() || '0'),
      change: `+${stats?.orders.pending || 0}`,
      changeType: (stats?.orders.pending || 0) > 0 ? 'positive' as const : 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
    {
      name: 'Productos',
      value: isLoading ? '...' : (stats?.products.total.toString() || '0'),
      change: `+${stats?.products.published || 0}`,
      changeType: (stats?.products.published || 0) > 0 ? 'positive' as const : 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
    {
      name: 'Clientes',
      value: isLoading ? '...' : (stats?.customers.total.toString() || '0'),
      change: '+0',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
  ];

  const quickActions = [
    {
      title: 'Agregar Producto',
      description: 'Crear producto',
      href: '/admin/products/new',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
    {
      title: 'Categorías',
      description: 'Organizar productos',
      href: '/admin/categories',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
    {
      title: 'Ver Órdenes',
      description: 'Gestionar pedidos',
      href: '/admin/orders',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
    {
      title: 'Configuración',
      description: 'Ajustes del sistema',
      href: '/admin/settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-[#2a63cd] to-[#1e4ba3]',
    },
  ];

  const pendingActions = stats?.pendingActions || {
    creators: 0,
    discounts: 0,
    productRequests: 0,
    contactMessages: 0,
    referrals: 0,
    reviews: 0,
    businessVerifications: 0,
  };

  const totalPendingActions =
    (pendingActions.creators || 0) +
    (pendingActions.discounts || 0) +
    (pendingActions.productRequests || 0) +
    (pendingActions.contactMessages || 0) +
    (pendingActions.referrals || 0) +
    (pendingActions.reviews || 0) +
    (pendingActions.businessVerifications || 0) +
    (stats?.products?.outOfStock || 0) +
    (stats?.orders?.pending || 0);

  const alertsList = [
    {
      id: 'orders',
      count: stats?.orders?.pending || 0,
      title: 'Pedidos Pendientes',
      description: `${stats?.orders?.pending || 0} por procesar`,
      icon: <FiClock className="w-4 h-4" />,
      href: '/admin/orders',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-amber-500 text-white',
      hoverColor: 'hover:border-amber-300',
      pulse: true,
    },
    {
      id: 'outOfStock',
      count: stats?.products?.outOfStock || 0,
      title: 'Productos Agotados',
      description: `${stats?.products?.outOfStock || 0} sin stock`,
      icon: <FiAlertTriangle className="w-4 h-4" />,
      href: '/admin/products',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-rose-600 text-white',
      hoverColor: 'hover:border-rose-300',
      pulse: true,
    },
    {
      id: 'creators',
      count: pendingActions.creators || 0,
      title: 'Creadores de Cursos',
      description: `${pendingActions.creators || 0} solicitudes`,
      icon: <FiUsers className="w-4 h-4" />,
      href: '/admin/creators',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
    {
      id: 'discounts',
      count: pendingActions.discounts || 0,
      title: 'Solicitudes Descuento',
      description: `${pendingActions.discounts || 0} por aprobar`,
      icon: <FiPercent className="w-4 h-4" />,
      href: '/admin/discount-requests',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
    {
      id: 'productRequests',
      count: pendingActions.productRequests || 0,
      title: 'Solicitudes Especiales',
      description: `${pendingActions.productRequests || 0} solicitudes`,
      icon: <FiLayers className="w-4 h-4" />,
      href: '/admin/product-requests',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
    {
      id: 'contactMessages',
      count: pendingActions.contactMessages || 0,
      title: 'Consultas de Clientes',
      description: `${pendingActions.contactMessages || 0} mensajes`,
      icon: <FiMail className="w-4 h-4" />,
      href: '/admin/inquiries',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
    {
      id: 'referrals',
      count: pendingActions.referrals || 0,
      title: 'Afiliados / Referidos',
      description: `${pendingActions.referrals || 0} por aprobar`,
      icon: <FiShare2 className="w-4 h-4" />,
      href: '/admin/marketing',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
    {
      id: 'reviews',
      count: pendingActions.reviews || 0,
      title: 'Reseñas de Productos',
      description: `${pendingActions.reviews || 0} por moderar`,
      icon: <FiStar className="w-4 h-4" />,
      href: '/admin/reviews',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
    {
      id: 'businessVerifications',
      count: pendingActions.businessVerifications || 0,
      title: 'Verificaciones Perfil',
      description: `${pendingActions.businessVerifications || 0} pendientes`,
      icon: <FiShield className="w-4 h-4" />,
      href: '/admin/verifications',
      bgColor: 'bg-white border-[#e9ecef] text-slate-800 hover:bg-[#f8f9fa]',
      iconBg: 'bg-[#2a63cd] text-white',
      hoverColor: 'hover:border-blue-300',
      pulse: false,
    },
  ];

  const activeAlerts = alertsList.filter((alert) => alert.count > 0);

  return (
    <div className="space-y-4">
      {/* Welcome Section - Compact with Integrated System Status */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-lg p-3.5 shadow-md animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h1 className="text-2xl font-bold text-white mb-0.5">
              Bienvenido, {session?.user?.name}
            </h1>
            <p className="text-base text-blue-100">
              Panel de administración de Electro Shop Morandin
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded border border-white/15">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-base font-semibold text-white">BD: Conectado</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded border border-white/15">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-base font-semibold text-white">Auth: Activo</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded border border-white/15">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-300" />
              <span className="text-base font-semibold text-white">Modo: Desarrollo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Action Center */}
      <div className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm animate-scaleIn">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#212529] flex items-center gap-2">
              <FiBell className={`w-4.5 h-4.5 text-[#2a63cd] ${totalPendingActions > 0 ? 'animate-bounce' : ''}`} />
              Centro de Alertas y Aprobaciones
            </h2>
            <p className="text-base text-[#6a6c6b]">Control y gestión de tareas que requieren tu atención inmediata</p>
          </div>
          {totalPendingActions > 0 && (
            <span className="flex h-5.5 px-2.5 items-center justify-center text-base font-bold bg-rose-100 text-rose-700 rounded-full animate-pulse border border-rose-200">
              {totalPendingActions} {totalPendingActions === 1 ? 'Alerta' : 'Alertas'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-[#f8f9fa] rounded p-3 border border-[#e9ecef] h-14"></div>
            ))}
          </div>
        ) : totalPendingActions === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-lg text-slate-800 transition-all duration-500 hover:shadow">
            <div className="flex items-center justify-center w-9 h-9 bg-slate-600 text-white rounded-full shadow mb-2">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-0.5">¡Todo al día!</h3>
            <p className="text-base text-slate-500">No hay tareas pendientes ni aprobaciones que requieran tu atención.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeAlerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="group relative flex items-center justify-between p-2.5 rounded-lg border border-[#e9ecef] bg-white text-slate-800 hover:bg-[#f8f9fa] hover:border-blue-200 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-[#2a63cd] border border-blue-100 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    {alert.pulse && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                    )}
                    {alert.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-[#2a63cd] transition-colors duration-300">
                      {alert.title}
                    </h3>
                    <p className="text-base text-gray-500 mt-0.5">{alert.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/60 group-hover:bg-[#2a63cd] group-hover:text-white transition-all duration-300 border border-black/5">
                  <FiChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {dashboardStats.map((stat, index) => (
          <div
            key={stat.name}
            style={{ animationDelay: `${index * 40}ms` }}
            className="group relative bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm hover:shadow-md transition-all duration-500 hover:scale-[1.01] hover:-translate-y-0.5 animate-fadeIn overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 bg-blue-50 text-[#2a63cd] border border-blue-100 rounded-full shadow-sm group-hover:bg-[#2a63cd] group-hover:text-white group-hover:border-[#2a63cd] transition-all duration-300">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-base text-[#6a6c6b] font-medium group-hover:text-[#212529] transition-colors duration-300">{stat.name}</p>
                  <p className="text-2xl font-bold text-[#212529] group-hover:text-[#2a63cd] transition-colors duration-300">{stat.value}</p>
                </div>
              </div>
              <span
                className={`text-base font-semibold px-1.5 py-0.5 rounded-full transition-all duration-500 ${stat.changeType === 'positive'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-[#f8f9fa] text-[#6a6c6b]'
                  }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart and Quick Actions Grid - Combined Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm animate-scaleIn flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-[#212529]">Resumen de Ventas</h2>
              <p className="text-base text-[#6a6c6b]">Últimos 7 días</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[#2a63cd]">
                Total: ${stats?.sales?.total.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          <div className="h-[160px] w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center bg-[#f8f9fa] rounded">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2a63cd]"></div>
              </div>
            ) : stats?.sales?.history && stats.sales.history.length > 0 ? (
              <ResponsiveContainer width="100%" height={160} minWidth={200}>
                <AreaChart data={stats.sales.history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2a63cd" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2a63cd" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6a6c6b', fontSize: 14 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6a6c6b', fontSize: 14 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '14px'
                    }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'Ventas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2a63cd"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-[#f8f9fa] rounded text-[#6a6c6b]">
                <svg className="w-8 h-8 mb-1.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-base font-medium">No hay datos de ventas recientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (1/3) */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm animate-scaleIn flex flex-col justify-between">
          <div className="h-full flex flex-col justify-between">
            <h2 className="text-xl font-bold text-[#212529] mb-3">Accesos Rápidos</h2>
            <div className="grid grid-cols-2 gap-2.5 h-full">
              {quickActions.map((action, index) => (
                <Link
                  key={action.title}
                  href={action.href}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="group relative flex flex-col items-center justify-center gap-1 p-2 bg-[#f8f9fa] rounded-lg border border-[#e9ecef] shadow-sm hover:shadow hover:border-blue-100 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 bg-blue-50 text-[#2a63cd] border border-blue-100 rounded-full shadow-sm group-hover:bg-[#2a63cd] group-hover:text-white transition-all duration-300">
                    {action.icon}
                  </div>
                  <div className="relative text-center">
                    <p className="text-base font-bold text-[#212529] group-hover:text-[#2a63cd] transition-colors duration-300 leading-tight">{action.title}</p>
                    <p className="text-sm text-[#6a6c6b] mt-0.5 leading-none">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
