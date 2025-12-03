'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiPrinter, FiBriefcase, FiUser, FiFileText } from 'react-icons/fi';

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
  total: number;
  status: string;
  createdAt: string;
  items: any[];
  paymentMethod: string;
  adminNotes: string | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all'
        ? '/api/orders'
        : `/api/orders?status=${filterStatus}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
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

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
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
        const updatedOrder = await response.json();
        setSelectedOrder(updatedOrder);
        // Update in list as well
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-100 text-orange-700';
      case 'PAID': return 'bg-blue-100 text-blue-700';
      case 'SHIPPED': return 'bg-purple-100 text-purple-700';
      case 'DELIVERED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'PAID': return 'Pagado';
      case 'SHIPPED': return 'Enviado';
      case 'DELIVERED': return 'Entregado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const stats = [
    { label: 'Total', value: orders.length.toString(), color: 'bg-[#2a63cd]' },
    { label: 'Pendientes', value: orders.filter(o => o.status === 'PENDING').length.toString(), color: 'bg-orange-500' },
    { label: 'Pagadas', value: orders.filter(o => o.status === 'PAID').length.toString(), color: 'bg-blue-500' },
    { label: 'Completadas', value: orders.filter(o => o.status === 'DELIVERED').length.toString(), color: 'bg-green-500' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between animate-fadeIn">
          <div>
            <h1 className="text-xl font-semibold text-[#212529]">Órdenes</h1>
            <p className="text-xs text-[#6a6c6b] mt-0.5">Gestiona pedidos de clientes</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg text-[#212529] focus:outline-none focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10"
            >
              <option value="all">Todas</option>
              <option value="PENDING">Pendientes</option>
              <option value="PAID">Pagadas</option>
              <option value="SHIPPED">Enviadas</option>
              <option value="DELIVERED">Entregadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 stagger-children">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                <span className="text-xs text-[#6a6c6b] font-medium">{stat.label}</span>
              </div>
              <p className="text-xl font-semibold text-[#212529]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 overflow-y-auto pr-2 mt-4">
        <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm animate-scaleIn min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
              title="No hay órdenes"
              description={filterStatus !== 'all' ? 'No hay órdenes con este estado' : 'Aún no se han realizado pedidos'}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    }
                    title="No hay órdenes"
                    description={filterStatus !== 'all' ? 'No hay órdenes con este estado' : 'Aún no se han realizado pedidos'}
                  />
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-lg font-bold text-[#2a63cd] block mb-1">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-[#6a6c6b]">
                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#6a6c6b]">Cliente</span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#212529]">{order.user.name}</p>
                            <p className="text-xs text-[#6a6c6b]">{order.user.email}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#e9ecef]">
                          <span className="text-sm font-bold text-[#212529]">Total</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                            <span className="text-lg font-bold text-[#212529]">
                              {parseFloat(order.total.toString()).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setAdminNotes(order.adminNotes || '');
                          setShowDetailsModal(true);
                        }}
                        className="w-full py-2 text-sm font-medium text-[#2a63cd] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6a6c6b]">Orden</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6a6c6b]">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6a6c6b]">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6a6c6b]">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6a6c6b]">Fecha</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#6a6c6b]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9ecef]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#2a63cd]">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[#212529] font-medium">{order.user.name}</span>
                            <span className="text-xs text-[#6a6c6b]">{order.user.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#212529]">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                            <span className="text-sm font-bold text-[#212529]">
                              {parseFloat(order.total.toString()).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6a6c6b]">
                          {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: es })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setAdminNotes(order.adminNotes || '');
                              setShowDetailsModal(true);
                            }}
                            className="text-[#2a63cd] hover:text-[#1e4ba3] font-medium text-xs hover:underline"
                          >
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Order Details Modal */}
      {
        showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
              onClick={() => setShowDetailsModal(false)}
            />

            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl transform transition-all animate-scaleIn flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-[#e9ecef] flex items-center justify-between bg-[#f8f9fa] rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-bold text-[#212529]">{selectedOrder.orderNumber}</h3>
                  <p className="text-sm text-[#6a6c6b]">
                    {format(new Date(selectedOrder.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#dee2e6] text-[#212529] text-sm font-medium rounded-lg hover:bg-[#f8f9fa] transition-colors shadow-sm"
                    onClick={() => alert('Funcionalidad de impresión próximamente')}
                  >
                    <FiPrinter className="w-4 h-4" />
                    Imprimir Factura
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 hover:bg-[#e9ecef] rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#6a6c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto">
                {/* Status & Actions */}
                <div className="flex items-center justify-between mb-8 bg-white p-4 border border-[#e9ecef] rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#6a6c6b]">Estado actual:</span>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {selectedOrder.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(selectedOrder.id, 'PAID')}
                          disabled={updatingStatus}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Marcar como Pagado
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(selectedOrder.id, 'CANCELLED')}
                          disabled={updatingStatus}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Cancelar Orden
                        </button>
                      </>
                    )}
                    {selectedOrder.status === 'PAID' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'SHIPPED')}
                        disabled={updatingStatus}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Marcar como Enviado
                      </button>
                    )}
                    {selectedOrder.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')}
                        disabled={updatingStatus}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Marcar como Entregado
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-sm font-bold text-[#212529] uppercase tracking-wider mb-3">Cliente</h4>
                    <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e9ecef] space-y-3">
                      <div>
                        <p className="font-semibold text-[#212529]">{selectedOrder.user.name}</p>
                        <p className="text-sm text-[#6a6c6b]">{selectedOrder.user.email}</p>
                      </div>

                      <div className="pt-3 border-t border-[#e9ecef]">
                        <div className="flex items-center gap-2 mb-2">
                          {selectedOrder.user.profile?.customerType === 'COMPANY' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                              <FiBriefcase className="w-3 h-3" /> Empresa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-100">
                              <FiUser className="w-3 h-3" /> Persona
                            </span>
                          )}
                        </div>
                        {selectedOrder.user.profile?.customerType === 'COMPANY' && (
                          <div className="text-sm">
                            <p className="text-[#6a6c6b]"><span className="font-medium text-[#212529]">Empresa:</span> {selectedOrder.user.profile.companyName}</p>
                            <p className="text-[#6a6c6b]"><span className="font-medium text-[#212529]">RIF:</span> {selectedOrder.user.profile.taxId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Info & Admin Notes */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#212529] uppercase tracking-wider mb-3">Pago</h4>
                      <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e9ecef]">
                        <p className="text-sm text-[#6a6c6b] mb-1">Método de pago</p>
                        <p className="font-semibold text-[#212529]">{selectedOrder.paymentMethod || 'No especificado'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#212529] uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FiFileText className="w-4 h-4" /> Notas de Administración
                      </h4>
                      <div className="bg-[#fff3cd] p-4 rounded-xl border border-[#ffeeba]">
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-[#856404] placeholder-[#856404]/60 resize-none"
                          rows={3}
                          placeholder="Agregar notas internas sobre esta orden..."
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleSaveNotes}
                            disabled={savingNotes}
                            className="text-xs font-bold text-[#856404] hover:text-[#533f03] underline disabled:opacity-50"
                          >
                            {savingNotes ? 'Guardando...' : 'Guardar Nota'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-bold text-[#212529] uppercase tracking-wider mb-3">Productos</h4>
                  <div className="border border-[#e9ecef] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#f8f9fa] border-b border-[#e9ecef]">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-[#6a6c6b]">Producto</th>
                          <th className="px-4 py-2 text-center font-semibold text-[#6a6c6b]">Cant.</th>
                          <th className="px-4 py-2 text-right font-semibold text-[#6a6c6b]">Precio</th>
                          <th className="px-4 py-2 text-right font-semibold text-[#6a6c6b]">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9ecef]">
                        {selectedOrder.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-[#212529]">{item.productName}</div>
                              <div className="text-xs text-[#6a6c6b]">SKU: {item.productSku}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-[#212529]">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-[#6a6c6b]">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-[10px] font-bold text-[#6a6c6b] opacity-60">USD</span>
                                <span>{parseFloat(item.pricePerUnit).toFixed(2).replace('.', ',')}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-[#212529]">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-[10px] font-bold text-[#212529] opacity-60">USD</span>
                                <span>{parseFloat(item.subtotal).toFixed(2).replace('.', ',')}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#f8f9fa] border-t border-[#e9ecef]">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right font-bold text-[#212529]">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-[#2a63cd] text-lg">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-xs font-bold text-[#2a63cd] opacity-60">USD</span>
                              <span className="text-xl font-bold text-[#2a63cd]">
                                {parseFloat(selectedOrder.total.toString()).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-4 border-t border-[#e9ecef] bg-[#f8f9fa] rounded-b-2xl flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-white border border-[#dee2e6] hover:bg-[#f8f9fa] text-[#212529] rounded-lg transition-colors font-medium shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
