'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
  IconoActualizar, IconoBillete, IconoBuscar, IconoCerrar, IconoCheck, IconoConfirmado, IconoDescargar,
  IconoEntradaPuntos, IconoError, IconoFiltro, IconoPagoMovil, IconoPaquete, IconoRegalo, IconoReloj, IconoRepetir,
  IconoLista, IconoSalidaPuntos, IconoTarjeta, IconoWeb,
} from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import { SiBinance } from 'react-icons/si';
import { formatPaymentMethod, isCreditTransaction } from '@/lib/format-helpers';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import {
    adminPageTitle,
    adminPageSubtitle,
    adminPageHeaderCompact,
    adminRowZebra,
    adminSecondaryButton,
    adminDangerButton,
    adminSuccessButton,
    adminModalOverlay,
    adminModalPanel,
    adminModalHeader,
    adminModalTitle,
    adminModalBody,
    adminModalFooter,
    adminTable,
    adminTableWrap,
    adminTh,
    adminTd,
    adminInput,
    adminLabel,
    adminBadge,
    adminDato,
} from '@/lib/admin-ui';
import PagosSinOrden from './_components/PagosSinOrden';
import ConsultarPagoMovil from './_components/ConsultarPagoMovil';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { celda } from '@/lib/relacion-ventas';
import { useTiempoReal } from '@/lib/realtime/hooks';
import { EnVivo } from '@/components/ui/EnVivo';


// ─── Payment method icons (react-icons, no emojis) ──────────────────────────

