'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiPrinter, FiUserX, FiPackage, FiClock, FiCheck, FiTruck, FiX, FiEye, FiDollarSign, FiSearch, FiRefreshCw, FiArrowRight, FiCheckCircle, FiLoader, FiMonitor, FiSend } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { EMPRESAS_GUIA, NOMBRE_EMPRESA, siguientePaso, type PasoOrden } from '@/lib/envios/empresas';
import EntregaOrden from './_components/EntregaOrden';
import {
  adminBadge,
  adminTab,
  adminModalHeader,
  adminModalBody,
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
  adminHint,
  adminNotice,
  adminDangerButton,
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
  } | null;
  guestName?: string | null;
  guestEmail?: string | null;
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
  // C-100: destino y destinatario del checkout, e historial del envío
  shippingMode?: string | null;
  shippingPaidBy?: string | null;
  shippingState?: string | null;
  shippingCity?: string | null;
  courierOfficeCode?: string | null;
  courierOfficeName?: string | null;
  courierOfficeAddress?: string | null;
  recipientName?: string | null;
  recipientIdNumber?: string | null;
  recipientPhone?: string | null;
  shipmentEvents?: Array<{ id: string; source: string; description: string; occurredAt: string }>;
  createdAt: string;
  confirmedAt?: string;
  processingAt?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: Array<{
    id: string;
    productName?: string;
    quantity?: number;
    priceUSD?: number;
    pricePerUnit?: number;
    totalUSD?: number;
    subtotal?: number;
    product?: {
      name?: string;
      productType?: string;
    };
  }>;
  paymentMethod: string;
  adminNotes: string | null;
  hasDigital?: boolean;
  isOnlyDigital?: boolean; // All items are digital (no physical products)
}

