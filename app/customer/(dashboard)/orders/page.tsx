'use client';
import { formatUSD } from '@/lib/currency';
import { toast } from 'react-hot-toast';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiPackage, FiClock, FiCheck, FiX, FiTruck, FiShoppingBag, FiEye, FiSearch, FiRefreshCw, FiArrowLeft, FiDollarSign, FiChevronRight } from 'react-icons/fi';
import { BsCardList } from 'react-icons/bs';
import Link from 'next/link';
import Image from 'next/image';
import OrderTracking from '@/components/orders/OrderTracking';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatPaymentMethod } from '@/lib/format-helpers';

interface RawOrderItem {
  id?: string;
  priceUSD?: number | string;
  totalUSD?: number | string;
  product?: {
    productType?: string;
  };
  [key: string]: unknown;
}

interface RawOrder {
  totalUSD?: number | string;
  items?: RawOrderItem[];
  [key: string]: unknown;
}

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
  address?: unknown;
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
    <div className="relative overflow-hidden rounded-2xl bg-brand-950 p-5">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-white/20 rounded-full mb-3" />
        <div className="h-10 w-32 bg-white/30 rounded-lg mb-4" />
        <div className="flex gap-3">
          <div className="h-14 flex-1 bg-white/10 rounded-xl" />
          <div className="h-14 flex-1 bg-white/10 rounded-xl" />
          <div className="h-14 flex-1 bg-white/10 rounded-xl" />
        </div>
      </div>
    </div>

    {/* Search Skeleton */}
    <div className="h-11 bg-white rounded-xl border border-line animate-pulse" />

    {/* Orders Skeleton */}
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-line p-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-surface rounded-xl" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-line rounded-full mb-2" />
              <div className="h-3 w-20 bg-surface rounded-full" />
            </div>
            <div className="h-5 w-16 bg-line rounded-full" />
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

  useBodyScrollLock(showOrderDetails);

  async function fetchOrders() {
    setLoading(true);
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result) ? result : (result.orders || []);
        setOrders(data.map((order: RawOrder) => ({
          ...order,
          totalUSD: Number(order.totalUSD) || 0,
          hasDigital: order.items?.some((item: RawOrderItem) => item.product?.productType === 'DIGITAL') || false,
          items: order.items?.map((item: RawOrderItem) => ({
            ...item,
            priceUSD: Number(item.priceUSD) || 0,
            totalUSD: Number(item.totalUSD) || 0,
          })) || []
        })));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
      PENDING: { bg: 'bg-warning/15', text: 'text-warning-strong', border: 'border-warning/30', icon: <FiClock className="w-4 h-4" /> },
      CONFIRMED: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', icon: <FiCheck className="w-4 h-4" /> },
      PAID: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', icon: <FiCheck className="w-4 h-4" /> },
      PROCESSING: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', icon: <FiPackage className="w-4 h-4" /> },
      SHIPPED: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', icon: <FiTruck className="w-4 h-4" /> },
      DELIVERED: { bg: 'bg-success-strong/10', text: 'text-success-strong', border: 'border-success-strong/20', icon: <FiCheck className="w-4 h-4" /> },
      CANCELLED: { bg: 'bg-deal-bg', text: 'text-deal', border: 'border-deal/30', icon: <FiX className="w-4 h-4" /> },
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
            <div className="absolute inset-0 rounded-full border-2 border-line" />
            <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ============================================
          MOBILE VIEW - PREMIUM ANIMATED DESIGN
          Epic animations for Android Full HD+ / QHD+
          ============================================ */}
      <div className="lg:hidden overflow-y-auto h-full space-y-4">
        {/* ========================================
            ANIMATED HERO - Premium Effects
            ======================================== */}
        <div className="relative rounded-2xl bg-brand-600 p-3 text-white overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Title + Total */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <FiPackage className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/80 uppercase font-bold tracking-wider">Mis Pedidos</p>
                <p className="text-xl font-bold text-white">
                  {formatUSD(stats.totalSpent)}
                </p>
              </div>
            </div>

            {/* Right: Icon Stats */}
            <div className="flex items-center gap-1.5">
              {/* Completed */}
              <div className="relative">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center border border-white/20">
                  <FiCheck className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-success-strong text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {stats.completedOrders}
                </span>
              </div>

              {/* Pending */}
              <div className="relative">
                <div className="w-8 h-8 bg-warning-strong/30 rounded-lg flex items-center justify-center border border-white/20">
                  <FiClock className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-warning-strong text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {stats.pendingOrders}
                </span>
              </div>

              {/* Items */}
              <div className="relative">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center border border-white/20">
                  <FiShoppingBag className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow">
                  {stats.totalItems}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================
            SEARCH & FILTERS - Comfortable Spacing
            ======================================== */}
        <div className="pt-3 pb-2 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-line rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 hover:border-line-strong transition-all shadow-sm text-ink"
            />
            <button
              onClick={fetchOrders}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-brand-600"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {[
              { value: 'ALL', label: 'Todos' },
              { value: 'PENDING', label: 'Pendiente' },
              { value: 'PROCESSING', label: 'Preparando' },
              { value: 'SHIPPED', label: 'Enviado' },
              { value: 'DELIVERED', label: 'Entregado' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${selectedStatus === filter.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-muted border border-line hover:bg-surface'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================
            ORDERS LIST - Comfortable Spacing
            ======================================== */}
        <div className="pb-24 space-y-3">
          {filteredOrders.length === 0 ? (
            /* Empty State */
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-2 bg-brand-50 rounded-full flex items-center justify-center">
                <FiPackage className="w-6 h-6 text-brand-500" />
              </div>
              <p className="text-xs font-bold text-ink mb-1">Sin pedidos</p>
              <p className="text-xs text-muted mb-3">
                {selectedStatus === 'ALL' ? 'Aún no has realizado ningún pedido' : 'No hay pedidos con este estado'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
              >
                <FiShoppingBag className="w-3 h-3" />
                Explorar
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-line hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 shadow-sm text-brand-600">
                      <FiPackage className="w-4 h-4" />
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-ink text-xs">#{order.orderNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {getTimeSince(order.createdAt)} • {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Price */}
                    <span className="text-sm font-bold text-ink flex-shrink-0 mr-1">{formatUSD(order.totalUSD)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {order.hasDigital && order.paymentStatus === 'PAID' && (
                        <Link
                          href={`/customer/orders/${order.id}/digital`}
                          className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center hover:bg-brand-700 transition-colors shadow-sm"
                        >
                          <BsCardList className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}
                        className="w-8 h-8 bg-surface text-ink-soft hover:bg-line rounded-lg flex items-center justify-center transition-colors border border-line"
                      >
                        <FiChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================
          DESKTOP VIEW - COMPLETELY UNCHANGED
          Only shows on screens >= 1024px
          ============================================ */}
      < div className="hidden lg:block space-y-2" >
        {/* STATS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {/* Total Spent */}
          <div className="bg-brand-600 rounded-xl px-3 py-2 text-white flex-shrink-0 min-w-[90px]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <FiDollarSign className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-70">Total</span>
            </div>
            <p className="text-base lg:text-lg font-bold">{formatUSD(stats.totalSpent)}</p>
          </div>

          {/* Completed */}
          <div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-line flex-shrink-0 min-w-[56px]">
            <div className="relative">
              <div className="w-9 h-9 bg-success-strong/10 rounded-lg flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-success-strong" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-success-strong text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-sm">
                {stats.completedOrders}
              </span>
            </div>
          </div>

          {/* In Process */}
          <div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-line flex-shrink-0 min-w-[56px]">
            <div className="relative">
              <div className="w-9 h-9 bg-warning/15 rounded-lg flex items-center justify-center">
                <FiClock className="w-5 h-5 text-warning-strong" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-warning-strong text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-sm">
                {stats.pendingOrders}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-line flex-shrink-0 min-w-[56px]">
            <div className="relative">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                <FiPackage className="w-5 h-5 text-brand-600" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-sm">
                {stats.totalItems}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter - Compact */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-ink bg-white"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 text-xs border border-line rounded-lg focus:ring-2 focus:ring-brand-500/20 bg-white text-ink min-w-[65px]"
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
            className="p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Orders List - Compact cards */}
        {
          filteredOrders.length === 0 ? (
            <div className="text-center py-8 bg-surface rounded-xl border border-dashed border-line-strong">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                <FiPackage className="w-5 h-5 text-subtle" />
              </div>
              <h3 className="text-sm font-bold text-ink mb-1">Sin pedidos</h3>
              <Link href="/" className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg">
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
                    className="bg-white rounded-lg border border-line p-2 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {/* Order Icon - Compact */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                          <FiPackage className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${statusConfig.bg} ${statusConfig.border} border flex items-center justify-center`}>
                          <span className={`${statusConfig.text} scale-75`}>{statusConfig.icon}</span>
                        </div>
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <h3 className="font-bold text-ink text-xs">#{order.orderNumber}</h3>
                          <span className={`px-1 py-0.5 rounded text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                            {getStatusTextShort(order.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted">
                          {getTimeSince(order.createdAt)} • {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Price */}
                      <p className="text-xs lg:text-sm font-bold text-ink mr-1">{formatUSD(order.totalUSD)}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {order.hasDigital && order.paymentStatus === 'PAID' && (
                          <Link
                            href={`/customer/orders/${order.id}/digital`}
                            className="w-9 h-9 bg-brand-600 hover:bg-brand-700 text-white rounded-lg flex items-center justify-center shadow-sm"
                          >
                            <BsCardList className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}
                          className="w-9 h-9 bg-surface hover:bg-brand-500 text-muted hover:text-white rounded-lg flex items-center justify-center transition-all"
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
            className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-3 animate-fadeIn"
            style={{ zIndex: 'var(--z-modal)' }}
          >
            {/* Backdrop */}
            <div
              onClick={closeModal}
              className="absolute inset-0 bg-ink/50"
            />

            {/* CLOSE BUTTON - POSITIONED OUTSIDE THE MODAL (Desktop) */}
            <button
              onClick={closeModal}
              className="hidden sm:flex fixed top-4 right-4 w-12 h-12 bg-white hover:bg-surface rounded-full items-center justify-center shadow-lg transition-all"
              style={{ zIndex: 'var(--z-modal)' }}
              aria-label="Cerrar"
            >
              <FiX className="w-6 h-6 text-ink" />
            </button>

            {/* Modal Content */}
            <div
              className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-xl h-[92vh] sm:h-auto sm:max-h-[85vh] shadow-lg overflow-hidden flex flex-col"
              style={{ zIndex: 1 }}
            >
              {/* Header */}
              <div className="bg-brand-600 px-5 sm:px-4 py-4 sm:py-3 text-white flex-shrink-0 flex items-center justify-between rounded-t-2xl sm:rounded-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiPackage className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Pedido</p>
                    <h3 className="text-lg font-bold">#{selectedOrder.orderNumber}</h3>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 sm:hidden hover:bg-white/20 rounded-lg transition-all">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="bg-surface rounded-xl p-3 mb-4">
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

                <h4 className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5">
                  <FiShoppingBag className="w-3.5 h-3.5 text-brand-500" />
                  Productos ({selectedOrder.items.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-surface rounded-lg">
                      <div className="w-10 h-10 bg-white rounded-lg border border-line flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <Image src={item.productImage} alt={item.productName} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <FiPackage className="w-4 h-4 text-subtle" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{item.productName}</p>
                        <p className="text-xs text-muted">x{item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-brand-500">{formatUSD(item.totalUSD)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-surface border-t border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted">
                    {selectedOrder.paymentMethod && <>Pago: <strong className="text-ink">{formatPaymentMethod(selectedOrder.paymentMethod)}</strong></>}
                  </span>
                  <div className="bg-brand-600 text-white px-3 py-1.5 rounded-lg">
                    <p className="text-xs opacity-70">Total</p>
                    <p className="text-base font-bold">{formatUSD(selectedOrder.totalUSD)}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-white border border-line text-ink font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-surface active:scale-[0.98] transition-all text-sm"
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
    </>
  );
}
