'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
    FiDownload, FiCheck, FiX, FiFilter, FiRefreshCw,
    FiAlertCircle, FiSearch, FiDollarSign, FiClock,
    FiCheckCircle, FiTrendingUp, FiUser,
} from 'react-icons/fi';
import { formatPaymentMethod, getPaymentMethodIcon } from '@/lib/format-helpers';

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
    { id: 'ref_invalid', label: 'Número de referencia inválido', description: 'El número de referencia proporcionado no coincide con ninguna transacción bancaria.' },
    { id: 'amount_mismatch', label: 'Monto incorrecto', description: 'El monto transferido no coincide con el monto declarado en la solicitud.' },
    { id: 'payment_not_found', label: 'Pago no encontrado', description: 'No se encontró el pago en nuestras cuentas bancarias.' },
    { id: 'duplicate', label: 'Transacción duplicada', description: 'Esta referencia ya fue utilizada en otra solicitud de recarga.' },
    { id: 'suspicious', label: 'Actividad sospechosa', description: 'La transacción ha sido marcada para revisión por actividad sospechosa.' },
    { id: 'expired', label: 'Comprobante vencido', description: 'El comprobante de pago supera el tiempo máximo permitido.' },
    { id: 'custom', label: 'Motivo personalizado', description: '' },
];

const TYPE_STYLES: Record<string, string> = {
    RECHARGE: 'bg-blue-50 text-blue-700',
    PURCHASE: 'bg-purple-50 text-purple-700',
    REFUND: 'bg-orange-50 text-orange-700',
    BONUS: 'bg-pink-50 text-pink-700',
    WITHDRAWAL: 'bg-gray-50 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
    RECHARGE: 'Recarga',
    PURCHASE: 'Compra',
    REFUND: 'Reembolso',
    BONUS: 'Bono',
    WITHDRAWAL: 'Retiro',
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    COMPLETED: 'Aprobada',
    FAILED: 'Fallida',
    CANCELLED: 'Rechazada',
};

