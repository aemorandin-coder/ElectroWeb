'use client';

import { formatUSD } from '@/lib/currency';
import { adminCard, adminCardFlush, adminEmpty, adminPageHeader, adminPageTitle, adminPageSubtitle, adminSectionTitle, adminSecondaryButton, adminStatLabel, adminStatValue } from '@/lib/admin-ui';

import { toast } from 'react-hot-toast';

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
        toast.error('No se pudieron cargar las estadísticas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const dashboardStats = [
    {
      name: 'Ventas totales',
      value: isLoading ? '...' : formatUSD(stats?.sales?.total || 0),
      change: '',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-brand-500 to-brand-600',
    },
    {
      name: 'Órdenes',
      value: isLoading ? '...' : (stats?.orders.total.toString() || '0'),
      change: `${stats?.orders.pending || 0} ${(stats?.orders.pending || 0) === 1 ? 'pendiente' : 'pendientes'}`,
      changeType: (stats?.orders.pending || 0) > 0 ? 'positive' as const : 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      gradient: 'from-brand-500 to-brand-600',
    },
    {
      name: 'Productos',
      value: isLoading ? '...' : (stats?.products.total.toString() || '0'),
      change: `${stats?.products.published || 0} ${(stats?.products.published || 0) === 1 ? 'publicado' : 'publicados'}`,
      changeType: (stats?.products.published || 0) > 0 ? 'positive' as const : 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-brand-500 to-brand-600',
    },
    {
      name: 'Clientes',
      value: isLoading ? '...' : (stats?.customers.total.toString() || '0'),
      change: '',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-brand-500 to-brand-600',
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
      gradient: 'from-brand-500 to-brand-600',
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
      gradient: 'from-brand-500 to-brand-600',
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
      gradient: 'from-brand-500 to-brand-600',
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
      gradient: 'from-brand-500 to-brand-600',
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
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-warning text-white',
      hoverColor: 'hover:border-warning',
      pulse: true,
    },
    {
      id: 'outOfStock',
      count: stats?.products?.outOfStock || 0,
      title: 'Productos Agotados',
      description: `${stats?.products?.outOfStock || 0} sin stock`,
      icon: <FiAlertTriangle className="w-4 h-4" />,
      href: '/admin/products',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-deal text-white',
      hoverColor: 'hover:border-deal',
      pulse: true,
    },
    {
      id: 'creators',
      count: pendingActions.creators || 0,
      title: 'Creadores de Cursos',
      description: `${pendingActions.creators || 0} solicitudes`,
      icon: <FiUsers className="w-4 h-4" />,
      href: '/admin/creators',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
    {
      id: 'discounts',
      count: pendingActions.discounts || 0,
      title: 'Solicitudes Descuento',
      description: `${pendingActions.discounts || 0} por aprobar`,
      icon: <FiPercent className="w-4 h-4" />,
      href: '/admin/discount-requests',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
    {
      id: 'productRequests',
      count: pendingActions.productRequests || 0,
      title: 'Solicitudes Especiales',
      description: `${pendingActions.productRequests || 0} solicitudes`,
      icon: <FiLayers className="w-4 h-4" />,
      href: '/admin/product-requests',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
    {
      id: 'contactMessages',
      count: pendingActions.contactMessages || 0,
      title: 'Consultas de Clientes',
      description: `${pendingActions.contactMessages || 0} mensajes`,
      icon: <FiMail className="w-4 h-4" />,
      href: '/admin/inquiries',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
    {
      id: 'referrals',
      count: pendingActions.referrals || 0,
      title: 'Afiliados / Referidos',
      description: `${pendingActions.referrals || 0} por aprobar`,
      icon: <FiShare2 className="w-4 h-4" />,
      href: '/admin/marketing',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
    {
      id: 'reviews',
      count: pendingActions.reviews || 0,
      title: 'Reseñas de Productos',
      description: `${pendingActions.reviews || 0} por moderar`,
      icon: <FiStar className="w-4 h-4" />,
      href: '/admin/reviews',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
    {
      id: 'businessVerifications',
      count: pendingActions.businessVerifications || 0,
      title: 'Verificaciones Perfil',
      description: `${pendingActions.businessVerifications || 0} pendientes`,
      icon: <FiShield className="w-4 h-4" />,
      href: '/admin/verifications',
      bgColor: 'bg-white border-line text-ink hover:bg-surface',
      iconBg: 'bg-brand-500 text-white',
      hoverColor: 'hover:border-brand-500',
      pulse: false,
    },
  ];

  const pendingLabel = (id: string, count: number) => {
    const plural = count !== 1;
    const labels: Record<string, string> = {
      orders: plural ? 'pedidos por procesar' : 'pedido por procesar',
      outOfStock: plural ? 'productos sin stock' : 'producto sin stock',
      creators: plural ? 'solicitudes de creadores' : 'solicitud de creador',
      discounts: plural ? 'descuentos por aprobar' : 'descuento por aprobar',
      productRequests: plural ? 'solicitudes especiales' : 'solicitud especial',
      contactMessages: plural ? 'mensajes de clientes' : 'mensaje de cliente',
      referrals: plural ? 'referidos por aprobar' : 'referido por aprobar',
      reviews: plural ? 'reseñas por moderar' : 'reseña por moderar',
      businessVerifications: plural ? 'perfiles por verificar' : 'perfil por verificar',
    };
    return `${count} ${labels[id]}`;
  };

  const activeAlerts = alertsList.filter((alert) => alert.count > 0);

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Resumen</h1>
          <p className={adminPageSubtitle}>{new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <section aria-labelledby="pendientes-titulo" className={adminCardFlush}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h2 id="pendientes-titulo" className={adminSectionTitle}>Por atender</h2>
          {totalPendingActions > 0 && <span className="text-sm text-muted">{totalPendingActions} pendientes</span>}
        </div>
        {isLoading ? (
          <div role="status" aria-label="Cargando pendientes" className="space-y-2 px-4 pb-4">
            {[0, 1].map((i) => <div key={i} className="h-11 rounded-lg bg-surface" />)}
          </div>
        ) : totalPendingActions === 0 ? (
          <p className="flex items-center gap-2 px-4 pb-3 text-sm text-ink-soft"><FiCheckCircle className="h-4 w-4 text-success-strong" aria-hidden="true" /> Todo al día</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {activeAlerts.map((alert) => (
              <li key={alert.id}>
                <Link href={alert.href} className="flex min-h-11 items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                  <span className="shrink-0 text-muted" aria-hidden="true">{alert.icon}</span>
                  <span className="min-w-0 flex-1 font-medium">{pendingLabel(alert.id, alert.count)}</span>
                  <FiChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div key={stat.name} className="min-w-0 rounded-2xl border border-line bg-white p-3 sm:p-4">
            <p className={adminStatLabel}>{stat.name}</p>
            <p className={`${adminStatValue} mt-1 text-lg tabular-nums [overflow-wrap:anywhere] sm:text-2xl`}>{stat.value}</p>
            {stat.change && <p className="mt-1 text-xs text-muted">{stat.change}</p>}
          </div>
        ))}
      </div>

      <section className={adminCard} aria-labelledby="ventas-titulo">
        <div className="mb-4">
          <h2 id="ventas-titulo" className={adminSectionTitle}>Ventas</h2>
          <p className="text-sm text-muted">Últimos 7 días</p>
        </div>
        <div className="h-40 min-w-0 sm:h-56">
          {isLoading ? (
            <div role="status" aria-label="Cargando ventas" className="h-full rounded-lg bg-surface" />
          ) : stats?.sales?.history && stats.sales.history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={stats.sales.history} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} dy={5} />
                <YAxis width={76} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} tickFormatter={(value) => formatUSD(Number(value))} />
                <Tooltip formatter={(value) => [formatUSD(Number(value) || 0), 'Ventas']} />
                <Area type="monotone" dataKey="amount" stroke="var(--color-brand-500)" strokeWidth={1.5} fillOpacity={0.15} fill="var(--color-brand-500)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={`${adminEmpty} h-full py-4`}><p className="text-sm text-muted">No hay datos de ventas recientes</p></div>
          )}
        </div>
      </section>

      <section aria-labelledby="accesos-titulo">
        <h2 id="accesos-titulo" className={`${adminSectionTitle} mb-3`}>Accesos rápidos</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} title={action.description} className={adminSecondaryButton}>
              <span aria-hidden="true">{action.icon}</span>{action.title}
              <span className="sr-only">: {action.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
