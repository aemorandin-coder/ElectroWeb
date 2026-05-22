'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
    FiDownload, FiCheck, FiX, FiFilter, FiRefreshCw,
    FiAlertCircle, FiSearch, FiDollarSign, FiClock,
    FiCheckCircle, FiTrendingUp, FiUser, FiSmartphone,
    FiCreditCard, FiGlobe, FiArrowUpCircle, FiArrowDownCircle,
    FiRepeat, FiGift, FiPackage,
} from 'react-icons/fi';
import { SiBinance } from 'react-icons/si';
import { formatPaymentMethod } from '@/lib/format-helpers';

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
    RECHARGE:   { label: 'Recarga',    cls: 'bg-blue-50 text-blue-700 border-blue-200',    icon: <FiArrowUpCircle   className="w-3 h-3" /> },
    PURCHASE:   { label: 'Compra',     cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: <FiPackage         className="w-3 h-3" /> },
    REFUND:     { label: 'Reembolso',  cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: <FiRepeat          className="w-3 h-3" /> },
    BONUS:      { label: 'Bono',       cls: 'bg-pink-50 text-pink-700 border-pink-200',    icon: <FiGift            className="w-3 h-3" /> },
    WITHDRAWAL: { label: 'Retiro',     cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: <FiArrowDownCircle className="w-3 h-3" /> },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
    PENDING:   { label: 'Pendiente', dot: 'bg-amber-500',  cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
    COMPLETED: { label: 'Aprobada',  dot: 'bg-emerald-500',cls: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
    FAILED:    { label: 'Fallida',   dot: 'bg-rose-500',   cls: 'bg-rose-50   text-rose-700   border-rose-200'   },
    CANCELLED: { label: 'Rechazada', dot: 'bg-slate-400',  cls: 'bg-slate-50  text-slate-600  border-slate-200'  },
};

const IS_CREDIT = (type: string) => ['RECHARGE', 'BONUS', 'REFUND'].includes(type);

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
    icon, label, value, sub, accent = false
}: {
    icon: React.ReactNode; label: string; value: string | number;
    sub: React.ReactNode; accent?: boolean;
}) {
    return (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${accent ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e9ecef]'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? 'bg-amber-100 text-amber-600' : 'bg-[#f8f9fa] text-[#6a6c6b]'}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[#6a6c6b] uppercase tracking-widest mb-0.5">{label}</p>
                <p className={`text-2xl font-black leading-none ${accent ? 'text-amber-700' : 'text-[#212529]'}`}>{value}</p>
                <div className="text-xs mt-1">{sub}</div>
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

    const fmtAmount = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2 });

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="h-full flex flex-col gap-5">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[#212529] flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#2a63cd] flex items-center justify-center shadow-sm flex-shrink-0">
                            <FiDollarSign className="w-4 h-4 text-white" />
                        </span>
                        Transacciones
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold animate-pulse">
                                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </h1>
                    <p className="text-[#6a6c6b] text-xs mt-1 ml-10.5">Recargas y movimientos de saldo · máx. 200 registros</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { fetchTransactions(); fetchStats(); }}
                        className="p-2 bg-white border border-[#dee2e6] rounded-lg hover:bg-[#f8f9fa] transition-all"
                        title="Actualizar"
                    >
                        <FiRefreshCw className={`w-4 h-4 text-[#6a6c6b] ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={displayed.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#dee2e6] rounded-lg text-xs font-semibold text-[#212529] hover:bg-[#f8f9fa] transition-all disabled:opacity-40"
                    >
                        <FiDownload className="w-3.5 h-3.5" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        icon={<FiClock className="w-5 h-5" />}
                        label="Pendientes"
                        value={stats.pendingCount}
                        sub={<span className={stats.pendingCount > 0 ? 'text-amber-600 font-semibold' : 'text-[#6a6c6b]'}>
                            ${fmtAmount(stats.pendingAmount)} por aprobar
                        </span>}
                        accent={stats.pendingCount > 0}
                    />
                    <StatCard
                        icon={<FiCheckCircle className="w-5 h-5 text-emerald-600" />}
                        label="Aprobadas hoy"
                        value={stats.completedTodayCount}
                        sub={<span className="text-emerald-600 font-semibold">+${fmtAmount(stats.completedTodayAmount)}</span>}
                    />
                    <StatCard
                        icon={<FiTrendingUp className="w-5 h-5 text-[#2a63cd]" />}
                        label="Esta semana"
                        value={stats.weekCount}
                        sub={<span className="text-[#2a63cd] font-semibold">${fmtAmount(stats.weekAmount)}</span>}
                    />
                    <StatCard
                        icon={<FiX className="w-5 h-5 text-rose-500" />}
                        label="Rechazadas hoy"
                        value={stats.cancelledTodayCount}
                        sub={<span className="text-[#6a6c6b]">transacciones canceladas</span>}
                    />
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o referencia..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] transition-colors"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#adb5bd] hover:text-[#212529]">
                            <FiX className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Type */}
                <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd] pointer-events-none" />
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] appearance-none cursor-pointer text-[#212529]"
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
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] appearance-none cursor-pointer text-[#212529]"
                >
                    <option value="all">Todos los estados</option>
                    <option value="PENDING">Pendientes</option>
                    <option value="COMPLETED">Aprobadas</option>
                    <option value="CANCELLED">Rechazadas</option>
                </select>

                {searchQuery && (
                    <div className="px-3 py-2 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg text-xs text-[#6a6c6b] font-medium">
                        {displayed.length} / {transactions.length}
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-[#e9ecef] shadow-sm flex flex-col min-h-0">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[#e9ecef] border-t-[#2a63cd]" />
                            <span className="text-sm text-[#6a6c6b]">Cargando transacciones...</span>
                        </div>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#6a6c6b] gap-3 py-16">
                        <div className="w-14 h-14 rounded-2xl bg-[#f8f9fa] border border-[#e9ecef] flex items-center justify-center">
                            <FiDollarSign className="w-6 h-6 text-[#dee2e6]" />
                        </div>
                        <p className="text-sm font-medium">
                            {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay transacciones'}
                        </p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-xs text-[#2a63cd] hover:underline font-medium">
                                Limpiar búsqueda
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-[#f1f3f5] overflow-auto">
                            {displayed.map(t => {
                                const typeConf = TYPE_CONFIG[t.type] || TYPE_CONFIG.RECHARGE;
                                const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                                const isCredit = IS_CREDIT(t.type);
                                const anim = successAnimations[t.id];
                                return (
                                    <div
                                        key={t.id}
                                        className={`p-4 transition-all duration-500 ${anim === 'approve' ? 'bg-emerald-50' : anim === 'reject' ? 'bg-rose-50 opacity-50' : ''}`}
                                    >
                                        {/* Top row */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${typeConf.cls}`}>
                                                    {typeConf.icon}{typeConf.label}
                                                </span>
                                                <span className="text-[10px] text-[#6a6c6b]">
                                                    {format(new Date(t.createdAt), 'dd MMM · HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusConf.cls}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                                                {statusConf.label}
                                            </span>
                                        </div>

                                        {/* User */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-7 h-7 rounded-full bg-[#f8f9fa] border border-[#e9ecef] flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-[#2a63cd]">
                                                    {(t.balance.user.name || t.balance.user.email)[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[#212529] truncate">{t.balance.user.name || 'Usuario'}</p>
                                                <p className="text-[10px] text-[#6a6c6b] truncate">{t.balance.user.email}</p>
                                            </div>
                                        </div>

                                        {/* Amount + meta */}
                                        <div className="bg-[#f8f9fa] rounded-lg px-3 py-2.5 flex justify-between items-center mb-3">
                                            <div className="space-y-0.5">
                                                {t.reference && (
                                                    <p className="text-[10px] text-[#6a6c6b]">
                                                        Ref: <span className="font-mono text-[#212529]">{t.reference}</span>
                                                    </p>
                                                )}
                                                {t.paymentMethod && (
                                                    <p className="text-[10px] text-[#6a6c6b] flex items-center gap-1">
                                                        <PaymentIcon method={t.paymentMethod} className="w-3 h-3" />
                                                        {formatPaymentMethod(t.paymentMethod)}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`text-lg font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isCredit ? '+' : '-'}${fmtAmount(Number(t.amount))}
                                            </span>
                                        </div>

                                        {t.status === 'CANCELLED' && t.rejectionReason && (
                                            <div className="flex items-start gap-1.5 text-xs text-rose-600 mb-3">
                                                <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                <span>{t.rejectionReason}</span>
                                            </div>
                                        )}

                                        {t.status === 'PENDING' && t.type === 'RECHARGE' && (
                                            <div className="flex gap-2 pt-3 border-t border-[#f1f3f5]">
                                                <button
                                                    onClick={() => openApproveModal(t)}
                                                    disabled={processingId === t.id}
                                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                                >
                                                    {processingId === t.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
                                                    Aprobar
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(t)}
                                                    disabled={processingId === t.id}
                                                    className="flex-1 py-2.5 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
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
                        <div className="hidden md:block overflow-auto flex-1">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#f1f3f5] bg-[#f8f9fa]">
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Usuario</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Tipo</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Monto</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Referencia</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Estado</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Fecha</th>
                                        <th className="px-5 py-3 text-right text-[10px] font-bold text-[#6a6c6b] uppercase tracking-widest">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f3f5]">
                                    {displayed.map(t => {
                                        const typeConf = TYPE_CONFIG[t.type] || TYPE_CONFIG.RECHARGE;
                                        const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                                        const isCredit = IS_CREDIT(t.type);
                                        const anim = successAnimations[t.id];
                                        return (
                                            <tr
                                                key={t.id}
                                                className={`transition-all duration-500 ${anim === 'approve' ? 'bg-emerald-50' : anim === 'reject' ? 'bg-rose-50 opacity-40' : 'hover:bg-[#fafafa]'}`}
                                            >
                                                {/* Usuario */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-[#f8f9fa] border border-[#e9ecef] flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-[#2a63cd]">
                                                                {(t.balance.user.name || t.balance.user.email)[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-[#212529] truncate max-w-[140px] text-sm">
                                                                {t.balance.user.name || 'Usuario'}
                                                            </p>
                                                            <p className="text-[11px] text-[#6a6c6b] truncate max-w-[140px]">{t.balance.user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tipo + método */}
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${typeConf.cls}`}>
                                                        {typeConf.icon}{typeConf.label}
                                                    </span>
                                                    {t.paymentMethod && (
                                                        <p className="text-[11px] text-[#6a6c6b] mt-1 flex items-center gap-1">
                                                            <PaymentIcon method={t.paymentMethod} className="w-3 h-3 flex-shrink-0" />
                                                            {formatPaymentMethod(t.paymentMethod)}
                                                        </p>
                                                    )}
                                                    {t.description && (
                                                        <p className="text-[10px] text-[#adb5bd] mt-0.5 truncate max-w-[140px]">{t.description}</p>
                                                    )}
                                                </td>

                                                {/* Monto */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isCredit ? '+' : '-'}${fmtAmount(Number(t.amount))}
                                                    </span>
                                                    <p className="text-[10px] text-[#adb5bd] font-medium">USD</p>
                                                </td>

                                                {/* Referencia */}
                                                <td className="px-5 py-3.5">
                                                    {t.reference ? (
                                                        <span className="font-mono text-xs bg-[#f8f9fa] border border-[#e9ecef] px-2 py-1 rounded-md text-[#212529] tracking-wide">
                                                            {t.reference}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[#dee2e6]">—</span>
                                                    )}
                                                </td>

                                                {/* Estado */}
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConf.cls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusConf.dot}`} />
                                                        {statusConf.label}
                                                    </span>
                                                    {t.status === 'CANCELLED' && t.rejectionReason && (
                                                        <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1">
                                                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate max-w-[120px]">{t.rejectionReason}</span>
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Fecha */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-[#212529]">
                                                        {format(new Date(t.createdAt), 'dd MMM yyyy', { locale: es })}
                                                    </p>
                                                    <p className="text-[11px] text-[#6a6c6b]">
                                                        {format(new Date(t.createdAt), 'HH:mm')}
                                                    </p>
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-5 py-3.5 text-right">
                                                    {t.status === 'PENDING' && t.type === 'RECHARGE' ? (
                                                        anim ? (
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${anim === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                {anim === 'approve' ? <><FiCheck className="w-3.5 h-3.5" /> Aprobada</> : <><FiX className="w-3.5 h-3.5" /> Rechazada</>}
                                                            </span>
                                                        ) : (
                                                            <div className="flex justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => openApproveModal(t)}
                                                                    disabled={processingId === t.id}
                                                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50 active:scale-95"
                                                                    title="Aprobar recarga"
                                                                >
                                                                    {processingId === t.id
                                                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                        : <FiCheck className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => openRejectModal(t)}
                                                                    disabled={processingId === t.id}
                                                                    className="p-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-400 rounded-lg transition-all disabled:opacity-50 active:scale-95"
                                                                    title="Rechazar recarga"
                                                                >
                                                                    <FiX className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-[#dee2e6]">—</span>
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[440px] overflow-hidden border border-[#e9ecef]">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#f1f3f5]">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <FiCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#212529]">Confirmar Aprobación</h2>
                                <p className="text-xs text-[#6a6c6b]">
                                    {approvingTransaction.balance.user.name || approvingTransaction.balance.user.email}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Amount highlight */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                <p className="text-3xl font-black text-emerald-700">
                                    +${fmtAmount(Number(approvingTransaction.amount))}
                                </p>
                                <p className="text-xs text-emerald-600 mt-1">USD · se acreditará al saldo del cliente</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5 text-sm">
                                {approvingTransaction.reference && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6a6c6b]">Referencia</span>
                                        <span className="font-mono text-xs bg-[#f8f9fa] border border-[#e9ecef] px-2 py-1 rounded-md">
                                            {approvingTransaction.reference}
                                        </span>
                                    </div>
                                )}
                                {approvingTransaction.paymentMethod && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6a6c6b]">Método de pago</span>
                                        <span className="flex items-center gap-1.5 text-[#212529]">
                                            <PaymentIcon method={approvingTransaction.paymentMethod} />
                                            {formatPaymentMethod(approvingTransaction.paymentMethod)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6a6c6b]">Email</span>
                                    <span className="text-[#212529] text-xs">{approvingTransaction.balance.user.email}</span>
                                </div>
                            </div>

                            <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg px-4 py-3 text-xs text-[#6a6c6b]">
                                El cliente recibirá una notificación de aprobación automáticamente.
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => { setShowApproveModal(false); setApprovingTransaction(null); }}
                                className="flex-1 py-2.5 border border-[#dee2e6] text-[#212529] font-semibold rounded-xl hover:bg-[#f8f9fa] transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processingId === approvingTransaction.id}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[520px] max-h-[90vh] overflow-hidden flex flex-col border border-[#e9ecef]">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#f1f3f5] flex-shrink-0">
                            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                                <FiX className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#212529]">Rechazar Transacción</h2>
                                <p className="text-xs text-[#6a6c6b]">
                                    ${fmtAmount(Number(rejectingTransaction.amount))} · {rejectingTransaction.balance.user.name || rejectingTransaction.balance.user.email}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-[#212529] mb-3 uppercase tracking-widest">
                                    Motivo del Rechazo *
                                </label>
                                <div className="space-y-2">
                                    {REJECTION_REASONS.map(reason => (
                                        <label
                                            key={reason.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedReason === reason.id ? 'border-[#2a63cd] bg-blue-50' : 'border-[#e9ecef] hover:border-[#2a63cd]/30 hover:bg-[#f8f9fa]'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="rejectionReason"
                                                value={reason.id}
                                                checked={selectedReason === reason.id}
                                                onChange={e => setSelectedReason(e.target.value)}
                                                className="mt-0.5 w-4 h-4 text-[#2a63cd] focus:ring-[#2a63cd]/20 border-[#dee2e6]"
                                            />
                                            <div>
                                                <span className="text-sm font-semibold text-[#212529]">{reason.label}</span>
                                                {reason.description && (
                                                    <p className="text-xs text-[#6a6c6b] mt-0.5">{reason.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {selectedReason === 'custom' && (
                                <textarea
                                    value={customReason}
                                    onChange={e => setCustomReason(e.target.value)}
                                    placeholder="Escribe el motivo del rechazo..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-[#dee2e6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] resize-none text-sm transition-colors"
                                />
                            )}

                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                                <strong>Nota:</strong> El cliente recibirá una notificación con el motivo del rechazo.
                            </div>
                        </div>

                        <div className="px-6 pb-6 border-t border-[#f1f3f5] pt-4 flex gap-3 flex-shrink-0 bg-white">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-2.5 border border-[#dee2e6] text-[#212529] font-semibold rounded-xl hover:bg-[#f8f9fa] transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === rejectingTransaction.id || !selectedReason}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
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
