'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ProductRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productName: string;
  description: string;
  category?: string;
  estimatedBudget?: number;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

export default function ProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      const url = filterStatus === 'all'
        ? '/api/product-requests'
        : `/api/product-requests?status=${filterStatus}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/product-requests?id=${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminNotes,
        }),
      });

      if (response.ok) {
        fetchRequests();
        setShowModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        setNewStatus('');
      }
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta solicitud?')) return;

    try {
      const response = await fetch(`/api/product-requests?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const openModal = (request: ProductRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setNewStatus(request.status);
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      PENDING: { variant: 'warning', label: 'Pendiente' },
      IN_PROGRESS: { variant: 'info', label: 'En Progreso' },
      FULFILLED: { variant: 'success', label: 'Cumplida' },
      REJECTED: { variant: 'error', label: 'Rechazada' },
    };

    const config = variants[status] || variants.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
    fulfilled: requests.filter(r => r.status === 'FULFILLED').length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-fadeIn">
          <div>
            <h1 className="text-xl font-semibold text-[#212529]">Solicitudes de Productos</h1>
            <p className="text-xs text-[#6a6c6b] mt-0.5">
              Gestiona las solicitudes de productos de los clientes
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 stagger-children">
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Total</p>
            <p className="text-2xl font-semibold text-[#212529]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Pendientes</p>
            <p className="text-2xl font-semibold text-orange-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">En Progreso</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Cumplidas</p>
            <p className="text-2xl font-semibold text-green-600">{stats.fulfilled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10"
          >
            <option value="all">Todas</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="FULFILLED">Cumplidas</option>
            <option value="REJECTED">Rechazadas</option>
          </select>
        </div>
      </div>

      {/* Scrollable Requests List */}
      <div className="flex-1 overflow-y-auto pr-2 mt-4">
        <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-[#e9ecef] p-12 text-center">
            <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[#6a6c6b] mt-3">Cargando solicitudes...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#e9ecef] p-12 text-center">
            <svg className="w-16 h-16 text-[#adb5bd] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="text-lg font-semibold text-[#212529] mb-1">No hay solicitudes</h3>
            <p className="text-sm text-[#6a6c6b]">No se encontraron solicitudes de productos</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-[#212529]">
                          {request.productName}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-[#6a6c6b] mb-2">
                        {request.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-[#6a6c6b]">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{request.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{request.customerEmail}</span>
                        </div>
                        {request.customerPhone && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{request.customerPhone}</span>
                          </div>
                        )}
                        {request.estimatedBudget && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Presupuesto: ${request.estimatedBudget.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#adb5bd] mt-2">
                        {new Date(request.createdAt).toLocaleString('es-VE')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(request)}
                        className="p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors"
                        title="Gestionar"
                      >
                        <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {request.adminNotes && (
                    <div className="mt-3 p-3 bg-[#f8f9fa] rounded-lg">
                      <p className="text-xs font-semibold text-[#212529] mb-1">Notas del Admin:</p>
                      <p className="text-xs text-[#6a6c6b]">{request.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowModal(false)}
            />

            <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-scaleIn">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-[#212529]">
                    Gestionar Solicitud
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#6a6c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#212529] mb-2">
                      Estado
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-4 focus:ring-[#2a63cd]/10"
                    >
                      <option value="PENDING">Pendiente</option>
                      <option value="IN_PROGRESS">En Progreso</option>
                      <option value="FULFILLED">Cumplida</option>
                      <option value="REJECTED">Rechazada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#212529] mb-2">
                      Notas del Administrador
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      placeholder="Agrega notas internas sobre esta solicitud..."
                      className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg text-[#212529] placeholder:text-[#adb5bd] focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-4 focus:ring-[#2a63cd]/10 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#f8f9fa] px-6 py-4 flex items-center justify-end gap-3 border-t border-[#e9ecef]">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleUpdateStatus}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
