'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiPackage, FiClock, FiCheck, FiX, FiTruck, FiShoppingBag, FiEye, FiSearch, FiRefreshCw, FiCalendar, FiArrowLeft, FiInfo, FiDownload, FiRepeat, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import { BsCardList } from 'react-icons/bs';
import Link from 'next/link';
import OrderTracking from '@/components/orders/OrderTracking';

interface OrderItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  priceUSD: number;
  totalUSD: number;
  productImage?: string;
  product?: {
    productType?: string;
  };
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
  // Shipping info
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingNotes?: string;
  estimatedDelivery?: string;
  // Digital products
  hasDigital?: boolean;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + o.totalUSD : sum, 0);
    const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    return { totalSpent, completedOrders, pendingOrders, totalItems };
  }, [orders]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showOrderDetails) {
      setShowOrderDetails(false);
    }
  }, [showOrderDetails]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  useEffect(() => {
    if (showOrderDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showOrderDetails]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const ordersWithNumbers = (data || []).map((order: any) => {
          // Check if order has digital products
          const hasDigital = order.items?.some((item: any) => item.product?.productType === 'DIGITAL') || false;
          return {
            ...order,
            totalUSD: Number(order.totalUSD) || 0,
            hasDigital,
            items: order.items?.map((item: any) => ({
              ...item,
              priceUSD: Number(item.priceUSD) || 0,
              totalUSD: Number(item.totalUSD) || 0,
            })) || []
          };
        });
        setOrders(ordersWithNumbers);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; animation?: string }> = {
      PENDING: {
        bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
        icon: <FiClock className="w-3.5 h-3.5" />,
        animation: 'animate-pulse'
      },
      PAID: {
        bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
        icon: <FiCheck className="w-3.5 h-3.5" />
      },
      PROCESSING: {
        bg: 'bg-[#2a63cd]/10', text: 'text-[#2a63cd]', border: 'border-[#2a63cd]/30',
        icon: <FiPackage className="w-3.5 h-3.5" />,
        animation: 'animate-spin-slow'
      },
      SHIPPED: {
        bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',
        icon: <FiTruck className="w-3.5 h-3.5" />,
        animation: 'animate-bounce-subtle'
      },
      DELIVERED: {
        bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
        icon: <FiCheck className="w-3.5 h-3.5" />
      },
      CANCELLED: {
        bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200',
        icon: <FiX className="w-3.5 h-3.5" />
      },
    };
    return configs[status] || configs.PENDING;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PAID: 'Pagado',
      PROCESSING: 'Procesando',
      SHIPPED: 'En Camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      READY_FOR_PICKUP: 'Listo'
    };
    return statusMap[status] || status;
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
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return `Hace ${Math.floor(days / 30)} meses`;
  };

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <FiDollarSign className="w-5 h-5 opacity-80" />
            <span className="text-xs opacity-70">Total</span>
          </div>
          <p className="text-2xl font-black">${stats.totalSpent.toFixed(2)}</p>
          <p className="text-xs opacity-70">Gastado en compras</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
          <div className="flex items-center justify-between mb-2">
            <FiCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-xs text-[#6a6c6b]">Completados</span>
          </div>
          <p className="text-2xl font-black text-[#212529]">{stats.completedOrders}</p>
          <p className="text-xs text-[#6a6c6b]">Pedidos entregados</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
          <div className="flex items-center justify-between mb-2">
            <FiClock className="w-5 h-5 text-amber-500" />
            <span className="text-xs text-[#6a6c6b]">En Proceso</span>
          </div>
          <p className="text-2xl font-black text-[#212529]">{stats.pendingOrders}</p>
          <p className="text-xs text-[#6a6c6b]">Pedidos activos</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
          <div className="flex items-center justify-between mb-2">
            <FiPackage className="w-5 h-5 text-[#2a63cd]" />
            <span className="text-xs text-[#6a6c6b]">Productos</span>
          </div>
          <p className="text-2xl font-black text-[#212529]">{stats.totalItems}</p>
          <p className="text-xs text-[#6a6c6b]">Artículos comprados</p>
        </div>
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] transition-all"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] bg-white"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="SHIPPED">En Camino</option>
            <option value="DELIVERED">Entregado</option>
          </select>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors disabled:opacity-50"
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
          <p className="mt-4 text-sm text-[#6a6c6b]">Cargando pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-[#f8f9fa] rounded-xl border border-dashed border-[#dee2e6]">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FiPackage className="w-8 h-8 text-[#adb5bd]" />
          </div>
          <h3 className="text-lg font-bold text-[#212529] mb-1">No hay pedidos</h3>
          <p className="text-sm text-[#6a6c6b] mb-4">Aún no has realizado ningún pedido</p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors"
          >
            <FiShoppingBag className="w-4 h-4" />
            Explorar Productos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, index) => {
            const statusConfig = getStatusConfig(order.status);
            return (
              <div
                key={order.id}
                className="group bg-white rounded-xl border border-[#e9ecef] p-4 hover:shadow-md hover:border-[#2a63cd]/20 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Order Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#2a63cd]/5 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FiPackage className="w-5 h-5 text-[#2a63cd]" />
                    </div>
                    {/* Status Indicator Dot */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${statusConfig.bg} ${statusConfig.border} border flex items-center justify-center`}>
                      <span className={statusConfig.animation}>{statusConfig.icon}</span>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-[#212529] text-sm">#{order.orderNumber}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border flex items-center gap-1`}>
                        <span className={statusConfig.animation}>{statusConfig.icon}</span>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6a6c6b]">
                      <span>{getTimeSince(order.createdAt)}</span>
                      <span>•</span>
                      <span>{order.items.length} producto{order.items.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Products Preview */}
                  <div className="hidden sm:flex -space-x-2">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-lg border-2 border-white bg-[#f8f9fa] flex items-center justify-center overflow-hidden shadow-sm"
                        title={item.productName}
                      >
                        {item.productImage ? (
                          <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FiPackage className="w-3 h-3 text-[#adb5bd]" />
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-8 h-8 rounded-lg border-2 border-white bg-[#2a63cd] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Price & Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-[#212529]">${order.totalUSD.toFixed(2)}</p>
                      <p className="text-[10px] text-[#6a6c6b] uppercase tracking-wide">USD</p>
                    </div>

                    {/* Digital Codes Button */}
                    {order.hasDigital && order.paymentStatus === 'PAID' && (
                      <Link
                        href={`/customer/orders/${order.id}/digital`}
                        className="p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/20"
                        title="Ver códigos digitales"
                      >
                        <BsCardList className="w-4 h-4" />
                      </Link>
                    )}

                    <div className="relative group/tooltip">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="p-2.5 bg-[#f8f9fa] hover:bg-[#2a63cd] text-[#6a6c6b] hover:text-white rounded-lg transition-all duration-200"
                        title="Ver detalles del pedido"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#212529] text-white text-xs font-medium rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                        Ver detalles
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#212529]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {mounted && showOrderDetails && selectedOrder && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 999999,
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={closeModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)'
            }}
          />
          <div
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <div style={{ background: 'linear-gradient(to right, #2a63cd, #1e4ba3)', padding: '20px', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiPackage style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>Pedido</p>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>#{selectedOrder.orderNumber}</h3>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <FiX style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px', maxHeight: '50vh', overflowY: 'auto' }}>
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
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

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#212529', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiShoppingBag style={{ width: '16px', height: '16px', color: '#2a63cd' }} />
                  Productos ({selectedOrder.items.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <FiPackage style={{ width: '16px', height: '16px', color: '#adb5bd' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, color: '#212529', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item.productName}</p>
                        <p style={{ fontSize: '12px', color: '#6a6c6b', margin: 0 }}>x{item.quantity}</p>
                      </div>
                      <p style={{ fontWeight: 700, color: '#2a63cd', fontSize: '14px', margin: 0 }}>${item.totalUSD.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6a6c6b' }}>
                  {selectedOrder.paymentMethod && <span>Pago: <strong style={{ color: '#212529' }}>{selectedOrder.paymentMethod.replace('_', ' ')}</strong></span>}
                </div>
                <div style={{ backgroundColor: '#2a63cd', color: 'white', padding: '8px 16px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>Total</p>
                  <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>USD {selectedOrder.totalUSD.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'white',
                  border: '2px solid #e9ecef',
                  color: '#212529',
                  fontWeight: 600,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <FiArrowLeft style={{ width: '16px', height: '16px' }} />
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
