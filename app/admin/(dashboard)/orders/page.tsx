'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiPrinter, FiBriefcase, FiUser, FiFileText, FiPackage, FiClock, FiCheck, FiTruck, FiX, FiEye, FiDollarSign, FiSearch, FiRefreshCw, FiMapPin, FiExternalLink, FiArrowRight, FiCheckCircle, FiZap } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  user: {
    name: string;
    email: string;
    profile?: {
      customerType: string | null;
      companyName: string | null;
      taxId: string | null;
    };
  };
  totalUSD: number;
  subtotalUSD?: number;
  status: string;
  paymentStatus?: string;
  deliveryMethod?: string;
  shippingAddress?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingNotes?: string;
  estimatedDelivery?: string;
  createdAt: string;
  confirmedAt?: string;
  processingAt?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: Array<{ id: string; product?: { productType?: string } }>;
  paymentMethod: string;
  adminNotes: string | null;
  hasDigital?: boolean;
  isOnlyDigital?: boolean; // All items are digital (no physical products)
}

// Shipping carriers with their tracking URL patterns
const SHIPPING_CARRIERS = [
  { id: 'ZOOM', name: 'ZOOM', trackingUrl: 'https://www.zoom.red/tracking?guia=' },
  { id: 'MRW', name: 'MRW', trackingUrl: 'https://www.mrw.com.ve/resultados_ws.aspx?Ession=' },
  { id: 'TEALCA', name: 'TEALCA', trackingUrl: 'https://tealca.com/rastreo/' },
  { id: 'DOMESA', name: 'DOMESA', trackingUrl: 'https://www.domesa.com.ve/tracking/' },
  { id: 'OTHER', name: 'Otro', trackingUrl: '' },
];

// Order flow statuses in sequence - PHYSICAL PRODUCTS
const ORDER_FLOW = [
  { status: 'PENDING', label: 'Pedido', icon: FiPackage },
  { status: 'CONFIRMED', label: 'Confirmado', icon: FiCheckCircle },
  { status: 'PAID', label: 'Pagado', icon: FiDollarSign },
  { status: 'PROCESSING', label: 'Preparando', icon: FiPackage },
  { status: 'SHIPPED', label: 'Enviado', icon: FiTruck },
  { status: 'DELIVERED', label: 'Entregado', icon: FiCheck },
];

