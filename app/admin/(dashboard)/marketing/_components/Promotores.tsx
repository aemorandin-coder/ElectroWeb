'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import {
  FiAlertTriangle, FiCheck, FiCopy, FiDollarSign, FiEdit2, FiEye, FiInbox, FiInfo, FiLink, FiPause, FiPlay, FiPlus, FiTrash2, FiTrendingUp, FiUserCheck, FiUsers, FiX,
} from 'react-icons/fi';
import {
  adminBadge, adminCardFlush, adminDangerButton, adminEmpty, adminHint, adminIconButton, adminIconChip, adminInput, adminLabel,
  adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice,
  adminPrimaryButton, adminSecondaryButton, adminSpinner, adminStatCard, adminStatLabel, adminStatValue, adminSuccessButton,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatUSD } from '@/lib/currency';

interface Promotor {
  id: string;
  code: string;
  name: string;
  commissionRate: number;
  customerDiscountPercent: number;
  hasCoupon: boolean;
  status: 'ACTIVE' | 'PAUSED';
  user: { id: string; name: string | null; email: string | null };
  stats: { totalConversions: number; pendingConversions: number; toReview: number; pendingCommission: number; approvedCommission: number; totalGross: number };
}

interface Solicitud {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  channels: string;
  followers: number | null;
  message: string | null;
  wantedCode: string | null;
  reviewNote: string | null;
  createdAt: string;
  suggestedCode: string | null;
  user: { id: string; name: string | null; email: string | null; verified: boolean; since: string; orders: number };
}

interface Comision {
  id: string;
  type: 'REGISTRATION' | 'PURCHASE' | 'RECHARGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  source: 'CODE' | 'LINK' | null;
  grossAmount: number;
  baseAmount: number | null;
  commission: number;
  createdAt: string;
  heldReason: string | null;
  creditsAt: string | null;
  referredUser: { name: string | null; email: string | null };
  order: { orderNumber: string; status: string; paymentStatus: string } | null;
}

interface Usuario { id: string; name: string | null; email: string | null }

const TIPO: Record<Comision['type'], string> = { REGISTRATION: 'Registro', PURCHASE: 'Compra', RECHARGE: 'Recarga (antes de C-75)' };
const ESTADO: Record<Comision['status'], { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'Por acreditar', tone: 'warning' },
  APPROVED: { label: 'Acreditada', tone: 'success' },
  REJECTED: { label: 'Rechazada', tone: 'danger' },
};

