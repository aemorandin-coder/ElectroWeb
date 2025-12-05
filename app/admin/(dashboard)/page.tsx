'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ReviewsWidget from '@/components/admin/ReviewsWidget';

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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      name: 'Órdenes',
      value: isLoading ? '...' : (stats?.orders.total.toString() || '0'),
      change: `+${stats?.orders.pending || 0}`,
      changeType: (stats?.orders.pending || 0) > 0 ? 'positive' as const : 'neutral' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      name: 'Productos',
      value: isLoading ? '...' : (stats?.products.total.toString() || '0'),
      change: `+${stats?.products.published || 0}`,
      changeType: (stats?.products.published || 0) > 0 ? 'positive' as const : 'neutral' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      name: 'Clientes',
      value: isLoading ? '...' : (stats?.customers.total.toString() || '0'),
      change: '+0',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-600',
    },
  ];

  const quickActions = [
    {
      title: 'Agregar Producto',
      description: 'Crear un nuevo producto',
      href: '/admin/products/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Gestionar Categorías',
      description: 'Organizar productos',
      href: '/admin/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Ver Órdenes',
      description: 'Gestionar pedidos',
      href: '/admin/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Configuración',
      description: 'Ajustes del sistema',
      href: '/admin/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-gray-500 to-slate-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section - Compact */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 shadow-lg shadow-[#2a63cd]/20 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              Bienvenido, {session?.user?.name}
            </h1>
            <p className="text-sm text-blue-100">
              Panel de administración de Electro Shop Morandin
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
            <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            <span className="text-xs font-semibold text-white">Sistema Activo</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => (
          <div
            key={stat.name}
            style={{ animationDelay: `${index * 50}ms` }}
            className="group relative bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm hover:shadow-xl hover:shadow-[#2a63cd]/10 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1 animate-fadeIn overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-lg shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-500 group-hover:rotate-3`}>
                  <div className="text-white group-hover:scale-110 transition-transform duration-500">{stat.icon}</div>
                </div>
                <div>
                  <p className="text-xs text-[#6a6c6b] font-medium group-hover:text-[#212529] transition-colors duration-300">{stat.name}</p>
                  <p className="text-lg font-bold text-[#212529] group-hover:text-[#2a63cd] transition-colors duration-300">{stat.value}</p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full transition-all duration-500 ${stat.changeType === 'positive'
                  ? 'bg-green-50 text-green-600 group-hover:bg-green-100 group-hover:shadow-md group-hover:scale-110'
                  : 'bg-[#f8f9fa] text-[#6a6c6b] group-hover:bg-[#e9ecef]'
                  }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-xl border border-[#e9ecef] p-6 shadow-sm animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#212529]">Resumen de Ventas</h2>
            <p className="text-sm text-[#6a6c6b]">Últimos 7 días</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#2a63cd]">
              Total: ${stats?.sales?.total.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center bg-[#f8f9fa] rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
            </div>
          ) : stats?.sales?.history && stats.sales.history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.sales.history}>
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
                  tick={{ fill: '#6a6c6b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6a6c6b', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2a63cd"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[#f8f9fa] rounded-lg text-[#6a6c6b]">
              <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium">No hay datos de ventas recientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Compact Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Link
            key={action.title}
            href={action.href}
            style={{ animationDelay: `${index * 75}ms` }}
            className="group relative flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-[#e9ecef] shadow-sm hover:shadow-xl hover:shadow-[#2a63cd]/10 transition-all duration-500 hover:scale-[1.05] hover:-translate-y-1 animate-fadeIn overflow-hidden"
          >
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className={`relative flex items-center justify-center w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
              <div className="text-white group-hover:scale-110 transition-transform duration-500">{action.icon}</div>
            </div>
            <div className="relative text-center">
              <p className="text-sm font-semibold text-[#212529] group-hover:text-[#2a63cd] transition-colors duration-300">{action.title}</p>
              <p className="text-xs text-[#6a6c6b] mt-0.5">{action.description}</p>
            </div>

            {/* Arrow indicator */}
            <svg className="absolute top-3 right-3 w-4 h-4 text-[#6a6c6b] group-hover:text-[#2a63cd] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Reviews and System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reviews Widget */}
        <ReviewsWidget />

        {/* System Status - Compact */}
        <div className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm animate-scaleIn">
          <h2 className="text-sm font-semibold text-[#212529] mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-[#2a63cd] to-[#1e4ba3] rounded-full"></div>
            Estado del Sistema
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Base de Datos', status: 'Conectado', color: 'green' },
              { name: 'Autenticación', status: 'Activo', color: 'green' },
              { name: 'Modo', status: 'Desarrollo', color: 'blue' },
            ].map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 p-2.5 bg-[#f8f9fa] rounded-lg hover:bg-[#e9ecef] transition-colors duration-300">
                <div className={`w-2 h-2 rounded-full bg-${item.color}-500 ${item.color === 'green' ? 'animate-pulse' : ''}`} />
                <div>
                  <p className="text-xs font-semibold text-[#212529]">{item.name}</p>
                  <p className="text-xs text-[#6a6c6b]">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}
