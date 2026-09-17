'use client';
import { formatUSD } from '@/lib/currency';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiShoppingBag, FiDollarSign, FiHeart, FiTrendingUp, FiPackage, FiClock, FiActivity, FiArrowUp, FiArrowDown, FiChevronRight, FiTag, FiCheck, FiTruck, FiUser, FiLogIn } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import CustomerOnboarding from '@/components/customer/CustomerOnboarding';
import { adminPrimaryButton } from '@/lib/admin-ui';

import type { IconType } from 'react-icons';

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  itemCount: number;
  total: number;
  createdAt: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  amount?: number | null;
}

interface DashboardStats {
  balance: number;
  totalRecharges: number;
  totalSpent: number;
  orders: number;
  pending: number;
  wishlist: number;
  tieneDireccion?: boolean;
  datosCompletos?: boolean;
  totalSpentThisMonth: number;
  recentOrders: RecentOrder[];
  recentActivity: RecentActivity[];
}

export default function CustomerDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/customer/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('No se pudieron cargar los datos del panel');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string; icon: IconType }> = {
      PENDING: { bg: 'bg-warning/15', text: 'text-warning-strong', label: 'Pendiente', icon: FiClock },
      CONFIRMED: { bg: 'bg-brand-50', text: 'text-brand-700', label: 'Confirmado', icon: FiCheck },
      PAID: { bg: 'bg-success-strong/10', text: 'text-success-strong', label: 'Pagado', icon: FiDollarSign },
      PROCESSING: { bg: 'bg-brand-50', text: 'text-brand-700', label: 'Preparando', icon: FiPackage },
      SHIPPED: { bg: 'bg-brand-50', text: 'text-brand-700', label: 'Enviado', icon: FiTruck },
      DELIVERED: { bg: 'bg-success-strong/10', text: 'text-success-strong', label: 'Entregado', icon: FiCheck },
    };
    return configs[status] || configs.PENDING;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-12 h-12 lg:w-16 lg:h-16">
          <div className="absolute inset-0 rounded-full border-4 border-line" />
          <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
        <p className="mt-3 text-xs lg:text-sm text-muted">Cargando tu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 lg:gap-3">
      {/* Hero Welcome Section - Compact with icon stats */}
      <div className="relative bg-brand-600 rounded-lg lg:rounded-xl p-3 lg:p-4 text-white overflow-hidden flex-shrink-0">
        <div className="flex flex-col gap-3">
          {/* Greeting - Title */}
          <div className="flex-shrink-0">
            <h1 className="text-xl lg:text-2xl font-bold mb-0.5 leading-tight">
              {greeting},<br className="sm:hidden" /> {session?.user?.name?.split(' ')[0] || 'Cliente'}
            </h1>
            <p className="text-white/80 text-xs lg:text-sm hidden sm:block">Gestiona tus pedidos y preferencias</p>
          </div>

          {/* Stats - Icons under text on mobile, responsive row */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2">
              {/* Pedidos */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                  <FiShoppingBag className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 bg-white text-brand-500 text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {stats?.orders || 0}
                </span>
              </div>

              {/* En Proceso */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-warning-strong/30 rounded-xl flex items-center justify-center border border-white/20">
                  <FiClock className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 bg-warning-strong text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {stats?.pending || 0}
                </span>
              </div>

              {/* Favoritos */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
                  <FiHeart className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {stats?.wishlist || 0}
                </span>
              </div>
            </div>

            {/* Saldo - Right aligned on mobile */}
            <div className="bg-white/20 rounded-xl px-3 py-1.5 border border-white/20 text-right min-w-[80px]">
              <p className="text-white/80 text-xs uppercase font-bold tracking-tighter">Saldo</p>
              <p className="text-base lg:text-xl font-bold">{formatUSD(stats?.balance || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Onboarding Section */}
      <CustomerOnboarding stats={stats} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white border border-line rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-line flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                <FiPackage className="w-3 h-3 lg:w-4 lg:h-4 text-brand-600" />
              </div>
              <h2 className="font-bold text-ink text-sm lg:text-base">Pedidos Recientes</h2>
            </div>
            <Link href="/customer/orders" className="text-xs text-brand-600 hover:underline font-semibold flex items-center gap-0.5">
              Ver todos <FiChevronRight className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
            </Link>
          </div>
          <div className="p-3 lg:p-4 flex-1 overflow-y-auto">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-2">
                {stats.recentOrders.slice(0, 3).map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Link href="/customer/orders" key={order.id} className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl hover:bg-surface border border-transparent hover:border-line transition-all">
                      <div className="w-9 h-9 lg:w-11 lg:h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiPackage className="w-4 h-4 lg:w-5 lg:h-5 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-ink text-xs lg:text-sm">#{order.orderNumber}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} flex items-center gap-0.5 lg:gap-1`}>
                            <StatusIcon className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{order.itemCount} productos</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-ink text-sm lg:text-base">{formatUSD(order.total)}</p>
                        <p className="text-xs text-muted">
                          {new Date(order.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 lg:py-12">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-surface border border-line rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FiPackage className="w-6 h-6 lg:w-8 lg:h-8 text-subtle" />
                </div>
                <h3 className="text-sm lg:text-base font-bold text-ink mb-1">Empieza tu aventura</h3>
                <p className="text-muted text-xs lg:text-sm mb-4">Aún no tienes pedidos. ¡Es hora de armar tu setup!</p>
                <Link href="/" className={`${adminPrimaryButton} inline-flex items-center gap-2`}>
                  <FiTag className="w-4 h-4" />
                  Ver Ofertas de Hoy
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity & Stats */}
        <div className="flex flex-col gap-4">
          {/* Activity Feed */}
          <div className="bg-white border border-line rounded-2xl overflow-hidden flex flex-col flex-1 shadow-sm">
            <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 lg:w-7 lg:h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-3 h-3 lg:w-4 lg:h-4 text-brand-600" />
                </div>
                <h2 className="font-bold text-ink text-sm lg:text-base">Actividad</h2>
              </div>
            </div>
            <div className="p-3 lg:p-4 flex-1 overflow-y-auto">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-1.5 lg:space-y-2">
                  {stats.recentActivity.slice(0, 4).map((activity) => {
                    const getActivityStyle = (type: string) => {
                      switch (type) {
                        case 'LOGIN':
                          return { bg: 'bg-brand-50', icon: <FiLogIn className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-brand-600" />, color: 'text-brand-600' };
                        case 'ORDER':
                          return { bg: 'bg-brand-50', icon: <FiPackage className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-brand-600" />, color: 'text-brand-600' };
                        case 'ACCOUNT':
                          return { bg: 'bg-brand-50', icon: <FiUser className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-brand-600" />, color: 'text-brand-600' };
                        case 'RECHARGE':
                        case 'DEPOSIT':
                          return { bg: 'bg-success-strong/10', icon: <FiArrowUp className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-success-strong" />, color: 'text-success-strong' };
                        case 'PURCHASE':
                          return { bg: 'bg-deal-bg', icon: <FiArrowDown className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-deal" />, color: 'text-deal' };
                        default:
                          return { bg: 'bg-surface', icon: <FiActivity className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-muted" />, color: 'text-muted' };
                      }
                    };
                    const style = getActivityStyle(activity.type);

                    return (
                      <div key={activity.id} className="flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 rounded-lg hover:bg-surface transition-colors">
                        <div className={`w-5 h-5 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ink truncate">{activity.description}</p>
                          <p className="text-xs text-muted">
                            {new Date(activity.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        {activity.amount && (
                          <span className={`text-xs font-bold ${style.color} flex-shrink-0`}>
                            {activity.type === 'RECHARGE' || activity.type === 'DEPOSIT' ? '+' : activity.type === 'PURCHASE' ? '-' : ''}{formatUSD(activity.amount || 0)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 lg:py-4">
                  <FiActivity className="w-6 h-6 lg:w-8 lg:h-8 text-subtle mx-auto mb-1.5 lg:mb-2" />
                  <p className="text-xs text-muted">Sin actividad reciente</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-surface rounded-xl p-3 lg:p-4 border border-line flex-shrink-0">
            <h3 className="font-bold text-ink text-sm lg:text-base mb-2 lg:mb-3 flex items-center gap-1.5 lg:gap-2">
              <FiTrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand-500" />
              Resumen
            </h3>
            <div className="space-y-1.5 lg:space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Total Recargado</span>
                <span className="font-bold text-success-strong text-xs lg:text-sm">{formatUSD(stats?.totalRecharges || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Total Gastado</span>
                <span className="font-bold text-ink text-xs lg:text-sm">{formatUSD(stats?.totalSpent || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Este Mes</span>
                <span className="font-bold text-brand-600 text-xs lg:text-sm">{formatUSD(stats?.totalSpentThisMonth || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
