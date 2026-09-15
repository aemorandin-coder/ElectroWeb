'use client';

import { useState, useEffect } from 'react';
import {
    FiGift, FiPlus, FiSearch, FiFilter, FiDownload, FiEye, FiPrinter,
    FiCheck, FiX, FiAlertCircle, FiClock, FiDollarSign, FiHash, FiUser,
    FiMail, FiCalendar, FiRefreshCw, FiCopy, FiShield
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import {
  adminPageTitle,
  adminPageSubtitle,
  adminStatCard,
  adminStatLabel,
  adminStatValue,
  adminIconChip,
  adminPrimaryButton,
  adminSecondaryButton,
  adminModalOverlay,
  adminModalPanel,
  adminModalTitle,
  adminTableWrap,
  adminTh,
  adminTd,
  adminRowHover,
  adminInput,
  adminBadge,
} from '@/lib/admin-ui';

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

const statusColors: Record<string, { cls: string; label: string }> = {
    ACTIVE: { cls: adminBadge('success'), label: 'Activa' },
    INACTIVE: { cls: adminBadge('neutral'), label: 'Inactiva' },
    DEPLETED: { cls: adminBadge('brand'), label: 'Agotada' },
    EXPIRED: { cls: adminBadge('danger'), label: 'Expirada' },
    SUSPENDED: { cls: adminBadge('warning'), label: 'Suspendida' },
    CANCELLED: { cls: adminBadge('danger'), label: 'Cancelada' },
    PARTIALLY_USED: { cls: adminBadge('warning'), label: 'Uso Parcial' },
};

export default function GiftCardsAdminPage() {
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState<GiftCard | null>(null);
    useBodyScrollLock(showCreateModal);
    useBodyScrollLock(Boolean(showDetailsModal));
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
                <div className="flex items-center gap-3">
                    <div className={adminIconChip('brand')}>
                        <FiGift className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className={adminPageTitle}>Gift Cards</h1>
                        <p className={adminPageSubtitle}>Administra las tarjetas de regalo</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchGiftCards()}
                        className={adminSecondaryButton}
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className={adminPrimaryButton}
                    >
                        <FiPlus className="w-4 h-4" />
                        Generar Gift Cards
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className={adminStatCard}>
                    <span className={adminIconChip('brand')}>
                        <FiHash className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{stats.total}</p>
                        <p className={adminStatLabel}>Total</p>
                    </div>
                </div>
                <div className={adminStatCard}>
                    <span className={adminIconChip('success')}>
                        <FiCheck className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{stats.active}</p>
                        <p className={adminStatLabel}>Activas</p>
                    </div>
                </div>
                <div className={adminStatCard}>
                    <span className={adminIconChip('brand')}>
                        <FiGift className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{stats.depleted}</p>
                        <p className={adminStatLabel}>Canjeadas</p>
                    </div>
                </div>
                <div className={adminStatCard}>
                    <span className={adminIconChip('brand')}>
                        <FiDollarSign className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{formatUSD(stats.totalBalance)}</p>
                        <p className={adminStatLabel}>Saldo Activo</p>
                    </div>
                </div>
                <div className={adminStatCard}>
                    <span className={adminIconChip('success')}>
                        <FiDollarSign className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{formatUSD(stats.totalRedeemed)}</p>
                        <p className={adminStatLabel}>Canjeado</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border border-line mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por código, email o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${adminInput()} pl-10`}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={adminInput()}
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
            <div className={adminTableWrap}>
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={adminTh}>
                                Código
                            </th>
                            <th className={adminTh}>
                                Monto
                            </th>
                            <th className={adminTh}>
                                Saldo
                            </th>
                            <th className={adminTh}>
                                Estado
                            </th>
                            <th className={adminTh}>
                                Destinatario
                            </th>
                            <th className={adminTh}>
                                Fecha
                            </th>
                            <th className={`${adminTh} text-right`}>
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-muted text-sm">Cargando...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredCards.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <FiGift className="w-12 h-12 text-subtle" />
                                        <p className="text-muted text-sm">No se encontraron gift cards</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredCards.map((card) => (
                                <tr key={card.id} className={adminRowHover}>
                                    <td className={adminTd}>
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono bg-surface px-2 py-1 rounded text-ink">
                                                ****{card.codeLast4 || card.code.slice(-4)}
                                            </code>
                                            <button
                                                onClick={() => copyCode(card.code)}
                                                aria-label="Copiar código"
                                                className="p-1 text-muted hover:text-brand-600 transition-colors"
                                                title="Copiar código"
                                            >
                                                <FiCopy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className={adminTd}>
                                        <span className="font-semibold text-ink">
                                            {formatUSD(Number(card.amountUSD))}
                                        </span>
                                    </td>
                                    <td className={adminTd}>
                                        <span className={`font-semibold ${Number(card.balanceUSD) > 0 ? 'text-success-strong' : 'text-muted'}`}>
                                            {formatUSD(Number(card.balanceUSD))}
                                        </span>
                                    </td>
                                    <td className={adminTd}>
                                        <span className={statusColors[card.status]?.cls || adminBadge('neutral')}>
                                            {statusColors[card.status]?.label || card.status}
                                        </span>
                                    </td>
                                    <td className={adminTd}>
                                        {card.recipientEmail ? (
                                            <div className="text-sm">
                                                <p className="font-medium text-ink">{card.recipientName}</p>
                                                <p className="text-muted">{card.recipientEmail}</p>
                                            </div>
                                        ) : (
                                            <span className="text-subtle text-sm">-</span>
                                        )}
                                    </td>
                                    <td className={`${adminTd} text-sm text-muted`}>
                                        {new Date(card.createdAt).toLocaleDateString('es-VE')}
                                    </td>
                                    <td className={`${adminTd} text-right`}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setShowDetailsModal(card)}
                                                aria-label="Ver detalles"
                                                className="p-2 text-muted hover:text-brand-600 transition-colors"
                                                title="Ver detalles"
                                            >
                                                <FiEye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePrintCards([card])}
                                                aria-label="Imprimir"
                                                className="p-2 text-muted hover:text-brand-600 transition-colors"
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

            {/* Create Modal */}
            {showCreateModal && (
                <div
                    className={adminModalOverlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowCreateModal(false);
                    }}
                >
                    <div className={`${adminModalPanel} sm:max-w-md`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={adminIconChip('brand')}>
                                <FiGift className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <h2 className={adminModalTitle}>Generar Gift Cards</h2>
                                <p className="text-sm text-muted">Para impresión física</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">
                                    Monto por tarjeta (USD)
                                </label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[10, 25, 50, 100].map((amount) => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => setCreateForm(prev => ({ ...prev, amount }))}
                                            className={`py-2 rounded-lg font-semibold transition-colors ${createForm.amount === amount
                                                    ? 'bg-brand-500 text-white'
                                                    : 'bg-surface text-ink hover:bg-line border border-line'
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
                                    className={adminInput()}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">
                                    Cantidad a generar
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={createForm.quantity}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                    className={adminInput()}
                                />
                                <p className="text-xs text-muted mt-1">Máximo 50 por lote</p>
                            </div>

                            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <FiShield className="w-5 h-5 text-brand-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-brand-700">Seguridad</p>
                                        <p className="text-xs text-brand-600 mt-1">
                                            Los códigos son generados con alta entropía criptográfica y
                                            almacenados de forma segura (hash SHA-256).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-ink-soft">Total a generar:</span>
                                    <span className="text-xl font-bold text-brand-600">
                                        {formatUSD(createForm.amount * createForm.quantity)} ({createForm.quantity} tarjetas)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className={adminSecondaryButton}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateGiftCards}
                                disabled={creating}
                                className={`${adminPrimaryButton} flex-1 justify-center`}
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
                <div
                    className={adminModalOverlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowDetailsModal(null);
                    }}
                >
                    <div className={`${adminModalPanel} sm:max-w-lg max-h-[90vh] overflow-y-auto`}>
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-line">
                            <h2 className={adminModalTitle}>Detalles de Gift Card</h2>
                            <button
                                onClick={() => setShowDetailsModal(null)}
                                aria-label="Cerrar"
                                className="p-2 text-muted hover:text-ink transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Code */}
                            <div className="bg-ink rounded-xl p-4 text-center">
                                <p className="text-xs text-muted mb-2">Código</p>
                                <code className="text-xl font-mono text-brand-400 tracking-wider">
                                    {showDetailsModal.code.replace(/(.{4})/g, '$1-').slice(0, -1)}
                                </code>
                                <button
                                    onClick={() => copyCode(showDetailsModal.code)}
                                    aria-label="Copiar código"
                                    className="ml-2 text-muted hover:text-white transition-colors"
                                >
                                    <FiCopy className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Amount & Balance */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-surface rounded-lg p-4">
                                    <p className="text-sm text-muted">Monto Original</p>
                                    <p className="text-2xl font-bold text-ink">
                                        {formatUSD(Number(showDetailsModal.amountUSD))}
                                    </p>
                                </div>
                                <div className="bg-surface rounded-lg p-4">
                                    <p className="text-sm text-muted">Saldo Actual</p>
                                    <p className={`text-2xl font-bold ${Number(showDetailsModal.balanceUSD) > 0 ? 'text-success-strong' : 'text-muted'}`}>
                                        {formatUSD(Number(showDetailsModal.balanceUSD))}
                                    </p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                                <span className="text-ink-soft">Estado:</span>
                                <span className={statusColors[showDetailsModal.status]?.cls || adminBadge('neutral')}>
                                    {statusColors[showDetailsModal.status]?.label || showDetailsModal.status}
                                </span>
                            </div>

                            {/* Recipient */}
                            {showDetailsModal.recipientEmail && (
                                <div className="p-4 bg-surface rounded-lg">
                                    <p className="text-sm text-muted mb-2">Destinatario</p>
                                    <div className="flex items-center gap-3">
                                        <div className={adminIconChip('brand')}>
                                            <FiUser className="w-5 h-5 text-brand-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-ink">{showDetailsModal.recipientName}</p>
                                            <p className="text-sm text-muted">{showDetailsModal.recipientEmail}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-surface rounded-lg">
                                    <p className="text-sm text-muted">Creada</p>
                                    <p className="font-medium text-ink">
                                        {new Date(showDetailsModal.createdAt).toLocaleDateString('es-VE', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {showDetailsModal.redeemedAt && (
                                    <div className="p-4 bg-surface rounded-lg">
                                        <p className="text-sm text-muted">Canjeada</p>
                                        <p className="font-medium text-ink">
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
                                className={`${adminSecondaryButton} flex-1 justify-center text-brand-600 hover:text-brand-700`}
                            >
                                <FiPrinter className="w-4 h-4" />
                                Imprimir
                            </button>
                            <button
                                onClick={() => setShowDetailsModal(null)}
                                className={`${adminSecondaryButton} flex-1 justify-center`}
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
