'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiPrinter, FiBriefcase, FiUser, FiFileText, FiPackage, FiClock, FiCheck, FiTruck, FiX, FiEye, FiDollarSign, FiSearch, FiRefreshCw, FiMapPin, FiExternalLink, FiArrowRight, FiCheckCircle, FiLoader, FiMonitor, FiSend } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import {
  adminPageHeader,
  adminPageTitle,
  adminPageSubtitle,
  adminStatCard,
  adminStatLabel,
  adminStatValue,
  adminIconChip,
  adminPrimaryButton,
  adminSecondaryButton,
  adminIconButton,
  adminModalOverlay,
  adminModalPanel,
  adminModalFooter,
  adminTableWrap,
  adminTh,
  adminTd,
  adminRowHover,
  adminInput,
  adminLabel,
} from '@/lib/admin-ui';


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
  { status: 'PROCESSING', label: 'Preparando', icon: FiLoader },
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

  useBodyScrollLock(showDetailsModal);
  useBodyScrollLock(showShippingModal);

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
        const result = await response.json();
        // Handle both paginated format { orders: [...] } and legacy array format
        const data = Array.isArray(result) ? result : (result.orders || []);
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
        toast.error('No se pudieron cargar las órdenes');
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
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
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
        toast.error('No se pudieron guardar las notas');
    } finally {
      setSavingNotes(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; animation?: string }> = {
      PENDING: { bg: 'bg-warning/15', text: 'text-warning-strong', icon: <FiClock className="w-3.5 h-3.5" /> },
      CONFIRMED: { bg: 'bg-brand-50', text: 'text-brand-700', icon: <FiCheck className="w-3.5 h-3.5" /> },
      PAID: { bg: 'bg-success-strong/10', text: 'text-success-strong', icon: <FiDollarSign className="w-3.5 h-3.5" /> },
      PROCESSING: { bg: 'bg-brand-50', text: 'text-brand-700', icon: <FiPackage className="w-3.5 h-3.5" /> },
      READY_FOR_PICKUP: { bg: 'bg-brand-50', text: 'text-brand-700', icon: <FiMapPin className="w-3.5 h-3.5" /> },
      SHIPPED: { bg: 'bg-brand-50', text: 'text-brand-700', icon: <FiTruck className="w-3.5 h-3.5" /> },
      DELIVERED: { bg: 'bg-success-strong/10', text: 'text-success-strong', icon: <FiCheck className="w-3.5 h-3.5" /> },
      CANCELLED: { bg: 'bg-deal-bg', text: 'text-deal', icon: <FiX className="w-3.5 h-3.5" /> },
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
      PENDING: { label: 'Confirmar Pedido', color: 'bg-brand-500 hover:bg-brand-600' },
      CONFIRMED: { label: 'Marcar Pagado', color: 'bg-success-strong hover:bg-success-strong/90' },
      PAID: { label: 'Comenzar Preparación', color: 'bg-brand-500 hover:bg-brand-600' },
      PROCESSING: { label: 'Marcar Enviado', color: 'bg-brand-500 hover:bg-brand-600' },
      SHIPPED: { label: 'Marcar Entregado', color: 'bg-success-strong hover:bg-success-strong/90' },
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
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Órdenes</h1>
          <p className={adminPageSubtitle}>Pedidos de la tienda</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={adminStatCard}>
          <span className={`${adminIconChip('brand')} max-sm:hidden`}>
            <FiDollarSign className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>Ingresos</span>
            <p className={`${adminStatValue} max-sm:text-xl`}>{formatUSD(stats.totalRevenue)}</p>
          </div>
        </div>
        <div className={adminStatCard}>
          <span className={`${adminIconChip('warning')} max-sm:hidden`}>
            <FiClock className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>Pendientes</span>
            <p className={`${adminStatValue} max-sm:text-xl`}>{stats.pendingCount}</p>
          </div>
        </div>
        <div className={adminStatCard}>
          <span className={`${adminIconChip('brand')} max-sm:hidden`}>
            <FiPackage className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>En proceso</span>
            <p className={`${adminStatValue} max-sm:text-xl`}>{stats.processingCount}</p>
          </div>
        </div>
        <div className={adminStatCard}>
          <span className={`${adminIconChip('success')} max-sm:hidden`}>
            <FiCheck className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>Completadas</span>
            <p className={`${adminStatValue} max-sm:text-xl`}>{stats.completedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex w-full items-center gap-3 flex-1 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar orden o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${adminInput()} pl-9`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Estado"
            className={`${adminInput()} max-w-36 shrink-0 sm:max-w-none sm:w-44`}
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
          className={adminPrimaryButton}
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-line" />
            <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-sm text-muted">Cargando órdenes...</p>
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
              <div key={order.id} className="group bg-white rounded-xl border border-line p-4 transition-all duration-300">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Order Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                        <FiPackage className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${statusConfig.bg} border flex items-center justify-center`}>
                        <span>{statusConfig.icon}</span>
                      </div>
                    </div>

                    {/* Order Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-bold text-ink text-sm">#{order.orderNumber}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                          {getStatusText(order.status)}
                        </span>
                        {order.hasDigital && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 flex items-center gap-1">
                            <FiMonitor className="w-2.5 h-2.5" />
                            Digital
                          </span>
                        )}
                        {order.trackingNumber && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                            {order.shippingCarrier}: {order.trackingNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-medium text-ink">{order.user?.name || 'Invitado'}</span>
                        <span>•</span>
                        <span>{getTimeSince(order.createdAt)}</span>
                        <span>•</span>
                        <span>{order.items?.length || 0} productos</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Quick Actions */}
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-ink">{formatUSD(Number(order.totalUSD) || 0)}</p>
                      <p className="text-xs text-muted uppercase">USD</p>
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
                        className={`hidden sm:flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg ${order.isOnlyDigital && order.status === 'PROCESSING' ? 'bg-brand-500 hover:bg-brand-600' : nextAction.color} disabled:opacity-50`}
                      >
                        {order.isOnlyDigital && order.status === 'PROCESSING' ? (
                          <>
                            <FiMonitor className="w-3 h-3" />
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
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600"
                        title="Enviar códigos digitales"
                      >
                        <FiMonitor className="w-3.5 h-3.5" />
                        Códigos
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setAdminNotes(order.adminNotes || '');
                        setShowDetailsModal(true);
                      }}
                      className={adminIconButton}
                      aria-label="Ver detalles"
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
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={`${adminModalPanel} sm:max-w-4xl max-h-[90vh]`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-line bg-brand-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">#{selectedOrder.orderNumber}</h3>
                  <p className="text-sm opacity-80">{format(new Date(selectedOrder.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toast('Próximamente')} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/30">
                    <FiPrinter className="w-4 h-4" /> Imprimir
                  </button>
                  <button onClick={closeModal} aria-label="Cerrar" className="p-2 hover:bg-white/20 rounded-lg">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Order Flow Progress */}
              <div className={`mb-6 p-4 rounded-xl ${selectedOrder.isOnlyDigital ? 'bg-brand-50' : 'bg-surface'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-xs font-bold text-muted uppercase">Progreso del Pedido</h4>
                  {selectedOrder.isOnlyDigital && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500 text-white flex items-center gap-1">
                      <FiMonitor className="w-2.5 h-2.5" /> Solo Digital
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between relative">
                  {/* Progress bar background */}
                  <div className="absolute top-4 left-0 right-0 h-1 bg-line mx-8" />
                  {/* Progress bar fill */}
                  <div
                    className="absolute top-4 left-0 h-1 mx-8 transition-all duration-500 bg-brand-500"
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
                          ? 'bg-brand-500 text-white'
                          : 'bg-white border-2 border-line text-muted'
                          } ${isCurrent ? 'ring-4 ring-brand-500/20' : ''}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className={`mt-2 text-xs font-medium ${isCompleted ? 'text-brand-600' : 'text-muted'}`}>
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
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'CONFIRMED')} disabled={updatingStatus} className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
                    <FiCheck className="w-4 h-4" /> Confirmar Pedido
                  </button>
                )}
                {selectedOrder.status === 'CONFIRMED' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'PAID')} disabled={updatingStatus} className="px-4 py-2 bg-success-strong text-white text-sm font-medium rounded-lg hover:bg-success-strong/90 disabled:opacity-50 flex items-center gap-2">
                    <FiDollarSign className="w-4 h-4" /> Marcar Pagado
                  </button>
                )}
                {selectedOrder.status === 'PAID' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'PROCESSING')} disabled={updatingStatus} className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
                    <FiPackage className="w-4 h-4" /> Comenzar Preparación
                  </button>
                )}
                {selectedOrder.status === 'PROCESSING' && !selectedOrder.isOnlyDigital && (
                  <button onClick={openShippingModal} disabled={updatingStatus} className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
                    <FiTruck className="w-4 h-4" /> Marcar Enviado
                  </button>
                )}
                {selectedOrder.status === 'PROCESSING' && selectedOrder.isOnlyDigital && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')} disabled={updatingStatus} className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
                    <FiCheckCircle className="w-4 h-4" /> Marcar Completado (Digital)
                  </button>
                )}
                {selectedOrder.status === 'SHIPPED' && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')} disabled={updatingStatus} className="px-4 py-2 bg-success-strong text-white text-sm font-medium rounded-lg hover:bg-success-strong/90 disabled:opacity-50 inline-flex items-center gap-1.5">
                    <FiCheck className="inline h-4 w-4 shrink-0" aria-hidden="true" />Marcar Entregado
                  </button>
                )}
                {!['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(selectedOrder.status) && (
                  <button onClick={() => handleStatusUpdate(selectedOrder.id, 'CANCELLED')} disabled={updatingStatus} className="px-4 py-2 bg-deal-bg text-deal text-sm font-medium rounded-lg hover:bg-deal/15 disabled:opacity-50 flex items-center gap-2">
                    <FiX className="w-4 h-4" /> Cancelar Orden
                  </button>
                )}
                {/* Digital Codes Button */}
                {selectedOrder.hasDigital && selectedOrder.paymentStatus === 'PAID' && (
                  <a
                    href={`/admin/orders/${selectedOrder.id}/digital`}
                    className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 flex items-center gap-2"
                  >
                    <FiSend className="w-4 h-4" /> Enviar Códigos Digitales
                  </a>
                )}
              </div>

              {/* Shipping Info (if shipped) */}
              {selectedOrder.trackingNumber && (
                <div className="mb-6 p-4 bg-brand-50 rounded-xl border border-brand-200">
                  <h4 className="text-xs font-bold text-brand-700 uppercase mb-3 flex items-center gap-2">
                    <FiTruck className="w-4 h-4" /> Información de Envío
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Carrier:</span>
                      <span className="ml-2 font-semibold text-ink">{selectedOrder.shippingCarrier}</span>
                    </div>
                    <div>
                      <span className="text-muted">Guía:</span>
                      <span className="ml-2 font-semibold text-ink">{selectedOrder.trackingNumber}</span>
                    </div>
                    {selectedOrder.trackingUrl && (
                      <div className="col-span-2">
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <FiExternalLink className="w-4 h-4" />
                          Ver seguimiento en {selectedOrder.shippingCarrier}
                        </a>
                      </div>
                    )}
                    {selectedOrder.shippingNotes && (
                      <div className="col-span-2">
                        <span className="text-muted">Notas:</span>
                        <p className="mt-1 text-ink">{selectedOrder.shippingNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Customer Info */}
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase mb-3">Cliente</h4>
                  <div className="bg-surface p-4 rounded-xl">
                    <p className="font-semibold text-ink">{selectedOrder.user?.name || 'Invitado'}</p>
                    <p className="text-sm text-muted">{selectedOrder.user?.email}</p>
                    {selectedOrder.shippingAddress && (
                      <div className="mt-2 pt-2 border-t border-line">
                        <p className="text-xs text-muted">Dirección de envío:</p>
                        <p className="text-sm text-ink">{selectedOrder.shippingAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase mb-3">Notas Admin</h4>
                  <div className="bg-warning/15 p-4 rounded-xl border border-warning/30">
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm text-ink placeholder:text-muted resize-none" rows={3} placeholder="Agregar notas..." />
                    <div className="flex justify-end">
                      <button onClick={handleSaveNotes} disabled={savingNotes} className="text-xs font-bold text-warning-strong hover:underline disabled:opacity-50">
                        {savingNotes ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h4 className="text-xs font-bold text-ink uppercase mb-3">Productos</h4>
                <div className={adminTableWrap}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={adminTh}>Producto</th>
                        <th className={`${adminTh} text-center`}>Cant.</th>
                        <th className={`${adminTh} text-right`}>Precio</th>
                        <th className={`${adminTh} text-right`}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item: any) => (
                        <tr key={item.id} className={adminRowHover}>
                          <td className={adminTd}>
                            <div className="font-medium text-ink">{item.productName || item.product?.name}</div>
                          </td>
                          <td className={`${adminTd} text-center`}>{item.quantity}</td>
                          <td className={`${adminTd} text-right`}>{formatUSD(Number(item.priceUSD || item.pricePerUnit) || 0)}</td>
                          <td className={`${adminTd} text-right font-medium`}>{formatUSD(Number(item.totalUSD || item.subtotal) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-ink">Total</td>
                        <td className="px-4 py-3 text-right text-xl font-bold text-brand-600">{formatUSD(Number(selectedOrder.totalUSD) || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={adminModalFooter}>
              <button onClick={closeModal} className={adminSecondaryButton}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Shipping Modal */}
      {mounted && showShippingModal && selectedOrder && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowShippingModal(false); }}>
          <div className={`${adminModalPanel} sm:max-w-md`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-line bg-brand-600 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                <FiTruck className="w-5 h-5" />
                Información de Envío
              </h3>
              <p className="text-sm opacity-80">Orden #{selectedOrder.orderNumber}</p>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className={adminLabel}>
                  Empresa de Envío *
                </label>
                <select
                  value={shippingForm.carrier}
                  onChange={(e) => setShippingForm({ ...shippingForm, carrier: e.target.value })}
                  className={adminInput()}
                >
                  <option value="">Seleccionar...</option>
                  {SHIPPING_CARRIERS.map(carrier => (
                    <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={adminLabel}>
                  Número de Guía *
                </label>
                <input
                  type="text"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                  placeholder="Ej: 123456789"
                  className={adminInput()}
                />
              </div>

              <div>
                <label className={adminLabel}>
                  URL de Seguimiento (opcional)
                </label>
                <input
                  type="url"
                  value={shippingForm.trackingUrl}
                  onChange={(e) => setShippingForm({ ...shippingForm, trackingUrl: e.target.value })}
                  placeholder="Se genera automáticamente"
                  className={adminInput()}
                />
                <p className="text-xs text-muted mt-1">Se genera automáticamente según el carrier</p>
              </div>

              <div>
                <label className={adminLabel}>
                  Notas de Envío (opcional)
                </label>
                <textarea
                  value={shippingForm.shippingNotes}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingNotes: e.target.value })}
                  placeholder="Ej: Oficina Central, Agencia Chacao"
                  rows={2}
                  className={`${adminInput()} h-auto py-2.5 resize-none`}
                />
              </div>

              <div>
                <label className={adminLabel}>
                  Fecha Estimada de Entrega (opcional)
                </label>
                <input
                  type="date"
                  value={shippingForm.estimatedDelivery}
                  onChange={(e) => setShippingForm({ ...shippingForm, estimatedDelivery: e.target.value })}
                  className={adminInput()}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={adminModalFooter}>
              <button
                onClick={() => setShowShippingModal(false)}
                className={adminSecondaryButton}
              >
                Cancelar
              </button>
              <button
                onClick={handleShipOrder}
                disabled={updatingStatus}
                className={adminPrimaryButton}
              >
                {updatingStatus ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <FiTruck className="w-4 h-4" />
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