// Order flow for DIGITAL ONLY products (no shipping step)
const DIGITAL_ORDER_FLOW = [
  { status: 'PENDING', label: 'Pedido', icon: FiPackage },
  { status: 'CONFIRMED', label: 'Confirmado', icon: FiCheckCircle },
  { status: 'PAID', label: 'Pagado', icon: FiDollarSign },
  { status: 'PROCESSING', label: 'Preparando', icon: FiZap },
  { status: 'DELIVERED', label: 'Entregado', icon: FiCheck },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Shipping form state
  const [shippingForm, setShippingForm] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
    shippingNotes: '',
    estimatedDelivery: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + (Number(o.totalUSD) || 0) : sum, 0);
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const processingCount = orders.filter(o => ['CONFIRMED', 'PAID', 'PROCESSING'].includes(o.status)).length;
    const completedCount = orders.filter(o => o.status === 'DELIVERED').length;
    return { total: orders.length, totalRevenue, pendingCount, processingCount, completedCount };
  }, [orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all' ? '/api/orders' : `/api/orders?status=${filterStatus}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const normalizedOrders = data.map((order: any) => {
          const digitalCount = order.items?.filter((item: any) => item.product?.productType === 'DIGITAL').length || 0;
          const totalCount = order.items?.length || 0;
          return {
            ...order,
            totalUSD: Number(order.totalUSD) || 0,
            hasDigital: digitalCount > 0,
            isOnlyDigital: totalCount > 0 && digitalCount === totalCount,
          };
        });
        setOrders(normalizedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const handleStatusUpdate = async (orderId: string, newStatus: string, additionalData?: any) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalData }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        toast.success(`Estado actualizado a: ${getStatusText(newStatus)}`);
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, ...updatedOrder, status: newStatus });
        }
        setShowShippingModal(false);
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleShipOrder = () => {
    if (!selectedOrder) return;

    if (!shippingForm.carrier || !shippingForm.trackingNumber) {
      toast.error('Por favor ingresa el carrier y número de guía');
      return;
    }

    const carrier = SHIPPING_CARRIERS.find(c => c.id === shippingForm.carrier);
    const trackingUrl = shippingForm.trackingUrl ||
      (carrier && carrier.trackingUrl ? `${carrier.trackingUrl}${shippingForm.trackingNumber}` : '');

    handleStatusUpdate(selectedOrder.id, 'SHIPPED', {
      shippingCarrier: shippingForm.carrier,
      trackingNumber: shippingForm.trackingNumber,
      trackingUrl: trackingUrl,
      shippingNotes: shippingForm.shippingNotes,
      estimatedDelivery: shippingForm.estimatedDelivery || undefined,
    });
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;
    try {
      setSavingNotes(true);
      const response = await fetch(`/api/orders?id=${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });

      if (response.ok) {
        toast.success('Notas guardadas');
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, adminNotes } : o));
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; animation?: string }> = {
      PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <FiClock className="w-3.5 h-3.5" />, animation: 'animate-pulse' },
      CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <FiCheck className="w-3.5 h-3.5" /> },
      PAID: { bg: 'bg-green-50', text: 'text-green-700', icon: <FiDollarSign className="w-3.5 h-3.5" /> },
      PROCESSING: { bg: 'bg-[#2a63cd]/10', text: 'text-[#2a63cd]', icon: <FiPackage className="w-3.5 h-3.5" /> },
      READY_FOR_PICKUP: { bg: 'bg-purple-50', text: 'text-purple-700', icon: <FiMapPin className="w-3.5 h-3.5" /> },
      SHIPPED: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <FiTruck className="w-3.5 h-3.5" /> },
      DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <FiCheck className="w-3.5 h-3.5" /> },
      CANCELLED: { bg: 'bg-red-50', text: 'text-red-600', icon: <FiX className="w-3.5 h-3.5" /> },
    };
    return configs[status] || configs.PENDING;
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PAID: 'Pagado', PROCESSING: 'Preparando',
      READY_FOR_PICKUP: 'Listo para recoger', SHIPPED: 'Enviado', DELIVERED: 'Entregado', CANCELLED: 'Cancelado'
    };
    return map[status] || status;
  };

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return format(new Date(dateString), 'dd MMM', { locale: es });
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const flow = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= flow.length - 1) return null;
    return flow[currentIndex + 1];
  };

  const getNextStatusAction = (status: string): { label: string; color: string } | null => {
    const actions: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Confirmar Pedido', color: 'bg-blue-600 hover:bg-blue-700' },
      CONFIRMED: { label: 'Marcar Pagado', color: 'bg-green-600 hover:bg-green-700' },
      PAID: { label: 'Comenzar Preparación', color: 'bg-[#2a63cd] hover:bg-[#1e4ba3]' },
      PROCESSING: { label: 'Marcar Enviado', color: 'bg-indigo-600 hover:bg-indigo-700' },
      SHIPPED: { label: 'Marcar Entregado', color: 'bg-emerald-600 hover:bg-emerald-700' },
    };
    return actions[status] || null;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const closeModal = () => {
    setShowDetailsModal(false);
    setShowShippingModal(false);
  };

  const openShippingModal = () => {
    setShippingForm({ carrier: '', trackingNumber: '', trackingUrl: '', shippingNotes: '', estimatedDelivery: '' });
    setShowShippingModal(true);
  };

  const getCurrentFlowIndex = (status: string, isDigitalOnly = false) => {
    const flow = isDigitalOnly ? DIGITAL_ORDER_FLOW : ORDER_FLOW;
    return flow.findIndex(item => item.status === status);
  };

  // Get the appropriate flow for an order
  const getOrderFlow = (isDigitalOnly = false) => {
    return isDigitalOnly ? DIGITAL_ORDER_FLOW : ORDER_FLOW;
  };

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <FiDollarSign className="w-5 h-5 opacity-80" />
            <span className="text-xs opacity-70">Ingresos</span>
          </div>
          <p className="text-2xl font-black">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
          <div className="flex items-center justify-between mb-2">
            <FiClock className="w-5 h-5 text-amber-500" />
            <span className="text-xs text-[#6a6c6b]">Pendientes</span>
          </div>
          <p className="text-2xl font-black text-[#212529]">{stats.pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
          <div className="flex items-center justify-between mb-2">
            <FiPackage className="w-5 h-5 text-[#2a63cd]" />
            <span className="text-xs text-[#6a6c6b]">En proceso</span>
          </div>
          <p className="text-2xl font-black text-[#212529]">{stats.processingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
          <div className="flex items-center justify-between mb-2">
            <FiCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-xs text-[#6a6c6b]">Completadas</span>
          </div>
          <p className="text-2xl font-black text-[#212529]">{stats.completedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
            <input
              type="text"
              placeholder="Buscar orden o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 bg-white"
          >
            <option value="all">Todas</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="PAID">Pagadas</option>
            <option value="PROCESSING">En preparación</option>
            <option value="SHIPPED">Enviadas</option>
            <option value="DELIVERED">Entregadas</option>
          </select>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[#e9ecef]" />
            <div className="absolute inset-0 rounded-full border-2 border-[#2a63cd] border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-sm text-[#6a6c6b]">Cargando órdenes...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<FiPackage className="w-8 h-8" />}
          title="No hay órdenes"
          description={filterStatus !== 'all' ? 'No hay órdenes con este estado' : 'Aún no se han realizado pedidos'}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const nextAction = getNextStatusAction(order.status);
            return (
              <div key={order.id} className="group bg-white rounded-xl border border-[#e9ecef] p-4 hover:shadow-md hover:border-[#2a63cd]/20 transition-all duration-300">
                <div className="flex items-center gap-4">
                  {/* Order Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#2a63cd]/5 rounded-xl flex items-center justify-center">
                      <FiPackage className="w-5 h-5 text-[#2a63cd]" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${statusConfig.bg} border flex items-center justify-center`}>
                      <span className={statusConfig.animation}>{statusConfig.icon}</span>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-[#212529] text-sm">#{order.orderNumber}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.hasDigital && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 flex items-center gap-1">
                          <FiZap className="w-2.5 h-2.5" />
                          Digital
                        </span>
                      )}
                      {order.trackingNumber && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {order.shippingCarrier}: {order.trackingNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6a6c6b]">
                      <span className="font-medium text-[#212529]">{order.user?.name || 'Invitado'}</span>
                      <span>•</span>
                      <span>{getTimeSince(order.createdAt)}</span>
                      <span>•</span>
                      <span>{order.items?.length || 0} productos</span>
                    </div>
                  </div>

                  {/* Price & Quick Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-[#212529]">${(Number(order.totalUSD) || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-[#6a6c6b] uppercase">USD</p>
                    </div>

                    {/* Quick action button */}
                    {nextAction && order.status !== 'CANCELLED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = getNextStatus(order.status);
                          if (nextStatus === 'SHIPPED') {
                            // For digital-only orders, skip shipping and go to DELIVERED
                            if (order.isOnlyDigital) {
                              handleStatusUpdate(order.id, 'DELIVERED');
                            } else {
                              setSelectedOrder(order);
                              openShippingModal();
                            }
                          } else if (nextStatus) {
                            handleStatusUpdate(order.id, nextStatus);
                          }
                        }}
                        disabled={updatingStatus}
                        className={`hidden sm:flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg ${order.isOnlyDigital && order.status === 'PROCESSING' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : nextAction.color} disabled:opacity-50`}
                      >
                        {order.isOnlyDigital && order.status === 'PROCESSING' ? (
                          <>
                            <FiZap className="w-3 h-3" />
                            Completar (Digital)
                          </>
                        ) : (
                          <>
                            <FiArrowRight className="w-3 h-3" />
                            {nextAction.label}
                          </>
                        )}
                      </button>
                    )}

                    {/* Digital Codes button - VISIBLE for orders with digital products */}
                    {order.hasDigital && order.paymentStatus === 'PAID' && (
                      <a
                        href={`/admin/orders/${order.id}/digital`}
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25"
                        title="Enviar códigos digitales"
                      >
                        <FiZap className="w-3.5 h-3.5" />
                        Códigos
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setAdminNotes(order.adminNotes || '');
                        setShowDetailsModal(true);
                      }}
                      className="p-2.5 bg-[#f8f9fa] hover:bg-[#2a63cd] text-[#6a6c6b] hover:text-white rounded-lg transition-all"
                      title="Ver detalles"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {mounted && showDetailsModal && selectedOrder && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">#{selectedOrder.orderNumber}</h3>
                  <p className="text-sm opacity-70">{format(new Date(selectedOrder.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => alert('Próximamente')} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/30">
                    <FiPrinter className="w-4 h-4" /> Imprimir
                  </button>
                  <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-lg">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Order Flow Progress */}
              <div className={`mb-6 p-4 rounded-xl ${selectedOrder.isOnlyDigital ? 'bg-gradient-to-r from-purple-50 to-blue-50' : 'bg-[#f8f9fa]'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-xs font-bold text-[#6a6c6b] uppercase">Progreso del Pedido</h4>
                  {selectedOrder.isOnlyDigital && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center gap-1">
                      <FiZap className="w-2.5 h-2.5" /> Solo Digital
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between relative">
                  {/* Progress bar background */}
                  <div className="absolute top-4 left-0 right-0 h-1 bg-[#e9ecef] mx-8" />
                  {/* Progress bar fill */}
                  <div
                    className={`absolute top-4 left-0 h-1 mx-8 transition-all duration-500 ${selectedOrder.isOnlyDigital ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-[#2a63cd]'}`}
                    style={{
                      width: `${(getCurrentFlowIndex(selectedOrder.status, selectedOrder.isOnlyDigital) / (getOrderFlow(selectedOrder.isOnlyDigital).length - 1)) * 100}%`
                    }}
                  />

                  {getOrderFlow(selectedOrder.isOnlyDigital).map((step, index) => {
                    const isCompleted = getCurrentFlowIndex(selectedOrder.status, selectedOrder.isOnlyDigital) >= index;
                    const isCurrent = selectedOrder.status === step.status;
                    const IconComponent = step.icon;
                    return (
                      <div key={step.status} className="relative z-10 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCompleted
                          ? selectedOrder.isOnlyDigital ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white' : 'bg-[#2a63cd] text-white'
                          : 'bg-white border-2 border-[#e9ecef] text-[#6a6c6b]'
                          } ${isCurrent ? selectedOrder.isOnlyDigital ? 'ring-4 ring-purple-500/20' : 'ring-4 ring-[#2a63cd]/20' : ''}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className={`mt-2 text-[10px] font-medium ${isCompleted ? selectedOrder.isOnlyDigital ? 'text-purple-600' : 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedOrder.status === 'PENDING' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'CONFIRMED')} disabled={updatingStatus} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    <FiCheck className="w-4 h-4" /> Confirmar Pedido
                  </button>
                )}
                {selectedOrder.status === 'CONFIRMED' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'PAID')} disabled={updatingStatus} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                    <FiDollarSign className="w-4 h-4" /> Marcar Pagado
                  </button>
                )}
                {selectedOrder.status === 'PAID' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'PROCESSING')} disabled={updatingStatus} className="px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] disabled:opacity-50 flex items-center gap-2">
                    <FiPackage className="w-4 h-4" /> Comenzar Preparación
                  </button>
                )}
                {selectedOrder.status === 'PROCESSING' && !selectedOrder.isOnlyDigital && (
                  <button onClick={openShippingModal} disabled={updatingStatus} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                    <FiTruck className="w-4 h-4" /> Marcar Enviado
                  </button>
                )}
                {selectedOrder.status === 'PROCESSING' && selectedOrder.isOnlyDigital && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')} disabled={updatingStatus} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2">
                    <FiZap className="w-4 h-4" /> Marcar Completado (Digital)
                  </button>
                )}
                {selectedOrder.status === 'SHIPPED' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')} disabled={updatingStatus} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                    ✓ Marcar Entregado
                  </button>
                )}
                {!['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(selectedOrder.status) && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'CANCELLED')} disabled={updatingStatus} className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-2">
                    <FiX className="w-4 h-4" /> Cancelar Orden
                  </button>
                )}
                {/* Digital Codes Button */}
                {selectedOrder.hasDigital && selectedOrder.paymentStatus === 'PAID' && (
                  <a
                    href={`/admin/orders/${selectedOrder.id}/digital`}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 shadow-lg shadow-purple-500/25"
                  >
                    <FiZap className="w-4 h-4" /> Enviar Códigos Digitales
                  </a>
                )}
              </div>

              {/* Shipping Info (if shipped) */}
              {selectedOrder.trackingNumber && (
                <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3 flex items-center gap-2">
                    <FiTruck className="w-4 h-4" /> Información de Envío
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-indigo-600">Carrier:</span>
                      <span className="ml-2 font-semibold text-indigo-900">{selectedOrder.shippingCarrier}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600">Guía:</span>
                      <span className="ml-2 font-semibold text-indigo-900">{selectedOrder.trackingNumber}</span>
                    </div>
                    {selectedOrder.trackingUrl && (
                      <div className="col-span-2">
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <FiExternalLink className="w-4 h-4" />
                          Ver seguimiento en {selectedOrder.shippingCarrier}
                        </a>
                      </div>
                    )}
                    {selectedOrder.shippingNotes && (
                      <div className="col-span-2">
                        <span className="text-indigo-600">Notas:</span>
                        <p className="mt-1 text-indigo-900">{selectedOrder.shippingNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Customer Info */}
                <div>
                  <h4 className="text-xs font-bold text-[#212529] uppercase mb-3">Cliente</h4>
                  <div className="bg-[#f8f9fa] p-4 rounded-xl">
                    <p className="font-semibold text-[#212529]">{selectedOrder.user?.name || 'Invitado'}</p>
                    <p className="text-sm text-[#6a6c6b]">{selectedOrder.user?.email}</p>
                    {selectedOrder.shippingAddress && (
                      <div className="mt-2 pt-2 border-t border-[#e9ecef]">
                        <p className="text-xs text-[#6a6c6b]">Dirección de envío:</p>
                        <p className="text-sm text-[#212529]">{selectedOrder.shippingAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <h4 className="text-xs font-bold text-[#212529] uppercase mb-3">Notas Admin</h4>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm text-amber-800 placeholder-amber-600/50 resize-none" rows={3} placeholder="Agregar notas..." />
                    <div className="flex justify-end">
                      <button onClick={handleSaveNotes} disabled={savingNotes} className="text-xs font-bold text-amber-700 hover:underline disabled:opacity-50">
                        {savingNotes ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h4 className="text-xs font-bold text-[#212529] uppercase mb-3">Productos</h4>
                <div className="border border-[#e9ecef] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f8f9fa]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Producto</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-[#6a6c6b]">Cant.</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-[#6a6c6b]">Precio</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-[#6a6c6b]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9ecef]">
                      {selectedOrder.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#212529]">{item.productName || item.product?.name}</div>
                          </td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">${(Number(item.priceUSD || item.pricePerUnit) || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">${(Number(item.totalUSD || item.subtotal) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#f8f9fa]">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-bold">Total</td>
                        <td className="px-4 py-3 text-right text-xl font-black text-[#2a63cd]">${(Number(selectedOrder.totalUSD) || 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e9ecef] bg-[#f8f9fa] flex justify-end">
              <button onClick={closeModal} className="px-6 py-2 bg-white border border-[#dee2e6] text-[#212529] rounded-lg hover:bg-[#f8f9fa] font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Shipping Modal - With explicit inline styles */}
      {mounted && showShippingModal && selectedOrder && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setShowShippingModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal Content */}
          <div
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '420px',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e9ecef',
                background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
                color: 'white',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FiTruck style={{ width: '20px', height: '20px' }} />
                Información de Envío
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.7 }}>Orden #{selectedOrder.orderNumber}</p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#212529', marginBottom: '6px' }}>
                  Empresa de Envío *
                </label>
                <select
                  value={shippingForm.carrier}
                  onChange={(e) => setShippingForm({ ...shippingForm, carrier: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: 'white',
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {SHIPPING_CARRIERS.map(carrier => (
                    <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#212529', marginBottom: '6px' }}>
                  Número de Guía *
                </label>
                <input
                  type="text"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                  placeholder="Ej: 123456789"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#212529', marginBottom: '6px' }}>
                  URL de Seguimiento (opcional)
                </label>
                <input
                  type="url"
                  value={shippingForm.trackingUrl}
                  onChange={(e) => setShippingForm({ ...shippingForm, trackingUrl: e.target.value })}
                  placeholder="Se genera automáticamente"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6a6c6b', marginTop: '4px' }}>Se genera automáticamente según el carrier</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#212529', marginBottom: '6px' }}>
                  Notas de Envío (opcional)
                </label>
                <textarea
                  value={shippingForm.shippingNotes}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingNotes: e.target.value })}
                  placeholder="Ej: Oficina Central, Agencia Chacao"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#212529', marginBottom: '6px' }}>
                  Fecha Estimada de Entrega (opcional)
                </label>
                <input
                  type="date"
                  value={shippingForm.estimatedDelivery}
                  onChange={(e) => setShippingForm({ ...shippingForm, estimatedDelivery: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => setShowShippingModal(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #dee2e6',
                  color: '#212529',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleShipOrder}
                disabled={updatingStatus}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: updatingStatus ? 'not-allowed' : 'pointer',
                  opacity: updatingStatus ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {updatingStatus ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <FiTruck style={{ width: '16px', height: '16px' }} />
                    Marcar como Enviado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
