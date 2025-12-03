'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiShoppingBag, FiDollarSign, FiHeart, FiTrendingUp, FiPackage, FiClock, FiActivity, FiArrowUp, FiArrowDown } from 'react-icons/fi';
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

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto h-full">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white shadow-lg animate-fadeIn relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">
              ¡Bienvenido, {session?.user?.name?.split(' ')[0]}!
            </h1>
          </div>
          <p className="text-sm text-blue-100">
            Gestiona tus pedidos, saldo y preferencias desde tu panel personal
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slideInUp">
        {/* Balance Card */}
        <Link href="/customer/balance" className="group">
          <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-[#2a63cd]/30">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiDollarSign className="w-4 h-4 text-green-600" />
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                Activo
              </span>
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b] mb-1">Saldo Disponible</h3>
            <p className="text-xl font-bold text-[#212529]">
              ${stats?.balance.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-[#2a63cd] mt-1 font-medium">
              Ver movimientos →
            </p>
          </div>
        </Link>

        {/* Orders Card */}
        <Link href="/customer/orders" className="group">
          <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-[#2a63cd]/30">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiShoppingBag className="w-4 h-4 text-blue-600" />
              </div>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {stats?.pending || 0} Pendiente{(stats?.pending || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b] mb-1">Mis Pedidos</h3>
            <p className="text-xl font-bold text-[#212529]">
              {stats?.orders || 0}
            </p>
            <p className="text-xs text-[#2a63cd] mt-1 font-medium">
              Ver historial →
            </p>
          </div>
        </Link>

        {/* Wishlist Card */}
        <Link href="/customer/wishlist" className="group">
          <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-[#2a63cd]/30">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiHeart className="w-4 h-4 text-pink-600" />
              </div>
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b] mb-1">Lista de Deseos</h3>
            <p className="text-xl font-bold text-[#212529]">
              {stats?.wishlist || 0}
            </p>
            <p className="text-xs text-[#2a63cd] mt-1 font-medium">
              Ver favoritos →
            </p>
          </div>
        </Link>

        {/* Monthly Spending Card */}
        <Link href="/customer/balance" className="group">
          <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-[#2a63cd]/30">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiTrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b] mb-1">Gastado Este Mes</h3>
            <p className="text-xl font-bold text-[#212529]">
              ${stats?.totalSpentThisMonth?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-[#2a63cd] mt-1 font-medium">
              Ver gastos →
            </p>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-slideInLeft">
          <div className="px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#212529] flex items-center gap-2">
                <FiPackage className="w-4 h-4 text-[#2a63cd]" />
                Pedidos Recientes
              </h2>
              <Link href="/customer/orders" className="text-xs text-[#2a63cd] hover:underline font-medium">
                Ver todos
              </Link>
            </div>
          </div>
          <div className="p-3">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-2">
                {stats.recentOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-[#e9ecef] last:border-0 hover:bg-[#f8f9fa] px-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-lg flex items-center justify-center">
                        <FiPackage className="w-4 h-4 text-[#2a63cd]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#212529]">Pedido #{order.orderNumber}</p>
                        <p className="text-xs text-[#6a6c6b]">{order.itemCount} productos • ${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {order.status === 'DELIVERED' ? 'Entregado' :
                          order.status === 'SHIPPED' ? 'Enviado' :
                            order.status === 'PENDING' ? 'Pend.' : order.status}
                      </span>
                      <p className="text-xs text-[#6a6c6b] mt-1">
                        {new Date(order.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiPackage className="w-16 h-16 text-[#adb5bd] mx-auto mb-4" />
                <p className="text-[#6a6c6b]">No tienes pedidos recientes</p>
                <Link href="/productos" className="inline-block mt-4 px-6 py-2 bg-[#2a63cd] text-white rounded-lg hover:bg-[#1e4ba3] transition-colors">
                  Explorar Productos
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-slideInRight">
          <div className="px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
            <h2 className="text-sm font-bold text-[#212529] flex items-center gap-2">
              <FiActivity className="w-4 h-4 text-[#2a63cd]" />
              Actividad
            </h2>
          </div>
          <div className="p-2">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-1">
                {stats.recentActivity.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#f8f9fa] transition-colors">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.type === 'RECHARGE' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                      {activity.type === 'RECHARGE' ? (
                        <FiArrowUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <FiArrowDown className="w-3 h-3 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#212529] truncate">{activity.description}</p>
                      <p className="text-xs text-[#6a6c6b]">
                        {new Date(activity.createdAt).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric'
                        })}
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
              <div className="text-center py-8">
                <FiActivity className="w-12 h-12 text-[#adb5bd] mx-auto mb-3" />
                <p className="text-sm text-[#6a6c6b]">No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-bold text-[#212529] mb-4 flex items-center gap-2">
          <FiTrendingUp className="w-5 h-5 text-[#2a63cd]" />
          Resumen de Cuenta
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[#e9ecef]">
            <p className="text-sm text-[#6a6c6b] mb-1">Total Recargado</p>
            <p className="text-2xl font-bold text-green-600">${stats?.totalRecharges.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#e9ecef]">
            <p className="text-sm text-[#6a6c6b] mb-1">Total Gastado</p>
            <p className="text-2xl font-bold text-purple-600">${stats?.totalSpent.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#e9ecef]">
            <p className="text-sm text-[#6a6c6b] mb-1">Pedidos Completados</p>
            <p className="text-2xl font-bold text-[#2a63cd]">{(stats?.orders || 0) - (stats?.pending || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