const enlaceReferido = (codigo: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/registro?ref=${codigo}`;

export default function Promotores() {
  const { confirm } = useConfirm();
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [cargando, setCargando] = useState(true);

  const [detalle, setDetalle] = useState<Promotor | null>(null);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [cargandoComisiones, setCargandoComisiones] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [procesando, setProcesando] = useState(false);

  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ userId: '', code: '', name: '', commissionRate: '5', customerDiscountPercent: '5', notes: '' });
  // C-167: solicitudes de clientes y edición de un promotor
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [revisando, setRevisando] = useState<Solicitud | null>(null);
  const [revision, setRevision] = useState({ code: '', name: '', commissionRate: '5', customerDiscountPercent: '5', note: '' });
  const [editando, setEditando] = useState<Promotor | null>(null);
  const [edicion, setEdicion] = useState({ name: '', commissionRate: '5', customerDiscountPercent: '5' });
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [guardando, setGuardando] = useState(false);

  useBodyScrollLock(Boolean(detalle) || creando || Boolean(revisando) || Boolean(editando));

  const cargarSolicitudes = useCallback(async () => {
    const res = await fetch('/api/influencers/solicitudes').catch(() => null);
    if (res?.ok) setSolicitudes((await res.json()).solicitudes ?? []);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/influencers');
      if (!res.ok) throw new Error();
      setPromotores(await res.json());
    } catch {
      toast.error('No se pudieron cargar los promotores');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/influencers')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelado) setPromotores(d); })
      .catch(() => toast.error('No se pudieron cargar los promotores'))
      .finally(() => { if (!cancelado) setCargando(false); });
    fetch('/api/influencers/solicitudes')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelado && d) setSolicitudes(d.solicitudes ?? []); })
      .catch(() => undefined);
    return () => { cancelado = true; };
  }, []);

  // Búsqueda de usuarios con espera: antes se pedía al servidor en cada tecla
  const buscar = busqueda.trim().length >= 2 && !form.userId;
  const resultadosVisibles = buscar ? resultados : [];
  useEffect(() => {
    if (!buscar) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(busqueda.trim())}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResultados(data.users || []);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, buscar]);

  const abrirDetalle = async (promotor: Promotor) => {
    setDetalle(promotor);
    setSeleccion([]);
    setCargandoComisiones(true);
    try {
      const res = await fetch(`/api/influencers/${promotor.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComisiones(data.conversions || []);
    } catch {
      toast.error('No se pudieron cargar las comisiones');
    } finally {
      setCargandoComisiones(false);
    }
  };

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(enlaceReferido(codigo)).then(() => toast.success('Enlace copiado'), () => toast.error('No se pudo copiar'));
  };

  const cambiarEstado = async (promotor: Promotor) => {
    const status = promotor.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await fetch(`/api/influencers/${promotor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return toast.error(data?.error || 'No se pudo cambiar el estado');
    toast.success(status === 'ACTIVE' ? 'Promotor activado' : 'Promotor pausado: sus nuevas ventas no generan comisión');
    cargar();
  };

  const eliminar = async (promotor: Promotor) => {
    const ok = await confirm({
      title: 'Eliminar promotor',
      message: `¿Eliminar a ${promotor.name}? El usuario conserva su cuenta.`,
      confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/influencers/${promotor.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) return toast.error(data?.error || 'No se pudo eliminar');
    toast.success('Promotor eliminado');
    cargar();
  };

  const crear = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo crear el promotor');
      toast.success('Promotor creado');
      setCreando(false);
      setForm({ userId: '', code: '', name: '', commissionRate: '5', customerDiscountPercent: '5', notes: '' });
      setBusqueda('');
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const abrirSolicitud = (sol: Solicitud) => {
    setRevisando(sol);
    setRevision({ code: sol.suggestedCode ?? '', name: sol.user.name ?? '', commissionRate: '5', customerDiscountPercent: '5', note: '' });
  };

  const resolverSolicitud = async (accion: 'approve' | 'reject') => {
    if (!revisando) return;
    setGuardando(true);
    try {
      const cuerpo = accion === 'approve'
        ? { action: 'approve', code: revision.code, name: revision.name, commissionRate: revision.commissionRate, customerDiscountPercent: revision.customerDiscountPercent }
        : { action: 'reject', note: revision.note };
      const res = await fetch(`/api/influencers/solicitudes/${revisando.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo atender la solicitud');
      toast.success(accion === 'approve' ? `Promotor creado con el código ${data.code}. Se le avisó por correo.` : 'Solicitud rechazada. Se le avisó en su panel.');
      setRevisando(null);
      cargarSolicitudes();
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = (promotor: Promotor) => {
    setEditando(promotor);
    setEdicion({ name: promotor.name, commissionRate: String(promotor.commissionRate), customerDiscountPercent: String(promotor.customerDiscountPercent) });
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/influencers/${editando.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edicion) });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo guardar');
      toast.success('Promotor actualizado. Las comisiones ya creadas no cambian.');
      setEditando(null);
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const resolver = async (action: 'approve_conversions' | 'reject_conversions') => {
    if (!detalle || seleccion.length === 0) return;
    setProcesando(true);
    try {
      const res = await fetch(`/api/influencers/${detalle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, conversionIds: seleccion }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo procesar');
      if (action === 'approve_conversions') {
        if (data.approved > 0) toast.success(`${data.approved} comisión(es) aprobada(s) y acreditada(s) como Puntos ES`);
        if (data.failed > 0) toast.error(data.errores?.join(' · ') || `${data.failed} no se pudieron aprobar`);
      } else {
        toast.success(`${data.rejected} comisión(es) rechazada(s)`);
      }
      setSeleccion([]);
      abrirDetalle(detalle);
      cargar();
    } finally {
      setProcesando(false);
    }
  };

  const pendienteTotal = promotores.reduce((s, p) => s + p.stats.pendingCommission, 0);
  const generadoTotal = promotores.reduce((s, p) => s + p.stats.totalGross, 0);
  const pendientesSeleccionables = comisiones.filter((c) => c.status === 'PENDING').map((c) => c.id);
  const porRevisar = promotores.reduce((s, p) => s + p.stats.toReview, 0);
  const solicitudesPendientes = solicitudes.filter((sol) => sol.status === 'PENDING');

  return (
    <div className="space-y-5">
      <div className={`${adminNotice('brand')} flex gap-3`}>
        <FiInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Cada promotor tiene un <strong>código</strong> (el cliente lo escribe en el carrito y recibe un descuento) y un enlace. Cuenta para él la compra
          hecha con su código, aunque el cliente ya tuviera cuenta, y la de quien se registró desde su enlace. La comisión es sobre los{' '}
          <strong>productos, sin IVA ni envío</strong>, y se acredita <strong>sola en Puntos ES 7 días después de la entrega</strong>. Solo esperan
          tu revisión las que parecen una autocompra o pasan de $50. Si la orden se cancela, la comisión se anula sola. Nunca se paga en dinero.
        </p>
      </div>

      {porRevisar > 0 && (
        <div className={`${adminNotice('warning')} flex items-start gap-2`} role="alert">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>{porRevisar} {porRevisar === 1 ? 'comisión espera' : 'comisiones esperan'} tu revisión.</strong> Abre las comisiones del promotor marcado para aprobarla o rechazarla.</span>
        </div>
      )}

      {solicitudesPendientes.length > 0 && (
        <div className={adminCardFlush}>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <FiInbox className="h-4 w-4 text-brand-500" aria-hidden="true" />
            <h2 className="text-base font-semibold text-ink">Solicitudes para ser promotor</h2>
            <span className={adminBadge('warning')}>{solicitudesPendientes.length}</span>
          </div>
          <ul className="divide-y divide-line">
            {solicitudesPendientes.map((sol) => (
              <li key={sol.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{sol.user.name || sol.user.email}</p>
                  <p className="break-all text-xs text-muted">
                    {sol.user.email} · cliente desde {new Date(sol.user.since).toLocaleDateString('es-VE')} · {sol.user.orders} {sol.user.orders === 1 ? 'compra' : 'compras'}
                    {!sol.user.verified && ' · correo sin verificar'}
                  </p>
                  <p className="mt-1 break-words text-sm text-ink-soft">{sol.channels}{sol.followers !== null ? ` · ${sol.followers.toLocaleString('es-VE')} seguidores` : ''}</p>
                  {sol.message && <p className="mt-0.5 break-words text-sm text-muted">{sol.message}</p>}
                </div>
                <button type="button" onClick={() => abrirSolicitud(sol)} className={`${adminPrimaryButton} h-9 shrink-0 px-3 text-xs`}>Revisar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icono: <FiUserCheck className="h-5 w-5" />, tono: 'brand' as const, label: 'Promotores', valor: String(promotores.length) },
          { icono: <FiTrendingUp className="h-5 w-5" />, tono: 'neutral' as const, label: 'Conversiones', valor: String(promotores.reduce((s, p) => s + p.stats.totalConversions, 0)) },
          { icono: <FiDollarSign className="h-5 w-5" />, tono: 'warning' as const, label: 'Por acreditar', valor: formatUSD(pendienteTotal) },
          { icono: <FiDollarSign className="h-5 w-5" />, tono: 'success' as const, label: 'Ventas referidas', valor: formatUSD(generadoTotal) },
        ].map((stat) => (
          <div key={stat.label} className={`${adminStatCard} p-4`}>
            {/* En el teléfono el ícono se oculta: sin él, el monto cabe completo */}
            <span className="hidden sm:block" aria-hidden="true"><span className={adminIconChip(stat.tono)}>{stat.icono}</span></span>
            <div className="min-w-0">
              <p className={adminStatLabel}>{stat.label}</p>
              <p className={`${adminStatValue} text-lg sm:text-xl`}>{stat.valor}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={adminCardFlush}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">Promotores</h2>
          <button type="button" onClick={() => setCreando(true)} className={`${adminPrimaryButton} h-9 px-3 text-xs`}>
            <FiPlus className="h-4 w-4" aria-hidden="true" /> Nuevo promotor
          </button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12"><span className={adminSpinner} aria-label="Cargando" /></div>
        ) : promotores.length === 0 ? (
          <div className={`${adminEmpty} m-4`}>
            <FiUsers className="mb-2 h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="font-semibold text-ink">Sin promotores</p>
            <p className="mt-1 text-sm text-muted">Crea el primero para empezar a medir sus ventas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {promotores.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{p.name}</p>
                      <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-brand-700">{p.code}</span>
                      <span className={adminBadge(p.status === 'ACTIVE' ? 'success' : 'neutral')}>{p.status === 'ACTIVE' ? 'Activo' : 'Pausado'}</span>
                      {p.stats.toReview > 0 && <span className={adminBadge('warning')}>{p.stats.toReview} por revisar</span>}
                      {!p.hasCoupon && <span className={adminBadge('danger')} title="Un cupón normal ya usa este código: su código no funciona en el carrito">Código sin cupón</span>}
                    </div>
                    <p className="truncate text-xs text-muted">{p.user.email} · gana {p.commissionRate} % · su código descuenta {p.customerDiscountPercent} %</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted">Por acreditar</p>
                    <p className={`text-sm font-bold ${p.stats.pendingCommission > 0 ? 'text-warning-strong' : 'text-ink'}`}>{formatUSD(p.stats.pendingCommission)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => copiar(p.code)} className={adminIconButton} aria-label={`Copiar enlace de ${p.name}`} title="Copiar enlace de referido"><FiLink className="h-4 w-4" /></button>
                    <button type="button" onClick={() => abrirDetalle(p)} className={adminIconButton} aria-label={`Ver comisiones de ${p.name}`} title="Ver comisiones"><FiEye className="h-4 w-4" /></button>
                    <button type="button" onClick={() => abrirEdicion(p)} className={adminIconButton} aria-label={`Editar a ${p.name}`} title="Editar comisión y descuento"><FiEdit2 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => cambiarEstado(p)} className={adminIconButton} aria-label={p.status === 'ACTIVE' ? `Pausar a ${p.name}` : `Activar a ${p.name}`} title={p.status === 'ACTIVE' ? 'Pausar' : 'Activar'}>
                      {p.status === 'ACTIVE' ? <FiPause className="h-4 w-4" /> : <FiPlay className="h-4 w-4" />}
                    </button>
                    {p.stats.totalConversions === 0 && (
                      <button type="button" onClick={() => eliminar(p)} className={`${adminIconButton} hover:text-deal`} aria-label={`Eliminar a ${p.name}`} title="Eliminar"><FiTrash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Comisiones del promotor */}
      {/* Solo se abre tras un clic: nunca se pinta en el servidor */}
      {detalle && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDetalle(null); }}>
          <div className={`${adminModalPanel} sm:max-w-2xl`} role="dialog" aria-modal="true" aria-labelledby="titulo-comisiones">
            <div className={adminModalHeader}>
              <div className="min-w-0">
                <h3 id="titulo-comisiones" className={adminModalTitle}>Comisiones de {detalle.name}</h3>
                <p className="text-xs text-muted">
                  <span className="font-mono">{detalle.code}</span> · {detalle.commissionRate}% ·{' '}
                  <button type="button" onClick={() => copiar(detalle.code)} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
                    <FiCopy className="h-3 w-3" aria-hidden="true" /> copiar enlace
                  </button>
                </p>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" /></button>
            </div>

            <div className={`${adminModalBody} p-0`}>
              {cargandoComisiones ? (
                <div className="flex justify-center py-12"><span className={adminSpinner} aria-label="Cargando" /></div>
              ) : comisiones.length === 0 ? (
                <div className={`${adminEmpty} m-4`}>
                  <FiTrendingUp className="mb-2 h-8 w-8 text-subtle" aria-hidden="true" />
                  <p className="text-sm text-muted">Todavía no hay conversiones.</p>
                </div>
              ) : (
                <>
                  {pendientesSeleccionables.length > 0 && (
                    <label className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2 text-xs font-semibold text-ink-soft">
                      <input
                        type="checkbox"
                        checked={seleccion.length === pendientesSeleccionables.length}
                        onChange={(e) => setSeleccion(e.target.checked ? pendientesSeleccionables : [])}
                        className="h-4 w-4 accent-brand-500"
                      />
                      Seleccionar las {pendientesSeleccionables.length} pendientes
                    </label>
                  )}
                  <ul className="divide-y divide-line">
                    {comisiones.map((c) => {
                      const pendiente = c.status === 'PENDING';
                      const ordenNoPagada = c.order && (c.order.paymentStatus !== 'PAID' || c.order.status === 'CANCELLED');
                      return (
                        <li key={c.id}>
                          <label className={`flex items-center gap-3 px-4 py-3 ${pendiente ? 'cursor-pointer hover:bg-surface' : ''}`}>
                            {pendiente ? (
                              <input
                                type="checkbox"
                                checked={seleccion.includes(c.id)}
                                onChange={(e) => setSeleccion((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))}
                                className="h-4 w-4 shrink-0 accent-brand-500"
                              />
                            ) : (
                              <span className="w-4 shrink-0" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className={adminBadge('neutral')}>{TIPO[c.type]}{c.source === 'CODE' ? ' con código' : c.source === 'LINK' ? ' con enlace' : ''}</span>
                                <span className={adminBadge(ESTADO[c.status].tone)}>{ESTADO[c.status].label}</span>
                                {c.order && <span className="font-mono text-xs text-ink-soft">{c.order.orderNumber}</span>}
                                {ordenNoPagada && <span className={adminBadge('danger')}>Orden sin pago o cancelada</span>}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {c.referredUser.name || c.referredUser.email} · {new Date(c.createdAt).toLocaleDateString('es-VE')}
                              </span>
                              {pendiente && c.type === 'PURCHASE' && (
                                c.heldReason
                                  ? <span className="mt-0.5 block text-xs font-semibold text-warning-strong">Espera tu revisión: {c.heldReason}</span>
                                  : <span className="mt-0.5 block text-xs text-muted">{c.creditsAt ? `Se acredita sola el ${new Date(c.creditsAt).toLocaleDateString('es-VE')}` : 'Se acredita sola 7 días después de la entrega'}</span>
                              )}
                            </span>
                            <span className="shrink-0 text-right">
                              {c.grossAmount > 0 && <span className="block text-xs text-muted" title={c.baseAmount !== null ? 'Productos sin IVA ni envío' : 'Total de la orden (antes de C-167)'}>{formatUSD(c.baseAmount ?? c.grossAmount)}</span>}
                              <span className={`block text-sm font-bold ${c.status === 'REJECTED' ? 'text-muted line-through' : 'text-success-strong'}`}>
                                {formatUSD(c.commission)}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <div className={adminModalFooter}>
              <button type="button" onClick={() => resolver('reject_conversions')} disabled={procesando || seleccion.length === 0} className={adminDangerButton}>
                <FiX className="h-4 w-4" aria-hidden="true" /> Rechazar
              </button>
              <button type="button" onClick={() => resolver('approve_conversions')} disabled={procesando || seleccion.length === 0} className={adminSuccessButton}>
                <FiCheck className="h-4 w-4" aria-hidden="true" /> Aprobar y acreditar{seleccion.length > 0 ? ` (${seleccion.length})` : ''}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Nuevo promotor */}
      {creando && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setCreando(false); }}>
          <div className={`${adminModalPanel} sm:max-w-md`} role="dialog" aria-modal="true" aria-labelledby="titulo-nuevo-promotor">
            <div className={adminModalHeader}>
              <h3 id="titulo-nuevo-promotor" className={adminModalTitle}>Nuevo promotor</h3>
              <button type="button" onClick={() => setCreando(false)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" /></button>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <div>
                <label htmlFor="promotor-usuario" className={adminLabel}>Usuario *</label>
                <input
                  id="promotor-usuario"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setForm((f) => ({ ...f, userId: '' })); }}
                  placeholder="Buscar por nombre o correo"
                  className={adminInput()}
                  autoComplete="off"
                />
                {resultadosVisibles.length > 0 && (
                  <ul className="mt-1 overflow-hidden rounded-lg border border-line">
                    {resultadosVisibles.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, userId: u.id, name: f.name || u.name || '' }));
                            setBusqueda(u.email || u.name || '');
                            setResultados([]);
                          }}
                          className="w-full border-b border-line px-3 py-2 text-left text-sm last:border-0 hover:bg-surface"
                        >
                          <span className="block font-medium text-ink">{u.name || 'Sin nombre'}</span>
                          <span className="block text-xs text-muted">{u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.userId && <p className={adminHint}>Usuario elegido.</p>}
              </div>
              <div>
                <label htmlFor="promotor-codigo" className={adminLabel}>Código *</label>
                <input id="promotor-codigo" value={form.code} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="GAMER10" className={`${adminInput()} font-mono uppercase`} />
                <p className={adminHint}>Es también el cupón que el cliente escribe en el carrito.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promotor-porcentaje" className={adminLabel}>Comisión %</label>
                  <input id="promotor-porcentaje" type="number" min="0" max="50" step="0.5" value={form.commissionRate} onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))} className={adminInput()} />
                  <p className={adminHint}>Lo que gana, en Puntos ES.</p>
                </div>
                <div>
                  <label htmlFor="promotor-descuento" className={adminLabel}>Descuento al cliente %</label>
                  <input id="promotor-descuento" type="number" min="1" max="30" step="1" value={form.customerDiscountPercent} onChange={(e) => setForm((f) => ({ ...f, customerDiscountPercent: e.target.value }))} className={adminInput()} />
                  <p className={adminHint}>Lo que descuenta su código.</p>
                </div>
              </div>
              <div>
                <label htmlFor="promotor-nombre" className={adminLabel}>Nombre para mostrar *</label>
                <input id="promotor-nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="GamerPro VE" className={adminInput()} />
              </div>
              <div>
                <label htmlFor="promotor-notas" className={adminLabel}>Notas internas</label>
                <textarea id="promotor-notas" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Canal, acuerdo…" className={`${adminInput()} h-auto resize-none py-2.5`} />
              </div>
              {form.code && (
                <p className={adminNotice('neutral')}>
                  Enlace: <span className="break-all font-mono text-xs text-brand-700">{enlaceReferido(form.code)}</span>
                </p>
              )}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setCreando(false)} className={adminSecondaryButton}>Cancelar</button>
              <button type="button" onClick={crear} disabled={guardando || !form.userId || !form.code || !form.name} className={adminPrimaryButton}>
                <FiPlus className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Creando…' : 'Crear promotor'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Revisar una solicitud (C-167) */}
      {revisando && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setRevisando(null); }}>
          <div className={`${adminModalPanel} sm:max-w-md`} role="dialog" aria-modal="true" aria-labelledby="titulo-solicitud">
            <div className={adminModalHeader}>
              <h3 id="titulo-solicitud" className={adminModalTitle}>Solicitud de {revisando.user.name || revisando.user.email}</h3>
              <button type="button" onClick={() => setRevisando(null)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" /></button>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <div className={adminNotice('neutral')}>
                <p className="break-words text-sm text-ink">{revisando.channels}{revisando.followers !== null ? ` · ${revisando.followers.toLocaleString('es-VE')} seguidores` : ''}</p>
                {revisando.message && <p className="mt-1 break-words text-sm text-muted">{revisando.message}</p>}
                <p className="mt-1 text-xs text-muted">{revisando.user.orders} {revisando.user.orders === 1 ? 'compra' : 'compras'} en la tienda{revisando.wantedCode ? ` · pidió el código ${revisando.wantedCode}` : ''}</p>
              </div>
              <div>
                <label htmlFor="solicitud-codigo" className={adminLabel}>Código</label>
                <input id="solicitud-codigo" value={revision.code} maxLength={20} onChange={(e) => setRevision((r) => ({ ...r, code: e.target.value.toUpperCase() }))} className={`${adminInput()} font-mono uppercase`} />
                <p className={adminHint}>Propuesto y libre. Lo escriben sus seguidores en el carrito.</p>
              </div>
              <div>
                <label htmlFor="solicitud-nombre" className={adminLabel}>Nombre para mostrar</label>
                <input id="solicitud-nombre" value={revision.name} onChange={(e) => setRevision((r) => ({ ...r, name: e.target.value }))} className={adminInput()} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="solicitud-comision" className={adminLabel}>Comisión %</label>
                  <input id="solicitud-comision" type="number" min="0" max="50" step="0.5" value={revision.commissionRate} onChange={(e) => setRevision((r) => ({ ...r, commissionRate: e.target.value }))} className={adminInput()} />
                </div>
                <div>
                  <label htmlFor="solicitud-descuento" className={adminLabel}>Descuento al cliente %</label>
                  <input id="solicitud-descuento" type="number" min="1" max="30" step="1" value={revision.customerDiscountPercent} onChange={(e) => setRevision((r) => ({ ...r, customerDiscountPercent: e.target.value }))} className={adminInput()} />
                </div>
              </div>
              <div>
                <label htmlFor="solicitud-nota" className={adminLabel}>Si la rechazas, el motivo (opcional)</label>
                <input id="solicitud-nota" value={revision.note} maxLength={300} onChange={(e) => setRevision((r) => ({ ...r, note: e.target.value }))} placeholder="Se lo decimos al cliente en su panel" className={adminInput()} />
              </div>
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => resolverSolicitud('reject')} disabled={guardando} className={adminDangerButton}>
                <FiX className="h-4 w-4" aria-hidden="true" /> Rechazar
              </button>
              <button type="button" onClick={() => resolverSolicitud('approve')} disabled={guardando || !revision.code || !revision.name} className={adminSuccessButton}>
                <FiCheck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Editar un promotor (C-167): antes solo se podía pausar */}
      {editando && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setEditando(null); }}>
          <div className={`${adminModalPanel} sm:max-w-md`} role="dialog" aria-modal="true" aria-labelledby="titulo-editar-promotor">
            <div className={adminModalHeader}>
              <h3 id="titulo-editar-promotor" className={adminModalTitle}>Editar a {editando.name}</h3>
              <button type="button" onClick={() => setEditando(null)} className={adminIconButton} aria-label="Cerrar"><FiX className="h-5 w-5" /></button>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <div>
                <label htmlFor="editar-nombre" className={adminLabel}>Nombre para mostrar</label>
                <input id="editar-nombre" value={edicion.name} onChange={(e) => setEdicion((d) => ({ ...d, name: e.target.value }))} className={adminInput()} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="editar-comision" className={adminLabel}>Comisión %</label>
                  <input id="editar-comision" type="number" min="0" max="50" step="0.5" value={edicion.commissionRate} onChange={(e) => setEdicion((d) => ({ ...d, commissionRate: e.target.value }))} className={adminInput()} />
                </div>
                <div>
                  <label htmlFor="editar-descuento" className={adminLabel}>Descuento al cliente %</label>
                  <input id="editar-descuento" type="number" min="1" max="30" step="1" value={edicion.customerDiscountPercent} onChange={(e) => setEdicion((d) => ({ ...d, customerDiscountPercent: e.target.value }))} className={adminInput()} />
                </div>
              </div>
              <p className={adminHint}>El código ({editando.code}) no se cambia: ya puede estar publicado. Los cambios valen para las compras nuevas.</p>
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setEditando(null)} className={adminSecondaryButton}>Cancelar</button>
              <button type="button" onClick={guardarEdicion} disabled={guardando || !edicion.name} className={adminPrimaryButton}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
