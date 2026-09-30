'use client';

// Una solicitud de garantía (C-122): historial con el cliente, notas internas y el cambio de estado.

import { use, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiLock, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';
import {
  adminBadge, adminCard, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPageTitle, adminPrimaryButton,
  adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { conditionBadge, WARRANTY_REASONS, type Condition, type Grade, type WarrantyReason } from '@/lib/product-condition';
import {
  CLAIM_STATUSES, CLAIM_STATUS_LABEL, CLAIM_STATUS_TONE, isClosedStatus, RESOLUTIONS, RESOLUTION_LABEL, WARRANTY_MESSAGE_MAX,
  type ClaimStatus, type Resolution,
} from '@/lib/warranty';
import { Historial, type EventoGarantia } from '@/components/warranty/Historial';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

interface Detalle {
  id: string;
  code: string;
  productName: string;
  productCondition: Condition | null;
  status: ClaimStatus;
  resolution: Resolution | null;
  reason: WarrantyReason;
  description: string;
  warrantyDays: number;
  deliveredAt: string;
  createdAt: string;
  closedAt: string | null;
  refundUSD: number | null;
  refundTransactionId: string | null;
  user: { id: string; name: string | null; email: string | null; profile: { phone: string | null; whatsapp: string | null } | null };
  order: { id: string; orderNumber: string; deliveryMethod: string | null; totalUSD: number };
  orderItem: { quantity: number; priceUSD: number; totalUSD: number; productSku: string | null; conditionGrade: Grade | null };
}

interface Otra { id: string; code: string; productName: string; status: ClaimStatus; createdAt: string }

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
const DIA_MS = 24 * 60 * 60 * 1000;

export default function GarantiaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [claim, setClaim] = useState<Detalle | null>(null);
  const [eventos, setEventos] = useState<EventoGarantia[]>([]);
  const [otras, setOtras] = useState<Otra[]>([]);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<ClaimStatus>('RECEIVED');
  const [resolucion, setResolucion] = useState<Resolution | ''>('');
  const [monto, setMonto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargar = async () => {
    const r = await fetch(`/api/admin/warranty/${id}`);
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) { setError(data?.error || 'No se pudo cargar la solicitud'); return; }
    setClaim(data.claim);
    setEventos(data.events);
    setOtras(data.others);
    setEstado(data.claim.status);
    setResolucion(data.claim.resolution ?? '');
    setMonto(String(data.claim.orderItem.priceUSD));
  };
  useCargarAlMontar(cargar, [id]);

  if (error) return <p className={adminNotice('danger')} role="alert">{error}</p>;
  if (!claim) return <div className="flex justify-center py-12" role="status" aria-label="Cargando"><div className={adminSpinner} /></div>;

  const devuelto = !!claim.refundTransactionId;
  const tope = Math.min(claim.orderItem.totalUSD, claim.order.totalUSD);
  const dias = Math.floor((new Date(claim.createdAt).getTime() - new Date(claim.deliveredAt).getTime()) / DIA_MS);
  const etiqueta = conditionBadge(claim.productCondition, claim.orderItem.conditionGrade);
  const whatsapp = (claim.user.profile?.whatsapp || claim.user.profile?.phone || '').replace(/\D/g, '');
  const cambiaEstado = estado !== claim.status;
  const devolviendo = !devuelto && estado === 'RESOLVED' && resolucion === 'BALANCE_REFUND';

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');
    const cuerpo: Record<string, unknown> = {};
    if (cambiaEstado || (estado === 'RESOLVED' && resolucion !== (claim.resolution ?? ''))) {
      cuerpo.status = estado;
      if (estado === 'RESOLVED') cuerpo.resolution = resolucion || undefined;
    }
    if (mensaje.trim()) cuerpo.message = mensaje.trim();
    if (nota.trim()) cuerpo.note = nota.trim();
    if (devolviendo) cuerpo.refundUSD = Number(monto.replace(',', '.'));
    if (Object.keys(cuerpo).length === 0) { setErrorForm('No hay nada que guardar'); return; }
    setGuardando(true);
    try {
      const r = await fetch(`/api/admin/warranty/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'No se pudo guardar');
      toast.success(cuerpo.message || cuerpo.status ? 'Guardado. Le avisamos al cliente.' : 'Nota guardada');
      setMensaje('');
      setNota('');
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <Link href="/admin/garantias" className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" /> Garantías
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={adminPageTitle}>{claim.code}</h1>
          <span className={adminBadge(CLAIM_STATUS_TONE[claim.status])}>
            {CLAIM_STATUS_LABEL[claim.status]}{claim.status === 'RESOLVED' && claim.resolution ? ` · ${RESOLUTION_LABEL[claim.resolution]}` : ''}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{claim.productName} · {WARRANTY_REASONS[claim.reason] ?? claim.reason} · pedida el {fecha(claim.createdAt)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <section className={adminCard} aria-labelledby="historial">
            <h2 id="historial" className="text-base font-semibold text-ink">Historial</h2>
            <Historial eventos={eventos} vista="equipo" />
          </section>

          <form onSubmit={guardar} className={`${adminCard} space-y-4`} aria-labelledby="responder">
            <h2 id="responder" className="text-base font-semibold text-ink">Responder o cambiar el estado</h2>
            {devuelto && (
              <p className={adminNotice('success')}>Se devolvieron {formatUSD(claim.refundUSD ?? 0)} en Puntos ES al cliente. El estado ya no se cambia; puedes escribirle o dejar notas.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="g-estado" className={adminLabel}>Estado</label>
                <select id="g-estado" className={adminInput()} value={estado} disabled={devuelto} onChange={(e) => setEstado(e.target.value as ClaimStatus)}>
                  {CLAIM_STATUSES.map((s) => <option key={s} value={s}>{CLAIM_STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              {estado === 'RESOLVED' && (
                <div>
                  <label htmlFor="g-resolucion" className={adminLabel}>Cómo se resolvió</label>
                  <select id="g-resolucion" className={adminInput()} value={resolucion} disabled={devuelto} onChange={(e) => setResolucion(e.target.value as Resolution | '')}>
                    <option value="">Elige…</option>
                    {RESOLUTIONS.map((r) => <option key={r} value={r}>{RESOLUTION_LABEL[r]}</option>)}
                  </select>
                </div>
              )}
            </div>
            {devolviendo && (
              <div>
                <label htmlFor="g-monto" className={adminLabel}>Monto a devolver en Puntos ES (USD)</label>
                <input id="g-monto" inputMode="decimal" className={adminInput()} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))} />
                <p className={adminHint}>
                  Se acredita al guardar, una sola vez. Precio de la unidad: {formatUSD(claim.orderItem.priceUSD)}; máximo {formatUSD(tope)}. Si el pedido tuvo cupón, devuelve lo que pagó el cliente.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="g-mensaje" className={adminLabel}>Mensaje para el cliente</label>
              <textarea id="g-mensaje" rows={3} maxLength={WARRANTY_MESSAGE_MAX} className={`${adminInput()} h-auto py-2`} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                placeholder={estado === 'WAITING_CUSTOMER' ? 'Qué necesitas: fotos, un video, traer el equipo…' : estado === 'REJECTED' ? 'Por qué no lo cubre la garantía' : 'Lo que el cliente va a leer'} />
              <p className={adminHint}>Lo ve en su panel y le llega por correo.{estado === 'REJECTED' ? ' Obligatorio si no lo cubre la garantía.' : ''}</p>
            </div>
            <div>
              <label htmlFor="g-nota" className={`${adminLabel} flex items-center gap-1.5`}><FiLock className="h-3.5 w-3.5" aria-hidden="true" /> Nota interna</label>
              <textarea id="g-nota" rows={2} maxLength={WARRANTY_MESSAGE_MAX} className={`${adminInput()} h-auto py-2`} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Solo la ve el equipo" />
            </div>
            {errorForm && <p className={adminError} role="alert">{errorForm}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={guardando} className={adminPrimaryButton}>{guardando ? 'Guardando…' : devolviendo ? 'Guardar y devolver en Puntos ES' : 'Guardar'}</button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <section className={adminCard} aria-labelledby="cliente">
            <h2 id="cliente" className="text-base font-semibold text-ink">Cliente</h2>
            <p className="mt-2 text-sm font-semibold text-ink">{claim.user.name || 'Sin nombre'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}>
                  <FaWhatsapp className="h-4 w-4 text-success-strong" aria-hidden="true" /> WhatsApp
                </a>
              )}
              {claim.user.email && (
                <a href={`mailto:${claim.user.email}`} className={`${adminSecondaryButton} max-w-full`}>
                  <FiMail className="h-4 w-4 shrink-0" aria-hidden="true" /> <span className="truncate">{claim.user.email}</span>
                </a>
              )}
            </div>
          </section>

          <section className={adminCard} aria-labelledby="producto">
            <h2 id="producto" className="text-base font-semibold text-ink">Producto y pedido</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Pedido</dt><dd><Link href={`/admin/orders/${claim.order.id}`} className="font-semibold text-brand-700 hover:underline">#{claim.order.orderNumber}</Link></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Producto</dt><dd className="text-right text-ink">{claim.productName}</dd></div>
              {claim.orderItem.productSku && <div className="flex justify-between gap-3"><dt className="text-muted">SKU</dt><dd className="font-mono text-ink">{claim.orderItem.productSku}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-muted">Condición</dt><dd className="text-ink">{etiqueta ?? 'Nuevo'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Pagó</dt><dd className="text-ink">{claim.orderItem.quantity} × {formatUSD(claim.orderItem.priceUSD)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Entregado</dt><dd className="text-ink">{fecha(claim.deliveredAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Garantía</dt><dd className="text-ink">{claim.warrantyDays} días · pedida al día {dias}</dd></div>
              {claim.closedAt && <div className="flex justify-between gap-3"><dt className="text-muted">Cerrada</dt><dd className="text-ink">{fecha(claim.closedAt)}</dd></div>}
            </dl>
          </section>

          {otras.length > 0 && (
            <section className={adminCard} aria-labelledby="otras">
              <h2 id="otras" className="text-base font-semibold text-ink">Otras solicitudes del cliente</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {otras.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/garantias/${o.id}`} className="font-mono font-semibold text-brand-700 hover:underline">{o.code}</Link>
                    <span className="text-muted"> · {o.productName} · {CLAIM_STATUS_LABEL[o.status]}{isClosedStatus(o.status) ? '' : ' (abierta)'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