function PaymentIcon({ method, className = 'w-3.5 h-3.5' }: { method: string | null | undefined; className?: string }) {
    switch (method) {
        case 'MOBILE_PAYMENT':   return <IconoPagoMovil className={className} />;
        case 'BANK_TRANSFER':    return <IconoBillete className={className} />;
        case 'ZELLE':            return <IconoWeb className={className} />;
        case 'ZINLI':            return <IconoWeb className={className} />;
        case 'PAYPAL':           return <IconoWeb className={className} />;
        case 'CRYPTO':           return <SiBinance className={className} />;
        case 'CASH':             return <IconoBillete className={className} />;
        case 'CREDIT_CARD':      return <IconoTarjeta className={className} />;
        case 'BALANCE':          return <IconoEntradaPuntos className={className} />;
        case 'MERCANTIL_PANAMA': return <IconoWeb className={className} />;
        default:                 return <IconoBillete className={className} />;
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Transaction {
    id: string;
    type: 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'BONUS' | 'WITHDRAWAL';
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    amount: number;
    currency: string;
    description: string;
    reference: string | null;
    paymentMethod: string | null;
    rejectionReason: string | null;
    createdAt: string;
    balance: {
        user: {
            id: string;
            name: string | null;
            email: string;
        };
    };
}

interface Stats {
    pendingCount: number;
    pendingAmount: number;
    completedTodayCount: number;
    completedTodayAmount: number;
    cancelledTodayCount: number;
    weekCount: number;
    weekAmount: number;
}

const REJECTION_REASONS = [
    { id: 'ref_invalid',      label: 'Número de referencia inválido',   description: 'El número de referencia proporcionado no coincide con ninguna transacción bancaria.' },
    { id: 'amount_mismatch',  label: 'Monto incorrecto',                description: 'El monto transferido no coincide con el monto declarado en la solicitud.' },
    { id: 'payment_not_found',label: 'Pago no encontrado',              description: 'No se encontró el pago en nuestras cuentas bancarias.' },
    { id: 'duplicate',        label: 'Transacción duplicada',           description: 'Esta referencia ya fue utilizada en otra solicitud de recarga.' },
    { id: 'suspicious',       label: 'Actividad sospechosa',            description: 'La transacción ha sido marcada para revisión por actividad sospechosa.' },
    { id: 'expired',          label: 'Comprobante vencido',             description: 'El comprobante de pago supera el tiempo máximo permitido.' },
    { id: 'custom',           label: 'Motivo personalizado',            description: '' },
];

// ─── Design tokens ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    RECHARGE:   { label: 'Recarga',    cls: adminDato, icon: <IconoEntradaPuntos   className="w-3 h-3" /> },
    DEPOSIT:    { label: 'Abono',      cls: adminDato, icon: <IconoEntradaPuntos   className="w-3 h-3" /> },
    PURCHASE:   { label: 'Compra',     cls: adminDato,   icon: <IconoPaquete         className="w-3 h-3" /> },
    REFUND:     { label: 'Reembolso',  cls: adminDato,   icon: <IconoRepetir          className="w-3 h-3" /> },
    BONUS:      { label: 'Bono',       cls: adminDato, icon: <IconoRegalo            className="w-3 h-3" /> },
    WITHDRAWAL: { label: 'Salida',     cls: adminDato, icon: <IconoSalidaPuntos className="w-3 h-3" /> },
};

// C-245: lleno y con su ícono, como el estado de una orden (el punto de color quedaba invisible sobre su mismo color)
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    PENDING:   { label: 'Pendiente', icon: <IconoReloj      className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />, cls: adminBadge('warning') },
    COMPLETED: { label: 'Aprobada',  icon: <IconoConfirmado className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />, cls: adminBadge('success') },
    FAILED:    { label: 'Fallida',   icon: <IconoError      className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />, cls: adminBadge('danger')  },
    CANCELLED: { label: 'Rechazada', icon: <IconoCerrar     className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />, cls: adminBadge('danger')  },
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    // C-281 (A-07): se busca en el servidor entre todos los movimientos (antes, solo entre los 200 cargados). Espera a que
    // se deje de escribir; `pedidoLista` descarta una respuesta que llegó tarde
    const [busqueda, setBusqueda] = useState('');
    const pedidoLista = useRef(0);
    useEffect(() => {
        const t = setTimeout(() => setBusqueda(searchQuery.trim()), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [successAnimations, setSuccessAnimations] = useState<{ [key: string]: 'approve' | 'reject' | null }>({});

    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approvingTransaction, setApprovingTransaction] = useState<Transaction | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingTransaction, setRejectingTransaction] = useState<Transaction | null>(null);
    const [selectedReason, setSelectedReason] = useState('');

    useBodyScrollLock(showApproveModal);
    useBodyScrollLock(showRejectModal);
    const [customReason, setCustomReason] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/transactions?summary=1');
            if (res.ok) setStats(await res.json());
        } catch { /* silent */ }
    }, []);

    const fetchTransactions = useCallback(async () => {
        const pedido = ++pedidoLista.current;
        try {
            setLoading(true);
            const params = new URLSearchParams({ status: filterStatus, type: filterType });
            if (busqueda) params.set('q', busqueda);
            const res = await fetch(`/api/admin/transactions?${params}`);
            if (!res.ok) throw new Error(String(res.status));
            const lista = await res.json();
            if (pedido === pedidoLista.current) setTransactions(lista);
        } catch {
            if (pedido === pedidoLista.current) toast.error('Error al cargar transacciones');
        } finally {
            if (pedido === pedidoLista.current) setLoading(false);
        }
    }, [filterStatus, filterType, busqueda]);

    useCargarAlMontar(() => {
        void fetchTransactions();
        void fetchStats();
    }, [fetchTransactions, fetchStats]);

    // C-127: en vivo. Cuando el banco o alguien del equipo resuelve una recarga, la lista y los totales se
    // actualizan, y si su modal está abierto se cierra (antes: aprobarla dos veces daba "ya fue procesada").
    // Si la conexión se cae, se vuelve al sondeo de cada minuto que había antes.
    const recargar = useCallback(() => {
        void fetchStats();
        if (filterStatus === 'PENDING' || filterStatus === 'all') void fetchTransactions();
    }, [fetchStats, fetchTransactions, filterStatus]);
    const enVivo = useTiempoReal((evento) => {
        if (evento.tipo !== 'payment:verified') return;
        recargar();
        if (evento.transactionId && approvingTransaction?.id === evento.transactionId) {
            setShowApproveModal(false);
            setApprovingTransaction(null);
            toast.success(evento.aprobado ? 'Esta recarga ya se aprobó (el banco la confirmó o la aprobó otra persona).' : 'Esta recarga ya se rechazó.');
        }
        if (evento.transactionId && rejectingTransaction?.id === evento.transactionId) {
            setShowRejectModal(false);
            setRejectingTransaction(null);
            toast.success(evento.aprobado ? 'Esta recarga ya se aprobó: no hace falta rechazarla.' : 'Esta recarga ya se rechazó.');
        }
    }, { onReconectar: recargar, respaldoMs: 60_000 });

    // C-281 (A-07): la lista ya llega buscada del servidor (y el CSV exporta lo encontrado)
    const displayed = transactions;

    const openApproveModal = (t: Transaction) => { setApprovingTransaction(t); setShowApproveModal(true); };

    const handleApprove = async () => {
        if (!approvingTransaction) return;
        const id = approvingTransaction.id;
        try {
            setProcessingId(id);
            setShowApproveModal(false);
            const res = await fetch('/api/admin/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'COMPLETED' }),
            });
            if (res.ok) {
                setSuccessAnimations(prev => ({ ...prev, [id]: 'approve' }));
                toast.success('Recarga aprobada exitosamente');
                window.dispatchEvent(new Event('refresh-sidebar-counts'));
                setTimeout(() => {
                    setSuccessAnimations(prev => ({ ...prev, [id]: null }));
                    fetchTransactions(); fetchStats();
                }, 1200);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Error al aprobar');
            }
        } catch { toast.error('Error al aprobar transacción'); }
        finally { setProcessingId(null); setApprovingTransaction(null); }
    };

    const openRejectModal = (t: Transaction) => {
        setRejectingTransaction(t); setSelectedReason(''); setCustomReason(''); setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectingTransaction || !selectedReason) { toast.error('Por favor selecciona un motivo de rechazo'); return; }
        const reason = selectedReason === 'custom'
            ? customReason
            : REJECTION_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
        if (selectedReason === 'custom' && !customReason.trim()) { toast.error('Por favor escribe el motivo personalizado'); return; }
        const id = rejectingTransaction.id;
        try {
            setProcessingId(id);
            const res = await fetch('/api/admin/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'CANCELLED', rejectionReason: reason }),
            });
            if (res.ok) {
                setSuccessAnimations(prev => ({ ...prev, [id]: 'reject' }));
                toast.success('Transacción rechazada');
                setShowRejectModal(false); setRejectingTransaction(null);
                window.dispatchEvent(new Event('refresh-sidebar-counts'));
                setTimeout(() => {
                    setSuccessAnimations(prev => ({ ...prev, [id]: null }));
                    fetchTransactions(); fetchStats();
                }, 1200);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Error al rechazar');
            }
        } catch { toast.error('Error al rechazar transacción'); }
        finally { setProcessingId(null); }
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Usuario', 'Email', 'Tipo', 'Estado', 'Monto USD', 'Descripción', 'Referencia', 'Método de Pago', 'Motivo Rechazo', 'Fecha'];
        // C-282 (A-10): cada texto con `celda` (comillas duplicadas y un apóstrofo delante de = + - @: el nombre, la referencia y
        // la descripción los escribe el cliente, y "=HYPERLINK(…)" se ejecutaba al abrir el archivo). El monto va como número
        const csvData = displayed.map(t => [
            celda(t.id), celda(t.balance.user.name || 'N/A'), celda(t.balance.user.email),
            celda(TYPE_CONFIG[t.type]?.label || t.type), celda(STATUS_CONFIG[t.status]?.label || t.status),
            `"${Number(t.amount).toFixed(2)}"`, celda(t.description),
            celda(t.reference), celda(formatPaymentMethod(t.paymentMethod)),
            celda(t.rejectionReason),
            celda(format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm:ss')),
        ]);
        const BOM = '\uFEFF';
        const content = [headers.map(celda), ...csvData].map(row => row.join(',')).join('\n');
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `transacciones_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV descargado');
    };

    // ── Helpers ──────────────────────────────────────────────────────────────

    const fmtAmount = (n: number) => formatUSD(Math.abs(Number(n)));

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-0 flex-col gap-3">

            {/* ── Header ── */}
            <div className={adminPageHeaderCompact}>
                <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h1 className={adminPageTitle}>Transacciones</h1>
                        <EnVivo estado={enVivo} />
                        {stats && (
                            <span className={adminDato}>
                                Hoy <strong className="text-success-strong">+{fmtAmount(stats.completedTodayAmount)}</strong> · Semana <strong className="text-ink">{fmtAmount(stats.weekAmount)}</strong>
                            </span>
                        )}
                        {stats && stats.pendingCount > 0 && (
                            <button type="button" onClick={() => setFilterStatus('PENDING')} className={adminBadge('warning')}>
                                {stats.pendingCount} {stats.pendingCount === 1 ? 'pendiente' : 'pendientes'} · {fmtAmount(stats.pendingAmount)}
                            </button>
                        )}
                    </div>
                    <p className={adminPageSubtitle}>Recargas y movimientos de Puntos ES · máx. 200 registros</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ConsultarPagoMovil />
                    <button
                        type="button"
                        onClick={() => { fetchTransactions(); fetchStats(); }}
                        className={`${adminSecondaryButton} w-11 px-0!`}
                        aria-label="Actualizar transacciones"
                        title="Actualizar"
                    >
                        <IconoActualizar className={`h-4 w-4 text-muted ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={exportToCSV}
                        disabled={displayed.length === 0}
                        className={adminSecondaryButton}
                    >
                        <IconoDescargar className="h-3.5 w-3.5" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* C-114: Pagos Móvil confirmados por el banco que no llegaron a ser orden */}
            <PagosSinOrden onChange={() => { fetchTransactions(); fetchStats(); }} />

            {/* C-249 + G-70: filtros alineados en 4 columnas iguales */}
            <Filtros
                columnas={4}
                etiqueta="Estado de transacción"
                valor={filterStatus}
                onCambiar={setFilterStatus}
                filtros={[
                    { valor: 'all', etiqueta: 'Todas', ayuda: 'Hasta 200 movimientos', Icono: IconoLista },
                    { valor: 'PENDING', etiqueta: 'Pendientes', ayuda: 'Esperan tu revisión', Icono: IconoReloj, tono: 'aviso', cuenta: stats ? stats.pendingCount : null },
                    { valor: 'COMPLETED', etiqueta: 'Aprobadas', ayuda: 'Ya procesadas', Icono: IconoConfirmado },
                    { valor: 'CANCELLED', etiqueta: 'Rechazadas', ayuda: 'Con su motivo', Icono: IconoCerrar },
                ]}
            />

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
                    <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                    <input
                        type="search"
                        aria-label="Buscar por nombre, correo, teléfono, cédula o referencia"
                        placeholder="Nombre, correo, teléfono o referencia"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`${adminInput()} pl-9 pr-11`}
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" title="Limpiar búsqueda" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted">
                            <IconoCerrar className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Type */}
                <div className="relative sm:w-48">
                    <IconoFiltro className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                    <select
                        aria-label="Tipo de transacción"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className={`${adminInput()} pl-9`}
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="RECHARGE">Recargas</option>
                        <option value="PURCHASE">Compras</option>
                        <option value="REFUND">Reembolsos</option>
                        <option value="BONUS">Bonos</option>
                        <option value="WITHDRAWAL">Salidas</option>
                    </select>
                </div>

                {busqueda && !loading && (
                    <div role="status" className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-muted">
                        {displayed.length >= 200 ? 'Las 200 más nuevas' : displayed.length === 1 ? '1 encontrada' : `${displayed.length} encontradas`}
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex items-center justify-center rounded-2xl border border-line bg-white py-16">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand-500" />
                        <span className="text-sm text-muted">Cargando transacciones...</span>
                    </div>
                </div>
            ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white py-16 text-muted">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface">
                        <IconoBillete className="h-6 w-6 text-line-strong" />
                    </div>
                    <p className="text-sm font-medium">
                        {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay transacciones'}
                    </p>
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="text-xs font-medium text-brand-500 hover:underline">
                            Limpiar búsqueda
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white lg:hidden">
                        {[...displayed].sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING')).map(t => {
                            const typeConf = TYPE_CONFIG[t.type] || TYPE_CONFIG.RECHARGE;
                            const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                            const isCredit = isCreditTransaction(t.type);
                            const anim = successAnimations[t.id];
                            return (
                                <div
                                    key={t.id}
                                    className={`p-4 transition-all duration-500 ${anim === 'approve' ? 'bg-success-strong/10' : anim === 'reject' ? 'bg-deal-bg opacity-50' : ''}`}
                                >
                                    {/* Top row */}
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={typeConf.cls}>
                                                {typeConf.icon}{typeConf.label}
                                            </span>
                                            <span className="text-xs text-muted">
                                                {format(new Date(t.createdAt), 'dd MMM · HH:mm', { locale: es })}
                                            </span>
                                        </div>
                                        <span className={statusConf.cls}>
                                            {statusConf.icon}
                                            {statusConf.label}
                                        </span>
                                    </div>

                                    {/* User */}
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface">
                                            <span className="text-xs font-bold text-brand-500">
                                                {(t.balance.user.name || t.balance.user.email)[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-ink">{t.balance.user.name || 'Usuario'}</p>
                                            <p className="truncate text-xs text-muted">{t.balance.user.email}</p>
                                        </div>
                                    </div>

                                    {/* Amount + meta */}
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                                        <div className="space-y-0.5">
                                            {t.reference && (
                                                <p className="text-xs text-muted">
                                                    Ref: <span className="font-mono text-ink">{t.reference}</span>
                                                </p>
                                            )}
                                            {t.paymentMethod && (
                                                <p className="flex items-center gap-1 text-xs text-muted">
                                                    <PaymentIcon method={t.paymentMethod} className="h-3 w-3" />
                                                    {formatPaymentMethod(t.paymentMethod)}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`whitespace-nowrap text-lg font-bold tabular-nums ${isCredit ? 'text-success-strong' : 'text-deal'}`}>
                                            {isCredit ? '+' : '-'}{fmtAmount(Number(t.amount))}
                                        </span>
                                    </div>

                                    {t.description && <p className="mb-3 text-sm text-ink-soft [overflow-wrap:anywhere]">{t.description}</p>}

                                    {t.status === 'CANCELLED' && t.rejectionReason && (
                                        <div className="mb-3 flex items-start gap-1.5 text-xs text-deal">
                                            <IconoError className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                            <span>{t.rejectionReason}</span>
                                        </div>
                                    )}

                                    {t.status === 'PENDING' && t.type === 'RECHARGE' && (
                                        <div className="flex gap-2 border-t border-line pt-3">
                                            <button
                                                type="button"
                                                onClick={() => openApproveModal(t)}
                                                disabled={processingId === t.id}
                                                className={`${adminSuccessButton} flex-1 px-3`}
                                            >
                                                {processingId === t.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <IconoCheck className="h-3.5 w-3.5" />}
                                                Aprobar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openRejectModal(t)}
                                                disabled={processingId === t.id}
                                                className={`${adminSecondaryButton} flex-1 px-3 text-deal!`}
                                            >
                                                <IconoCerrar className="h-3.5 w-3.5" />
                                                Rechazar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className={`${adminTableWrap} hidden lg:block`}>
                        <table className={`${adminTable} min-w-[780px]`}>
                            <thead>
                                <tr>
                                    <th className={adminTh}>Usuario</th>
                                    <th className={adminTh}>Tipo</th>
                                    <th className={adminTh}>Monto</th>
                                    <th className={adminTh}>Referencia</th>
                                    <th className={adminTh}>Estado</th>
                                    <th className={adminTh}>Fecha</th>
                                    <th className={`${adminTh} text-right`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...displayed].sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING')).map(t => {
                                    const typeConf = TYPE_CONFIG[t.type] || TYPE_CONFIG.RECHARGE;
                                    const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                                    const isCredit = isCreditTransaction(t.type);
                                    const anim = successAnimations[t.id];
                                    return (
                                        <tr
                                            key={t.id}
                                            className={`transition-colors duration-300 ${anim === 'approve' ? 'bg-success-strong/10' : anim === 'reject' ? 'bg-deal-bg opacity-40' : adminRowZebra}`}
                                        >
                                            {/* Usuario */}
                                            <td className={adminTd}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface">
                                                        <span className="text-xs font-bold text-brand-500">
                                                            {(t.balance.user.name || t.balance.user.email)[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="max-w-[160px] truncate text-sm font-semibold text-ink">
                                                            {t.balance.user.name || 'Usuario'}
                                                        </p>
                                                        <p className="max-w-[160px] truncate text-xs text-muted">{t.balance.user.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipo + método */}
                                            <td className={adminTd}>
                                                <span className={typeConf.cls}>
                                                    {typeConf.icon}{typeConf.label}
                                                </span>
                                                {t.paymentMethod && (
                                                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                                                        <PaymentIcon method={t.paymentMethod} className="h-3 w-3 flex-shrink-0" />
                                                        {formatPaymentMethod(t.paymentMethod)}
                                                    </p>
                                                )}
                                                {t.description && (
                                                    <p className="mt-0.5 max-w-[200px] text-xs text-muted [overflow-wrap:anywhere]">{t.description}</p>
                                                )}
                                            </td>

                                            {/* Monto */}
                                            <td className={`${adminTd} whitespace-nowrap`}>
                                                <span className={`text-sm font-bold tabular-nums ${isCredit ? 'text-success-strong' : 'text-deal'}`}>
                                                    {isCredit ? '+' : '-'}{fmtAmount(Number(t.amount))}
                                                </span>
                                                <p className="text-xs font-medium text-subtle">USD</p>
                                            </td>

                                            {/* Referencia */}
                                            <td className={adminTd}>
                                                {t.reference ? (
                                                    <span className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs tracking-wide text-ink">
                                                        {t.reference}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-line-strong">—</span>
                                                )}
                                            </td>

                                            {/* Estado */}
                                            <td className={adminTd}>
                                                <span className={statusConf.cls}>
                                                    {statusConf.icon}
                                                    {statusConf.label}
                                                </span>
                                                {t.status === 'CANCELLED' && t.rejectionReason && (
                                                    <p className="mt-1 flex items-center gap-1 text-xs text-deal">
                                                        <IconoError className="h-3 w-3 flex-shrink-0" />
                                                        <span className="max-w-[120px] truncate">{t.rejectionReason}</span>
                                                    </p>
                                                )}
                                            </td>

                                            {/* Fecha */}
                                            <td className={`${adminTd} whitespace-nowrap`}>
                                                <p className="text-sm font-medium text-ink">
                                                    {format(new Date(t.createdAt), 'dd MMM yyyy', { locale: es })}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {format(new Date(t.createdAt), 'HH:mm')}
                                                </p>
                                            </td>

                                            {/* Acciones */}
                                            <td className={`${adminTd} text-right`}>
                                                {t.status === 'PENDING' && t.type === 'RECHARGE' ? (
                                                    anim ? (
                                                        <span className={adminBadge(anim === 'approve' ? 'success' : 'danger')}>
                                                            {anim === 'approve' ? <><IconoCheck className="h-3.5 w-3.5" /> Aprobada</> : <><IconoCerrar className="h-3.5 w-3.5" /> Rechazada</>}
                                                        </span>
                                                    ) : (
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openApproveModal(t)}
                                                                disabled={processingId === t.id}
                                                                className={`${adminSuccessButton} w-11 px-0!`}
                                                                aria-label="Aprobar recarga"
                                                                title="Aprobar recarga"
                                                            >
                                                                {processingId === t.id
                                                                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                    : <IconoCheck className="h-4 w-4" />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openRejectModal(t)}
                                                                disabled={processingId === t.id}
                                                                className={`${adminSecondaryButton} w-11 px-0! text-deal!`}
                                                                aria-label="Rechazar recarga"
                                                                title="Rechazar recarga"
                                                            >
                                                                <IconoCerrar className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-line-strong">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ── Approval Modal ── */}
            {showApproveModal && approvingTransaction && typeof document !== 'undefined' && createPortal(
                <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowApproveModal(false); setApprovingTransaction(null); } }}>
                    <div className={`${adminModalPanel} sm:max-w-md`}>
                        {/* Header */}
                        <div className={adminModalHeader}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-success-strong/15 flex items-center justify-center">
                                    <IconoCheck className="w-5 h-5 text-success-strong" />
                                </div>
                                <div>
                                    <h2 className={adminModalTitle}>Confirmar Aprobación</h2>
                                    <p className="text-xs text-muted">
                                        {approvingTransaction.balance.user.name || approvingTransaction.balance.user.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={adminModalBody}>
                            {/* Amount highlight */}
                            <div className="bg-success-strong/10 border border-success-strong/20 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-success-strong">
                                    +{fmtAmount(Number(approvingTransaction.amount))}
                                </p>
                                <p className="text-xs text-success-strong mt-1">USD · se acreditará a los Puntos ES del cliente</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5 text-sm mt-4">
                                {approvingTransaction.reference && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 [overflow-wrap:anywhere]">
                                        <span className="text-muted">Referencia</span>
                                        <span className="font-mono text-xs bg-surface border border-line px-2 py-1 rounded-md">
                                            {approvingTransaction.reference}
                                        </span>
                                    </div>
                                )}
                                {approvingTransaction.paymentMethod && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 [overflow-wrap:anywhere]">
                                        <span className="text-muted">Método de pago</span>
                                        <span className="flex items-center gap-1.5 text-ink">
                                            <PaymentIcon method={approvingTransaction.paymentMethod} />
                                            {formatPaymentMethod(approvingTransaction.paymentMethod)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-2 [overflow-wrap:anywhere]">
                                    <span className="text-muted">Correo</span>
                                    <span className="text-ink text-xs">{approvingTransaction.balance.user.email}</span>
                                </div>
                            </div>

                            <div className="bg-surface border border-line rounded-lg px-4 py-3 text-xs text-muted mt-4">
                                El cliente recibirá una notificación de aprobación automáticamente.
                            </div>
                        </div>

                        <div className={adminModalFooter}>
                            <button
                                onClick={() => { setShowApproveModal(false); setApprovingTransaction(null); }}
                                className={adminSecondaryButton}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processingId === approvingTransaction.id}
                                className={adminSuccessButton}
                            >
                                {processingId === approvingTransaction.id
                                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <IconoCheck className="w-4 h-4" />}
                                Aprobar Recarga
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Rejection Modal ── */}
            {showRejectModal && rejectingTransaction && typeof document !== 'undefined' && createPortal(
                <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowRejectModal(false); }}>
                    <div className={`${adminModalPanel} sm:max-w-lg max-h-[90vh]`}>
                        {/* Header */}
                        <div className={adminModalHeader}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-deal-bg flex items-center justify-center">
                                    <IconoCerrar className="w-5 h-5 text-deal" />
                                </div>
                                <div>
                                    <h2 className={adminModalTitle}>Rechazar Transacción</h2>
                                    <p className="text-xs text-muted">
                                        {fmtAmount(Number(rejectingTransaction.amount))} · {rejectingTransaction.balance.user.name || rejectingTransaction.balance.user.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={adminModalBody}>
                            <div>
                                <label className={adminLabel}>
                                    Motivo del Rechazo *
                                </label>
                                <div className="space-y-2">
                                    {REJECTION_REASONS.map(reason => (
                                        <label
                                            key={reason.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedReason === reason.id ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-brand-500/30 hover:bg-surface'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="rejectionReason"
                                                value={reason.id}
                                                checked={selectedReason === reason.id}
                                                onChange={e => setSelectedReason(e.target.value)}
                                                className="mt-0.5 w-4 h-4 accent-brand-500"
                                            />
                                            <div>
                                                <span className="text-sm font-semibold text-ink">{reason.label}</span>
                                                {reason.description && (
                                                    <p className="text-xs text-muted mt-0.5">{reason.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {selectedReason === 'custom' && (
                                <div className="mt-4">
                                    <textarea
                                        value={customReason}
                                        onChange={e => setCustomReason(e.target.value)}
                                        placeholder="Escribe el motivo del rechazo..."
                                        rows={3}
                                        className={`${adminInput()} h-auto py-2.5 resize-none`}
                                    />
                                </div>
                            )}

                            <div className="mt-4 bg-surface border border-line rounded-lg px-4 py-3 text-xs text-ink-soft">
                                <strong>Nota:</strong> El cliente recibirá una notificación con el motivo del rechazo.
                            </div>
                        </div>

                        <div className={adminModalFooter}>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className={adminSecondaryButton}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === rejectingTransaction.id || !selectedReason}
                                className={adminDangerButton}
                            >
                                {processingId === rejectingTransaction.id
                                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <IconoCerrar className="w-4 h-4" />}
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
