'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface OrderItem {
  id: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalUSD: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  paymentMethod: string | null;
  deliveryMethod: string | null;
}

export default function MisPedidosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
    }
  }, [session, filter]);

  const fetchOrders = async () => {
    try {
      const url = filter === 'all'
        ? '/api/orders'
        : `/api/orders?status=${filter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al cargar pedidos');

      const data = await response.json();
      // Parse numbers correctly
      const parsedOrders = (data || []).map((order: any) => ({
        ...order,
        totalUSD: Number(order.totalUSD) || 0,
        items: order.items?.map((item: any) => ({
          ...item,
          pricePerUnit: Number(item.priceUSD) || 0,
          subtotal: Number(item.totalUSD) || 0,
        })) || []
      }));
      setOrders(parsedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
      PAYMENT_PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
      PAID: 'bg-green-100 text-green-800 border-green-200',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
      SHIPPED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      REFUNDED: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PAYMENT_PENDING: 'Pago Pendiente',
      PAID: 'Pagado',
      PROCESSING: 'En Proceso',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      REFUNDED: 'Reembolsado',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'VES',
    }).format(amount);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#2a63cd] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 mb-4 shadow-2xl animate-pulse">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-white/80 text-sm font-medium">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#2a63cd] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <div className="fixed inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-white/30 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-[#212529] hover:text-[#2a63cd] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Volver al inicio</span>
              </Link>
              <h1 className="text-xl font-bold text-[#212529]">Mis Pedidos</h1>
              <Link
                href="/mi-cuenta"
                className="px-4 py-2 text-sm font-medium text-[#2a63cd] hover:text-[#1e4ba3] transition-colors"
              >
                Mi Cuenta
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 mb-6">
            <div className="flex flex-wrap gap-2">
              {['all', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === status
                    ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg'
                    : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
                    }`}
                >
                  {status === 'all' ? 'Todos' : getStatusText(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-12 text-center">
              <svg className="w-16 h-16 text-[#6a6c6b] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-bold text-[#212529] mb-2">No hay pedidos</h3>
              <p className="text-[#6a6c6b] mb-6">Aún no has realizado ningún pedido</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Ver Productos
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all"
                >
                  <div className="h-1 bg-gradient-to-r from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd]"></div>

                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-[#212529] mb-1">
                          Pedido {order.orderNumber}
                        </h3>
                        <p className="text-sm text-[#6a6c6b]">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                          <span className="text-xl font-bold text-[#212529]">
                            {order.totalUSD.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3 mb-6">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-[#f8f9fa] rounded-lg">
                          {item.productImage ? (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={item.productImage}
                                alt={item.productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-[#e9ecef] flex items-center justify-center flex-shrink-0">
                              <svg className="w-8 h-8 text-[#6a6c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[#212529] truncate">{item.productName}</h4>
                            <p className="text-sm text-[#6a6c6b]">SKU: {item.productSku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#6a6c6b]">Cantidad: {item.quantity}</p>
                            <div className="flex items-baseline gap-1 justify-end">
                              <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                              <span className="font-semibold text-[#212529]">
                                {Number(item.subtotal).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-[#e9ecef]">
                      <div className="text-sm text-[#6a6c6b]">
                        {order.paymentMethod && (
                          <p className="mb-1">
                            <span className="font-semibold">Método de pago:</span>{' '}
                            {order.paymentMethod.replace('_', ' ').toUpperCase()}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Entrega:</span>{' '}
                          {order.deliveryMethod ? order.deliveryMethod.replace('_', ' ').toUpperCase() : 'N/A'}
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] font-semibold rounded-lg transition-colors border border-[#dee2e6]">
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