// Empresas con las que se puede marcar un envío. El enlace de rastreo lo arma el servidor (C-100):
// el de MRW apuntaba a www.mrw.com.ve, que ya no existe.
const SHIPPING_CARRIERS = EMPRESAS_GUIA.map((id) => ({ id, name: NOMBRE_EMPRESA[id] }));

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
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
  useBodyScrollLock(showCancelModal);

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
        const normalizedOrders = data.map((order: Order) => {
          const digitalCount = order.items?.filter((item) => item.product?.productType === 'DIGITAL').length || 0;
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

  const handleStatusUpdate = async (orderId: string, newStatus: string, additionalData?: Record<string, unknown>) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalData }),
      });

      const datos = await response.json().catch(() => null);

      if (response.ok) {
        toast.success(`Estado actualizado a: ${getStatusText(newStatus)}`);
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, ...datos, status: newStatus });
        }
        setShowShippingModal(false);
        setShowCancelModal(false);
        setCancelReason('');
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
        return true;
      }

      toast.error(datos?.error || 'Error al actualizar el estado');
      return false;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };

  // El servidor exige un motivo de al menos 10 caracteres para cancelar: antes el botón
  // no lo mandaba y la cancelación fallaba siempre.
  const handleCancelOrder = () => {
    if (!selectedOrder) return;
    if (cancelReason.trim().length < 10) {
      toast.error('Escribe el motivo de la cancelación (mínimo 10 caracteres).');
      return;
    }
    handleStatusUpdate(selectedOrder.id, 'CANCELLED', { notes: cancelReason.trim() });
  };

  const handleShipOrder = () => {
    if (!selectedOrder) return;

    if (!shippingForm.carrier || !shippingForm.trackingNumber) {
      toast.error('Por favor ingresa el carrier y número de guía');
      return;
    }

    handleStatusUpdate(selectedOrder.id, 'SHIPPED', {
      shippingCarrier: shippingForm.carrier,
      trackingNumber: shippingForm.trackingNumber.trim(),
      ...(shippingForm.carrier === 'OTHER' && shippingForm.trackingUrl.trim() ? { trackingUrl: shippingForm.trackingUrl.trim() } : {}),
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

  // El paso siguiente depende de cómo se entrega (C-100): retiro → "Lista para recoger", Guanare → "Salió a entregar",
  // ZOOM o MRW → formulario de la guía. Antes todas iban a "Marcar enviado", también los retiros en tienda.
  const avanzar = (order: Order, paso: PasoOrden) => {
    if (paso.pideGuia) {
      setSelectedOrder(order);
      openShippingModal(order);
      return;
    }
    handleStatusUpdate(order.id, paso.estado);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pasoDetalle = selectedOrder
    ? siguientePaso(selectedOrder.status, selectedOrder.deliveryMethod ?? (selectedOrder.isOnlyDigital ? 'DIGITAL' : null))
    : null;

  const closeModal = () => {
    setShowDetailsModal(false);
    setShowShippingModal(false);
  };

  const openShippingModal = (order: Order) => {
    // La empresa que eligió el cliente viene marcada
    setShippingForm({ carrier: order.shippingCarrier || '', trackingNumber: '', trackingUrl: '', shippingNotes: '', estimatedDelivery: '' });
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex w-full items-center gap-3 flex-1 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              aria-label="Buscar orden o cliente"
              placeholder="Buscar orden o cliente"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${adminInput()} pl-9`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Estado"
            className={`${adminInput()} hidden shrink-0 lg:block lg:w-44`}
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
          className={adminSecondaryButton}
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <nav aria-label="Filtrar órdenes por estado" className="overflow-x-auto pb-1 lg:hidden">
        <div className="flex w-max gap-2">
          {[
            ['all', 'Todas'], ['PENDING', 'Pendientes'], ['CONFIRMED', 'Confirmadas'],
            ['PAID', 'Pagadas'], ['PROCESSING', 'En preparación'], ['SHIPPED', 'Enviadas'], ['DELIVERED', 'Entregadas'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilterStatus(value)} aria-pressed={filterStatus === value} className={`${adminTab(filterStatus === value)} h-11`}>
              {label}
              {!loading && (filterStatus === 'all' || filterStatus === value) && <span className="tabular-nums">{value === 'all' ? orders.length : orders.filter((order) => order.status === value).length}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Stats Cards */}
      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4">
        <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
          <span className={`${adminIconChip('brand')} hidden`}>
            <FiDollarSign className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>Ingresos</span>
            <p className={`${adminStatValue} text-lg tabular-nums`}>{formatUSD(stats.totalRevenue)}</p>
          </div>
        </div>
        <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
          <span className={`${adminIconChip('warning')} hidden`}>
            <FiClock className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>Pendientes</span>
            <p className={`${adminStatValue} text-lg tabular-nums`}>{stats.pendingCount}</p>
          </div>
        </div>
        <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
          <span className={`${adminIconChip('brand')} hidden`}>
            <FiPackage className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>En proceso</span>
            <p className={`${adminStatValue} text-lg tabular-nums`}>{stats.processingCount}</p>
          </div>
        </div>
        <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
          <span className={`${adminIconChip('success')} hidden`}>
            <FiCheck className="w-5 h-5" />
          </span>
          <div>
            <span className={adminStatLabel}>Completadas</span>
            <p className={`${adminStatValue} text-lg tabular-nums`}>{stats.completedCount}</p>
          </div>
        </div>
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
            const paso = siguientePaso(order.status, order.deliveryMethod ?? (order.isOnlyDigital ? 'DIGITAL' : null));
            return (
              <div key={order.id} className="relative rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Order Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold text-ink text-sm">
                          <button type="button" onClick={() => { setSelectedOrder(order); setAdminNotes(order.adminNotes || ''); setShowDetailsModal(true); }} className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-500">
                            #{order.orderNumber}
                          </button>
                        </h3>
                        <span className={adminBadge(order.status === 'PENDING' ? 'warning' : order.status === 'CANCELLED' ? 'danger' : order.status === 'DELIVERED' ? 'success' : order.status === 'REFUNDED' ? 'neutral' : 'brand')}>
                          {ETIQUETA_ESTADO[order.status as keyof typeof ETIQUETA_ESTADO] || getStatusText(order.status)}
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
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        {order.user ? (
                          <span className="font-medium text-ink">{order.user.name || 'Invitado'}</span>
                        ) : order.guestEmail ? (
                          <span className="font-medium text-ink">Invitado</span>
                        ) : (
                          <span className={adminBadge('neutral')}><FiUserX className="h-3.5 w-3.5" aria-hidden="true" /> Cliente eliminado</span>
                        )}
                        <span>•</span>
                        <span>{getTimeSince(order.createdAt)}</span>
                        <span>•</span>
                        <span>{order.items?.length || 0} {order.items?.length === 1 ? 'producto' : 'productos'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-ink">{formatUSD(Number(order.totalUSD) || 0)}</p>
                    </div>

                    {/* Quick action button */}
                    {paso && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          avanzar(order, paso);
                        }}
                        disabled={updatingStatus}
                        className={`${adminSecondaryButton} relative min-h-11 w-full sm:w-auto`}
                      >
                        {paso.pideGuia ? <FiTruck className="w-3 h-3" aria-hidden="true" /> : <FiArrowRight className="w-3 h-3" aria-hidden="true" />}
                        {paso.accion}
                      </button>
                    )}

                    {/* Digital Codes button - VISIBLE for orders with digital products */}
                    {order.hasDigital && order.paymentStatus === 'PAID' && (
                      <a
                        href={`/admin/orders/${order.id}/digital`}
                        onClick={(e) => e.stopPropagation()}
                        className={`${adminSecondaryButton} relative`}
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
                      className={`${adminIconButton} relative h-11 w-11`}
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
          <div className={`${adminModalPanel} sm:max-w-4xl`} role="dialog" aria-modal="true" aria-label="Detalle de la orden">
            {/* Header */}
            <div className={`${adminModalHeader} flex-wrap text-ink`}>
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">#{selectedOrder.orderNumber}</h3>
                  <p className="text-sm opacity-80">{format(new Date(selectedOrder.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toast('Próximamente')} className={adminSecondaryButton}>
                    <FiPrinter className="w-4 h-4" /> Imprimir
                  </button>
                  <button onClick={closeModal} aria-label="Cerrar" title="Cerrar" className={`${adminIconButton} h-11 w-11`}>
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className={adminModalBody}>
              <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-2">
                {/* Customer Info */}
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase mb-3">Cliente</h4>
                  <div className="space-y-1 [overflow-wrap:anywhere]">
                    {selectedOrder.user ? (
                      <>
                        <p className="font-semibold text-ink">{selectedOrder.user.name || 'Invitado'}</p>
                        <p className="text-sm text-muted">{selectedOrder.user.email}</p>
                      </>
                    ) : selectedOrder.guestEmail ? (
                      <>
                        <p className="font-semibold text-ink">Invitado</p>
                        <p className="text-sm text-muted">{selectedOrder.guestEmail}</p>
                      </>
                    ) : (
                      <p className="font-semibold text-ink">
                        <span className={adminBadge('neutral')}><FiUserX className="h-3.5 w-3.5" aria-hidden="true" /> Cliente eliminado</span>
                      </p>
                    )}
                    <p className="text-sm text-muted">Pago: {selectedOrder.paymentMethod} · {selectedOrder.paymentStatus || 'Sin estado'}</p>

                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase mb-3">Notas Admin</h4>
                  <div className="rounded-xl border border-line p-3">
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm text-ink placeholder:text-muted resize-none" rows={3} placeholder="Agregar notas..." />
                    <div className="flex justify-end">
                      <button onClick={handleSaveNotes} disabled={savingNotes} className={adminSecondaryButton}>
                        {savingNotes ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                {pasoDetalle && (
                  <button type="button" onClick={() => avanzar(selectedOrder, pasoDetalle)} disabled={updatingStatus} className={adminPrimaryButton}>
                    {pasoDetalle.estado === 'PAID' ? <FiDollarSign className="w-4 h-4" aria-hidden="true" />
                      : pasoDetalle.pideGuia || pasoDetalle.estado === 'SHIPPED' ? <FiTruck className="w-4 h-4" aria-hidden="true" />
                        : pasoDetalle.estado === 'DELIVERED' ? <FiCheckCircle className="w-4 h-4" aria-hidden="true" />
                          : <FiCheck className="w-4 h-4" aria-hidden="true" />}
                    {pasoDetalle.accion}
                  </button>
                )}
                {!['CANCELLED', 'DELIVERED', 'REFUNDED', 'SHIPPED'].includes(selectedOrder.status) && (
                  <button onClick={() => { setCancelReason(''); setShowCancelModal(true); }} disabled={updatingStatus} className="px-4 py-2 bg-deal-bg text-deal text-sm font-medium rounded-lg hover:bg-deal/15 disabled:opacity-50 flex items-center gap-2">
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
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id} className={adminRowHover}>
                          <td className={adminTd}>
                            <div className="font-medium text-ink">{item.productName || item.product?.name}</div>
                          </td>
                          <td className={`${adminTd} text-center`}>{item.quantity}</td>
                          <td className={`${adminTd} whitespace-nowrap text-right`}>{formatUSD(Number(item.priceUSD || item.pricePerUnit) || 0)}</td>
                          <td className={`${adminTd} whitespace-nowrap text-right font-medium`}>{formatUSD(Number(item.totalUSD || item.subtotal) || 0)}</td>
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
              {/* Entrega (C-100): destino, quién recibe, flete, guía e historial */}
              {!selectedOrder.isOnlyDigital && (
                <div className="mt-5">
                  <EntregaOrden orden={selectedOrder} />
                </div>
              )}

              {/* Order Flow Progress */}
              <div className={`mt-5 overflow-x-auto rounded-xl p-4 ${selectedOrder.isOnlyDigital ? 'bg-brand-50' : 'bg-surface'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-xs font-bold text-muted uppercase">Progreso del Pedido</h4>
                  {selectedOrder.isOnlyDigital && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500 text-white flex items-center gap-1">
                      <FiMonitor className="w-2.5 h-2.5" /> Solo Digital
                    </span>
                  )}
                </div>
                <div className="relative flex min-w-[440px] items-center justify-between">
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
            <div className={`${adminModalHeader} flex-wrap text-ink`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                <FiTruck className="w-5 h-5" />
                Información de Envío
              </h3>
              <p className="text-sm opacity-80">Orden #{selectedOrder.orderNumber}</p>
            </div>

            {/* Content */}
            <div className={`${adminModalBody} flex flex-col gap-4`}>
              <div>
                <label className={adminLabel}>
                  Empresa de envío *
                </label>
                {selectedOrder.shippingCarrier && shippingForm.carrier && shippingForm.carrier !== selectedOrder.shippingCarrier && (
                  <p className="mb-2 text-xs font-semibold text-warning-strong">
                    El cliente eligió {NOMBRE_EMPRESA[selectedOrder.shippingCarrier as keyof typeof NOMBRE_EMPRESA] ?? selectedOrder.shippingCarrier}.
                  </p>
                )}
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

              {/* El enlace de ZOOM, MRW, TEALCA y DOMESA lo arma el servidor; solo "Otra empresa" lo pide */}
              {shippingForm.carrier === 'OTHER' && (
                <div>
                  <label className={adminLabel}>
                    Enlace de rastreo (opcional)
                  </label>
                  <input
                    type="url"
                    value={shippingForm.trackingUrl}
                    onChange={(e) => setShippingForm({ ...shippingForm, trackingUrl: e.target.value })}
                    placeholder="https://…"
                    className={adminInput()}
                  />
                </div>
              )}

              <div>
                <label className={adminLabel}>
                  Notas de Envío (opcional)
                </label>
                <textarea
                  value={shippingForm.shippingNotes}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingNotes: e.target.value })}
                  placeholder="Ej: sale mañana en la tarde"
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
      {/* Cancelar orden: el motivo va al cliente por correo y por notificación */}
      {mounted && showCancelModal && selectedOrder && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowCancelModal(false); }}>
          <div className={`${adminModalPanel} sm:max-w-md`}>
            <div className={`${adminModalHeader} flex-col items-start`}>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <FiX className="w-5 h-5 text-deal" />
                Cancelar orden
              </h3>
              <p className="text-sm text-muted mt-1">Orden #{selectedOrder.orderNumber}</p>
            </div>

            <div className={`${adminModalBody} flex flex-col gap-4`}>
              <div className={adminNotice('warning')}>
                {selectedOrder.paymentStatus === 'PAID' ? (
                  selectedOrder.paymentMethod === 'WALLET' ? (
                    <>Se devolverá <strong>{formatUSD(Number(selectedOrder.totalUSD) || 0)}</strong> al saldo del cliente para comprar en la tienda, y el stock volverá al inventario.</>
                  ) : (
                    <>El stock volverá al inventario. Este pago no fue con saldo: si hay que devolver algo, se gestiona aparte.</>
                  )
                ) : (
                  <>La orden no está pagada: no se devuelve stock ni saldo, solo se libera la reserva.</>
                )}
              </div>

              <div>
                <label className={adminLabel} htmlFor="motivo-cancelacion">
                  Motivo de la cancelación *
                </label>
                <textarea
                  id="motivo-cancelacion"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Ej: El cliente pidió cancelar porque ya consiguió el equipo."
                  className={`${adminInput(cancelReason.length > 0 && cancelReason.trim().length < 10)} h-auto py-2.5 resize-none`}
                />
                <p className={adminHint}>
                  Mínimo 10 caracteres. El cliente lo recibe por correo y en sus notificaciones.
                </p>
              </div>
            </div>

            <div className={adminModalFooter}>
              <button onClick={() => setShowCancelModal(false)} className={adminSecondaryButton}>
                Volver
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={updatingStatus || cancelReason.trim().length < 10}
                className={adminDangerButton}
              >
                {updatingStatus ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <FiX className="w-4 h-4" />
                    Cancelar orden
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