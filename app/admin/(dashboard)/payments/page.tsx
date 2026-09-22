'use client';

import { useState, useEffect, useRef } from 'react';
import {
    FiPlus, FiEdit2, FiTrash2, FiCreditCard, FiCheck, FiX,
    FiArrowUp, FiArrowDown, FiDollarSign, FiShield, FiUpload,
    FiInfo, FiSmartphone, FiGlobe
} from 'react-icons/fi';
import { SiBinance, SiZelle, SiPaypal } from 'react-icons/si';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import PageHeader from '@/components/ui/PageHeader';
import {
    adminCard, adminPrimaryButton, adminSecondaryButton,
    adminInput, adminModalOverlay, adminModalPanel,
    adminModalHeader, adminModalTitle, adminModalFooter, adminSpinner
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import { BANCOS_VENEZUELA } from '@/lib/pago-movil/bancos-venezuela';

export interface AdminPaymentMethod {
    id: string;
    type: string;
    name: string;
    bankName?: string | null;
    accountNumber?: string | null;
    accountType?: string | null;
    holderName?: string | null;
    holderId?: string | null;
    phone?: string | null;
    email?: string | null;
    walletAddress?: string | null;
    network?: string | null;
    payId?: string | null;
    instructions?: string | null;
    logo?: string | null;
    qrCodeImage?: string | null;
    sortOrder?: number;
    minAmount?: number | null;
    maxAmount?: number | null;
    displayNote?: string | null;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const PAYMENT_TYPE_METADATA: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
    MOBILE_PAYMENT: {
        label: 'Pago Móvil',
        icon: <FiSmartphone className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    BANK_TRANSFER: {
        label: 'Transferencia',
        icon: <FiCreditCard className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    BINANCE_PAY: {
        label: 'Binance Pay',
        icon: <SiBinance className="w-5 h-5 text-warning-strong" />,
        badgeClass: 'bg-warning/10 text-warning-strong border-warning/30',
    },
    ZELLE: {
        label: 'Zelle',
        icon: <SiZelle className="w-5 h-5 text-purple-600" />,
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    ZINLI: {
        label: 'Zinli',
        icon: <FiCreditCard className="w-5 h-5 text-orange-600" />,
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    PAYPAL: {
        label: 'PayPal',
        icon: <SiPaypal className="w-5 h-5 text-blue-600" />,
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    MERCANTIL_PANAMA: {
        label: 'Mercantil Panamá',
        icon: <FiGlobe className="w-5 h-5 text-brand-700" />,
        badgeClass: 'bg-brand-50 text-brand-800 border-brand-200',
    },
    CRYPTO: {
        label: 'Criptomonedas',
        icon: <SiBinance className="w-5 h-5 text-warning-strong" />,
        badgeClass: 'bg-warning/10 text-warning-strong border-warning/30',
    },
    CASH: {
        label: 'Efectivo',
        icon: <FiDollarSign className="w-5 h-5 text-success-strong" />,
        badgeClass: 'bg-success/10 text-success-strong border-success/30',
    },
    OTHER: {
        label: 'Otro',
        icon: <FiCreditCard className="w-5 h-5 text-muted" />,
        badgeClass: 'bg-surface text-ink border-line',
    },
};

const DEFAULT_FORM_DATA: Partial<AdminPaymentMethod> = {
    type: 'MOBILE_PAYMENT',
    name: '',
    bankName: 'Banco de Venezuela',
    accountNumber: '',
    accountType: 'Corriente',
    holderName: '',
    holderId: '',
    phone: '',
    email: '',
    walletAddress: '',
    network: 'USDT-TRC20',
    payId: '',
    instructions: '',
    qrCodeImage: null,
    minAmount: null,
    maxAmount: null,
    displayNote: '',
    isActive: true,
};

export default function PaymentsPage() {
    const { confirm } = useConfirm();
    const [methods, setMethods] = useState<AdminPaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<AdminPaymentMethod | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingQR, setUploadingQR] = useState(false);
    const qrInputRef = useRef<HTMLInputElement>(null);
    useBodyScrollLock(isModalOpen);

    const [formData, setFormData] = useState<Partial<AdminPaymentMethod>>(DEFAULT_FORM_DATA);

    useEffect(() => {
        fetchMethods();
    }, []);

    async function fetchMethods() {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/payments');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    data.sort((a: AdminPaymentMethod, b: AdminPaymentMethod) => (a.sortOrder || 0) - (b.sortOrder || 0));
                    setMethods(data);
                }
            } else {
                toast.error('Error al cargar métodos de pago');
            }
        } catch (error) {
            console.error('Error fetching methods:', error);
            toast.error('Error de conexión al cargar métodos de pago');
        } finally {
            setLoading(false);
        }
    }

    const seedInitialMethods = async () => {
        try {
            const response = await fetch('/api/admin/payments/seed', { method: 'POST' });
            const data = await response.json();
            if (data.seeded) {
                toast.success(`${data.count} métodos predefinidos creados`);
                fetchMethods();
            } else if (data.count > 0) {
                toast('Ya existen métodos de pago configurados', { icon: <FiInfo className="h-5 w-5 text-brand-600" /> });
            } else {
                toast.error(data.error || 'Error al crear métodos');
            }
        } catch (error) {
            console.error('Error seeding:', error);
            toast.error('Error de conexión');
        }
    };

    const handleQRUpload = async (file: File) => {
        setUploadingQR(true);
        try {
            const body = new FormData();
            body.append('file', file);
            body.append('folder', 'payment-methods');
            const res = await fetch('/api/upload', { method: 'POST', body });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, qrCodeImage: data.url }));
                toast.success('Código QR subido correctamente');
            } else {
                toast.error('Error al subir imagen');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error de conexión al subir imagen');
        } finally {
            setUploadingQR(false);
        }
    };

    const handleOpenModal = (methodToEdit?: AdminPaymentMethod) => {
        if (methodToEdit) {
            setEditingMethod(methodToEdit);
            setFormData({
                ...methodToEdit,
                minAmount: methodToEdit.minAmount ? Number(methodToEdit.minAmount) : null,
                maxAmount: methodToEdit.maxAmount ? Number(methodToEdit.maxAmount) : null,
            });
        } else {
            setEditingMethod(null);
            setFormData({
                ...DEFAULT_FORM_DATA,
                sortOrder: methods.length + 1,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingMethod(null);
        setFormData(DEFAULT_FORM_DATA);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim()) {
            toast.error('El nombre del método es requerido');
            return;
        }

        setSubmitting(true);
        try {
            const isEditing = Boolean(editingMethod);
            const payload = {
                ...(isEditing ? { id: editingMethod?.id } : {}),
                ...formData,
                minAmount: formData.minAmount ? Number(formData.minAmount) : null,
                maxAmount: formData.maxAmount ? Number(formData.maxAmount) : null,
            };

            const response = await fetch('/api/admin/payments', {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success(isEditing ? 'Método actualizado' : 'Método creado exitosamente');
                handleCloseModal();
                fetchMethods();
            } else {
                const data = await response.json().catch(() => ({}));
                toast.error(data.error || 'Error al guardar el método');
            }
        } catch (error) {
            console.error('Error saving method:', error);
            toast.error('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (method: AdminPaymentMethod) => {
        try {
            const response = await fetch('/api/admin/payments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: method.id, isActive: !method.isActive }),
            });
            if (response.ok) {
                toast.success(method.isActive ? 'Método desactivado' : 'Método activado');
                fetchMethods();
            } else {
                toast.error('No se pudo cambiar el estado');
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error('Error de conexión');
        }
    };

    const handleMove = async (method: AdminPaymentMethod, direction: 'UP' | 'DOWN') => {
        const currentIndex = methods.findIndex(m => m.id === method.id);
        if (currentIndex < 0) return;
        const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= methods.length) return;

        const targetMethod = methods[targetIndex];
        const newSortOrder = targetMethod.sortOrder ?? targetIndex;
        const targetNewSortOrder = method.sortOrder ?? currentIndex;

        try {
            await Promise.all([
                fetch('/api/admin/payments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: method.id, sortOrder: newSortOrder }),
                }),
                fetch('/api/admin/payments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: targetMethod.id, sortOrder: targetNewSortOrder }),
                }),
            ]);
            fetchMethods();
        } catch (error) {
            console.error('Error moving method:', error);
        }
    };

    const handleDelete = async (method: AdminPaymentMethod) => {
        const confirmed = await confirm({
            title: 'Eliminar método de pago',
            message: `¿Estás seguro de que deseas eliminar "${method.name}"? Los clientes ya no podrán seleccionarlo para recargas ni pagos.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/admin/payments?id=${method.id}`, { method: 'DELETE' });
            if (response.ok) {
                toast.success('Método eliminado correctamente');
                fetchMethods();
            } else {
                const data = await response.json().catch(() => ({}));
                toast.error(data.error || 'No se pudo eliminar el método');
            }
        } catch (error) {
            console.error('Error deleting method:', error);
            toast.error('Error de conexión');
        }
    };

    const activeCount = methods.filter(m => m.isActive).length;
    const inactiveCount = methods.length - activeCount;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Métodos de Pago"
                description="Administra las cuentas y métodos para recargas de saldo y pagos directos."
                actions={
                    <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className={`inline-flex items-center gap-2 ${adminPrimaryButton}`}
                    >
                        <FiPlus className="w-4 h-4" />
                        Nuevo método
                    </button>
                }
            />

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${adminCard} p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                        <FiCreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted font-medium uppercase tracking-wider">Total Métodos</p>
                        <p className="text-xl font-bold text-ink">{methods.length}</p>
                    </div>
                </div>

                <div className={`${adminCard} p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-success-strong shrink-0">
                        <FiCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted font-medium uppercase tracking-wider">Activos</p>
                        <p className="text-xl font-bold text-ink">{activeCount}</p>
                    </div>
                </div>

                <div className={`${adminCard} p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-muted shrink-0">
                        <FiX className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted font-medium uppercase tracking-wider">Inactivos</p>
                        <p className="text-xl font-bold text-ink">{inactiveCount}</p>
                    </div>
                </div>
            </div>

            {/* Methods Listing */}
            {loading ? (
                <div className={`${adminCard} p-12 flex flex-col items-center justify-center gap-3 text-muted`}>
                    <div className={adminSpinner} />
                    <p className="text-sm">Cargando métodos de pago...</p>
                </div>
            ) : methods.length === 0 ? (
                <div className={`${adminCard} p-12 text-center max-w-lg mx-auto`}>
                    <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
                        <FiCreditCard className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-1">Sin métodos de pago</h3>
                    <p className="text-sm text-muted mb-6">
                        No hay métodos configurados todavía. Puedes cargar los predefinidos para Venezuela o crear uno nuevo.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={seedInitialMethods}
                            className={`inline-flex items-center gap-2 ${adminSecondaryButton}`}
                        >
                            <FiPlus className="w-4 h-4" />
                            Cargar predefinidos
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className={`inline-flex items-center gap-2 ${adminPrimaryButton}`}
                        >
                            <FiPlus className="w-4 h-4" />
                            Crear método
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {methods.map((method, index) => {
                        const meta = PAYMENT_TYPE_METADATA[method.type] || PAYMENT_TYPE_METADATA.OTHER;
                        return (
                            <div
                                key={method.id}
                                className={`${adminCard} p-5 flex flex-col justify-between transition-all ${
                                    !method.isActive ? 'opacity-65 bg-surface/80 border-dashed' : ''
                                }`}
                            >
                                <div>
                                    {/* Header: Icon, Name, Active switch */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0">
                                                {meta.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-ink text-base truncate">{method.name}</h3>
                                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${meta.badgeClass}`}>
                                                    {meta.label}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleStatus(method)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                method.isActive ? 'bg-success-strong' : 'bg-subtle'
                                            }`}
                                            title={method.isActive ? 'Desactivar método' : 'Activar método'}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                    method.isActive ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Details breakdown */}
                                    <div className="space-y-1.5 text-xs text-ink-soft py-2 border-t border-b border-line mb-3">
                                        {method.bankName && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Banco:</span>
                                                <span className="font-medium text-ink">{method.bankName}</span>
                                            </div>
                                        )}
                                        {method.accountNumber && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Cuenta:</span>
                                                <span className="font-mono text-ink">{method.accountNumber}</span>
                                            </div>
                                        )}
                                        {method.phone && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Teléfono:</span>
                                                <span className="font-medium text-ink">{method.phone}</span>
                                            </div>
                                        )}
                                        {method.holderId && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Cédula / RIF:</span>
                                                <span className="font-medium text-ink">{method.holderId}</span>
                                            </div>
                                        )}
                                        {method.holderName && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Titular:</span>
                                                <span className="font-medium text-ink truncate ml-2">{method.holderName}</span>
                                            </div>
                                        )}
                                        {method.email && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Correo:</span>
                                                <span className="font-medium text-ink truncate ml-2">{method.email}</span>
                                            </div>
                                        )}
                                        {method.payId && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Binance Pay ID:</span>
                                                <span className="font-mono font-medium text-ink">{method.payId}</span>
                                            </div>
                                        )}
                                        {method.walletAddress && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Wallet:</span>
                                                <span className="font-mono text-ink truncate ml-2 max-w-[160px]">{method.walletAddress}</span>
                                            </div>
                                        )}
                                        {method.network && (
                                            <div className="flex justify-between">
                                                <span className="text-muted">Red:</span>
                                                <span className="font-medium text-ink">{method.network}</span>
                                            </div>
                                        )}

                                        {/* Limits */}
                                        {(method.minAmount || method.maxAmount) && (
                                            <div className="flex justify-between pt-1">
                                                <span className="text-muted">Límites:</span>
                                                <span className="font-semibold text-ink">
                                                    {method.minAmount ? `Mín ${formatUSD(Number(method.minAmount))}` : ''}
                                                    {method.minAmount && method.maxAmount ? ' · ' : ''}
                                                    {method.maxAmount ? `Máx ${formatUSD(Number(method.maxAmount))}` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Display Note */}
                                    {method.displayNote && (
                                        <p className="text-xs text-muted bg-surface p-2 rounded-lg border border-line mb-3 line-clamp-2">
                                            {method.displayNote}
                                        </p>
                                    )}

                                    {/* QR Code thumbnail */}
                                    {method.qrCodeImage && (
                                        <div className="flex items-center gap-2 text-xs text-muted mb-3">
                                            <Image
                                                src={method.qrCodeImage}
                                                alt="QR Thumbnail"
                                                width={36}
                                                height={36}
                                                className="rounded border border-line object-contain bg-white"
                                            />
                                            <span>Código QR configurado</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer actions: Reorder, Edit, Delete */}
                                <div className="flex items-center justify-between pt-2 border-t border-line">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMove(method, 'UP')}
                                            disabled={index === 0}
                                            className="p-1.5 rounded hover:bg-surface text-muted disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Mover arriba"
                                        >
                                            <FiArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(method, 'DOWN')}
                                            disabled={index === methods.length - 1}
                                            className="p-1.5 rounded hover:bg-surface text-muted disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Mover abajo"
                                        >
                                            <FiArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenModal(method)}
                                            className={`p-1.5 text-xs font-semibold rounded-lg ${adminSecondaryButton}`}
                                            title="Editar método"
                                        >
                                            <FiEdit2 className="w-3.5 h-3.5" />
                                            <span>Editar</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(method)}
                                            className="p-2 text-deal hover:bg-deal-bg rounded-lg transition-colors"
                                            title="Eliminar método"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Form + Live Customer Preview */}
            {isModalOpen && (
                <div className={adminModalOverlay}>
                    <div className={`${adminModalPanel} max-w-4xl max-h-[92vh] flex flex-col`}>
                        {/* Modal Header */}
                        <div className={adminModalHeader}>
                            <div>
                                <h2 className={adminModalTitle}>
                                    {editingMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                                </h2>
                                <p className="text-xs text-muted mt-0.5">
                                    Los campos se adaptan al tipo de método seleccionado.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: 2 Columns on Desktop */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left column: Dynamic Form (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Type Selection */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                                            Tipo de Método
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => {
                                                const nextType = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    type: nextType,
                                                    name: prev.name ? prev.name : (PAYMENT_TYPE_METADATA[nextType]?.label || ''),
                                                }));
                                            }}
                                            className={adminInput()}
                                        >
                                            <option value="MOBILE_PAYMENT">Pago Móvil (Venezuela)</option>
                                            <option value="BANK_TRANSFER">Transferencia Bancaria (Venezuela)</option>
                                            <option value="BINANCE_PAY">Binance Pay (Cripto sin comisión)</option>
                                            <option value="ZELLE">Zelle (Estados Unidos)</option>
                                            <option value="ZINLI">Zinli (Billetera USD)</option>
                                            <option value="PAYPAL">PayPal</option>
                                            <option value="MERCANTIL_PANAMA">Mercantil Panamá</option>
                                            <option value="CRYPTO">Criptomonedas (USDT-TRC20, etc.)</option>
                                            <option value="CASH">Efectivo</option>
                                            <option value="OTHER">Otro método manual</option>
                                        </select>
                                    </div>

                                    {/* Method Name */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                                            Nombre Visible <span className="text-deal">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ej: Pago Móvil BDV, Binance Pay USDT..."
                                            className={adminInput()}
                                        />
                                    </div>

                                    {/* Dynamic Fields per Type */}
                                    {/* MOBILE_PAYMENT */}
                                    {formData.type === 'MOBILE_PAYMENT' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                                                Datos de Pago Móvil
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Banco</label>
                                                <select
                                                    value={formData.bankName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                                    className={adminInput()}
                                                >
                                                    <option value="">Selecciona un banco</option>
                                                    {BANCOS_VENEZUELA.map(b => (
                                                        <option key={b.codigo} value={b.nombreCorto}>
                                                            {b.codigo} - {b.nombreCorto}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-ink mb-1">Teléfono</label>
                                                    <input
                                                        type="text"
                                                        value={formData.phone || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                        placeholder="0412-1234567"
                                                        className={adminInput()}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-ink mb-1">Cédula / RIF</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holderId || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, holderId: e.target.value }))}
                                                        placeholder="V-12345678 o J-12345678-9"
                                                        className={adminInput()}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Titular</label>
                                                <input
                                                    type="text"
                                                    value={formData.holderName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                                    placeholder="Nombre o Razón Social"
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* BANK_TRANSFER */}
                                    {formData.type === 'BANK_TRANSFER' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                                                Datos de Cuenta Bancaria
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Banco</label>
                                                <select
                                                    value={formData.bankName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                                    className={adminInput()}
                                                >
                                                    <option value="">Selecciona un banco</option>
                                                    {BANCOS_VENEZUELA.map(b => (
                                                        <option key={b.codigo} value={b.nombreCorto}>
                                                            {b.codigo} - {b.nombreCorto}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Número de Cuenta (20 dígitos)</label>
                                                <input
                                                    type="text"
                                                    maxLength={20}
                                                    value={formData.accountNumber || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }))}
                                                    placeholder="01020123456789012345"
                                                    className={`${adminInput()} font-mono`}
                                                />
                                                {formData.accountNumber && formData.accountNumber.length !== 20 && (
                                                    <p className="text-[11px] text-warning-strong mt-0.5">
                                                        Debe tener exactamente 20 dígitos (actual: {formData.accountNumber.length})
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-ink mb-1">Tipo de Cuenta</label>
                                                    <select
                                                        value={formData.accountType || 'Corriente'}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                                                        className={adminInput()}
                                                    >
                                                        <option value="Corriente">Corriente</option>
                                                        <option value="Ahorro">Ahorro</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-ink mb-1">Cédula / RIF</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holderId || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, holderId: e.target.value }))}
                                                        placeholder="J-12345678-9"
                                                        className={adminInput()}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Titular</label>
                                                <input
                                                    type="text"
                                                    value={formData.holderName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                                    placeholder="Nombre o Razón Social"
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* BINANCE_PAY */}
                                    {formData.type === 'BINANCE_PAY' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-warning-strong uppercase tracking-wider">
                                                Datos de Binance Pay
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Correo de la cuenta Binance</label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="pagos@ejemplo.com"
                                                    className={adminInput()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Binance Pay ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.payId || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, payId: e.target.value }))}
                                                    placeholder="123456789"
                                                    className={`${adminInput()} font-mono`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Nombre / Alias en Binance</label>
                                                <input
                                                    type="text"
                                                    value={formData.holderName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                                    placeholder="ElectroShopVE"
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ZELLE */}
                                    {formData.type === 'ZELLE' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                                                Datos de Zelle
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Correo Zelle</label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="zelle@ejemplo.com"
                                                    className={adminInput()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Titular de la cuenta</label>
                                                <input
                                                    type="text"
                                                    value={formData.holderName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                                    placeholder="Nombre y apellido"
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ZINLI */}
                                    {formData.type === 'ZINLI' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                                                Datos de Zinli
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Correo Zinli</label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="zinli@ejemplo.com"
                                                    className={adminInput()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Teléfono Zinli</label>
                                                <input
                                                    type="text"
                                                    value={formData.phone || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="0412-1234567"
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* PAYPAL */}
                                    {formData.type === 'PAYPAL' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                                Datos de PayPal
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Correo PayPal</label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="paypal@ejemplo.com"
                                                    className={adminInput()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Nombre de la cuenta</label>
                                                <input
                                                    type="text"
                                                    value={formData.holderName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                                    placeholder="Nombre del titular"
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* MERCANTIL_PANAMA */}
                                    {formData.type === 'MERCANTIL_PANAMA' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-brand-800 uppercase tracking-wider">
                                                Datos de Mercantil Panamá
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Número de Cuenta</label>
                                                <input
                                                    type="text"
                                                    value={formData.accountNumber || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                                    placeholder="0123456789"
                                                    className={`${adminInput()} font-mono`}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-ink mb-1">Correo Mony / Panamá</label>
                                                    <input
                                                        type="email"
                                                        value={formData.email || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                        placeholder="mony@ejemplo.com"
                                                        className={adminInput()}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-ink mb-1">Titular</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holderName || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                                        placeholder="Nombre del titular"
                                                        className={adminInput()}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* CRYPTO */}
                                    {formData.type === 'CRYPTO' && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-warning-strong uppercase tracking-wider">
                                                Datos de Billetera Cripto
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Dirección de Wallet</label>
                                                <input
                                                    type="text"
                                                    value={formData.walletAddress || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                                                    placeholder="TYDzsYUE28N4e5g6..."
                                                    className={`${adminInput()} font-mono`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Red / Blockchain</label>
                                                <input
                                                    type="text"
                                                    value={formData.network || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, network: e.target.value }))}
                                                    placeholder="USDT-TRC20, BEP20, Polygon..."
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* CASH or OTHER */}
                                    {(formData.type === 'CASH' || formData.type === 'OTHER') && (
                                        <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3">
                                            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                                                Instrucciones
                                            </h4>
                                            <div>
                                                <label className="block text-xs font-medium text-ink mb-1">Instrucciones para el cliente</label>
                                                <textarea
                                                    rows={3}
                                                    value={formData.instructions || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                                                    placeholder="Indica dónde pagar o entregar..."
                                                    className={adminInput()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Limits */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-ink mb-1">Monto Mínimo (USD, opcional)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={formData.minAmount ?? ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, minAmount: e.target.value ? Number(e.target.value) : null }))}
                                                placeholder="Ej: 5.00"
                                                className={adminInput()}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-ink mb-1">Monto Máximo (USD, opcional)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={formData.maxAmount ?? ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: e.target.value ? Number(e.target.value) : null }))}
                                                placeholder="Ej: 1000.00"
                                                className={adminInput()}
                                            />
                                        </div>
                                    </div>

                                    {/* Display Note */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                                            Nota visible para el cliente
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.displayNote || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, displayNote: e.target.value }))}
                                            placeholder="Ej: Incluir número de referencia sin guiones"
                                            className={adminInput()}
                                        />
                                    </div>

                                    {/* QR Code Upload */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                                            Código QR de Pago (Opcional)
                                        </label>
                                        <input
                                            ref={qrInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleQRUpload(file);
                                            }}
                                        />
                                        <div className="flex items-center gap-3">
                                            {formData.qrCodeImage ? (
                                                <div className="flex items-center gap-3 p-2 bg-surface rounded-xl border border-line">
                                                    <Image
                                                        src={formData.qrCodeImage}
                                                        alt="QR Preview"
                                                        width={48}
                                                        height={48}
                                                        className="rounded-lg object-contain bg-white border border-line"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, qrCodeImage: null }))}
                                                        className="text-xs text-deal hover:underline font-semibold"
                                                    >
                                                        Quitar QR
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => qrInputRef.current?.click()}
                                                    disabled={uploadingQR}
                                                    className={`inline-flex items-center gap-2 ${adminSecondaryButton}`}
                                                >
                                                    <FiUpload className="w-4 h-4" />
                                                    {uploadingQR ? 'Subiendo...' : 'Subir código QR'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active Switch */}
                                    <div className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-line">
                                        <div>
                                            <span className="text-sm font-bold text-ink block">Método Activo</span>
                                            <span className="text-xs text-muted">Disponible para que los clientes lo seleccionen</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                formData.isActive ? 'bg-success-strong' : 'bg-subtle'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                    formData.isActive ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Right column: "Así lo ve el cliente" Live Preview (5 cols) */}
                                <div className="lg:col-span-5 space-y-3">
                                    <div className="sticky top-0">
                                        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                                            <FiShield className="w-3.5 h-3.5 text-brand-600" />
                                            <span>Así lo ve el cliente</span>
                                        </div>

                                        {/* Preview Card in customer style */}
                                        <div className="bg-white rounded-xl border-2 border-brand-500 shadow-md p-4 space-y-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                                                    {formData.type === 'BINANCE_PAY' ? (
                                                        <SiBinance className="w-5 h-5 text-white" />
                                                    ) : formData.type === 'ZELLE' ? (
                                                        <SiZelle className="w-5 h-5 text-white" />
                                                    ) : formData.type === 'MOBILE_PAYMENT' ? (
                                                        <FiSmartphone className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <FiCreditCard className="w-5 h-5 text-white" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-ink text-sm truncate">
                                                        {formData.name || 'Nombre del Método'}
                                                    </h4>
                                                    <p className="text-xs text-muted">
                                                        {PAYMENT_TYPE_METADATA[formData.type || 'OTHER']?.label}
                                                    </p>
                                                </div>
                                            </div>

                                            {formData.displayNote && (
                                                <div className="p-2 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-900 font-medium">
                                                    {formData.displayNote}
                                                </div>
                                            )}

                                            {/* Preview details */}
                                            <div className="bg-surface rounded-lg p-2.5 border border-line space-y-1.5 text-xs">
                                                {formData.bankName && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Banco:</span>
                                                        <span className="font-medium text-ink">{formData.bankName}</span>
                                                    </div>
                                                )}
                                                {formData.accountNumber && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Cuenta:</span>
                                                        <span className="font-mono text-ink">{formData.accountNumber}</span>
                                                    </div>
                                                )}
                                                {formData.phone && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Teléfono:</span>
                                                        <span className="font-medium text-ink">{formData.phone}</span>
                                                    </div>
                                                )}
                                                {formData.holderId && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Cédula / RIF:</span>
                                                        <span className="font-medium text-ink">{formData.holderId}</span>
                                                    </div>
                                                )}
                                                {formData.holderName && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Titular:</span>
                                                        <span className="font-medium text-ink truncate ml-2">{formData.holderName}</span>
                                                    </div>
                                                )}
                                                {formData.email && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Correo:</span>
                                                        <span className="font-medium text-ink truncate ml-2">{formData.email}</span>
                                                    </div>
                                                )}
                                                {formData.payId && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Pay ID:</span>
                                                        <span className="font-mono font-medium text-ink">{formData.payId}</span>
                                                    </div>
                                                )}
                                                {formData.walletAddress && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Wallet:</span>
                                                        <span className="font-mono text-ink truncate ml-2 max-w-[130px]">{formData.walletAddress}</span>
                                                    </div>
                                                )}
                                                {formData.network && (
                                                    <div className="flex items-center justify-between py-0.5 border-b border-line">
                                                        <span className="text-muted">Red:</span>
                                                        <span className="font-medium text-ink">{formData.network}</span>
                                                    </div>
                                                )}
                                                {formData.instructions && (
                                                    <div className="pt-1 text-muted text-[11px]">
                                                        {formData.instructions}
                                                    </div>
                                                )}
                                            </div>

                                            {/* QR Preview in card */}
                                            {formData.qrCodeImage && (
                                                <div className="pt-1 text-center">
                                                    <p className="text-[11px] text-muted mb-1 font-medium">Escanea el código QR:</p>
                                                    <Image
                                                        src={formData.qrCodeImage}
                                                        alt="QR Preview"
                                                        width={110}
                                                        height={110}
                                                        className="mx-auto rounded-lg border border-line bg-white p-1"
                                                    />
                                                </div>
                                            )}

                                            {(formData.minAmount || formData.maxAmount) && (
                                                <p className="text-[11px] text-muted text-center pt-1">
                                                    {formData.minAmount && `Monto mínimo: ${formatUSD(Number(formData.minAmount))}`}
                                                    {formData.minAmount && formData.maxAmount && ' · '}
                                                    {formData.maxAmount && `Monto máximo: ${formatUSD(Number(formData.maxAmount))}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className={`${adminModalFooter} px-0 pb-0 mt-6`}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className={adminSecondaryButton}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`inline-flex items-center gap-2 ${adminPrimaryButton}`}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiCheck className="w-4 h-4" />
                                            <span>{editingMethod ? 'Guardar Cambios' : 'Crear Método'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
