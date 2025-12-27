'use client';

import { useState, useEffect } from 'react';
import {
    FiGift, FiPlus, FiSearch, FiFilter, FiDownload, FiEye, FiPrinter,
    FiCheck, FiX, FiAlertCircle, FiClock, FiDollarSign, FiHash, FiUser,
    FiMail, FiCalendar, FiRefreshCw, FiCopy, FiShield
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

interface GiftCard {
    id: string;
    code: string;
    codeLast4: string | null;
    amountUSD: number;
    balanceUSD: number;
    status: string;
    purchasedBy: string | null;
    purchasedAt: string | null;
    recipientEmail: string | null;
    recipientName: string | null;
    senderName: string | null;
    redeemedBy: string | null;
    redeemedAt: string | null;
    createdAt: string;
    design: {
        name: string;
        category: string;
    } | null;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activa' },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactiva' },
    DEPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Agotada' },
    EXPIRED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Expirada' },
    SUSPENDED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Suspendida' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
    PARTIALLY_USED: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Uso Parcial' },
};

export default function GiftCardsAdminPage() {
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState<GiftCard | null>(null);
    const [creating, setCreating] = useState(false);

    // Create form state
    const [createForm, setCreateForm] = useState({
        amount: 25,
        quantity: 1,
        forPrint: true,
    });

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        depleted: 0,
        totalBalance: 0,
        totalRedeemed: 0,
    });

    useEffect(() => {
        fetchGiftCards();
    }, []);

    const fetchGiftCards = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/gift-cards?type=admin');
            if (!res.ok) throw new Error('Error fetching gift cards');
            const data = await res.json();
            setGiftCards(data);

            // Calculate stats
            const active = data.filter((gc: GiftCard) => gc.status === 'ACTIVE').length;
            const depleted = data.filter((gc: GiftCard) => gc.status === 'DEPLETED').length;
            const totalBalance = data.reduce((sum: number, gc: GiftCard) => sum + Number(gc.balanceUSD), 0);
            const totalRedeemed = data.filter((gc: GiftCard) => gc.status === 'DEPLETED')
                .reduce((sum: number, gc: GiftCard) => sum + Number(gc.amountUSD), 0);

            setStats({
                total: data.length,
                active,
                depleted,
                totalBalance,
                totalRedeemed,
            });
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar gift cards');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGiftCards = async () => {
        if (createForm.amount < 5 || createForm.amount > 500) {
            toast.error('El monto debe estar entre $5 y $500');
            return;
        }
        if (createForm.quantity < 1 || createForm.quantity > 50) {
            toast.error('La cantidad debe estar entre 1 y 50');
            return;
        }

        setCreating(true);
        const createdCards: GiftCard[] = [];

        try {
            for (let i = 0; i < createForm.quantity; i++) {
                const res = await fetch('/api/gift-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amountUSD: createForm.amount,
                        forPrint: createForm.forPrint,
                        isGift: false,
                    }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Error creating gift card');
                }

                const data = await res.json();
                if (data.giftCard) {
                    createdCards.push(data.giftCard);
                }
            }

            toast.success(`${createdCards.length} Gift Card(s) creadas exitosamente`);
            setShowCreateModal(false);
            setCreateForm({ amount: 25, quantity: 1, forPrint: true });
            fetchGiftCards();

            // Auto-print if forPrint is selected
            if (createForm.forPrint && createdCards.length > 0) {
                handlePrintCards(createdCards);
            }
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al crear gift cards');
        } finally {
            setCreating(false);
        }
    };

    const handlePrintCards = (cards: GiftCard[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Permite las ventanas emergentes para imprimir');
            return;
        }

        const cardsHtml = cards.map(card => `
            <div style="
                border: 2px dashed #f59e0b;
                border-radius: 16px;
                padding: 24px;
                margin: 16px;
                width: 300px;
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                page-break-inside: avoid;
            ">
                <div style="text-align: center; margin-bottom: 16px;">
                    <img src="/logo.png" alt="Electro Shop" style="height: 40px;" onerror="this.style.display='none'">
                    <h2 style="margin: 8px 0; color: #92400e; font-size: 18px;">GIFT CARD</h2>
                </div>
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 16px;
                    text-align: center;
                    margin-bottom: 16px;
                ">
                    <div style="color: #f59e0b; font-size: 32px; font-weight: bold;">
                        $${Number(card.amountUSD).toFixed(2)}
                    </div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">USD</div>
                </div>
                <div style="
                    background: #1f2937;
                    color: white;
                    padding: 12px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 14px;
                    text-align: center;
                    letter-spacing: 2px;
                ">
                    ${card.code.replace(/(.{4})/g, '$1-').slice(0, -1)}
                </div>
                <div style="text-align: center; margin-top: 16px; color: #6b7280; font-size: 11px;">
                    Canjeable en electro-shop.com
                </div>
            </div>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gift Cards - Electro Shop</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, sans-serif;
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        padding: 20px;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body onload="window.print()">
                ${cardsHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Código copiado');
    };

    const filteredCards = giftCards.filter(card => {
        const matchesSearch =
            card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.codeLast4 && card.codeLast4.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || card.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                            <FiGift className="w-5 h-5 text-white" />
                        </div>
                        Gift Cards
                    </h1>
                    <p className="text-gray-500 mt-1">Administra las tarjetas de regalo</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchGiftCards()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <FiPlus className="w-4 h-4" />
                        Generar Gift Cards
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FiHash className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FiCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                            <p className="text-sm text-gray-500">Activas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FiGift className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.depleted}</p>
                            <p className="text-sm text-gray-500">Canjeadas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <FiDollarSign className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">${stats.totalBalance.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">Saldo Activo</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FiDollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">${stats.totalRedeemed.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">Canjeado</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por código, email o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="ACTIVE">Activas</option>
                        <option value="DEPLETED">Agotadas</option>
                        <option value="INACTIVE">Inactivas</option>
                        <option value="SUSPENDED">Suspendidas</option>
                        <option value="CANCELLED">Canceladas</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Monto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Saldo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Destinatario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-gray-500">Cargando...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCards.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FiGift className="w-12 h-12 text-gray-300" />
                                            <p className="text-gray-500">No se encontraron gift cards</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCards.map((card) => (
                                    <tr key={card.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                                    ****{card.codeLast4 || card.code.slice(-4)}
                                                </code>
                                                <button
                                                    onClick={() => copyCode(card.code)}
                                                    className="p-1 text-gray-400 hover:text-amber-500 transition-colors"
                                                    title="Copiar código"
                                                >
                                                    <FiCopy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">
                                                ${Number(card.amountUSD).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold ${Number(card.balanceUSD) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                ${Number(card.balanceUSD).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[card.status]?.bg} ${statusColors[card.status]?.text}`}>
                                                {statusColors[card.status]?.label || card.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {card.recipientEmail ? (
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900">{card.recipientName}</p>
                                                    <p className="text-gray-500">{card.recipientEmail}</p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(card.createdAt).toLocaleDateString('es-VE')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setShowDetailsModal(card)}
                                                    className="p-2 text-gray-400 hover:text-amber-500 transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handlePrintCards([card])}
                                                    className="p-2 text-gray-400 hover:text-amber-500 transition-colors"
                                                    title="Imprimir"
                                                >
                                                    <FiPrinter className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                <FiGift className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Generar Gift Cards</h2>
                                <p className="text-sm text-gray-500">Para impresión física</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monto por tarjeta (USD)
                                </label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[10, 25, 50, 100].map((amount) => (
                                        <button
                                            key={amount}
                                            onClick={() => setCreateForm(prev => ({ ...prev, amount }))}
                                            className={`py-2 rounded-lg font-semibold transition-colors ${createForm.amount === amount
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            ${amount}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    min={5}
                                    max={500}
                                    value={createForm.amount}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cantidad a generar
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={createForm.quantity}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Máximo 50 por lote</p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <FiShield className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Seguridad</p>
                                        <p className="text-xs text-amber-600 mt-1">
                                            Los códigos son generados con alta entropía criptográfica y
                                            almacenados de forma segura (hash SHA-256).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total a generar:</span>
                                    <span className="text-xl font-bold text-amber-600">
                                        ${(createForm.amount * createForm.quantity).toFixed(2)} ({createForm.quantity} tarjetas)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateGiftCards}
                                disabled={creating}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <FiPrinter className="w-4 h-4" />
                                        Generar e Imprimir
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Detalles de Gift Card</h2>
                            <button
                                onClick={() => setShowDetailsModal(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Code */}
                            <div className="bg-gray-900 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-400 mb-2">Código</p>
                                <code className="text-xl font-mono text-amber-400 tracking-wider">
                                    {showDetailsModal.code.replace(/(.{4})/g, '$1-').slice(0, -1)}
                                </code>
                                <button
                                    onClick={() => copyCode(showDetailsModal.code)}
                                    className="ml-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <FiCopy className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Amount & Balance */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Monto Original</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        ${Number(showDetailsModal.amountUSD).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Saldo Actual</p>
                                    <p className={`text-2xl font-bold ${Number(showDetailsModal.balanceUSD) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        ${Number(showDetailsModal.balanceUSD).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Estado:</span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[showDetailsModal.status]?.bg} ${statusColors[showDetailsModal.status]?.text}`}>
                                    {statusColors[showDetailsModal.status]?.label || showDetailsModal.status}
                                </span>
                            </div>

                            {/* Recipient */}
                            {showDetailsModal.recipientEmail && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500 mb-2">Destinatario</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                            <FiUser className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{showDetailsModal.recipientName}</p>
                                            <p className="text-sm text-gray-500">{showDetailsModal.recipientEmail}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Creada</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(showDetailsModal.createdAt).toLocaleDateString('es-VE', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {showDetailsModal.redeemedAt && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500">Canjeada</p>
                                        <p className="font-medium text-gray-900">
                                            {new Date(showDetailsModal.redeemedAt).toLocaleDateString('es-VE', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => handlePrintCards([showDetailsModal])}
                                className="flex-1 px-4 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <FiPrinter className="w-4 h-4" />
                                Imprimir
                            </button>
                            <button
                                onClick={() => setShowDetailsModal(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
