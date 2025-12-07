'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { FiDownload, FiCheck, FiX, FiFilter, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

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

// Predefined rejection reasons
const REJECTION_REASONS = [
    { id: 'ref_invalid', label: 'Número de referencia inválido', description: 'El número de referencia proporcionado no coincide con ninguna transacción bancaria.' },
    { id: 'amount_mismatch', label: 'Monto incorrecto', description: 'El monto transferido no coincide con el monto declarado en la solicitud.' },
    { id: 'payment_not_found', label: 'Pago no encontrado', description: 'No se encontró el pago en nuestras cuentas bancarias.' },
    { id: 'duplicate', label: 'Transacción duplicada', description: 'Esta referencia ya fue utilizada en otra solicitud de recarga.' },
    { id: 'suspicious', label: 'Actividad sospechosa', description: 'La transacción ha sido marcada para revisión por actividad sospechosa.' },
    { id: 'expired', label: 'Comprobante vencido', description: 'El comprobante de pago supera el tiempo máximo permitido.' },
    { id: 'custom', label: 'Motivo personalizado', description: '' },
];

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [successAnimations, setSuccessAnimations] = useState<{ [key: string]: 'approve' | 'reject' | null }>({});

    // Rejection modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingTransaction, setRejectingTransaction] = useState<Transaction | null>(null);
    const [selectedReason, setSelectedReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/transactions?status=${filterStatus}`);
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Error al cargar transacciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [filterStatus]);

    const handleApprove = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas APROBAR esta transacción?')) {
            return;
        }

        try {
            setProcessingId(id);

            const response = await fetch('/api/admin/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'COMPLETED' }),
            });

            if (response.ok) {
                setSuccessAnimations(prev => ({ ...prev, [id]: 'approve' }));
                toast.success('Transacción aprobada exitosamente');

                setTimeout(() => {
                    setSuccessAnimations(prev => ({ ...prev, [id]: null }));
                    fetchTransactions();
                }, 1500);
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al aprobar transacción');
            }
        } catch (error) {
            console.error('Error approving transaction:', error);
            toast.error('Error al aprobar transacción');
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (transaction: Transaction) => {
        setRejectingTransaction(transaction);
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

        try {
            setProcessingId(rejectingTransaction.id);

            const response = await fetch('/api/admin/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: rejectingTransaction.id,
                    status: 'CANCELLED',
                    rejectionReason: reason,
                }),
            });

            if (response.ok) {
                setSuccessAnimations(prev => ({ ...prev, [rejectingTransaction.id]: 'reject' }));
                toast.success('Transacción rechazada');
                setShowRejectModal(false);
                setRejectingTransaction(null);

                setTimeout(() => {
                    setSuccessAnimations(prev => ({ ...prev, [rejectingTransaction.id]: null }));
                    fetchTransactions();
                }, 1500);
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al rechazar transacción');
            }
        } catch (error) {
            console.error('Error rejecting transaction:', error);
            toast.error('Error al rechazar transacción');
        } finally {
            setProcessingId(null);
        }
    };

    // Export to JSON
    const exportToJSON = () => {
        const dataStr = JSON.stringify(transactions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transacciones_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Archivo JSON descargado');
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['ID', 'Usuario', 'Email', 'Tipo', 'Estado', 'Monto', 'Moneda', 'Descripción', 'Referencia', 'Método de Pago', 'Motivo Rechazo', 'Fecha'];
        const csvData = transactions.map(t => [
            t.id,
            t.balance.user.name || 'N/A',
            t.balance.user.email,
            t.type,
            t.status,
            t.amount,
            t.currency,
            t.description,
            t.reference || '',
            t.paymentMethod || '',
            t.rejectionReason || '',
            format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm:ss')
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const BOM = '\uFEFF';
        const dataBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transacciones_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Archivo CSV descargado');
    };

    const getStatusBadge = (status: string, rejectionReason?: string | null) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            COMPLETED: 'bg-green-100 text-green-800 border-green-200',
            FAILED: 'bg-red-100 text-red-800 border-red-200',
            CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
        };

        const labels = {
            PENDING: 'Pendiente',
            COMPLETED: 'Aprobada',
            FAILED: 'Fallida',
            CANCELLED: 'Rechazada',
        };

        return (
            <div className="flex flex-col gap-1">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.PENDING}`}>
                    {labels[status as keyof typeof labels] || status}
                </span>
                {status === 'CANCELLED' && rejectionReason && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" />
                        {rejectionReason}
                    </span>
                )}
            </div>
        );
    };

    const getTypeBadge = (type: string) => {
        const styles = {
            RECHARGE: 'bg-blue-50 text-blue-700',
            PURCHASE: 'bg-purple-50 text-purple-700',
            REFUND: 'bg-orange-50 text-orange-700',
            BONUS: 'bg-pink-50 text-pink-700',
            WITHDRAWAL: 'bg-gray-50 text-gray-700',
        };

        const labels = {
            RECHARGE: 'Recarga',
            PURCHASE: 'Compra',
            REFUND: 'Reembolso',
            BONUS: 'Bono',
            WITHDRAWAL: 'Retiro',
        };

        return (
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[type as keyof typeof styles] || styles.RECHARGE}`}>
                {labels[type as keyof typeof labels] || type}
            </span>
        );
    };

    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#212529] flex items-center gap-3">
                        Transacciones
                        {pendingCount > 0 && (
                            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold animate-pulse">
                                {pendingCount} pendientes
                            </span>
                        )}
                    </h1>
                    <p className="text-[#6a6c6b] text-sm">Gestiona las recargas y movimientos de saldo</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Filter */}
                    <div className="relative">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent appearance-none cursor-pointer"
                        >
                            <option value="all">Todos</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="COMPLETED">Aprobadas</option>
                            <option value="CANCELLED">Rechazadas</option>
                        </select>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={fetchTransactions}
                        className="p-2 bg-white border border-[#dee2e6] rounded-lg hover:bg-[#f8f9fa] transition-all hover:scale-105 active:scale-95"
                        title="Actualizar"
                    >
                        <FiRefreshCw className={`w-5 h-5 text-[#6a6c6b] ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Export Buttons */}
                    <div className="flex gap-1 bg-white border border-[#dee2e6] rounded-lg p-1">
                        <button
                            onClick={exportToJSON}
                            disabled={transactions.length === 0}
                            className="px-3 py-1.5 text-xs font-bold text-[#212529] hover:bg-[#f8f9fa] rounded transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <FiDownload className="w-3.5 h-3.5" />
                            JSON
                        </button>
                        <button
                            onClick={exportToCSV}
                            disabled={transactions.length === 0}
                            className="px-3 py-1.5 text-xs font-bold text-[#212529] hover:bg-[#f8f9fa] rounded transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <FiDownload className="w-3.5 h-3.5" />
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-[#e9ecef] shadow-sm flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2a63cd]"></div>
                            <span className="text-sm text-[#6a6c6b]">Cargando transacciones...</span>
                        </div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#6a6c6b]">
                        <svg className="w-16 h-16 mb-4 text-[#dee2e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium">No hay transacciones encontradas</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden overflow-auto">
                            {transactions.map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className={`bg-white rounded-xl border border-[#e9ecef] p-4 shadow-sm transition-all duration-500 ${successAnimations[transaction.id] === 'approve'
                                        ? 'bg-green-50 border-green-300 scale-[0.98]'
                                        : successAnimations[transaction.id] === 'reject'
                                            ? 'bg-red-50 border-red-300 scale-[0.98] opacity-50'
                                            : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            {getTypeBadge(transaction.type)}
                                            <span className="text-xs text-[#6a6c6b]">
                                                {format(new Date(transaction.createdAt), 'dd MMM', { locale: es })}
                                            </span>
                                        </div>
                                        {getStatusBadge(transaction.status, transaction.rejectionReason)}
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-[#212529]">{transaction.balance.user.name || 'Usuario'}</p>
                                            <p className="text-xs text-[#6a6c6b]">{transaction.balance.user.email}</p>
                                        </div>

                                        <div className="bg-[#f8f9fa] p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-[#6a6c6b]">Monto</span>
                                                <span className={`text-sm font-bold ${transaction.type === 'RECHARGE' || transaction.type === 'BONUS' || transaction.type === 'REFUND'
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                    }`}>
                                                    {transaction.type === 'RECHARGE' || transaction.type === 'BONUS' || transaction.type === 'REFUND' ? '+' : '-'}
                                                    ${Number(transaction.amount).toFixed(2).replace('.', ',')}
                                                </span>
                                            </div>
                                            {transaction.reference && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-[#6a6c6b]">Referencia</span>
                                                    <span className="text-xs font-mono text-[#212529]">{transaction.reference}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {transaction.status === 'PENDING' && transaction.type === 'RECHARGE' && (
                                        <div className="flex gap-2 pt-3 border-t border-[#e9ecef]">
                                            <button
                                                onClick={() => handleApprove(transaction.id)}
                                                disabled={processingId === transaction.id}
                                                className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {processingId === transaction.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                ) : (
                                                    <FiCheck className="w-4 h-4" />
                                                )}
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(transaction)}
                                                disabled={processingId === transaction.id}
                                                className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <FiX className="w-4 h-4" />
                                                Rechazar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-auto flex-1">
                            <table className="w-full">
                                <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Tipo / Descripción</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Referencia</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e9ecef]">
                                    {transactions.map((transaction) => (
                                        <tr
                                            key={transaction.id}
                                            className={`transition-all duration-500 ${successAnimations[transaction.id] === 'approve'
                                                ? 'bg-green-100'
                                                : successAnimations[transaction.id] === 'reject'
                                                    ? 'bg-red-100 opacity-50'
                                                    : 'hover:bg-[#f8f9fa]'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-[#212529]">{transaction.balance.user.name || 'Usuario'}</span>
                                                    <span className="text-xs text-[#6a6c6b]">{transaction.balance.user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {getTypeBadge(transaction.type)}
                                                    </div>
                                                    <span className="text-sm text-[#6a6c6b]">{transaction.description}</span>
                                                    {transaction.paymentMethod && (
                                                        <span className="text-xs text-[#868e96] bg-[#f1f3f5] px-2 py-0.5 rounded w-fit">
                                                            {transaction.paymentMethod}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm font-bold ${transaction.type === 'RECHARGE' || transaction.type === 'BONUS' || transaction.type === 'REFUND'
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                    }`}>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`text-xs font-bold opacity-60 ${transaction.type === 'RECHARGE' || transaction.type === 'BONUS' || transaction.type === 'REFUND'
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                            }`}>USD</span>
                                                        <span className="text-sm font-bold">
                                                            {transaction.type === 'RECHARGE' || transaction.type === 'BONUS' || transaction.type === 'REFUND' ? '+' : '-'}
                                                            {Number(transaction.amount).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono text-[#6a6c6b]">
                                                    {transaction.reference || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(transaction.status, transaction.rejectionReason)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-[#6a6c6b]">
                                                    {format(new Date(transaction.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {transaction.status === 'PENDING' && transaction.type === 'RECHARGE' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleApprove(transaction.id)}
                                                            disabled={processingId === transaction.id}
                                                            className="group relative p-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                                                            title="Aprobar Recarga"
                                                        >
                                                            {processingId === transaction.id ? (
                                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                            ) : (
                                                                <FiCheck className="w-5 h-5" />
                                                            )}
                                                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                Aprobar
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={() => openRejectModal(transaction)}
                                                            disabled={processingId === transaction.id}
                                                            className="group relative p-2 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/30 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                                                            title="Rechazar Recarga"
                                                        >
                                                            <FiX className="w-5 h-5" />
                                                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                Rechazar
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Success animation */}
                                                {successAnimations[transaction.id] && (
                                                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold animate-pulse ${successAnimations[transaction.id] === 'approve'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {successAnimations[transaction.id] === 'approve' ? (
                                                            <><FiCheck className="w-4 h-4" /> Aprobada</>
                                                        ) : (
                                                            <><FiX className="w-4 h-4" /> Rechazada</>
                                                        )}
                                                    </div>
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

            {/* Rejection Modal - Using Portal */}
            {showRejectModal && rejectingTransaction && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[550px] max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">
                        {/* Header - Fixed */}
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-4 rounded-t-2xl flex-shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FiX className="w-5 h-5" />
                                Rechazar Transacción
                            </h2>
                            <p className="text-sm text-white/80">
                                ${Number(rejectingTransaction.amount).toFixed(2)} - {rejectingTransaction.balance.user.name || rejectingTransaction.balance.user.email}
                            </p>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-[#212529] mb-2 uppercase tracking-wider">
                                    Motivo del Rechazo *
                                </label>
                                <div className="space-y-2">
                                    {REJECTION_REASONS.map((reason) => (
                                        <label
                                            key={reason.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${selectedReason === reason.id
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-[#e9ecef] hover:border-red-200'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="rejectionReason"
                                                value={reason.id}
                                                checked={selectedReason === reason.id}
                                                onChange={(e) => setSelectedReason(e.target.value)}
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
                                <div>
                                    <label className="block text-xs font-bold text-[#212529] mb-2 uppercase tracking-wider">
                                        Motivo Personalizado *
                                    </label>
                                    <textarea
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        placeholder="Escribe el motivo del rechazo..."
                                        rows={3}
                                        className="w-full px-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                    />
                                </div>
                            )}

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                <strong>Nota:</strong> El cliente recibirá una notificación con el motivo del rechazo.
                                Asegúrate de proporcionar una razón clara y profesional.
                            </div>
                        </div>

                        {/* Footer - Fixed */}
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
                                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processingId === rejectingTransaction.id ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiX className="w-5 h-5" />
                                )}
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style jsx>{`
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}
