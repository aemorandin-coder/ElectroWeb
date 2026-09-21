'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
    FiDownload, FiCheck, FiX, FiFilter, FiRefreshCw,
    FiAlertCircle, FiSearch, FiDollarSign, FiClock,
    FiCheckCircle, FiTrendingUp, FiSmartphone,
    FiCreditCard, FiGlobe, FiArrowUpCircle, FiArrowDownCircle,
    FiRepeat, FiGift, FiPackage,
} from 'react-icons/fi';
import { SiBinance } from 'react-icons/si';
import { formatPaymentMethod, isCreditTransaction } from '@/lib/format-helpers';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import {
    adminPageTitle,
    adminPageSubtitle,
    adminNotice,
    adminPageHeader,
        adminStatCard,
    adminStatLabel,
    adminStatValue,
    adminIconChip,
      adminSecondaryButton,
    adminDangerButton,
    adminSuccessButton,
      adminModalOverlay,
    adminModalPanel,
    adminModalHeader,
    adminModalTitle,
    adminModalBody,
    adminModalFooter,
    adminTableWrap,
    adminTh,
    adminTd,
      adminInput,
    adminLabel,
    adminBadge,
    } from '@/lib/admin-ui';


// ─── Payment method icons (react-icons, no emojis) ──────────────────────────

