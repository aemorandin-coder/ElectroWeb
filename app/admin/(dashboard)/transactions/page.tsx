'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface Transaction {
    id: string;
    type: 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'BONUS' | 'WITHDRAWAL';
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    amount: number;
    currency: string;
    description: string;
    reference: string | null;
    paymentMethod: string | null;
    createdAt: string;
    balance: {
        user: {
            name: string | null;
            email: string;
        };
    };
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [processingId, setProcessingId] = useState<string | null>(null);

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

    const handleUpdateStatus = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
        if (!confirm(`¿Estás seguro de que deseas ${status === 'COMPLETED' ? 'APROBAR' : 'RECHAZAR'} esta transacción?`)) {
            return;
        }

        try {
            setProcessingId(id);
            const response = await fetch('/api/admin/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });

            if (response.ok) {
                toast.success(`Transacción ${status === 'COMPLETED' ? 'aprobada' : 'rechazada'} exitosamente`);
                fetchTransactions();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al actualizar transacción');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            toast.error('Error al actualizar transacción');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            COMPLETED: 'bg-green-100 text-green-800 border-green-200',
            FAILED: 'bg-red-100 text-red-800 border-red-200',
            CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
        };

        const labels = {
            PENDING: 'Pendiente',
            COMPLETED: 'Completada',
            FAILED: 'Fallida',
            CANCELLED: 'Rechazada',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.PENDING}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
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

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#212529]">Transacciones</h1>
                    <p className="text-[#6a6c6b] text-sm">Gestiona las recargas y movimientos de saldo</p>
                </div>

                <div className="flex gap-3">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="COMPLETED">Completadas</option>
                        <option value="CANCELLED">Rechazadas</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-[#e9ecef] shadow-sm flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
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
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-[#6a6c6b] py-12">
                                    <svg className="w-16 h-16 mb-4 text-[#dee2e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-lg font-medium">No hay transacciones encontradas</p>
                                </div>
                            ) : (
                                transactions.map((transaction) => (
                                    <div key={transaction.id} className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                {getTypeBadge(transaction.type)}
                                                <span className="text-xs text-[#6a6c6b]">
                                                    {format(new Date(transaction.createdAt), 'dd MMM', { locale: es })}
                                                </span>
                                            </div>
                                            {getStatusBadge(transaction.status)}
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

                                            {transaction.description && (
                                                <p className="text-xs text-[#6a6c6b] italic">{transaction.description}</p>
                                            )}
                                        </div>

                                        {transaction.status === 'PENDING' && transaction.type === 'RECHARGE' && (
                                            <div className="flex gap-2 pt-3 border-t border-[#e9ecef]">
                                                <button
                                                    onClick={() => handleUpdateStatus(transaction.id, 'COMPLETED')}
                                                    disabled={processingId === transaction.id}
                                                    className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-bold flex items-center justify-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(transaction.id, 'CANCELLED')}
                                                    disabled={processingId === transaction.id}
                                                    className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold flex items-center justify-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Rechazar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-auto">
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
                                        <tr key={transaction.id} className="hover:bg-[#f8f9fa] transition-colors">
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
                                                {getStatusBadge(transaction.status)}
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
                                                            onClick={() => handleUpdateStatus(transaction.id, 'COMPLETED')}
                                                            disabled={processingId === transaction.id}
                                                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                                                            title="Aprobar Recarga"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(transaction.id, 'CANCELLED')}
                                                            disabled={processingId === transaction.id}
                                                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                                            title="Rechazar Recarga"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
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
        </div >
    );
}
