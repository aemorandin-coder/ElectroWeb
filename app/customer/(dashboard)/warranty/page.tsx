'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  IconoActualizar, IconoAyuda, IconoCamaraFotos, IconoCerrar, IconoCheck, IconoChevronDerecha, IconoCorreo,
  IconoDigital, IconoDocumento, IconoEliminar, IconoError, IconoFlechaIzquierda, IconoGarantia, IconoInfo, IconoPaquete,
} from '@/components/iconos';
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
import {
  CLAIM_STATUS_CUSTOMER, CLAIM_STATUS_HELP, CLAIM_TONE_CUSTOMER, isClosedStatus, RESOLUTION_LABEL, WARRANTY_MAX_PHOTOS, WARRANTY_MESSAGE_MAX,
  type ClaimStatus, type Resolution,
} from '@/lib/warranty';
import { Historial, type EventoGarantia } from '@/components/warranty/Historial';
import { useFocoDeVuelta } from '@/lib/hooks/useFocoDeVuelta';

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
    /** C-265: lo digital (códigos y recargas) va aparte */
    product?: { productType?: string | null; mainImage?: string | null } | null;
  }[];
}

/** C-122: solicitud con estado e historial (C-119 la guardaba como un mensaje de contacto) */
interface Claim {
  id: string;
  code: string;
  productName: string;
  productCondition: Condition | null;
  status: ClaimStatus;
  resolution: Resolution | null;
  reason: WarrantyReason;
  warrantyDays: number;
  orderNumber: string;
  /** C-265: la foto del producto */
  foto?: string | null;
  createdAt: string;
  updatedAt: string;
}

const inputClass = 'w-full px-3.5 py-2.5 bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink text-sm';
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
const itemWarrantyDays = (item: Order['items'][number]) => warrantyDaysFor(item.productCondition, item.warrantyDays);
// C-265 (decisión 2 de C-251): los códigos y las recargas no van por garantía al taller (el servidor tampoco los acepta)
const esFisico = (item: Order['items'][number]) => item.product?.productType !== 'DIGITAL';
const fotoDe = (item?: Order['items'][number]) => item?.productImage || item?.product?.mainImage || null;

