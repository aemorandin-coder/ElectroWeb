'use client';

import { useState, useEffect } from 'react';
import {
  FiShield,
  FiPackage,
  FiRefreshCw,
  FiCheck,
  FiAlertCircle,
  FiChevronRight,
  FiFileText,
  FiHelpCircle,
  FiX,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminCard,
  adminPrimaryButton,
  adminTab,
  adminBadge,
  adminLabel,
  adminModalOverlay,
  adminModalPanel,
} from '@/lib/admin-ui';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalUSD: number;
  createdAt: string;
  deliveredAt?: string;
  items: {
    id: string;
    productName: string;
    productImage?: string;
    quantity: number;
  }[];
}

interface WarrantyRequest {
  id: string;
  orderNumber: string;
  productName: string;
  type: 'WARRANTY' | 'RETURN' | 'EXCHANGE';
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  reason: string;
}

export default function WarrantyPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'info' | 'requests' | 'new'>('info');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedOrderForWarranty, setSelectedOrderForWarranty] = useState<Order | null>(null);
  const [warrantyReason, setWarrantyReason] = useState('');
  const [warrantyDescription, setWarrantyDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate stored requests
  const [submittedRequests, setSubmittedRequests] = useState<WarrantyRequest[]>([]);

  useBodyScrollLock(showFormModal);

  useEffect(() => {
    fetchDeliveredOrders();
  }, []);

  const fetchDeliveredOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=DELIVERED');
      if (response.ok) {
        const result = await response.json();
        // Handle both paginated format { orders: [...] } and legacy array format
        const data = Array.isArray(result) ? result : (result.orders || []);
        setOrders(data.filter((o: any) => o.status === 'DELIVERED').slice(0, 5));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudieron cargar las garantías');
    } finally {
      setLoading(false);
    }
  };

  const getDaysSinceDelivery = (deliveredAt?: string) => {
    if (!deliveredAt) return null;
    const diff = Date.now() - new Date(deliveredAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const isWithinWarranty = (deliveredAt?: string) => {
    const days = getDaysSinceDelivery(deliveredAt);
    return days !== null && days <= 30;
  };

  const handleOpenForm = (order: Order) => {
    if (!isWithinWarranty(order.deliveredAt)) return;
    setSelectedOrderForWarranty(order);
    setShowFormModal(true);
  };

  const handleSubmitWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForWarranty || !warrantyReason || !warrantyDescription) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newReq: WarrantyRequest = {
      id: `WAR-${Date.now()}`,
      orderNumber: selectedOrderForWarranty.orderNumber,
      productName: selectedOrderForWarranty.items[0]?.productName || 'Producto',
      type: warrantyReason === 'DEFECT' ? 'WARRANTY' : (warrantyReason === 'RETURN' ? 'RETURN' : 'EXCHANGE'),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      reason: warrantyDescription,
    };

    setSubmittedRequests(prev => [newReq, ...prev]);
    setIsSubmitting(false);
    setShowFormModal(false);
    setSelectedOrderForWarranty(null);
    setWarrantyReason('');
    setWarrantyDescription('');
    setSelectedTab('requests');
  };

  return (
    <div className="h-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <FiShield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base lg:text-lg font-bold text-ink">Garantía</h1>
          <p className="text-xs text-muted">Gestiona tus solicitudes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-line">
        <button
          type="button"
          onClick={() => setSelectedTab('info')}
          className={adminTab(selectedTab === 'info')}
        >
          <span className="inline-flex items-center gap-1.5">
            <FiHelpCircle className="w-3.5 h-3.5" />
            Info
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('requests')}
          className={adminTab(selectedTab === 'requests')}
        >
          <span className="inline-flex items-center gap-1.5">
            <FiFileText className="w-3.5 h-3.5" />
            Mis Solicitudes
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('new')}
          className={adminTab(selectedTab === 'new')}
        >
          <span className="inline-flex items-center gap-1.5">
            <FiRefreshCw className="w-3.5 h-3.5" />
            Nueva
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'info' && (
        <div className="space-y-4">
          {/* Policy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`${adminCard} p-4 transition-colors hover:border-brand-500/40`}>
              <div className="w-9 h-9 bg-success/10 text-success-strong rounded-lg flex items-center justify-center mb-2">
                <FiShield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Garantía de 30 días</h3>
              <p className="text-xs text-muted">
                Todos nuestros productos tienen garantía de 30 días por defectos de fábrica.
              </p>
            </div>
            <div className={`${adminCard} p-4 transition-colors hover:border-brand-500/40`}>
              <div className="w-9 h-9 bg-brand-50 text-brand-500 rounded-lg flex items-center justify-center mb-2">
                <FiRefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Devoluciones Fáciles</h3>
              <p className="text-xs text-muted">
                Puedes devolver productos sin usar en su empaque original dentro de 7 días.
              </p>
            </div>
            <div className={`${adminCard} p-4 transition-colors hover:border-brand-500/40`}>
              <div className="w-9 h-9 bg-surface text-ink-soft rounded-lg flex items-center justify-center mb-2">
                <FiPackage className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Soporte Técnico</h3>
              <p className="text-xs text-muted">
                Asistencia especializada para configuración y problemas técnicos.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className={`${adminCard} p-5`}>
            <h3 className="font-bold text-ink text-sm mb-3">¿Cómo funciona?</h3>
            <div className="space-y-3">
              {[
                { step: 1, title: 'Inicia tu solicitud', desc: 'Selecciona el pedido y producto afectado' },
                { step: 2, title: 'Describe el problema', desc: 'Cuéntanos qué sucedió con tu producto' },
                { step: 3, title: 'Revisión', desc: 'Nuestro equipo evaluará tu caso en 24-48 horas' },
                { step: 4, title: 'Resolución', desc: 'Te contactaremos con la solución' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-xs">{item.title}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'requests' && (
        <div className="space-y-3">
          {submittedRequests.length === 0 ? (
            <div className={`${adminCard} text-center py-10`}>
              <FiFileText className="w-8 h-8 text-subtle mx-auto mb-2" />
              <p className="text-xs text-muted mb-3">No tienes solicitudes de garantía activas</p>
              <button
                type="button"
                onClick={() => setSelectedTab('new')}
                className={`${adminPrimaryButton} text-xs inline-flex items-center gap-1.5`}
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                Nueva Solicitud
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {submittedRequests.map((req) => (
                <div key={req.id} className={`${adminCard} p-4`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-ink text-sm">Pedido #{req.orderNumber}</h3>
                        <span className={adminBadge('warning')}>En Revisión</span>
                      </div>
                      <p className="text-xs text-muted">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-muted uppercase">{req.type}</span>
                      <p className="text-xs font-medium text-brand-500 mt-0.5">{req.id}</p>
                    </div>
                  </div>
                  <div className="bg-surface border border-line rounded-lg p-3 text-xs text-ink">
                    <p className="font-semibold mb-1">Motivo:</p>
                    <p className="text-muted">{req.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'new' && (
        <div className="space-y-4">
          {/* Eligible Orders */}
          <div>
            <h3 className="text-xs font-bold text-ink mb-2 uppercase tracking-wider">Pedidos Elegibles</h3>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-line border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className={`${adminCard} text-center py-8`}>
                <FiAlertCircle className="w-6 h-6 text-subtle mx-auto mb-1" />
                <p className="text-xs text-muted">No tienes pedidos entregados elegibles para garantía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => {
                  const withinWarranty = isWithinWarranty(order.deliveredAt);
                  const daysSince = getDaysSinceDelivery(order.deliveredAt);

                  return (
                    <div
                      key={order.id}
                      onClick={() => withinWarranty && handleOpenForm(order)}
                      className={`${adminCard} p-3.5 transition-all ${
                        withinWarranty
                          ? 'hover:border-brand-500 hover:shadow-sm cursor-pointer'
                          : 'bg-surface/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiPackage className="w-4 h-4 text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-ink text-xs">#{order.orderNumber}</h4>
                            {withinWarranty ? (
                              <span className={adminBadge('success')}>
                                <FiCheck className="w-2.5 h-2.5" />
                                Elegible
                              </span>
                            ) : (
                              <span className={adminBadge('danger')}>
                                Expirado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted truncate">
                            {order.items.length} producto{order.items.length > 1 ? 's' : ''} •
                            Entregado hace {daysSince} días
                            {!withinWarranty && ' (fuera de garantía)'}
                          </p>
                        </div>
                        {withinWarranty && (
                          <button
                            type="button"
                            className="p-1.5 bg-surface text-brand-500 rounded-lg transition-colors hover:bg-brand-500 hover:text-white"
                            aria-label="Seleccionar pedido"
                          >
                            <FiChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2.5 p-3.5 bg-surface border border-line rounded-xl">
            <FiAlertCircle className="w-4 h-4 text-warning-strong flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-ink mb-0.5">Importante</p>
              <p className="text-muted">
                Solo los pedidos entregados en los últimos 30 días son elegibles para garantía.
                Para devoluciones, el producto debe estar sin usar y en su empaque original.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Warranty Form Modal */}
      {showFormModal && selectedOrderForWarranty && (
        <div className={adminModalOverlay}>
          <div className={`${adminModalPanel} w-full max-w-lg h-[85dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col overflow-hidden`}>
            <div className="bg-surface border-b border-line p-5 text-ink flex-shrink-0 flex justify-between items-center">
              <div>
                <h2 className="text-base lg:text-lg font-bold text-ink">Solicitar Garantía</h2>
                <p className="text-xs text-muted">Pedido #{selectedOrderForWarranty.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-2 text-muted hover:bg-surface rounded-lg transition-colors"
                aria-label="Cerrar modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <form onSubmit={handleSubmitWarranty} className="space-y-4">
                <div>
                  <label className={adminLabel}>Motivo</label>
                  <select
                    value={warrantyReason}
                    onChange={(e) => setWarrantyReason(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-ink text-sm"
                  >
                    <option value="">Selecciona un motivo...</option>
                    <option value="DEFECT">Defecto de fábrica</option>
                    <option value="RETURN">Devolución (no me gustó)</option>
                    <option value="EXCHANGE">Cambio por otro producto</option>
                    <option value="OTHER">Soporte Técnico</option>
                  </select>
                </div>
                <div>
                  <label className={adminLabel}>Descripción del problema</label>
                  <textarea
                    value={warrantyDescription}
                    onChange={(e) => setWarrantyDescription(e.target.value)}
                    required
                    rows={4}
                    placeholder="Por favor describe detalladamente el problema que presenta tu producto..."
                    className="w-full px-3.5 py-2.5 bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all resize-none text-ink text-sm placeholder:text-subtle"
                  ></textarea>
                </div>
                <div className="bg-surface border border-line p-3 rounded-xl">
                  <p className="text-xs text-muted">
                    <strong className="text-ink">Nota:</strong> Nuestro equipo de soporte revisará tu caso y te responderá en un plazo máximo de 24-48 horas laborables.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !warrantyReason || !warrantyDescription}
                    className={`${adminPrimaryButton} w-full py-3 flex items-center justify-center gap-2`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Enviando...
                      </>
                    ) : (
                      <>Confirmar Solicitud</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