function PaymentIcon({ method, className = 'w-3.5 h-3.5' }: { method: string | null | undefined; className?: string }) {
    switch (method) {
        case 'MOBILE_PAYMENT':   return <FiSmartphone className={className} />;
        case 'BANK_TRANSFER':    return <FiDollarSign className={className} />;
        case 'ZELLE':            return <FiGlobe className={className} />;
        case 'ZINLI':            return <FiGlobe className={className} />;
        case 'PAYPAL':           return <FiGlobe className={className} />;
        case 'CRYPTO':           return <SiBinance className={className} />;
        case 'CASH':             return <FiDollarSign className={className} />;
        case 'CREDIT_CARD':      return <FiCreditCard className={className} />;
        case 'BALANCE':          return <FiArrowUpCircle className={className} />;
        case 'MERCANTIL_PANAMA': return <FiGlobe className={className} />;
        default:                 return <FiDollarSign className={className} />;
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
    RECHARGE:   { label: 'Recarga',    cls: adminBadge('success'), icon: <FiArrowUpCircle   className="w-3 h-3" /> },
    DEPOSIT:    { label: 'Abono',      cls: adminBadge('success'), icon: <FiArrowUpCircle   className="w-3 h-3" /> },
    PURCHASE:   { label: 'Compra',     cls: adminBadge('brand'),   icon: <FiPackage         className="w-3 h-3" /> },
    REFUND:     { label: 'Reembolso',  cls: adminBadge('warning'), icon: <FiRepeat          className="w-3 h-3" /> },
    BONUS:      { label: 'Bono',       cls: adminBadge('success'), icon: <FiGift            className="w-3 h-3" /> },
    WITHDRAWAL: { label: 'Retiro',     cls: adminBadge('neutral'), icon: <FiArrowDownCircle className="w-3 h-3" /> },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
    PENDING:   { label: 'Pendiente', dot: 'bg-warning-strong', cls: adminBadge('warning') },
    COMPLETED: { label: 'Aprobada',  dot: 'bg-success-strong', cls: adminBadge('success') },
    FAILED:    { label: 'Fallida',   dot: 'bg-deal',           cls: adminBadge('danger')  },
    CANCELLED: { label: 'Rechazada', dot: 'bg-deal',           cls: adminBadge('danger')  },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
    icon, label, value, sub, accent = false
}: {
    icon: React.ReactNode; label: string; value: string | number;
    sub: React.ReactNode; accent?: boolean;
}) {
    return (
        <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
            <span className={`${adminIconChip(accent ? 'warning' : 'brand')} hidden xl:flex`}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className={adminStatLabel}>{label}</p>
                <p className={`${adminStatValue} text-lg tabular-nums`}>{value}</p>
                <div className="text-xs mt-1 text-muted">{sub}</div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
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
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/transactions?status=${filterStatus}&type=${filterType}`);
            if (res.ok) setTransactions(await res.json());
        } catch {
            toast.error('Error al cargar transacciones');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterType]);

    useEffect(() => {
        fetchTransactions();
        fetchStats();
    }, [fetchTransactions, fetchStats]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchStats();
            if (filterStatus === 'PENDING' || filterStatus === 'all') fetchTransactions();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchStats, fetchTransactions, filterStatus]);

    const displayed = useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter(t =>
            (t.balance.user.name || '').toLowerCase().includes(q) ||
            t.balance.user.email.toLowerCase().includes(q) ||
            (t.reference || '').toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q)
        );
    }, [transactions, searchQuery]);

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
        const csvData = displayed.map(t => [
            t.id, t.balance.user.name || 'N/A', t.balance.user.email,
            TYPE_CONFIG[t.type]?.label || t.type, STATUS_CONFIG[t.status]?.label || t.status,
            Number(t.amount).toFixed(2), t.description,
            t.reference || '', formatPaymentMethod(t.paymentMethod),
            t.rejectionReason || '',
            format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        ]);
        const BOM = '\uFEFF';
        const content = [headers, ...csvData].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `transacciones_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV descargado');
    };

    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const fmtAmount = (n: number) => formatUSD(Number(n));

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-0 flex-col gap-4">

            {/* ── Header ── */}
            <div className={adminPageHeader}>
                <div>
                    <h1 className={adminPageTitle}>
                        Transacciones

                    </h1>
                    <p className={adminPageSubtitle}>Recargas y movimientos de saldo · máx. 200 registros</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { fetchTransactions(); fetchStats(); }}
                        className={`${adminSecondaryButton} px-3`}
                        aria-label="Actualizar transacciones"
                        title="Actualizar"
                    >
                        <FiRefreshCw className={`w-4 h-4 text-muted ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={displayed.length === 0}
                        className={adminSecondaryButton}
                    >
                        <FiDownload className="w-3.5 h-3.5" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {pendingCount > 0 && (
                <button type="button" onClick={() => setFilterStatus('PENDING')} className={`${adminNotice('warning')} flex min-h-11 w-full items-center justify-between gap-3 text-left`}>
                    <span><strong>{pendingCount}</strong> {pendingCount === 1 ? 'transacción pendiente' : 'transacciones pendientes'} en esta lista</span>
                    <span className="shrink-0 font-semibold">Revisar</span>
                </button>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                    <input
                        type="text"
                        aria-label="Buscar por nombre, correo o referencia"
                        placeholder="Nombre, correo o referencia"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`${adminInput()} pl-9 pr-11`}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" title="Limpiar búsqueda" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted">
                            <FiX className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Type */}
                <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
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
                        <option value="WITHDRAWAL">Retiros</option>
                    </select>
                </div>

                {/* Status */}
                <select
                    aria-label="Estado de transacción"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className={`${adminInput()} w-auto`}
                >
                    <option value="all">Todos los estados</option>
                    <option value="PENDING">Pendientes</option>
                    <option value="COMPLETED">Aprobadas</option>
                    <option value="CANCELLED">Rechazadas</option>
                </select>

                {searchQuery && (
                    <div className="px-3 py-2 bg-surface border border-line rounded-lg text-xs text-muted font-medium">
                        {displayed.length} / {transactions.length}
                    </div>
                )}
            </div>

            {/* ── Stats ── */}
            {stats && (
                <div className="order-3 flex gap-3 overflow-x-auto pb-1 lg:order-none xl:grid xl:grid-cols-4">
                    <StatCard
                        icon={<FiClock className="w-5 h-5" />}
                        label="Pendientes"
                        value={stats.pendingCount}
                        sub={<span className={stats.pendingCount > 0 ? 'text-warning-strong font-semibold' : 'text-muted'}>
                            {fmtAmount(stats.pendingAmount)} por aprobar
                        </span>}
                        accent={stats.pendingCount > 0}
                    />
                    <StatCard
                        icon={<FiCheckCircle className="w-5 h-5 text-success-strong" />}
                        label="Aprobadas hoy"
                        value={stats.completedTodayCount}
                        sub={<span className="text-success-strong font-semibold">+{fmtAmount(stats.completedTodayAmount)}</span>}
                    />
                    <StatCard
                        icon={<FiTrendingUp className="w-5 h-5 text-brand-500" />}
                        label="Esta semana"
                        value={stats.weekCount}
                        sub={<span className="text-brand-500 font-semibold">{fmtAmount(stats.weekAmount)}</span>}
                    />
                    <StatCard
                        icon={<FiX className="w-5 h-5 text-deal" />}
                        label="Rechazadas hoy"
                        value={stats.cancelledTodayCount}
                        sub={<span className="text-muted">En el día</span>}
                    />
                </div>
            )}

            {/* ── Content ── */}
            <div className="order-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm lg:order-none">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-9 w-9 border-2 border-line border-t-brand-500" />
                            <span className="text-sm text-muted">Cargando transacciones...</span>
                        </div>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted gap-3 py-16">
                        <div className="w-14 h-14 rounded-2xl bg-surface border border-line flex items-center justify-center">
                            <FiDollarSign className="w-6 h-6 text-line-strong" />
                        </div>
                        <p className="text-sm font-medium">
                            {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay transacciones'}
                        </p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-xs text-brand-500 hover:underline font-medium">
                                Limpiar búsqueda
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="divide-y divide-line xl:hidden">
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
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${typeConf.cls}`}>
                                                    {typeConf.icon}{typeConf.label}
                                                </span>
                                                <span className="text-xs text-muted">
                                                    {format(new Date(t.createdAt), 'dd MMM · HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConf.cls}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                                                {statusConf.label}
                                            </span>
                                        </div>

                                        {/* User */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-7 h-7 rounded-full bg-surface border border-line flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-brand-500">
                                                    {(t.balance.user.name || t.balance.user.email)[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-ink truncate">{t.balance.user.name || 'Usuario'}</p>
                                                <p className="text-xs text-muted truncate">{t.balance.user.email}</p>
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
                                                    <p className="text-xs text-muted flex items-center gap-1">
                                                        <PaymentIcon method={t.paymentMethod} className="w-3 h-3" />
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
                                            <div className="flex items-start gap-1.5 text-xs text-deal mb-3">
                                                <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                <span>{t.rejectionReason}</span>
                                            </div>
                                        )}

                                        {t.status === 'PENDING' && t.type === 'RECHARGE' && (
                                            <div className="flex gap-2 pt-3 border-t border-line">
                                                <button
                                                    onClick={() => openApproveModal(t)}
                                                    disabled={processingId === t.id}
                                                    className={`${adminSuccessButton} flex-1 px-3`}
                                                >
                                                    {processingId === t.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
                                                    Aprobar
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(t)}
                                                    disabled={processingId === t.id}
                                                    className={`${adminSecondaryButton} flex-1 px-3 text-deal`}
                                                >
                                                    <FiX className="w-3.5 h-3.5" />
                                                    Rechazar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop table */}
                        <div className={`${adminTableWrap} hidden xl:block`}>
                            <table className="w-full text-sm">
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
                                <tbody className="divide-y divide-line">
                                    {[...displayed].sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING')).map(t => {
                                        const typeConf = TYPE_CONFIG[t.type] || TYPE_CONFIG.RECHARGE;
                                        const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                                        const isCredit = isCreditTransaction(t.type);
                                        const anim = successAnimations[t.id];
                                        return (
                                            <tr
                                                key={t.id}
                                                className={`transition-all duration-500 ${anim === 'approve' ? 'bg-success-strong/10' : anim === 'reject' ? 'bg-deal-bg opacity-40' : 'hover:bg-surface'}`}
                                            >
                                                {/* Usuario */}
                                                <td className={adminTd}>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-brand-500">
                                                                {(t.balance.user.name || t.balance.user.email)[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-ink truncate max-w-[140px] text-sm">
                                                                {t.balance.user.name || 'Usuario'}
                                                            </p>
                                                            <p className="text-xs text-muted truncate max-w-[140px]">{t.balance.user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tipo + método */}
                                                <td className={adminTd}>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${typeConf.cls}`}>
                                                        {typeConf.icon}{typeConf.label}
                                                    </span>
                                                    {t.paymentMethod && (
                                                        <p className="text-xs text-muted mt-1 flex items-center gap-1">
                                                            <PaymentIcon method={t.paymentMethod} className="w-3 h-3 flex-shrink-0" />
                                                            {formatPaymentMethod(t.paymentMethod)}
                                                        </p>
                                                    )}
                                                    {t.description && (
                                                        <p className="text-xs text-muted mt-0.5 max-w-[200px] [overflow-wrap:anywhere]">{t.description}</p>
                                                    )}
                                                </td>

                                                {/* Monto */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`text-sm font-bold ${isCredit ? 'text-success-strong' : 'text-deal'}`}>
                                                        {isCredit ? '+' : '-'}{fmtAmount(Number(t.amount))}
                                                    </span>
                                                    <p className="text-xs text-subtle font-medium">USD</p>
                                                </td>

                                                {/* Referencia */}
                                                <td className={adminTd}>
                                                    {t.reference ? (
                                                        <span className="font-mono text-xs bg-surface border border-line px-2 py-1 rounded-md text-ink tracking-wide">
                                                            {t.reference}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-line-strong">—</span>
                                                    )}
                                                </td>

                                                {/* Estado */}
                                                <td className={adminTd}>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConf.cls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusConf.dot}`} />
                                                        {statusConf.label}
                                                    </span>
                                                    {t.status === 'CANCELLED' && t.rejectionReason && (
                                                        <p className="text-xs text-deal flex items-center gap-1 mt-1">
                                                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate max-w-[120px]">{t.rejectionReason}</span>
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Fecha */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
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
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${anim === 'approve' ? 'bg-success-strong/15 text-success-strong' : 'bg-deal-bg text-deal'}`}>
                                                                {anim === 'approve' ? <><FiCheck className="w-3.5 h-3.5" /> Aprobada</> : <><FiX className="w-3.5 h-3.5" /> Rechazada</>}
                                                            </span>
                                                        ) : (
                                                            <div className="flex justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => openApproveModal(t)}
                                                                    disabled={processingId === t.id}
                                                                    className={`${adminSuccessButton} w-11 px-0`}
                                                                    aria-label="Aprobar recarga"
                                                                    title="Aprobar recarga"
                                                                >
                                                                    {processingId === t.id
                                                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                        : <FiCheck className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => openRejectModal(t)}
                                                                    disabled={processingId === t.id}
                                                                    className={`${adminSecondaryButton} w-11 px-0 text-deal`}
                                                                    aria-label="Rechazar recarga"
                                                                    title="Rechazar recarga"
                                                                >
                                                                    <FiX className="w-4 h-4" />
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
            </div>

            {/* ── Approval Modal ── */}
            {showApproveModal && approvingTransaction && typeof document !== 'undefined' && createPortal(
                <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowApproveModal(false); setApprovingTransaction(null); } }}>
                    <div className={`${adminModalPanel} sm:max-w-md`}>
                        {/* Header */}
                        <div className={adminModalHeader}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-success-strong/15 flex items-center justify-center">
                                    <FiCheck className="w-5 h-5 text-success-strong" />
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
                                <p className="text-xs text-success-strong mt-1">USD · se acreditará al saldo del cliente</p>
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
                                    : <FiCheck className="w-4 h-4" />}
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
                                    <FiX className="w-5 h-5 text-deal" />
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

                            <div className="mt-4 bg-warning/15 border border-warning/30 rounded-lg px-4 py-3 text-xs text-warning-strong">
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
                                    : <FiX className="w-4 h-4" />}
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