/** Fotos del cliente para una solicitud o una respuesta: se suben al elegirlas y quedan privadas */
function SelectorFotos({ fotos, onChange }: { fotos: string[]; onChange: (fotos: string[]) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const elegir = async (files: FileList | null) => {
    const lista = Array.from(files ?? []);
    if (!lista.length) return;
    if (fotos.length + lista.length > WARRANTY_MAX_PHOTOS) {
      toast.error(`Son ${WARRANTY_MAX_PHOTOS} fotos como máximo`);
      return;
    }
    setSubiendo(true);
    const nuevas: string[] = [];
    for (const file of lista) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/customer/warranty/photo', { method: 'POST', body: fd }).catch(() => null);
      const data = (await res?.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res?.ok || !data?.url) { toast.error(data?.error || `No se pudo subir "${file.name}"`); break; }
      nuevas.push(data.url);
    }
    onChange([...fotos, ...nuevas]);
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <p className={adminLabel}>Fotos (opcional, hasta {WARRANTY_MAX_PHOTOS})</p>
      <div className="flex flex-wrap gap-2">
        {fotos.map((url, i) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-surface">
            <Image src={url} alt={`Foto ${i + 1}`} fill sizes="80px" className="object-cover" unoptimized />
            <button type="button" onClick={() => onChange(fotos.filter((f) => f !== url))} aria-label={`Quitar foto ${i + 1}`}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white">
              <IconoEliminar className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {fotos.length < WARRANTY_MAX_PHOTOS && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs text-muted hover:border-brand-500 focus-within:border-brand-500">
            <IconoCamaraFotos className="h-5 w-5" aria-hidden="true" />
            {subiendo ? 'Subiendo…' : 'Agregar'}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={subiendo} onChange={(e) => void elegir(e.target.files)} />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">De la falla, del daño o de la etiqueta del equipo. Solo las ve el equipo de la tienda.</p>
    </div>
  );
}

const PASOS_GARANTIA = [
  { step: 1, title: 'Inicia tu solicitud', desc: 'Selecciona el pedido y producto afectado, y si puedes agrega fotos' },
  { step: 2, title: 'Describe el problema', desc: 'Cuéntanos qué sucedió con tu producto' },
  { step: 3, title: 'Revisión', desc: 'Te respondemos en 1 a 2 días hábiles, aquí y por correo. Puede que pidamos fotos, un video o revisar el equipo en la tienda' },
  { step: 4, title: 'Resolución', desc: 'Reparación, cambio o devolución del dinero en Puntos ES, según lo que encontremos' },
];

function PasosGarantia() {
  return (
    <div className="space-y-3">
      {PASOS_GARANTIA.map((item) => (
        <div key={item.step} className="flex items-start gap-3">
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
  );
}

/** Una solicitud abierta: su historial y la respuesta del cliente */
function DetalleSolicitud({ id, onVolver, onCambio }: { id: string; onVolver: () => void; onCambio: () => void }) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [eventos, setEventos] = useState<EventoGarantia[]>([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    const res = await fetch(`/api/customer/warranty/${id}`).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) { setError(data?.error || 'No se pudo cargar la solicitud'); return; }
    setClaim(data.claim);
    setEventos(data.events);
  };
  useCargarAlMontar(cargar, [id]);

  const responder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setEnviando(true);
    const res = await fetch(`/api/customer/warranty/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mensaje.trim(), photos: fotos }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setEnviando(false);
    if (!res?.ok) { toast.error(data?.error || 'No se pudo enviar. Intenta de nuevo.'); return; }
    toast.success('Mensaje enviado');
    setMensaje('');
    setFotos([]);
    await cargar();
    onCambio();
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onVolver} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Mis solicitudes
      </button>
      {error && <p className="text-sm font-semibold text-deal" role="alert">{error}</p>}
      {claim && (
        <>
          <div className={`${adminCard} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm font-bold text-ink">{claim.code}</h2>
              <span className={adminBadge(CLAIM_TONE_CUSTOMER[claim.status])}>
                {CLAIM_STATUS_CUSTOMER[claim.status]}{claim.status === 'RESOLVED' && claim.resolution ? ` · ${RESOLUTION_LABEL[claim.resolution]}` : ''}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink">{claim.productName}</p>
            <p className="text-xs text-muted">Pedido #{claim.orderNumber} · {WARRANTY_REASONS[claim.reason] ?? claim.reason} · garantía de {claim.warrantyDays} días</p>
            <p className="mt-2 text-xs text-ink-soft">{CLAIM_STATUS_HELP[claim.status]}</p>
          </div>
          <div className={`${adminCard} p-4`}>
            <h3 className="text-sm font-bold text-ink">Historial</h3>
            <Historial eventos={eventos} vista="cliente" />
          </div>
          {isClosedStatus(claim.status) ? (
            <p className="text-xs text-muted">Esta solicitud está cerrada. Si el problema sigue, abre una nueva desde &quot;Nueva&quot;.</p>
          ) : (
            <form onSubmit={responder} className={`${adminCard} space-y-3 p-4`}>
              <div>
                <label htmlFor="w-respuesta" className={adminLabel}>Escribir a la tienda</label>
                <textarea id="w-respuesta" rows={3} maxLength={WARRANTY_MESSAGE_MAX} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Responde lo que te pedimos o cuéntanos algo más" className={`${inputClass} resize-none`} />
              </div>
              <SelectorFotos fotos={fotos} onChange={setFotos} />
              <button type="submit" disabled={enviando || !mensaje.trim()} className={`${adminPrimaryButton} w-full sm:w-auto`}>{enviando ? 'Enviando…' : 'Enviar'}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function WarrantyPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  // Hora de referencia para la garantía: una vez por carga, no en cada render (C-111)
  const [ahora] = useState(Date.now);
  const [loading, setLoading] = useState(true);
  // C-261 (decisión del equipo sobre C-258): abre donde está lo que el cliente vino a hacer. Sin garantías en curso, en
  // "Nueva"; con alguna, en sus solicitudes (con "Pedir garantía" arriba). Antes abría en "Info". Se decide al llegar la lista.
  const [selectedTab, setSelectedTab] = useState<'info' | 'requests' | 'new' | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const { settings } = useSettings();
  const whatsappAyuda = settings?.whatsapp?.replace(/\D/g, '') || '';
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedOrderForWarranty, setSelectedOrderForWarranty] = useState<Order | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [warrantyReason, setWarrantyReason] = useState<WarrantyReason | ''>('');
  const [warrantyDescription, setWarrantyDescription] = useState('');
  const [fotosNuevas, setFotosNuevas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [claims, setClaims] = useState<Claim[]>([]);

  useBodyScrollLock(showFormModal);
  // C-265: el foco entra al formulario y vuelve al pedido que se eligió
  const formulario = useRef<HTMLDivElement>(null);
  useFocoDeVuelta(showFormModal, formulario);

  // El modal se cierra con Escape
  useEffect(() => {
    if (!showFormModal) return;
    const cerrar = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFormModal(false); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [showFormModal]);

  async function fetchRequests(): Promise<Claim[]> {
    const res = await fetch('/api/customer/warranty').catch(() => null);
    if (!res?.ok) return [];
    const lista = ((await res.json()) as { claims: Claim[] }).claims;
    setClaims(lista);
    return lista;
  }

  async function fetchDeliveredOrders() {
    // Desde el aviso de la campana o del correo: ?solicitud=<id> abre esa solicitud
    const desdeAviso = new URLSearchParams(window.location.search).get('solicitud');
    if (desdeAviso) { setSelectedTab('requests'); setAbierta(desdeAviso); }
    void fetchRequests().then((lista) => {
      if (!desdeAviso) setSelectedTab((t) => t ?? (lista.some((c) => !isClosedStatus(c.status)) ? 'requests' : 'new'));
    });
    try {
      // mine=1: una cuenta del equipo que compra ve solo sus pedidos, no los de todos
      const response = await fetch('/api/orders?status=DELIVERED&mine=1&limit=50');
      if (response.ok) {
        const result = await response.json();
        // Handle both paginated format { orders: [...] } and legacy array format
        const data: Order[] = Array.isArray(result) ? result : (result.orders || []);
        setOrders(data.filter((o) => o.status === 'DELIVERED'));
      }
    } catch {
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
    return days === null ? [] : order.items.filter((item) => esFisico(item) && days <= itemWarrantyDays(item));
  };
  const isWithinWarranty = (order: Order) => coveredItems(order).length > 0;
  // Antes solo se veían los 5 últimos: un usado con 90 días podía quedar fuera. Primero los que siguen cubiertos
  // C-265: un pedido solo de códigos no sale (va en la línea de lo digital, debajo)
  const fisicos = orders.filter((o) => o.items.some(esFisico));
  const pedidos = [...fisicos.filter(isWithinWarranty), ...fisicos.filter((o) => !isWithinWarranty(o)).slice(0, 5)];

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
    const res = await fetch('/api/customer/warranty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selectedOrderForWarranty.id, itemId: selectedItemId, reason: warrantyReason, description: warrantyDescription, photos: fotosNuevas }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; id?: string; code?: string } | null;
    if (!res?.ok) {
      setIsSubmitting(false);
      toast.error(data?.error || 'No se pudo enviar la solicitud. Intenta de nuevo o escríbenos por WhatsApp.');
      return;
    }
    toast.success(`Recibimos tu solicitud ${data?.code ?? ''}. Te avisamos aquí y por correo.`);
    await fetchRequests();
    setIsSubmitting(false);
    setShowFormModal(false);
    setSelectedOrderForWarranty(null);
    setSelectedItemId('');
    setWarrantyReason('');
    setWarrantyDescription('');
    setFotosNuevas([]);
    setSelectedTab('requests');
    setAbierta(data?.id ?? null);
  };

  const tieneDigital = orders.some((o) => o.items.some((item) => !esFisico(item)));
  const esperaRespuesta = claims.some((c) => c.status === 'WAITING_CUSTOMER');
  const PESTANAS = [
    { id: 'requests' as const, texto: 'Mis solicitudes', corto: 'Solicitudes', Icono: IconoDocumento },
    { id: 'new' as const, texto: 'Nueva', corto: 'Nueva', Icono: IconoActualizar },
    // C-265: "Info" pasa a "Cómo funciona" (decisión del equipo)
    { id: 'info' as const, texto: 'Cómo funciona', corto: 'Cómo funciona', Icono: IconoAyuda },
  ];

  return (
    <div className="h-full space-y-4">
      {/* C-265: el título, lo que se hace aquí y "Pedir garantía" arriba (antes, una placa con "Gestiona tus solicitudes") */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink lg:text-2xl">Garantía</h1>
          <p className="mt-0.5 text-sm text-ink-soft">Pide garantía de lo que te llegó con una falla y sigue tu solicitud aquí.</p>
        </div>
        {selectedTab !== 'new' && (
          <button type="button" onClick={() => { setSelectedTab('new'); setAbierta(null); }} className={`${adminPrimaryButton} shrink-0`}>
            <IconoGarantia className="h-4 w-4" aria-hidden="true" />
            Pedir garantía
          </button>
        )}
      </header>

      {/* Tabs */}
      {/* C-201: a 360 px "Nueva" quedaba cortada: en el teléfono, sin íconos, con menos aire y "Solicitudes" */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-line max-sm:gap-1" role="tablist" aria-label="Garantía">
        {PESTANAS.map(({ id, texto, corto, Icono }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selectedTab === id}
            onClick={() => { setSelectedTab(id); if (id === 'requests') setAbierta(null); }}
            className={`${adminTab(selectedTab === id)} max-sm:px-2.5`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icono className="w-3.5 h-3.5 max-sm:hidden" aria-hidden="true" />
              <span className="sm:hidden">{corto}</span><span className="max-sm:hidden">{texto}</span>
              {id === 'requests' && claims.length > 0 && <span className={`text-xs font-bold tabular-nums ${selectedTab === id ? 'text-white/80' : 'text-muted'}`}>{claims.length}</span>}
              {/* C-251b: lo que te toca va en el azul oscuro del logo (el rojo es error o cancelado) */}
              {id === 'requests' && esperaRespuesta && <span className={`h-2 w-2 rounded-full ${selectedTab === id ? 'bg-white' : 'bg-brand-700'}`} aria-label="Hay una solicitud esperando tu respuesta" />}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'info' && (
        <div className="space-y-4">
          {/* Policy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`${adminCard} p-4`}>
              <div className="w-9 h-9 bg-success/10 text-success-strong rounded-lg flex items-center justify-center mb-2">
                <IconoGarantia className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Garantía de la tienda</h3>
              <p className="text-xs text-muted">
                Cubre fallas de funcionamiento. Nuevos: {DEFAULT_WARRANTY_DAYS.NEW} días; reacondicionados: {DEFAULT_WARRANTY_DAYS.REFURBISHED}; usados: {DEFAULT_WARRANTY_DAYS.USED}. El plazo de cada producto se ve en su ficha y cuenta desde la entrega.
                {' '}Los códigos y las recargas van aparte: si uno no funciona, escríbenos.
              </p>
            </div>
            <div className={`${adminCard} p-4`}>
              <div className="w-9 h-9 bg-brand-50 text-brand-500 rounded-lg flex items-center justify-center mb-2">
                <IconoActualizar className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Sin devoluciones por cambio de opinión</h3>
              <p className="text-xs text-muted">
                Si el producto llega dañado, con una falla o distinto a lo publicado, lo atendemos por garantía: lo revisamos y lo reparamos, lo cambiamos o te devolvemos el dinero en Puntos ES.
              </p>
            </div>
            <div className={`${adminCard} p-4`}>
              <div className="w-9 h-9 bg-surface text-ink-soft rounded-lg flex items-center justify-center mb-2">
                <IconoPaquete className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-ink text-sm mb-0.5">Soporte técnico</h3>
              <p className="text-xs text-muted">
                Asistencia especializada para configuración y problemas técnicos.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {/* How It Works */}
            <div className={`${adminCard} p-5`}>
              <h3 className="font-bold text-ink text-sm mb-3">¿Cómo funciona?</h3>
              <PasosGarantia />
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
                      <IconoCorreo className="w-4 h-4" aria-hidden="true" />
                      {settings.email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mientras llega la lista no se elige pestaña: así no salta de una a otra */}
      {selectedTab === null && <div className="h-40" aria-busy="true" />}

      {selectedTab === 'requests' && (abierta ? (
        <DetalleSolicitud id={abierta} onVolver={() => setAbierta(null)} onCambio={() => void fetchRequests()} />
      ) : (
        <div className="space-y-3">
          {claims.length === 0 ? (
            <div className={`${adminCard} text-center py-10`}>
              <IconoDocumento className="w-8 h-8 text-subtle mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-muted mb-3">No tienes solicitudes de garantía</p>
              <button type="button" onClick={() => setSelectedTab('new')} className={`${adminPrimaryButton} text-xs inline-flex items-center gap-1.5`}>
                <IconoActualizar className="w-3.5 h-3.5" aria-hidden="true" />
                Nueva solicitud
              </button>
            </div>
          ) : (
            /* C-265: en dos columnas desde 1280 px, con la foto del producto; la que espera al cliente, con "Responder" */
            <ul className="grid gap-3 xl:grid-cols-2">
              {claims.map((c) => (
                <li key={c.id} className={`${adminCard} relative flex h-full flex-col p-3 transition-colors hover:border-brand-500 sm:p-4`}>
                  <div className="flex items-start gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                      {c.foto ? <Image src={c.foto} alt="" fill sizes="48px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-subtle"><IconoPaquete className="h-5 w-5" aria-hidden="true" /></span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* El sello arriba, junto al código: así el nombre del producto tiene todo el ancho (a 360 px quedaba en 130) */}
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <p className="font-mono text-xs text-muted">{c.code} · Pedido #{c.orderNumber}</p>
                        <span className={`${adminBadge(CLAIM_TONE_CUSTOMER[c.status])} shrink-0`}>{CLAIM_STATUS_CUSTOMER[c.status]}</span>
                      </div>
                      <h3 className="font-bold text-ink text-sm">{c.productName}</h3>
                      <p className="mt-0.5 text-xs text-ink-soft">{c.status === 'RESOLVED' && c.resolution ? RESOLUTION_LABEL[c.resolution] : CLAIM_STATUS_HELP[c.status]}</p>
                      <p className="mt-0.5 text-xs text-muted">Actualizada el {fecha(c.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex justify-end pt-3">
                    {/* Toda la tarjeta abre la solicitud (el botón se estira sobre ella) */}
                    <button
                      type="button"
                      onClick={() => setAbierta(c.id)}
                      className={`${c.status === 'WAITING_CUSTOMER' ? adminPrimaryButton : adminSecondaryButton} h-10 after:absolute after:inset-0 after:rounded-2xl after:content-['']`}
                    >
                      {c.status === 'WAITING_CUSTOMER' ? 'Responder' : 'Ver la solicitud'}
                      <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {selectedTab === 'new' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
          <div className="space-y-3">
            {/* Eligible Orders */}
            <h3 className="text-sm font-semibold text-ink">Pedidos elegibles</h3>
            {loading ? (
              <div className="flex items-center justify-center py-6" role="status" aria-label="Cargando">
                <div className="w-6 h-6 border-2 border-line border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : pedidos.length === 0 ? (
              <div className={`${adminCard} text-center py-8`}>
                <IconoError className="w-6 h-6 text-subtle mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-muted">No tienes pedidos entregados elegibles para garantía</p>
              </div>
            ) : (
              // C-265: en una sola tarjeta, una fila por pedido, con la foto (antes una tarjeta por pedido)
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {pedidos.map((order) => {
                  const withinWarranty = isWithinWarranty(order);
                  const daysSince = getDaysSinceDelivery(order.deliveredAt);
                  const primero = order.items.find(esFisico);
                  return (
                    <li key={order.id}>
                      {/* Antes era un div con clic (sin teclado) y un botón adentro */}
                      <button
                        type="button"
                        disabled={!withinWarranty}
                        onClick={() => handleOpenForm(order)}
                        className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                          withinWarranty ? 'hover:bg-brand-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500' : 'cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                          {fotoDe(primero) ? <Image src={fotoDe(primero) as string} alt="" fill sizes="40px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-subtle"><IconoPaquete className="h-4 w-4" aria-hidden="true" /></span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-0.5 flex items-center gap-1.5">
                            <span className="font-bold text-ink text-xs">#{order.orderNumber}</span>
                            {withinWarranty ? (
                              <span className={adminBadge('success')}>
                                <IconoCheck className="w-2.5 h-2.5" aria-hidden="true" />
                                Elegible
                              </span>
                            ) : (
                              <span className={adminBadge('danger')}>Expirado</span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-ink-soft">{primero?.productName}{order.items.filter(esFisico).length > 1 ? ` y ${order.items.filter(esFisico).length - 1} más` : ''}</span>
                          <span className="block text-xs text-muted">
                            Entregado hace {daysSince} días
                            {!withinWarranty && ' (fuera de garantía)'}
                            {withinWarranty && ` · garantía hasta ${Math.max(...coveredItems(order).map(itemWarrantyDays))} días`}
                          </span>
                        </span>
                        {withinWarranty && <IconoChevronDerecha className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* C-265 (decisión 2 de C-251): los códigos y las recargas van aparte, por WhatsApp */}
            {tieneDigital && (
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 sm:flex-row sm:items-center sm:p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <IconoDigital className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="min-w-0 flex-1 text-sm text-ink-soft">
                  <strong className="text-ink">Códigos y recargas:</strong> si un código no funciona, escríbenos y lo resolvemos.
                </p>
                {whatsappAyuda && (
                  <a href={`https://wa.me/${whatsappAyuda}?text=${encodeURIComponent('Hola! Tengo un problema con un código de mi pedido')}`} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} shrink-0`}>
                    <FaWhatsapp className="h-4 w-4 text-success-strong" aria-hidden="true" />
                    Escribir por WhatsApp
                  </a>
                )}
              </div>
            )}

            {/* Info Note */}
            <div className="flex items-start gap-2.5 p-3.5 bg-surface border border-line rounded-xl">
              <IconoInfo className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-semibold text-ink mb-0.5">Importante</p>
                <p className="text-muted">
                  Cada producto tiene su plazo de garantía, que cuenta desde la entrega. No cubre golpes, humedad, mal uso,
                  reparaciones de terceros ni el desgaste descrito en la ficha de un usado. Detalles en los términos y condiciones.
                </p>
              </div>
            </div>
          </div>

          {/* C-265: cómo sigue, al lado de la lista desde 1280 px */}
          <aside className={`${adminCard} hidden p-5 xl:block`} aria-label="Cómo funciona">
            <h3 className="font-bold text-ink text-sm mb-3">¿Cómo funciona?</h3>
            <PasosGarantia />
          </aside>
        </div>
      )}

      {/* Interactive Warranty Form Modal */}
      {showFormModal && selectedOrderForWarranty && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="w-titulo">
          <div ref={formulario} tabIndex={-1} className={`${adminModalPanel} w-full max-w-lg h-[85dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col overflow-hidden outline-none`}>
            <div className="bg-surface border-b border-line p-5 text-ink flex-shrink-0 flex justify-between items-center">
              <div>
                <h2 id="w-titulo" className="text-base lg:text-lg font-bold text-ink">Solicitar garantía</h2>
                <p className="text-xs text-muted">Pedido #{selectedOrderForWarranty.orderNumber}</p>
              </div>
              <button type="button" onClick={() => setShowFormModal(false)} className="flex h-11 w-11 items-center justify-center text-muted hover:bg-surface rounded-lg transition-colors" aria-label="Cerrar">
                <IconoCerrar className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <form onSubmit={handleSubmitWarranty} className="space-y-4">
                <div>
                  <label htmlFor="w-item" className={adminLabel}>Producto</label>
                  <select id="w-item" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required className={`${inputClass} font-medium`}>
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
                  <select id="w-reason" value={warrantyReason} onChange={(e) => setWarrantyReason(e.target.value as WarrantyReason | '')} required className={`${inputClass} font-medium`}>
                    <option value="">Selecciona un motivo...</option>
                    {(Object.keys(WARRANTY_REASONS) as WarrantyReason[]).map((r) => (
                      <option key={r} value={r}>{WARRANTY_REASONS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="w-descripcion" className={adminLabel}>Descripción del problema</label>
                  <textarea
                    id="w-descripcion"
                    value={warrantyDescription}
                    onChange={(e) => setWarrantyDescription(e.target.value)}
                    required
                    rows={4}
                    maxLength={WARRANTY_MESSAGE_MAX}
                    placeholder="Por favor describe detalladamente el problema que presenta tu producto..."
                    className={`${inputClass} resize-none placeholder:text-subtle`}
                  />
                </div>
                <SelectorFotos fotos={fotosNuevas} onChange={setFotosNuevas} />
                <div className="bg-surface border border-line p-3 rounded-xl">
                  <p className="text-xs text-muted">
                    <strong className="text-ink">Nota:</strong> Te respondemos en 1 a 2 días hábiles, aquí en &quot;Mis solicitudes&quot; y por correo.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedItemId || !warrantyReason || !warrantyDescription}
                    className={`${adminPrimaryButton} w-full py-3 flex items-center justify-center gap-2`}
                  >
                    {isSubmitting ? 'Enviando...' : 'Confirmar solicitud'}
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
