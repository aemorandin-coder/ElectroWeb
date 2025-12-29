'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiShoppingBag, FiDollarSign, FiHeart, FiTrendingUp, FiPackage, FiClock, FiActivity, FiArrowUp, FiArrowDown, FiChevronRight, FiShield, FiZap, FiCheck, FiTruck, FiUser, FiLogIn } from 'react-icons/fi';
import { useState, useEffect } from 'react';

interface DashboardStats {
  balance: number;
  totalRecharges: number;
  totalSpent: number;
  orders: number;
  pending: number;
  wishlist: number;
  totalSpentThisMonth: number;
  recentOrders: any[];
  recentActivity: any[];
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
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendiente', icon: FiClock },
      CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Confirmado', icon: FiCheck },
      PAID: { bg: 'bg-green-50', text: 'text-green-700', label: 'Pagado', icon: FiDollarSign },
      PROCESSING: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Preparando', icon: FiPackage },
      SHIPPED: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Enviado', icon: FiTruck },
      DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Entregado', icon: FiCheck },
    };
    return configs[status] || configs.PENDING;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-12 h-12 lg:w-16 lg:h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#e9ecef]" />
          <div className="absolute inset-0 rounded-full border-4 border-[#2a63cd] border-t-transparent animate-spin" />
        </div>
        <p className="mt-3 text-xs lg:text-sm text-[#6a6c6b]">Cargando tu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 lg:gap-3">
      {/* Hero Welcome Section - Responsive */}
      <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#162d6b] rounded-lg lg:rounded-xl p-3 lg:p-4 text-white overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-36 lg:w-56 h-36 lg:h-56 bg-blue-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          {/* Greeting - Always visible */}
          <div className="mb-2 lg:mb-0 lg:flex lg:items-center lg:justify-between">
            <div className="flex-shrink-0">
              <h1 className="text-lg lg:text-xl font-black mb-0.5">
                {greeting}, {session?.user?.name?.split(' ')[0] || 'Cliente'}
              </h1>
              <p className="text-blue-100 text-[10px] lg:text-xs">Gestiona tus pedidos, saldo y preferencias</p>
            </div>

            {/* Stats Row - Horizontal scroll on mobile, flex on desktop */}
            <div className="flex items-center gap-2 mt-2 lg:mt-0 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 border border-white/10 text-center flex-shrink-0 min-w-[60px] lg:min-w-[70px]">
                <div className="flex items-center gap-1 justify-center mb-0.5">
                  <FiShoppingBag className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-blue-200" />
                  <span className="text-[8px] lg:text-[10px] text-blue-200">Pedidos</span>
                </div>
                <p className="text-sm lg:text-lg font-bold">{stats?.orders || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 border border-white/10 text-center flex-shrink-0 min-w-[60px] lg:min-w-[70px]">
                <div className="flex items-center gap-1 justify-center mb-0.5">
                  <FiClock className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-amber-300" />
                  <span className="text-[8px] lg:text-[10px] text-blue-200">Proceso</span>
                </div>
                <p className="text-sm lg:text-lg font-bold">{stats?.pending || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 border border-white/10 text-center flex-shrink-0 min-w-[60px] lg:min-w-[70px]">
                <div className="flex items-center gap-1 justify-center mb-0.5">
                  <FiHeart className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-pink-300" />
                  <span className="text-[8px] lg:text-[10px] text-blue-200">Favoritos</span>
                </div>
                <p className="text-sm lg:text-lg font-bold">{stats?.wishlist || 0}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 lg:px-4 py-1.5 lg:py-2 border border-white/20 text-center flex-shrink-0">
                <p className="text-blue-200 text-[8px] lg:text-[10px]">Saldo</p>
                <p className="text-base lg:text-xl font-black">${stats?.balance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
        <Link href="/customer/orders" className="group flex-1">
          <div className="bg-white rounded-lg p-2 lg:p-2.5 border border-[#e9ecef] hover:border-[#2a63cd]/30 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                <FiPackage className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#212529] text-[10px] lg:text-[11px] truncate">Mis Pedidos</h3>
                <p className="text-[8px] lg:text-[9px] text-[#6a6c6b]">Ver historial</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/customer/balance" className="group flex-1">
          <div className="bg-white rounded-lg p-2 lg:p-2.5 border border-[#e9ecef] hover:border-green-200 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                <FiDollarSign className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#212529] text-[10px] lg:text-[11px] truncate">Mi Saldo</h3>
                <p className="text-[8px] lg:text-[9px] text-[#6a6c6b]">Recargar</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/customer/wishlist" className="group flex-1">
          <div className="bg-white rounded-lg p-2 lg:p-2.5 border border-[#e9ecef] hover:border-pink-200 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-pink-500 to-rose-600 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                <FiHeart className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#212529] text-[10px] lg:text-[11px] truncate">Favoritos</h3>
                <p className="text-[8px] lg:text-[9px] text-[#6a6c6b]">Ver lista</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/customer/warranty" className="group flex-1">
          <div className="bg-white rounded-lg p-2 lg:p-2.5 border border-[#e9ecef] hover:border-purple-200 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-purple-500 to-violet-600 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                <FiShield className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#212529] text-[10px] lg:text-[11px] truncate">Garantía</h3>
                <p className="text-[8px] lg:text-[9px] text-[#6a6c6b]">Soporte</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3 flex-1 min-h-0">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e9ecef] overflow-hidden flex flex-col">
          <div className="px-2 lg:px-3 py-1.5 lg:py-2 border-b border-[#e9ecef] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5 lg:gap-2">
              <div className="w-5 h-5 lg:w-6 lg:h-6 bg-[#2a63cd]/10 rounded-md flex items-center justify-center">
                <FiPackage className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[#2a63cd]" />
              </div>
              <h2 className="font-bold text-[#212529] text-sm lg:text-base">Pedidos Recientes</h2>
            </div>
            <Link href="/customer/orders" className="text-[9px] lg:text-[10px] text-[#2a63cd] hover:underline font-semibold flex items-center gap-0.5">
              Ver todos <FiChevronRight className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
            </Link>
          </div>
          <div className="p-1.5 lg:p-2 flex-1 overflow-y-auto">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-1">
                {stats.recentOrders.slice(0, 3).map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Link href="/customer/orders" key={order.id} className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg hover:bg-[#f8f9fa] transition-colors">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/5 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiPackage className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-[#2a63cd]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                          <p className="font-bold text-[#212529] text-xs lg:text-sm">#{order.orderNumber}</p>
                          <span className={`px-1.5 lg:px-2 py-0.5 rounded-full text-[8px] lg:text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text} flex items-center gap-0.5 lg:gap-1`}>
                            <StatusIcon className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-[10px] lg:text-xs text-[#6a6c6b]">{order.itemCount} productos</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[#212529] text-sm lg:text-base">${order.total.toFixed(2)}</p>
                        <p className="text-[8px] lg:text-[10px] text-[#6a6c6b]">
                          {new Date(order.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 lg:py-6">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#f8f9fa] rounded-xl flex items-center justify-center mx-auto mb-2">
                  <FiPackage className="w-5 h-5 lg:w-6 lg:h-6 text-[#adb5bd]" />
                </div>
                <p className="text-[#6a6c6b] text-[10px] lg:text-xs mb-2">No tienes pedidos recientes</p>
                <Link href="/productos" className="inline-flex items-center gap-1 px-2.5 lg:px-3 py-1 lg:py-1.5 bg-[#2a63cd] text-white rounded-lg hover:bg-[#1e4ba3] transition-colors font-medium text-[10px] lg:text-xs">
                  <FiZap className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                  Explorar Productos
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity & Stats */}
        <div className="flex flex-col gap-2">
          {/* Activity Feed */}
          <div className="bg-white rounded-lg border border-[#e9ecef] overflow-hidden flex flex-col flex-1">
            <div className="px-2 lg:px-3 py-1.5 lg:py-2 border-b border-[#e9ecef] flex-shrink-0">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <div className="w-5 h-5 lg:w-7 lg:h-7 bg-green-100 rounded-md flex items-center justify-center">
                  <FiActivity className="w-2.5 h-2.5 lg:w-4 lg:h-4 text-green-600" />
                </div>
                <h2 className="font-bold text-[#212529] text-sm lg:text-base">Actividad</h2>
              </div>
            </div>
            <div className="p-2 lg:p-3 flex-1 overflow-y-auto">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-1.5 lg:space-y-2">
                  {stats.recentActivity.slice(0, 4).map((activity) => {
                    // Determine icon and color based on activity type
                    const getActivityStyle = (type: string) => {
                      switch (type) {
                        case 'LOGIN':
                          return { bg: 'bg-blue-100', icon: <FiLogIn className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-blue-600" />, color: 'text-blue-600' };
                        case 'ORDER':
                          return { bg: 'bg-purple-100', icon: <FiPackage className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-purple-600" />, color: 'text-purple-600' };
                        case 'ACCOUNT':
                          return { bg: 'bg-green-100', icon: <FiUser className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-green-600" />, color: 'text-green-600' };
                        case 'RECHARGE':
                        case 'DEPOSIT':
                          return { bg: 'bg-emerald-100', icon: <FiArrowUp className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-emerald-600" />, color: 'text-emerald-600' };
                        case 'PURCHASE':
                          return { bg: 'bg-red-100', icon: <FiArrowDown className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-red-600" />, color: 'text-red-600' };
                        default:
                          return { bg: 'bg-gray-100', icon: <FiActivity className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-gray-600" />, color: 'text-gray-600' };
                      }
                    };
                    const style = getActivityStyle(activity.type);

                    return (
                      <div key={activity.id} className="flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 rounded-lg hover:bg-[#f8f9fa] transition-colors">
                        <div className={`w-5 h-5 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] lg:text-xs font-medium text-[#212529] truncate">{activity.description}</p>
                          <p className="text-[8px] lg:text-[10px] text-[#6a6c6b]">
                            {new Date(activity.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        {activity.amount && (
                          <span className={`text-[10px] lg:text-xs font-bold ${style.color} flex-shrink-0`}>
                            {activity.type === 'RECHARGE' || activity.type === 'DEPOSIT' ? '+' : activity.type === 'PURCHASE' ? '-' : ''}${activity.amount?.toFixed(2) || ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 lg:py-4">
                  <FiActivity className="w-6 h-6 lg:w-8 lg:h-8 text-[#adb5bd] mx-auto mb-1.5 lg:mb-2" />
                  <p className="text-[10px] lg:text-xs text-[#6a6c6b]">Sin actividad reciente</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 lg:p-4 border border-blue-100 flex-shrink-0">
            <h3 className="font-bold text-[#212529] text-sm lg:text-base mb-2 lg:mb-3 flex items-center gap-1.5 lg:gap-2">
              <FiTrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2a63cd]" />
              Resumen
            </h3>
            <div className="space-y-1.5 lg:space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] lg:text-xs text-[#6a6c6b]">Total Recargado</span>
                <span className="font-bold text-green-600 text-xs lg:text-sm">${stats?.totalRecharges?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] lg:text-xs text-[#6a6c6b]">Total Gastado</span>
                <span className="font-bold text-purple-600 text-xs lg:text-sm">${stats?.totalSpent?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] lg:text-xs text-[#6a6c6b]">Este Mes</span>
                <span className="font-bold text-[#2a63cd] text-xs lg:text-sm">${stats?.totalSpentThisMonth?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

