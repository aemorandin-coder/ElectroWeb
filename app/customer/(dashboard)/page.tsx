'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiShoppingBag, FiDollarSign, FiHeart, FiTrendingUp, FiPackage, FiClock, FiActivity, FiArrowUp, FiArrowDown, FiStar, FiChevronRight, FiShield, FiGift, FiZap, FiCheck, FiTruck } from 'react-icons/fi';
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
    // Set greeting based on time of day
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
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#e9ecef]" />
          <div className="absolute inset-0 rounded-full border-4 border-[#2a63cd] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-[#6a6c6b]">Cargando tu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Welcome Section */}
      <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#162d6b] rounded-2xl p-6 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-black mb-1">
                {greeting}, {session?.user?.name?.split(' ')[0] || 'Cliente'}
              </h1>
              <p className="text-blue-100 text-sm">
                Gestiona tus pedidos, saldo y preferencias desde tu panel personal
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-blue-200 text-xs">Saldo disponible</p>
                <p className="text-2xl font-black">${stats?.balance.toFixed(2) || '0.00'}</p>
              </div>
              <Link
                href="/customer/balance"
                className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all hover:scale-105"
              >
                <FiDollarSign className="w-6 h-6" />
              </Link>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FiShoppingBag className="w-4 h-4 text-blue-200" />
                <span className="text-xs text-blue-200">Pedidos</span>
              </div>
              <p className="text-xl font-bold">{stats?.orders || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FiClock className="w-4 h-4 text-amber-300" />
                <span className="text-xs text-blue-200">En proceso</span>
              </div>
              <p className="text-xl font-bold">{stats?.pending || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <FiHeart className="w-4 h-4 text-pink-300" />
                <span className="text-xs text-blue-200">Favoritos</span>
              </div>
              <p className="text-xl font-bold">{stats?.wishlist || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/customer/orders" className="group">
          <div className="bg-white rounded-xl p-4 border border-[#e9ecef] hover:border-[#2a63cd]/30 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
              <FiPackage className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Mis Pedidos</h3>
            <p className="text-xs text-[#6a6c6b]">Ver historial completo</p>
            <div className="flex items-center gap-1 mt-2 text-[#2a63cd] text-xs font-semibold">
              <span>Acceder</span>
              <FiChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/customer/balance" className="group">
          <div className="bg-white rounded-xl p-4 border border-[#e9ecef] hover:border-green-200 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-green-500/20">
              <FiDollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Mi Saldo</h3>
            <p className="text-xs text-[#6a6c6b]">Recargar y ver movimientos</p>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-semibold">
              <span>Gestionar</span>
              <FiChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/customer/wishlist" className="group">
          <div className="bg-white rounded-xl p-4 border border-[#e9ecef] hover:border-pink-200 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-pink-500/20">
              <FiHeart className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Favoritos</h3>
            <p className="text-xs text-[#6a6c6b]">Productos guardados</p>
            <div className="flex items-center gap-1 mt-2 text-pink-600 text-xs font-semibold">
              <span>Ver lista</span>
              <FiChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/customer/warranty" className="group">
          <div className="bg-white rounded-xl p-4 border border-[#e9ecef] hover:border-purple-200 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Garantía</h3>
            <p className="text-xs text-[#6a6c6b]">Soporte y devoluciones</p>
            <div className="flex items-center gap-1 mt-2 text-purple-600 text-xs font-semibold">
              <span>Solicitar</span>
              <FiChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e9ecef] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center">
                <FiPackage className="w-4 h-4 text-[#2a63cd]" />
              </div>
              <h2 className="font-bold text-[#212529]">Pedidos Recientes</h2>
            </div>
            <Link href="/customer/orders" className="text-xs text-[#2a63cd] hover:underline font-semibold flex items-center gap-1">
              Ver todos <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-2">
                {stats.recentOrders.slice(0, 4).map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Link href="/customer/orders" key={order.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8f9fa] transition-colors group">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiPackage className="w-5 h-5 text-[#2a63cd]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#212529] text-sm">#{order.orderNumber}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text} flex items-center gap-1`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#6a6c6b]">{order.itemCount} productos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#212529]">${order.total.toFixed(2)}</p>
                        <p className="text-[10px] text-[#6a6c6b]">
                          {new Date(order.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-[#f8f9fa] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FiPackage className="w-8 h-8 text-[#adb5bd]" />
                </div>
                <p className="text-[#6a6c6b] mb-4">No tienes pedidos recientes</p>
                <Link href="/productos" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2a63cd] text-white rounded-xl hover:bg-[#1e4ba3] transition-colors font-medium text-sm">
                  <FiZap className="w-4 h-4" />
                  Explorar Productos
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity & Stats */}
        <div className="space-y-4 max-h-[450px] overflow-y-auto">
          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e9ecef]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="font-bold text-[#212529]">Actividad</h2>
              </div>
            </div>
            <div className="p-3 max-h-[150px] overflow-y-auto">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentActivity.slice(0, 4).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#f8f9fa] transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.type === 'RECHARGE' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                        {activity.type === 'RECHARGE' ? (
                          <FiArrowUp className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <FiArrowDown className="w-3.5 h-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#212529] truncate">{activity.description}</p>
                        <p className="text-[10px] text-[#6a6c6b]">
                          {new Date(activity.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${activity.type === 'RECHARGE' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {activity.type === 'RECHARGE' ? '+' : '-'}${activity.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FiActivity className="w-10 h-10 text-[#adb5bd] mx-auto mb-2" />
                  <p className="text-xs text-[#6a6c6b]">Sin actividad reciente</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <h3 className="font-bold text-[#212529] text-sm mb-3 flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4 text-[#2a63cd]" />
              Resumen
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6a6c6b]">Total Recargado</span>
                <span className="font-bold text-green-600">${stats?.totalRecharges.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6a6c6b]">Total Gastado</span>
                <span className="font-bold text-purple-600">${stats?.totalSpent.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6a6c6b]">Este Mes</span>
                <span className="font-bold text-[#2a63cd]">${stats?.totalSpentThisMonth?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#212529]">Completados</span>
                  <span className="font-black text-[#2a63cd] text-lg">{(stats?.orders || 0) - (stats?.pending || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
