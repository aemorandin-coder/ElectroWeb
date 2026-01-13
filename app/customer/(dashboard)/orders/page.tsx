'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiPackage, FiClock, FiCheck, FiX, FiTruck, FiShoppingBag, FiEye, FiSearch, FiRefreshCw, FiArrowLeft, FiDollarSign, FiChevronRight } from 'react-icons/fi';
import { BsCardList } from 'react-icons/bs';
import Link from 'next/link';
import OrderTracking from '@/components/orders/OrderTracking';
import { formatPaymentMethod } from '@/lib/format-helpers';

interface OrderItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  priceUSD: number;
  totalUSD: number;
  productImage?: string;
  product?: { productType?: string; };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalUSD: number;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: OrderItem[];
  address?: any;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryMethod?: string;
  notes?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingNotes?: string;
  estimatedDelivery?: string;
  hasDigital?: boolean;
}

// ============================================
// MOBILE-ONLY SKELETON COMPONENTS
// Premium loading states for mobile orders
// ============================================
const MobileOrdersSkeleton = () => (
  <div className="lg:hidden space-y-4 p-4">
    {/* Hero Stats Skeleton */}
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-5">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-white/20 rounded-full mb-3" />
        <div className="h-10 w-32 bg-white/30 rounded-lg mb-4" />
        <div className="flex gap-3">
          <div className="h-14 flex-1 bg-white/10 rounded-xl" />
          <div className="h-14 flex-1 bg-white/10 rounded-xl" />
          <div className="h-14 flex-1 bg-white/10 rounded-xl" />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>

    {/* Search Skeleton */}
    <div className="h-11 bg-white rounded-xl border border-gray-100 animate-pulse" />

    {/* Orders Skeleton */}
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-gray-100 p-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-xl" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-gray-200 rounded-full mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded-full" />
            </div>
            <div className="h-5 w-16 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + o.totalUSD : sum, 0);
    const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    return { totalSpent, completedOrders, pendingOrders, totalItems };
  }, [orders]);

  useEffect(() => { setMounted(true); }, []);

  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showOrderDetails) setShowOrderDetails(false);
  }, [showOrderDetails]);

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  useEffect(() => {
    document.body.style.overflow = showOrderDetails ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showOrderDetails]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result) ? result : (result.orders || []);
        setOrders(data.map((order: any) => ({
          ...order,
          totalUSD: Number(order.totalUSD) || 0,
          hasDigital: order.items?.some((item: any) => item.product?.productType === 'DIGITAL') || false,
          items: order.items?.map((item: any) => ({
            ...item,
            priceUSD: Number(item.priceUSD) || 0,
            totalUSD: Number(item.totalUSD) || 0,
          })) || []
        })));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; animation?: string; gradient?: string }> = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300', icon: <FiClock className="w-4 h-4" />, animation: 'animate-pulse', gradient: 'from-amber-400 to-amber-500' },
      PAID: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300', icon: <FiCheck className="w-4 h-4" />, gradient: 'from-blue-400 to-blue-500' },
      PROCESSING: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-300', icon: <FiPackage className="w-4 h-4" />, animation: 'animate-spin-slow', gradient: 'from-purple-400 to-purple-500' },
      SHIPPED: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-300', icon: <FiTruck className="w-4 h-4" />, animation: 'animate-bounce-subtle', gradient: 'from-indigo-400 to-indigo-500' },
      DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-300', icon: <FiCheck className="w-4 h-4" />, gradient: 'from-emerald-400 to-emerald-500' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300', icon: <FiX className="w-4 h-4" />, gradient: 'from-red-400 to-red-500' },
    };
    return configs[status] || configs.PENDING;
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PAID: 'Pagado', PROCESSING: 'Preparando',
      SHIPPED: 'Enviado', DELIVERED: 'Entregado', CANCELLED: 'Cancelado', READY_FOR_PICKUP: 'Listo'
    };
    return map[status] || status;
  };

  const getStatusTextShort = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'Pend', CONFIRMED: 'Conf', PAID: 'Pago', PROCESSING: 'Prep',
      SHIPPED: 'Envío', DELIVERED: 'Entreg', CANCELLED: 'Canc', READY_FOR_PICKUP: 'Listo'
    };
    return map[status] || status;
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'ALL' || order.status === selectedStatus;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const closeModal = () => setShowOrderDetails(false);

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}sem`;
    return `${Math.floor(days / 30)}m`;
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <>
        {/* Mobile skeleton */}
        <MobileOrdersSkeleton />

        {/* Desktop loading - unchanged */}
        <div className="hidden lg:flex items-center justify-center py-12">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-[#e9ecef]" />
            <div className="absolute inset-0 rounded-full border-2 border-[#2a63cd] border-t-transparent animate-spin" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ============================================
          🚀 MOBILE VIEW - PREMIUM ANIMATED DESIGN
          Epic animations for Android Full HD+ / QHD+
          ============================================ */}
      <div className="lg:hidden overflow-y-auto h-full -m-2 bg-slate-50">
        {/* ========================================
            ANIMATED HERO - Premium Effects
            ======================================== */}
        <div className="relative mx-2 mt-2 rounded-2xl overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#0ea5e9]">
            {/* Floating Orbs */}
            <div className="absolute top-2 right-4 w-16 h-16 bg-white/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-3 left-3 w-12 h-12 bg-cyan-300/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          </div>

          {/* Content */}
          <div className="relative z-10 p-3">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Title + Total */}
              <div className="flex items-center gap-2 animate-fadeIn">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FiPackage className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[9px] text-blue-200 uppercase font-bold tracking-wider">Mis Pedidos</p>
                  <p className="text-xl font-black text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                    ${stats.totalSpent.toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Right: Animated Icon Stats */}
              <div className="flex items-center gap-1.5">
                {/* Completed - Animated Badge */}
                <div className="relative animate-slideInUp" style={{ animationDelay: '0.1s' }}>
                  <div className="w-8 h-8 bg-emerald-500/30 rounded-lg flex items-center justify-center backdrop-blur-sm border border-emerald-300/20">
                    <FiCheck className="w-4 h-4 text-emerald-200" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-emerald-600 text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                    {stats.completedOrders}
                  </span>
                </div>

                {/* Pending - Animated Badge */}
                <div className="relative animate-slideInUp" style={{ animationDelay: '0.15s' }}>
                  <div className="w-8 h-8 bg-amber-500/30 rounded-lg flex items-center justify-center backdrop-blur-sm border border-amber-300/20">
                    <FiClock className="w-4 h-4 text-amber-200" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-amber-600 text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse" style={{ animationDelay: '0.3s' }}>
                    {stats.pendingOrders}
                  </span>
                </div>

                {/* Items - Animated Badge */}
                <div className="relative animate-slideInUp" style={{ animationDelay: '0.2s' }}>
                  <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center backdrop-blur-sm border border-blue-300/20">
                    <FiShoppingBag className="w-4 h-4 text-blue-200" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-blue-600 text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {stats.totalItems}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================
            SEARCH & FILTERS - Ultra Compact
            ======================================== */}
        <div className="px-2 pt-2 pb-1 space-y-1.5">
          {/* Search Bar - Centered placeholder */}
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-[11px] text-center bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-center"
            />
            <button
              onClick={fetchOrders}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600"
            >
              <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div >

          {/* Filter Pills - FULL TEXT (no abbreviations) */}
          < div className="flex gap-1 overflow-x-auto scrollbar-hide" >
            {
              [
                { value: 'ALL', label: 'Todos' },
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'PROCESSING', label: 'Preparando' },
                { value: 'SHIPPED', label: 'Enviado' },
                { value: 'DELIVERED', label: 'Entregado' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`px-2 py-1 text-[8px] font-bold rounded-md whitespace-nowrap transition-all flex-shrink-0 ${selectedStatus === filter.value
                    ? 'bg-[#2a63cd] text-white'
                    : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                >
                  {filter.label}
                </button>
              ))
            }
          </div >
        </div >

        {/* ========================================
            ORDERS LIST - Ultra Compact
            ======================================== */}
        < div className="px-2 pb-20 space-y-1" >
          {
            filteredOrders.length === 0 ? (
              /* Empty State */
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 bg-blue-50 rounded-full flex items-center justify-center">
                  <FiPackage className="w-6 h-6 text-blue-300" />
                </div>
                <p className="text-[11px] font-bold text-gray-700 mb-1">Sin pedidos</p>
                <p className="text-[9px] text-gray-400 mb-3">
                  {selectedStatus === 'ALL' ? 'Aún no has realizado ningún pedido' : 'No hay pedidos con este estado'}
                </p>
                <Link
                  href="/productos"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-[#2a63cd] text-white text-[10px] font-bold rounded-lg"
                >
                  <FiShoppingBag className="w-3 h-3" />
                  Explorar
                </Link>
              </div>
            ) : (
              /* Orders List - Ultra Compact */
              filteredOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg p-2 border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {/* Status Icon - Very small */}
                      <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${statusConfig.gradient || 'from-blue-400 to-blue-500'} flex items-center justify-center flex-shrink-0`}>
                        <FiPackage className="w-3.5 h-3.5 text-white" />
                      </div>

                      {/* Order Info - Compact single line */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-900 text-[10px] whitespace-nowrap">#{order.orderNumber}</span>
                          <span className={`px-1 py-0.5 rounded text-[7px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400">
                          {getTimeSince(order.createdAt)} • {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Price */}
                      <span className="text-[11px] font-black text-gray-900 flex-shrink-0">${order.totalUSD.toFixed(0)}</span>

                      {/* Actions - Single row */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {order.hasDigital && order.paymentStatus === 'PAID' && (
                          <Link
                            href={`/customer/orders/${order.id}/digital`}
                            className="w-6 h-6 bg-purple-500 text-white rounded flex items-center justify-center"
                          >
                            <BsCardList className="w-3 h-3" />
                          </Link>
                        )}
                        <button
                          onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}
                          className="w-6 h-6 bg-gray-100 text-gray-500 rounded flex items-center justify-center"
                        >
                          <FiChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          }
        </div >
      </div >

      {/* ============================================
          💻 DESKTOP VIEW - COMPLETELY UNCHANGED
          Only shows on screens >= 1024px
          ============================================ */}
      < div className="hidden lg:block space-y-2" >
        {/* STATS - Premium icons with counter on top */}
        < div className="flex items-center gap-1.5 overflow-x-auto pb-1" >
          {/* Total Spent - Only medal style */}
          < div className="bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl px-3 py-2 text-white flex-shrink-0 min-w-[90px]" >
            <div className="flex items-center gap-1.5 mb-0.5">
              <FiDollarSign className="w-4 h-4 opacity-80" />
              <span className="text-[9px] opacity-70">Total</span>
            </div>
            <p className="text-base lg:text-lg font-black">${stats.totalSpent.toFixed(0)}</p>
          </div >

          {/* Completed - Icon with counter */}
          < div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-emerald-200 flex-shrink-0 min-w-[56px]" >
            <div className="relative">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {stats.completedOrders}
              </span>
            </div>
          </div >

          {/* In Process - Icon with counter and animation */}
          < div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-amber-200 flex-shrink-0 min-w-[56px]" >
            <div className="relative">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center animate-pulse">
                <FiClock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {stats.pendingOrders}
              </span>
            </div>
          </div >

          {/* Items - Icon with counter */}
          < div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-blue-200 flex-shrink-0 min-w-[56px]" >
            <div className="relative">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiPackage className="w-5 h-5 text-blue-600" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {stats.totalItems}
              </span>
            </div>
          </div >
        </div >

        {/* Search & Filter - Compact */}
        < div className="flex items-center gap-1.5" >
          <div className="relative flex-1">
            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 text-xs border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 bg-white min-w-[65px]"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pend</option>
            <option value="PROCESSING">Prep</option>
            <option value="SHIPPED">Envío</option>
            <option value="DELIVERED">Entreg</option>
          </select>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-1.5 bg-[#2a63cd] text-white rounded-lg hover:bg-[#1e4ba3] transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div >

        {/* Orders List - Compact cards */}
        {
          filteredOrders.length === 0 ? (
            <div className="text-center py-8 bg-[#f8f9fa] rounded-xl border border-dashed border-[#dee2e6]">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                <FiPackage className="w-5 h-5 text-[#adb5bd]" />
              </div>
              <h3 className="text-sm font-bold text-[#212529] mb-1">Sin pedidos</h3>
              <Link href="/productos" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2a63cd] text-white text-xs font-medium rounded-lg">
                <FiShoppingBag className="w-3.5 h-3.5" /> Explorar
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg border border-[#e9ecef] p-2 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {/* Order Icon - Compact */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd]/10 to-[#2a63cd]/5 rounded-lg flex items-center justify-center">
                          <FiPackage className="w-4 h-4 text-[#2a63cd]" />
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${statusConfig.bg} ${statusConfig.border} border flex items-center justify-center`}>
                          <span className={`${statusConfig.text} ${statusConfig.animation} scale-75`}>{statusConfig.icon}</span>
                        </div>
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <h3 className="font-bold text-[#212529] text-[9px] lg:text-xs">#{order.orderNumber}</h3>
                          <span className={`px-1 py-0.5 rounded text-[7px] lg:text-[8px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                            {getStatusTextShort(order.status)}
                          </span>
                        </div>
                        <p className="text-[9px] lg:text-[10px] text-[#6a6c6b]">
                          {getTimeSince(order.createdAt)} • {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Price */}
                      <p className="text-xs lg:text-sm font-black text-[#212529] mr-1">${order.totalUSD.toFixed(0)}</p>

                      {/* Actions - Larger and centered */}
                      <div className="flex items-center gap-1">
                        {order.hasDigital && order.paymentStatus === 'PAID' && (
                          <Link
                            href={`/customer/orders/${order.id}/digital`}
                            className="w-9 h-9 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-95"
                          >
                            <BsCardList className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}
                          className="w-9 h-9 bg-[#f8f9fa] hover:bg-[#2a63cd] text-[#6a6c6b] hover:text-white rounded-lg flex items-center justify-center transition-all active:scale-95"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div >

      {/* Order Details Modal - FIXED X BUTTON OUTSIDE CONTAINER */}
      {
        mounted && showOrderDetails && selectedOrder && createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-3"
            style={{ zIndex: 999999 }}
          >
            {/* Backdrop */}
            <div
              onClick={closeModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* CLOSE BUTTON - POSITIONED OUTSIDE THE MODAL */}
            <button
              onClick={closeModal}
              className="fixed top-4 right-4 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
              style={{ zIndex: 1000000 }}
              aria-label="Cerrar"
            >
              <FiX className="w-6 h-6 text-gray-700" />
            </button>

            {/* Modal Content */}
            <div
              className="relative bg-white rounded-2xl w-full max-w-xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col"
              style={{ zIndex: 1 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-4 py-3 text-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiPackage className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] opacity-70">Pedido</p>
                    <h3 className="text-lg font-black">#{selectedOrder.orderNumber}</h3>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="bg-[#f8f9fa] rounded-xl p-3 mb-4">
                  <OrderTracking
                    status={selectedOrder.status}
                    createdAt={selectedOrder.createdAt}
                    paidAt={selectedOrder.paidAt}
                    shippedAt={selectedOrder.shippedAt}
                    deliveredAt={selectedOrder.deliveredAt}
                    deliveryMethod={selectedOrder.deliveryMethod || 'HOME_DELIVERY'}
                    shippingCarrier={selectedOrder.shippingCarrier}
                    trackingNumber={selectedOrder.trackingNumber}
                    trackingUrl={selectedOrder.trackingUrl}
                    shippingNotes={selectedOrder.shippingNotes}
                    estimatedDelivery={selectedOrder.estimatedDelivery}
                  />
                </div>

                <h4 className="text-xs font-bold text-[#212529] mb-2 flex items-center gap-1.5">
                  <FiShoppingBag className="w-3.5 h-3.5 text-[#2a63cd]" />
                  Productos ({selectedOrder.items.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-[#f8f9fa] rounded-lg">
                      <div className="w-10 h-10 bg-white rounded-lg border border-[#e9ecef] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <FiPackage className="w-4 h-4 text-[#adb5bd]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#212529] truncate">{item.productName}</p>
                        <p className="text-[10px] text-[#6a6c6b]">x{item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-[#2a63cd]">${item.totalUSD.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#f8f9fa] border-t border-[#e9ecef] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-[#6a6c6b]">
                    {selectedOrder.paymentMethod && <>Pago: <strong className="text-[#212529]">{formatPaymentMethod(selectedOrder.paymentMethod)}</strong></>}
                  </span>
                  <div className="bg-[#2a63cd] text-white px-3 py-1.5 rounded-lg">
                    <p className="text-[9px] opacity-70">Total</p>
                    <p className="text-base font-black">USD {selectedOrder.totalUSD.toFixed(2)}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-white border-2 border-[#e9ecef] text-[#212529] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all text-sm"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 1s ease-in-out infinite; }
      `}</style>
    </>
  );
}
