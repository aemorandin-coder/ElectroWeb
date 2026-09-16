'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import {
  FiCheck, FiCopy, FiDollarSign, FiEye, FiInfo, FiLink, FiPause, FiPlay, FiPlus, FiTrash2, FiTrendingUp, FiUserCheck, FiUsers, FiX,
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
  status: 'ACTIVE' | 'PAUSED';
  user: { id: string; name: string | null; email: string | null };
  stats: { totalConversions: number; pendingConversions: number; pendingCommission: number; approvedCommission: number; totalGross: number };
}

interface Comision {
  id: string;
  type: 'REGISTRATION' | 'PURCHASE' | 'RECHARGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  grossAmount: number;
  commission: number;
  createdAt: string;
  referredUser: { name: string | null; email: string | null };
  order: { orderNumber: string; status: string; paymentStatus: string } | null;
}

interface Usuario { id: string; name: string | null; email: string | null }

const TIPO: Record<Comision['type'], string> = { REGISTRATION: 'Registro', PURCHASE: 'Compra', RECHARGE: 'Recarga (antes de C-75)' };
const ESTADO: Record<Comision['status'], { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  APPROVED: { label: 'Aprobada', tone: 'success' },
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
  const [form, setForm] = useState({ userId: '', code: '', name: '', commissionRate: '5', notes: '' });
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [guardando, setGuardando] = useState(false);

  useBodyScrollLock(Boolean(detalle) || creando);

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
      setForm({ userId: '', code: '', name: '', commissionRate: '5', notes: '' });
      setBusqueda('');
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
        if (data.approved > 0) toast.success(`${data.approved} comisión(es) aprobada(s) y acreditada(s) como saldo`);
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

  return (
    <div className="space-y-5">
      <div className={`${adminNotice('brand')} flex gap-3`}>
        <FiInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          El promotor comparte su enlace. Quien se registre con él en los siguientes 30 días queda asociado. Cada <strong>compra pagada</strong> de ese
          cliente crea una comisión pendiente; al aprobarla se acredita como <strong>saldo de la tienda</strong>. Si la orden se cancela, la comisión
          se rechaza sola. Las recargas no generan comisión.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icono: <FiUserCheck className="h-5 w-5" />, tono: 'brand' as const, label: 'Promotores', valor: String(promotores.length) },
          { icono: <FiTrendingUp className="h-5 w-5" />, tono: 'neutral' as const, label: 'Conversiones', valor: String(promotores.reduce((s, p) => s + p.stats.totalConversions, 0)) },
          { icono: <FiDollarSign className="h-5 w-5" />, tono: 'warning' as const, label: 'Por aprobar', valor: formatUSD(pendienteTotal) },
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
                    </div>
                    <p className="truncate text-xs text-muted">{p.user.email} · {p.commissionRate}% por compra</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted">Por aprobar</p>
                    <p className={`text-sm font-bold ${p.stats.pendingCommission > 0 ? 'text-warning-strong' : 'text-ink'}`}>{formatUSD(p.stats.pendingCommission)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => copiar(p.code)} className={adminIconButton} aria-label={`Copiar enlace de ${p.name}`} title="Copiar enlace de referido"><FiLink className="h-4 w-4" /></button>
                    <button type="button" onClick={() => abrirDetalle(p)} className={adminIconButton} aria-label={`Ver comisiones de ${p.name}`} title="Ver comisiones"><FiEye className="h-4 w-4" /></button>
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
                                <span className={adminBadge('neutral')}>{TIPO[c.type]}</span>
                                <span className={adminBadge(ESTADO[c.status].tone)}>{ESTADO[c.status].label}</span>
                                {c.order && <span className="font-mono text-xs text-ink-soft">{c.order.orderNumber}</span>}
                                {ordenNoPagada && <span className={adminBadge('danger')}>Orden sin pago o cancelada</span>}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {c.referredUser.name || c.referredUser.email} · {new Date(c.createdAt).toLocaleDateString('es-VE')}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {c.grossAmount > 0 && <span className="block text-xs text-muted">{formatUSD(c.grossAmount)}</span>}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promotor-codigo" className={adminLabel}>Código *</label>
                  <input id="promotor-codigo" value={form.code} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="GAMER10" className={`${adminInput()} font-mono uppercase`} />
                </div>
                <div>
                  <label htmlFor="promotor-porcentaje" className={adminLabel}>Comisión %</label>
                  <input id="promotor-porcentaje" type="number" min="0" max="50" step="0.5" value={form.commissionRate} onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))} className={adminInput()} />
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
    </div>
  );
}