const IS_CREDIT = (type: string) => ['RECHARGE', 'BONUS', 'REFUND'].includes(type);

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [successAnimations, setSuccessAnimations] = useState<{ [key: string]: 'approve' | 'reject' | null }>({});

    // Approval modal
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approvingTransaction, setApprovingTransaction] = useState<Transaction | null>(null);

    // Rejection modal
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

    // Auto-refresh stats every 60s when there are pending transactions
    useEffect(() => {
        const interval = setInterval(() => {
            fetchStats();
            if (filterStatus === 'PENDING' || filterStatus === 'all') {
                fetchTransactions();
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchStats, fetchTransactions, filterStatus]);

    // Client-side search filter
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

    const openApproveModal = (t: Transaction) => {
        setApprovingTransaction(t);
        setShowApproveModal(true);
    };

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
                setTimeout(() => {
                    setSuccessAnimations(prev => ({ ...prev, [id]: null }));
                    fetchTransactions();
                    fetchStats();
                }, 1200);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Error al aprobar');
            }
        } catch {
            toast.error('Error al aprobar transacción');
        } finally {
            setProcessingId(null);
            setApprovingTransaction(null);
        }
    };

    const openRejectModal = (t: Transaction) => {
        setRejectingTransaction(t);
        setSelectedReason('');
        setCustomReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectingTransaction || !selectedReason) {
            toast.error('Por favor selecciona un motivo de rechazo');
            return;
        }
        const reason = selectedReason === 'custom'
            ? customReason
            : REJECTION_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
        if (selectedReason === 'custom' && !customReason.trim()) {
            toast.error('Por favor escribe el motivo personalizado');
            return;
        }
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
                setShowRejectModal(false);
                setRejectingTransaction(null);
                setTimeout(() => {
                    setSuccessAnimations(prev => ({ ...prev, [id]: null }));
                    fetchTransactions();
                    fetchStats();
                }, 1200);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Error al rechazar');
            }
        } catch {
            toast.error('Error al rechazar transacción');
        } finally {
            setProcessingId(null);
        }
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Usuario', 'Email', 'Tipo', 'Estado', 'Monto USD', 'Descripción', 'Referencia', 'Método de Pago', 'Motivo Rechazo', 'Fecha'];
        const csvData = displayed.map(t => [
            t.id, t.balance.user.name || 'N/A', t.balance.user.email,
            TYPE_LABELS[t.type] || t.type, STATUS_LABELS[t.status] || t.status,
            Number(t.amount).toFixed(2), t.description,
            t.reference || '', formatPaymentMethod(t.paymentMethod),
            t.rejectionReason || '',
            format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        ]);
        const BOM = '﻿';
        const content = [headers, ...csvData].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transacciones_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV descargado');
    };

    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[#212529] flex items-center gap-2">
                        Transacciones
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-bold animate-pulse">
                                {pendingCount} pendientes
                            </span>
                        )}
                    </h1>
                    <p className="text-[#6a6c6b] text-xs">Recargas y movimientos de saldo · máx. 200 registros</p>
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
                        CSV
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className={`rounded-xl border p-3.5 ${stats.pendingCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-[#e9ecef]'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <FiClock className={`w-4 h-4 ${stats.pendingCount > 0 ? 'text-yellow-600' : 'text-[#6a6c6b]'}`} />
                            <span className="text-[10px] font-semibold text-[#6a6c6b] uppercase tracking-wide">Pendientes</span>
                        </div>
                        <p className={`text-2xl font-black ${stats.pendingCount > 0 ? 'text-yellow-700' : 'text-[#212529]'}`}>
                            {stats.pendingCount}
                        </p>
                        <p className={`text-xs font-semibold ${stats.pendingCount > 0 ? 'text-yellow-600' : 'text-[#6a6c6b]'}`}>
                            ${stats.pendingAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} por aprobar
                        </p>
                    </div>

                    <div className="bg-white border border-[#e9ecef] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                            <FiCheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-[10px] font-semibold text-[#6a6c6b] uppercase tracking-wide">Aprobadas hoy</span>
                        </div>
                        <p className="text-2xl font-black text-[#212529]">{stats.completedTodayCount}</p>
                        <p className="text-xs text-green-600 font-semibold">
                            +${stats.completedTodayAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="bg-white border border-[#e9ecef] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                            <FiTrendingUp className="w-4 h-4 text-[#2a63cd]" />
                            <span className="text-[10px] font-semibold text-[#6a6c6b] uppercase tracking-wide">Esta semana</span>
                        </div>
                        <p className="text-2xl font-black text-[#212529]">{stats.weekCount}</p>
                        <p className="text-xs text-[#2a63cd] font-semibold">
                            ${stats.weekAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="bg-white border border-[#e9ecef] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                            <FiX className="w-4 h-4 text-red-500" />
                            <span className="text-[10px] font-semibold text-[#6a6c6b] uppercase tracking-wide">Rechazadas hoy</span>
                        </div>
                        <p className="text-2xl font-black text-[#212529]">{stats.cancelledTodayCount}</p>
                        <p className="text-xs text-[#6a6c6b]">transacciones canceladas</p>
                    </div>
                </div>
            )}

            {/* Filters row */}
            <div className="flex flex-wrap gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o referencia..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#adb5bd] hover:text-[#212529]"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Type filter */}
                <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd] appearance-none cursor-pointer text-[#212529]"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="RECHARGE">Recargas</option>
                        <option value="PURCHASE">Compras</option>
                        <option value="REFUND">Reembolsos</option>
                        <option value="BONUS">Bonos</option>
                        <option value="WITHDRAWAL">Retiros</option>
                    </select>
                </div>

                {/* Status filter */}
                <div className="relative">
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd] appearance-none cursor-pointer text-[#212529]"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="COMPLETED">Aprobadas</option>
                        <option value="CANCELLED">Rechazadas</option>
                    </select>
                </div>

                {/* Results count */}
                {searchQuery && (
                    <div className="flex items-center px-3 py-2 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg text-xs text-[#6a6c6b]">
                        {displayed.length} de {transactions.length}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-[#e9ecef] shadow-sm flex flex-col min-h-0">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2a63cd]" />
                            <span className="text-sm text-[#6a6c6b]">Cargando transacciones...</span>
                        </div>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#6a6c6b] gap-3">
                        <FiDollarSign className="w-12 h-12 text-[#dee2e6]" />
                        <p className="text-base font-medium">
                            {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay transacciones'}
                        </p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-sm text-[#2a63cd] underline">
                                Limpiar búsqueda
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="grid grid-cols-1 gap-3 p-4 md:hidden overflow-auto">
                            {displayed.map(t => (
                                <div
                                    key={t.id}
                                    className={`bg-white rounded-xl border p-4 shadow-sm transition-all duration-500 ${
                                        successAnimations[t.id] === 'approve'
                                            ? 'bg-green-50 border-green-300'
                                            : successAnimations[t.id] === 'reject'
                                              ? 'bg-red-50 border-red-300 opacity-50'
                                              : 'border-[#e9ecef]'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_STYLES[t.type] || TYPE_STYLES.RECHARGE}`}>
                                                {TYPE_LABELS[t.type] || t.type}
                                            </span>
                                            <span className="text-xs text-[#6a6c6b]">
                                                {format(new Date(t.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[t.status] || STATUS_STYLES.PENDING}`}>
                                            {STATUS_LABELS[t.status] || t.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <FiUser className="w-3.5 h-3.5 text-[#6a6c6b]" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#212529]">{t.balance.user.name || 'Usuario'}</p>
                                                <p className="text-xs text-[#6a6c6b]">{t.balance.user.email}</p>
                                            </div>
                                        </div>

                                        <div className="bg-[#f8f9fa] rounded-lg px-3 py-2 flex justify-between items-center">
                                            <span className="text-xs text-[#6a6c6b]">Monto</span>
                                            <span className={`text-sm font-bold ${IS_CREDIT(t.type) ? 'text-green-600' : 'text-red-600'}`}>
                                                {IS_CREDIT(t.type) ? '+' : '-'}${Number(t.amount).toFixed(2)}
                                            </span>
                                        </div>

                                        {t.reference && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-[#6a6c6b]">Ref.</span>
                                                <span className="text-xs font-mono bg-[#f8f9fa] px-2 py-0.5 rounded text-[#212529]">{t.reference}</span>
                                            </div>
                                        )}

                                        {t.paymentMethod && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-[#6a6c6b]">Método</span>
                                                <span className="text-xs text-[#212529]">
                                                    {getPaymentMethodIcon(t.paymentMethod)} {formatPaymentMethod(t.paymentMethod)}
                                                </span>
                                            </div>
                                        )}

                                        {t.status === 'CANCELLED' && t.rejectionReason && (
                                            <div className="flex items-start gap-1.5 text-xs text-red-600">
                                                <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                <span>{t.rejectionReason}</span>
                                            </div>
                                        )}
                                    </div>

                                    {t.status === 'PENDING' && t.type === 'RECHARGE' && (
                                        <div className="flex gap-2 pt-3 border-t border-[#e9ecef]">
                                            <button
                                                onClick={() => openApproveModal(t)}
                                                disabled={processingId === t.id}
                                                className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-all"
                                            >
                                                {processingId === t.id ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : <FiCheck className="w-4 h-4" />}
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(t)}
                                                disabled={processingId === t.id}
                                                className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-all"
                                            >
                                                <FiX className="w-4 h-4" />
                                                Rechazar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block overflow-auto flex-1">
                            <table className="w-full">
                                <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Usuario</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Tipo / Método</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Monto</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Referencia</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Estado</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Fecha</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f0f0]">
                                    {displayed.map(t => (
                                        <tr
                                            key={t.id}
                                            className={`transition-all duration-500 ${
                                                successAnimations[t.id] === 'approve'
                                                    ? 'bg-green-50'
                                                    : successAnimations[t.id] === 'reject'
                                                      ? 'bg-red-50 opacity-50'
                                                      : 'hover:bg-[#f8f9fa]'
                                            }`}
                                        >
                                            <td className="px-5 py-3.5">
                                                <p className="text-sm font-semibold text-[#212529] truncate max-w-[160px]">
                                                    {t.balance.user.name || 'Usuario'}
                                                </p>
                                                <p className="text-xs text-[#6a6c6b] truncate max-w-[160px]">{t.balance.user.email}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_STYLES[t.type] || TYPE_STYLES.RECHARGE}`}>
                                                    {TYPE_LABELS[t.type] || t.type}
                                                </span>
                                                {t.paymentMethod && (
                                                    <p className="text-xs text-[#868e96] mt-1">
                                                        {getPaymentMethodIcon(t.paymentMethod)} {formatPaymentMethod(t.paymentMethod)}
                                                    </p>
                                                )}
                                                {t.description && (
                                                    <p className="text-xs text-[#6a6c6b] mt-0.5 truncate max-w-[150px]">{t.description}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`text-sm font-bold ${IS_CREDIT(t.type) ? 'text-green-600' : 'text-red-600'}`}>
                                                    {IS_CREDIT(t.type) ? '+' : '-'}${Number(t.amount).toFixed(2)}
                                                </span>
                                                <p className="text-[10px] text-[#adb5bd]">USD</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {t.reference ? (
                                                    <span className="font-mono text-xs bg-[#f8f9fa] border border-[#e9ecef] px-2 py-1 rounded text-[#212529]">
                                                        {t.reference}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-[#adb5bd]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[t.status] || STATUS_STYLES.PENDING}`}>
                                                    {STATUS_LABELS[t.status] || t.status}
                                                </span>
                                                {t.status === 'CANCELLED' && t.rejectionReason && (
                                                    <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1">
                                                        <FiAlertCircle className="w-3 h-3" />
                                                        {t.rejectionReason}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <p className="text-xs text-[#212529]">
                                                    {format(new Date(t.createdAt), 'dd MMM yyyy', { locale: es })}
                                                </p>
                                                <p className="text-[10px] text-[#6a6c6b]">
                                                    {format(new Date(t.createdAt), 'HH:mm')}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {t.status === 'PENDING' && t.type === 'RECHARGE' ? (
                                                    successAnimations[t.id] ? (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            successAnimations[t.id] === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {successAnimations[t.id] === 'approve' ? <><FiCheck className="w-3.5 h-3.5" /> Aprobada</> : <><FiX className="w-3.5 h-3.5" /> Rechazada</>}
                                                        </span>
                                                    ) : (
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => openApproveModal(t)}
                                                                disabled={processingId === t.id}
                                                                className="group relative p-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-md hover:shadow-green-500/30 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                                                                title="Aprobar recarga"
                                                            >
                                                                {processingId === t.id ? (
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                ) : <FiCheck className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectModal(t)}
                                                                disabled={processingId === t.id}
                                                                className="group relative p-2 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-lg hover:shadow-md hover:shadow-red-500/30 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                                                                title="Rechazar recarga"
                                                            >
                                                                <FiX className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-[#adb5bd]">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Approval confirmation modal */}
            {showApproveModal && approvingTransaction && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[460px] overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FiCheck className="w-5 h-5" />
                                Confirmar Aprobación
                            </h2>
                            <p className="text-sm text-green-100">
                                {approvingTransaction.balance.user.name || approvingTransaction.balance.user.email}
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                <p className="text-3xl font-black text-green-700">
                                    +${Number(approvingTransaction.amount).toFixed(2)}
                                </p>
                                <p className="text-xs text-green-600 mt-0.5">USD · se acreditará al saldo del cliente</p>
                            </div>

                            <div className="space-y-2 text-sm">
                                {approvingTransaction.reference && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6a6c6b]">Referencia</span>
                                        <span className="font-mono text-xs bg-[#f8f9fa] border border-[#e9ecef] px-2 py-1 rounded">
                                            {approvingTransaction.reference}
                                        </span>
                                    </div>
                                )}
                                {approvingTransaction.paymentMethod && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6a6c6b]">Método de pago</span>
                                        <span className="text-[#212529]">
                                            {getPaymentMethodIcon(approvingTransaction.paymentMethod)} {formatPaymentMethod(approvingTransaction.paymentMethod)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6a6c6b]">Email</span>
                                    <span className="text-[#212529] text-xs">{approvingTransaction.balance.user.email}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                El cliente recibirá una notificación de aprobación automáticamente.
                            </div>
                        </div>

                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => { setShowApproveModal(false); setApprovingTransaction(null); }}
                                className="flex-1 py-3 border-2 border-[#e9ecef] text-[#212529] font-bold rounded-xl hover:bg-[#f8f9fa] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processingId === approvingTransaction.id}
                                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingId === approvingTransaction.id ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : <FiCheck className="w-5 h-5" />}
                                Aprobar Recarga
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Rejection modal */}
            {showRejectModal && rejectingTransaction && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-4 flex-shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FiX className="w-5 h-5" />
                                Rechazar Transacción
                            </h2>
                            <p className="text-sm text-white/80">
                                ${Number(rejectingTransaction.amount).toFixed(2)} · {rejectingTransaction.balance.user.name || rejectingTransaction.balance.user.email}
                            </p>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-[#212529] mb-2 uppercase tracking-wider">
                                    Motivo del Rechazo *
                                </label>
                                <div className="space-y-2">
                                    {REJECTION_REASONS.map(reason => (
                                        <label
                                            key={reason.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${
                                                selectedReason === reason.id ? 'border-red-500 bg-red-50' : 'border-[#e9ecef] hover:border-red-200'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="rejectionReason"
                                                value={reason.id}
                                                checked={selectedReason === reason.id}
                                                onChange={e => setSelectedReason(e.target.value)}
                                                className="mt-0.5 w-4 h-4 text-red-600 focus:ring-red-500"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-[#212529]">{reason.label}</span>
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
                                    className="w-full px-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                                />
                            )}

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                <strong>Nota:</strong> El cliente recibirá una notificación con el motivo del rechazo.
                            </div>
                        </div>

                        <div className="p-6 border-t border-[#e9ecef] bg-white flex gap-3 flex-shrink-0">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-3 border-2 border-[#e9ecef] text-[#212529] font-bold rounded-xl hover:bg-[#f8f9fa] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === rejectingTransaction.id || !selectedReason}
                                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingId === rejectingTransaction.id ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : <FiX className="w-5 h-5" />}
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
