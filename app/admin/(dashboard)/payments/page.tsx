'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconoBillete, IconoCerrar, IconoCheck, IconoEditar, IconoEliminar, IconoFlechaAbajo, IconoFlechaArriba,
  IconoInfo, IconoMas, IconoPagoMovil, IconoTarjeta, IconoWeb,
} from '@/components/iconos';
import { SiBinance, SiZelle, SiPaypal } from 'react-icons/si';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import {
    adminCard, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminSpinner
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';

// C-249b: crear y cambiar un método van por pasos en su propia página (/admin/payments/nuevo y /[id], PLAN.md §1.9);
// aquí queda la lista con sus números, activar o desactivar, el orden, eliminar y cargar los predefinidos.
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
        icon: <IconoPagoMovil className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    BANK_TRANSFER: {
        label: 'Transferencia',
        icon: <IconoTarjeta className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    BINANCE_PAY: {
        label: 'Binance Pay',
        icon: <SiBinance className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    ZELLE: {
        label: 'Zelle',
        icon: <SiZelle className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    ZINLI: {
        label: 'Zinli',
        icon: <IconoTarjeta className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    PAYPAL: {
        label: 'PayPal',
        icon: <SiPaypal className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    MERCANTIL_PANAMA: {
        label: 'Mercantil Panamá',
        icon: <IconoWeb className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-800 border-brand-200',
    },
    CRYPTO: {
        label: 'Criptomonedas',
        icon: <SiBinance className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    CASH: {
        label: 'Efectivo',
        icon: <IconoBillete className="w-5 h-5 text-brand-600" />,
        badgeClass: 'bg-success/10 text-success-strong border-success/30',
    },
    OTHER: {
        label: 'Otro',
        icon: <IconoTarjeta className="w-5 h-5 text-muted" />,
        badgeClass: 'bg-surface text-ink border-line',
    },
};


export default function PaymentsPage() {
    const { confirm } = useConfirm();
    const [methods, setMethods] = useState<AdminPaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

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
                toast.success(`${data.count} plantillas creadas e inactivas: completa tus datos y actívalas`);
                fetchMethods();
            } else if (data.count > 0) {
                toast('Ya existen métodos de pago configurados', { icon: <IconoInfo className="h-5 w-5 text-brand-600" /> });
            } else {
                toast.error(data.error || 'Error al crear métodos');
            }
        } catch (error) {
            console.error('Error seeding:', error);
            toast.error('Error de conexión');
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
                // El servidor dice qué falta (C-110): activar una plantilla vacía ya no se permite
                const data = await response.json().catch(() => ({}));
                toast.error(data.error || 'No se pudo cambiar el estado');
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

        // El orden nuevo se guarda por posición: con órdenes repetidos (todos en 0) intercambiarlos no cambiaba nada
        const reordenados = [...methods];
        [reordenados[currentIndex], reordenados[targetIndex]] = [reordenados[targetIndex], reordenados[currentIndex]];
        const cambios = reordenados
            .map((m, posicion) => ({ id: m.id, sortOrder: posicion + 1, antes: m.sortOrder }))
            .filter(c => c.sortOrder !== c.antes);

        try {
            const respuestas = await Promise.all(cambios.map(c => fetch('/api/admin/payments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, sortOrder: c.sortOrder }),
            })));
            if (respuestas.some(r => !r.ok)) toast.error('No se pudo guardar el nuevo orden');
            fetchMethods();
        } catch (error) {
            console.error('Error moving method:', error);
            toast.error('Error de conexión');
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={adminPageTitle}>Métodos de Pago</h1>
                    <p className={adminPageSubtitle}>Administra las cuentas y métodos para recargas de Puntos ES y pagos directos.</p>
                </div>
                <Link href="/admin/payments/nuevo" className={adminPrimaryButton}>
                    <IconoMas className="w-4 h-4" aria-hidden="true" />
                    Nuevo método
                </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${adminCard} p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                        <IconoTarjeta className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted font-medium uppercase tracking-wider">Total Métodos</p>
                        <p className="text-xl font-bold text-ink">{methods.length}</p>
                    </div>
                </div>

                <div className={`${adminCard} p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-success-strong shrink-0">
                        <IconoCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-muted font-medium uppercase tracking-wider">Activos</p>
                        <p className="text-xl font-bold text-ink">{activeCount}</p>
                    </div>
                </div>

                <div className={`${adminCard} p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-muted shrink-0">
                        <IconoCerrar className="w-5 h-5" />
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
                        <IconoTarjeta className="w-7 h-7" />
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
                            <IconoMas className="w-4 h-4" />
                            Cargar predefinidos
                        </button>
                        <Link href="/admin/payments/nuevo" className={`inline-flex items-center gap-2 ${adminPrimaryButton}`}>
                            <IconoMas className="w-4 h-4" />
                            Crear método
                        </Link>
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
                                            <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0 overflow-hidden">
                                                {method.logo?.startsWith('/') ? (
                                                    <Image src={method.logo} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
                                                ) : meta.icon}
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
                                                <span className="text-muted">Dirección:</span>
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
                                            <IconoFlechaArriba className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(method, 'DOWN')}
                                            disabled={index === methods.length - 1}
                                            className="p-1.5 rounded hover:bg-surface text-muted disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Mover abajo"
                                        >
                                            <IconoFlechaAbajo className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/admin/payments/${method.id}`}
                                            className={`p-1.5 text-xs font-semibold rounded-lg ${adminSecondaryButton}`}
                                            title="Editar método"
                                        >
                                            <IconoEditar className="w-3.5 h-3.5" />
                                            <span>Editar</span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(method)}
                                            className="p-2 text-deal hover:bg-deal-bg rounded-lg transition-colors"
                                            title="Eliminar método"
                                        >
                                            <IconoEliminar className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
