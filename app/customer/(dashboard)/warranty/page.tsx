'use client';

import { useState } from 'react';
import {
  FiShield,
  FiPackage,
  FiRefreshCw,
  FiCheck,
  FiAlertCircle,
  FiChevronRight,
  FiFileText,
  FiHelpCircle,
  FiMail,
  FiX,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useSettings } from '@/contexts/SettingsContext';
import {
  adminCard,
  adminPrimaryButton,
  adminSecondaryButton,
  adminTab,
  adminBadge,
  adminLabel,
  adminModalOverlay,
  adminModalPanel,
} from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { CONDITION_LABEL, DEFAULT_WARRANTY_DAYS, WARRANTY_REASONS, warrantyDaysFor, type Condition, type WarrantyReason } from '@/lib/product-condition';

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
    /** C-119: copia de cómo se vendió (null en pedidos viejos: nuevo) */
    productCondition?: Condition | null;
    warrantyDays?: number | null;
  }[];
}

/** C-119: solicitud guardada en Mensajes y Solicitudes (antes esta lista era una simulación que no se guardaba) */
interface WarrantyRequest {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

const REQUEST_STATUS: Record<string, { label: string; tone: 'warning' | 'brand' | 'success' }> = {
  PENDING: { label: 'Recibida', tone: 'warning' },
  READ: { label: 'En revisión', tone: 'brand' },
  RESPONDED: { label: 'Respondida', tone: 'success' },
};

const itemWarrantyDays = (item: Order['items'][number]) => warrantyDaysFor(item.productCondition, item.warrantyDays);

export default function WarrantyPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  // Hora de referencia para la garantía: una vez por carga, no en cada render (C-111)
  const [ahora] = useState(Date.now);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'info' | 'requests' | 'new'>('info');
  const { settings } = useSettings();
  const whatsappAyuda = settings?.whatsapp?.replace(/\D/g, '') || '';
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedOrderForWarranty, setSelectedOrderForWarranty] = useState<Order | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [warrantyReason, setWarrantyReason] = useState<WarrantyReason | ''>('');
  const [warrantyDescription, setWarrantyDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submittedRequests, setSubmittedRequests] = useState<WarrantyRequest[]>([]);

  useBodyScrollLock(showFormModal);

  async function fetchRequests() {
    const res = await fetch('/api/customer/warranty').catch(() => null);
    if (res?.ok) setSubmittedRequests(((await res.json()) as { requests: WarrantyRequest[] }).requests);
  }

  async function fetchDeliveredOrders() {
    void fetchRequests();
    try {
      const response = await fetch('/api/orders?status=DELIVERED');
      if (response.ok) {
        const result = await response.json();
        // Handle both paginated format { orders: [...] } and legacy array format
        const data = Array.isArray(result) ? result : (result.orders || []);
        setOrders(data.filter((o: Order) => o.status === 'DELIVERED').slice(0, 5));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudieron cargar las garantías');
    } finally {
      setLoading(false);
    }
  }

  useCargarAlMontar(fetchDeliveredOrders);

  const getDaysSinceDelivery = (deliveredAt?: string) => {
    if (!deliveredAt) return null;
    const diff = ahora - new Date(deliveredAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // C-119: cada producto tiene su garantía (la que guardó el pedido). Un pedido es elegible si alguno sigue cubierto
  const coveredItems = (order: Order) => {
    const days = getDaysSinceDelivery(order.deliveredAt);
    return days === null ? [] : order.items.filter((item) => days <= itemWarrantyDays(item));
  };
  const isWithinWarranty = (order: Order) => coveredItems(order).length > 0;

  const handleOpenForm = (order: Order) => {
    const covered = coveredItems(order);
    if (!covered.length) return;
    setSelectedOrderForWarranty(order);
    setSelectedItemId(covered.length === 1 ? covered[0].id : '');
    setShowFormModal(true);
  };

  const handleSubmitWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForWarranty || !selectedItemId || !warrantyReason || !warrantyDescription) return;

    setIsSubmitting(true);
    // C-119: antes esto era una simulación (esperaba 1,5 s y no guardaba nada). Ahora llega al equipo de verdad
    const res = await fetch('/api/customer/warranty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selectedOrderForWarranty.id, itemId: selectedItemId, reason: warrantyReason, description: warrantyDescription }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    if (!res?.ok) {
      setIsSubmitting(false);
      toast.error(data?.error || 'No se pudo enviar la solicitud. Intenta de nuevo o escríbenos por WhatsApp.');
      return;
    }
    toast.success('Recibimos tu solicitud. Te respondemos por correo o WhatsApp.');
    await fetchRequests();
    setIsSubmitting(false);
    setShowFormModal(false);
    setSelectedOrderForWarranty(null);
    setSelectedItemId('');
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
              <h3 className="font-bold text-ink text-sm mb-0.5">Garantía de la tienda</h3>
              <p className="text-xs text-muted">
                Cubre fallas de funcionamiento. Nuevos: {DEFAULT_WARRANTY_DAYS.NEW} días; reacondicionados: {DEFAULT_WARRANTY_DAYS.REFURBISHED}; usados: {DEFAULT_WARRANTY_DAYS.USED}. El plazo de cada producto se ve en su ficha y cuenta desde la entrega.
              </p>
            </div>
            <div className={`${adminCard} p-4 transition-colors hover:border-brand-500/40`}>
              <div className="w-9 h-9 bg-brand-50 text-brand-500 rounded-lg flex items-center justify-center mb-2">
                <FiRefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Sin devoluciones por cambio de opinión</h3>
              <p className="text-xs text-muted">
                Si el producto llega dañado, con una falla o distinto a lo publicado, lo atendemos por garantía: lo revisamos y lo reparamos, lo cambiamos o te devolvemos el dinero.
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
                { step: 3, title: 'Revisión', desc: 'Te respondemos en 1 a 2 días hábiles. Puede que pidamos fotos, un video o revisar el equipo en la tienda' },
                { step: 4, title: 'Resolución', desc: 'Reparación, cambio o devolución del dinero, según lo que encontremos' },
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

          {/* Ayuda: R11 quitó el bloque porque tenía un correo y un teléfono inventados; ahora usa los de Configuración */}
          {(whatsappAyuda || settings?.email) && (
            <div className={`${adminCard} p-5`}>
              <h3 className="font-bold text-ink text-sm mb-1">¿Necesitas ayuda?</h3>
              <p className="text-xs text-muted mb-3">Escríbenos y te respondemos lo antes posible.</p>
              <div className="flex flex-wrap gap-2">
                {whatsappAyuda && (
                  <a href={`https://wa.me/${whatsappAyuda}`} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}>
                    <FaWhatsapp className="w-4 h-4 text-success-strong" aria-hidden="true" />
                    WhatsApp
                  </a>
                )}
                {settings?.email && (
                  <a href={`mailto:${settings.email}`} className={adminSecondaryButton}>
                    <FiMail className="w-4 h-4" aria-hidden="true" />
                    {settings.email}
                  </a>
                )}
              </div>
            </div>
          )}
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
              {submittedRequests.map((req) => {
                const st = REQUEST_STATUS[req.status] ?? REQUEST_STATUS.PENDING;
                return (
                  <div key={req.id} className={`${adminCard} p-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 font-bold text-ink text-sm">{req.subject}</h3>
                      <span className={`${adminBadge(st.tone)} shrink-0`}>{st.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{new Date(req.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                );
              })}
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
                  const withinWarranty = isWithinWarranty(order);
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
                          <p className="text-xs text-muted">
                            {order.items.length} producto{order.items.length > 1 ? 's' : ''} •
                            Entregado hace {daysSince} días
                            {!withinWarranty && ' (fuera de garantía)'}
                            {withinWarranty && ` · garantía hasta ${Math.max(...coveredItems(order).map(itemWarrantyDays))} días`}
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
                Cada producto tiene su plazo de garantía, que cuenta desde la entrega. No cubre golpes, humedad, mal uso,
                reparaciones de terceros ni el desgaste descrito en la ficha de un usado. Detalles en los términos y condiciones.
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
                  <label htmlFor="w-item" className={adminLabel}>Producto</label>
                  <select
                    id="w-item"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-ink text-sm"
                  >
                    <option value="">Elige el producto...</option>
                    {coveredItems(selectedOrderForWarranty).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.productName}
                        {item.productCondition && item.productCondition !== 'NEW' ? ` (${CONDITION_LABEL[item.productCondition]})` : ''} · {itemWarrantyDays(item)} días de garantía
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="w-reason" className={adminLabel}>Motivo</label>
                  <select
                    id="w-reason"
                    value={warrantyReason}
                    onChange={(e) => setWarrantyReason(e.target.value as WarrantyReason | '')}
                    required
                    className="w-full px-3.5 py-2.5 bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-ink text-sm"
                  >
                    <option value="">Selecciona un motivo...</option>
                    {(Object.keys(WARRANTY_REASONS) as WarrantyReason[]).map((r) => (
                      <option key={r} value={r}>{WARRANTY_REASONS[r]}</option>
                    ))}
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
                    <strong className="text-ink">Nota:</strong> Te respondemos en 1 a 2 días hábiles por correo o WhatsApp. Ten a mano fotos o un video de la falla: los podemos pedir.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedItemId || !warrantyReason || !warrantyDescription}
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
