'use client';

import { useState, useEffect } from 'react';
import { FiPackage, FiClock, FiCheck, FiX, FiTruck, FiShoppingBag, FiEye, FiDownload, FiSearch, FiRefreshCw, FiCalendar, FiFilter } from 'react-icons/fi';
import Link from 'next/link';
import OrderTracking from '@/components/orders/OrderTracking';

interface OrderItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  productImage?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: OrderItem[];
  address?: any;
  paymentMethod?: string;
  deliveryMethod?: string;
  notes?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');

  useEffect(() => {
    fetchOrders();
  }, []);

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
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const ordersWithNumbers = (data || []).map((order: any) => ({
          ...order,
          total: Number(order.total),
          items: order.items?.map((item: any) => ({
            ...item,
            pricePerUnit: Number(item.pricePerUnit),
            subtotal: Number(item.subtotal),
          })) || []
        }));
        setOrders(ordersWithNumbers);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'PAID':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'SHIPPED':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'DELIVERED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <FiClock className="w-4 h-4" />;
      case 'PAID':
      case 'PROCESSING':
        return <FiPackage className="w-4 h-4" />;
      case 'SHIPPED':
        return <FiTruck className="w-4 h-4" />;
      case 'DELIVERED':
        return <FiCheck className="w-4 h-4" />;
      case 'CANCELLED':
        return <FiX className="w-4 h-4" />;
      default:
        return <FiPackage className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PAID: 'Pagado',
      PROCESSING: 'Procesando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      READY_FOR_PICKUP: 'Listo para Recoger'
    };
    return statusMap[status] || status;
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'ALL' || order.status === selectedStatus;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Mis Pedidos</h1>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white rounded-lg hover:bg-[#1e4ba3] transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent"
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="PAID">Pagado</option>
          <option value="PROCESSING">Procesando</option>
          <option value="SHIPPED">Enviado</option>
          <option value="DELIVERED">Entregado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPackage className="w-10 h-10 text-[#adb5bd]" />
          </div>
          <h3 className="text-xl font-bold text-[#212529] mb-2">No hay pedidos</h3>
          <p className="text-[#6a6c6b] mb-6">Aún no has realizado ningún pedido</p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white rounded-xl font-semibold hover:bg-[#1e4ba3] transition-colors"
          >
            <FiShoppingBag className="w-5 h-5" />
            Ir a Comprar
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-[#e9ecef] p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#212529]">Pedido #{order.orderNumber}</h3>
                  <div className="flex items-center gap-2 text-sm text-[#6a6c6b]">
                    <FiCalendar className="w-4 h-4" />
                    {new Date(order.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                    <span className="text-lg font-bold text-[#212529]">
                      {order.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#e9ecef]">
                <div className="flex -space-x-2 overflow-hidden">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#f8f9fa] flex items-center justify-center relative" title={item.productName}>
                      {item.productImage ? (
                        <img src={item.productImage} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <FiPackage className="w-4 h-4 text-[#adb5bd]" />
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-[#e9ecef] flex items-center justify-center text-xs font-medium text-[#6a6c6b]">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderDetails(true);
                  }}
                  className="text-[#2a63cd] font-medium text-sm hover:underline flex items-center gap-1"
                >
                  Ver Detalles <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 z-[100] overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowOrderDetails(false)}
            />
            <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-scaleIn max-h-[85vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-[#e9ecef]">
                <div>
                  <h3 className="text-2xl font-bold text-[#212529] mb-2">
                    Pedido #{selectedOrder.orderNumber}
                  </h3>
                  <p className="text-sm text-[#6a6c6b]">
                    Realizado el {new Date(selectedOrder.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-6">
                {/* Order Tracking */}
                <div className="mb-6">
                  <OrderTracking
                    status={selectedOrder.status}
                    createdAt={selectedOrder.createdAt}
                    paidAt={selectedOrder.paidAt}
                    shippedAt={selectedOrder.shippedAt}
                    deliveredAt={selectedOrder.deliveredAt}
                    deliveryMethod={selectedOrder.deliveryMethod || 'HOME_DELIVERY'}
                  />
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-[#212529] mb-4">Productos</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-[#f8f9fa] rounded-lg">
                        <div className="w-16 h-16 bg-white rounded-lg border border-[#e9ecef] flex items-center justify-center flex-shrink-0">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <FiPackage className="w-6 h-6 text-[#6a6c6b]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-[#212529]">{item.productName}</h5>
                          <p className="text-sm text-[#6a6c6b]">
                            Cantidad: {item.quantity} •
                            <span className="inline-flex items-baseline gap-1 ml-1">
                              <span className="text-[10px] font-bold text-[#212529] opacity-60">USD</span>
                              <span className="font-medium text-[#212529]">{item.pricePerUnit.toFixed(2).replace('.', ',')}</span>
                            </span>
                            {' '}c/u
                          </p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-[#2a63cd] opacity-60">USD</span>
                          <span className="text-lg font-bold text-[#2a63cd]">
                            {item.subtotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-[#f8f9fa] rounded-xl p-6">
                  <h4 className="text-lg font-bold text-[#212529] mb-4">Resumen del Pedido</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6a6c6b]">Total</span>
                      <span className="font-bold text-[#212529]">
                        USD {selectedOrder.total.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {selectedOrder.paymentMethod && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6a6c6b]">Método de Pago</span>
                        <span className="font-medium text-[#212529]">{selectedOrder.paymentMethod}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryMethod && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6a6c6b]">Método de Entrega</span>
                        <span className="font-medium text-[#212529]">
                          {selectedOrder.deliveryMethod === 'PICKUP' ? 'Retiro en tienda' : 'Envío a domicilio'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
