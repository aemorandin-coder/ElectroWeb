'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiArrowLeft, FiSend, FiCheck, FiPackage, FiClock,
    FiAlertCircle, FiUser, FiMail, FiPhone, FiMonitor, FiCopy,
    FiPlus, FiTrash2, FiEdit
} from 'react-icons/fi';
import { BsNintendoSwitch } from 'react-icons/bs';
import { SiSteam, SiPlaystation, SiRoblox } from 'react-icons/si';
import { FaGamepad } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
    adminSecondaryButton,
    adminPageTitle,
    adminPageSubtitle,
    adminSectionTitle,
    adminStatCard,
    adminStatLabel,
    adminStatValue,
    adminIconChip,
    adminPrimaryButton,
    adminInput,
    adminLabel,
    adminBadge,
    adminNotice,
    adminSpinner,
} from '@/lib/admin-ui';
import { DIGITAL_PROVIDERS } from '@/lib/digital-catalog';
import { formatUSD } from '@/lib/currency';


interface DigitalCode {
    id: string;
    code: string;
    status: string;
    deliveredAt: string | null;
    notes: string | null;
}

interface DigitalItem {
    orderItemId: string;
    productId: string;
    productName: string;
    platform: string | null;
    region: string | null;
    image: string | null;
    quantity: number;
    codes: DigitalCode[];
    // Compra al proveedor (C-60b): solo llega al equipo
    supplier?: string | null;
    supplierOrderRef?: string | null;
    supplierCostUSD?: number | null;
}

// Formulario de entrega por artículo. Proveedor, referencia y costo son opcionales (C-60b).
type EntregaForm = { code: string; notes: string; supplier: string; supplierOrderRef: string; supplierCostUSD: string };
const FORM_VACIO: EntregaForm = { code: '', notes: '', supplier: '', supplierOrderRef: '', supplierCostUSD: '' };

/** "Eneba · Ref. 123 · Costo $9,00", o null si no se anotó nada. */
function compraProveedor(item: DigitalItem): string | null {
    const partes = [
        item.supplier ? DIGITAL_PROVIDERS.find((p) => p.value === item.supplier)?.label ?? item.supplier : null,
        item.supplierOrderRef ? `Ref. ${item.supplierOrderRef}` : null,
        item.supplierCostUSD != null ? `Costo ${formatUSD(item.supplierCostUSD)}` : null,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(' · ') : null;
}

interface OrderData {
    orderId: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    digitalItems: DigitalItem[];
    isDelivered: boolean;
    customer?: {
        name: string;
        email: string;
        phone?: string;
    };
}

const platformIcons: Record<string, React.ReactNode> = {
    STEAM: <SiSteam className="w-5 h-5" />,
    PLAYSTATION: <SiPlaystation className="w-5 h-5" />,
    PSN: <SiPlaystation className="w-5 h-5" />,
    XBOX: <FaGamepad className="w-5 h-5" />,
    NINTENDO: <BsNintendoSwitch className="w-5 h-5" />,
    ROBLOX: <SiRoblox className="w-5 h-5" />,
};

export default function AdminDigitalCodesPage() {
    const { id: orderId } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [data, setData] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState<string | null>(null);

    // Form state for adding new codes
    const [newCodes, setNewCodes] = useState<Record<string, EntregaForm>>({});

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?redirect=admin');
            return;
        }

        if (status === 'authenticated') {
            const userRole = (session?.user as any)?.role;
            if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
                router.push('/');
                return;
            }
            fetchOrderData();
        }
    }, [status, session]);

    const fetchOrderData = async () => {
        try {
            const response = await fetch(`/api/orders/${orderId}/digital?orderId=${orderId}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);

                // Initialize newCodes state for items without codes (using orderItemId as key)
                const initialCodes: Record<string, EntregaForm> = {};
                result.digitalItems.forEach((item: DigitalItem) => {
                    if (item.codes.length < item.quantity) {
                        initialCodes[item.orderItemId] = FORM_VACIO;
                    }
                });
                setNewCodes(initialCodes);
            } else {
                toast.error('Error al cargar los datos');
                router.push('/admin/orders');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const sendCode = async (orderItemId: string) => {
        const codeData = newCodes[orderItemId];
        if (!codeData?.code.trim()) {
            toast.error('Ingresa un código válido');
            return;
        }

        const costoTexto = codeData.supplierCostUSD.trim().replace(',', '.');
        const costo = costoTexto ? Number(costoTexto) : null;
        if (costo !== null && !(Number.isFinite(costo) && costo >= 0)) {
            toast.error('El costo del proveedor debe ser un monto en USD');
            return;
        }

        setSending(orderItemId);
        try {
            const response = await fetch(`/api/orders/${orderId}/digital`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    orderItemId,
                    code: codeData.code.trim(),
                    notes: codeData.notes.trim() || null,
                    supplier: codeData.supplier || null,
                    supplierOrderRef: codeData.supplierOrderRef.trim() || null,
                    supplierCostUSD: costo,
                }),
            });

            if (response.ok) {
                toast.success('¡Código enviado exitosamente!');
                // Clear the form and refresh data
                setNewCodes(prev => ({
                    ...prev,
                    [orderItemId]: FORM_VACIO
                }));
                fetchOrderData();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al enviar código');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error de conexión');
        } finally {
            setSending(null);
        }
    };

    const setCampo = (orderItemId: string, campo: keyof EntregaForm, valor: string) =>
        setNewCodes(prev => ({ ...prev, [orderItemId]: { ...(prev[orderItemId] ?? FORM_VACIO), [campo]: valor } }));

    const getPlatformIcon = (platform: string | null) => {
        if (!platform) return <FaGamepad className="w-5 h-5" />;
        return platformIcons[platform.toUpperCase()] || <FaGamepad className="w-5 h-5" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className={adminSpinner}></div>
                    <p className="text-muted">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <FiAlertCircle className="w-16 h-16 text-deal mx-auto mb-4" />
                <h1 className="text-xl font-bold text-ink mb-2">Orden no encontrada</h1>
                <Link href="/admin/orders" className="text-brand-600 hover:underline">
                    Volver a órdenes
                </Link>
            </div>
        );
    }

    const isPaid = data.paymentStatus === 'PAID';
    const pendingItems = data.digitalItems.filter(item => item.codes.length < item.quantity);
    const completedItems = data.digitalItems.filter(item => item.codes.length >= item.quantity);

    return (
        <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/admin/orders"
                    className={`${adminSecondaryButton} mb-4`}
                >
                    <FiArrowLeft /> Volver a órdenes
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className={`${adminIconChip('brand')} hidden sm:flex`}>
                                <FiMonitor className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <h1 className={adminPageTitle}>
                                    Códigos digitales
                                </h1>
                                <p className={adminPageSubtitle}>Orden #{data.orderNumber}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={adminBadge(isPaid ? 'success' : 'warning')}>
                            {isPaid ? <><FiCheck className="inline h-4 w-4 shrink-0 mr-1" aria-hidden="true" />Pagado</> : <><FiClock className="inline h-4 w-4 shrink-0 mr-1" aria-hidden="true" />Pendiente de pago</>}
                        </span>
                    </div>
                </div>
            </div>

            {/* Warning if not paid */}
            {!isPaid && (
                <div className={`mb-6 flex items-start gap-3 ${adminNotice('warning')}`}>
                    <FiAlertCircle className="w-5 h-5 text-warning-strong flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-warning-strong">Orden no pagada</p>
                        <p className="text-sm text-warning-strong">
                            No puedes enviar códigos hasta que el pago sea confirmado.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
                <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
                    <span className={`${adminIconChip('brand')} hidden sm:flex`}>
                        <FiPackage className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{data.digitalItems.length}</p>
                        <p className={adminStatLabel}>Productos digitales</p>
                    </div>
                </div>
                <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
                    <span className={`${adminIconChip('warning')} hidden sm:flex`}>
                        <FiClock className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{pendingItems.length}</p>
                        <p className={adminStatLabel}>Pendientes</p>
                    </div>
                </div>
                <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
                    <span className={`${adminIconChip('success')} hidden sm:flex`}>
                        <FiCheck className="w-5 h-5" />
                    </span>
                    <div>
                        <p className={adminStatValue}>{completedItems.length}</p>
                        <p className={adminStatLabel}>Entregados</p>
                    </div>
                </div>
            </div>

            {/* Pending Items - Need to send codes */}
            {pendingItems.length > 0 && (
                <div className="mb-8">
                    <h2 className={`${adminSectionTitle} mb-4 flex items-center gap-2`}>
                        <FiClock className="text-warning-strong" />
                        Pendientes de Envío ({pendingItems.length})
                    </h2>

                    <div className="space-y-4">
                        {pendingItems.map((item, index) => (
                            <div
                                key={item.orderItemId}
                                className="bg-white rounded-xl border border-warning/30 overflow-hidden"
                            >
                                <div className="p-4 bg-warning/10 border-b border-warning/20">
                                    <div className="flex items-center gap-4">
                                        {item.image && (
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-line flex-shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.productName}
                                                    width={56}
                                                    height={56}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                            <div className="flex items-center gap-2 text-sm text-ink-soft mb-1">
                                                {getPlatformIcon(item.platform)}
                                                <span>{item.platform || 'Digital'}</span>
                                                {item.region && (
                                                    <>
                                                        <span className="text-subtle">•</span>
                                                        <span>{item.region}</span>
                                                    </>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-ink">{item.productName}</h3>
                                            <p className="text-sm text-muted">
                                                {item.codes.length} de {item.quantity} código(s) enviado(s)
                                            </p>
                                            {compraProveedor(item) && <p className="text-xs text-muted">{compraProveedor(item)}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Send Code Form */}
                                <div className="p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className={adminLabel}>
                                                Código Digital *
                                            </label>
                                            <input
                                                type="text"
                                                value={newCodes[item.orderItemId]?.code || ''}
                                                onChange={(e) => setNewCodes(prev => ({
                                                    ...prev,
                                                    [item.orderItemId]: { ...prev[item.orderItemId], code: e.target.value }
                                                }))}
                                                placeholder="Ej: XXXX-XXXX-XXXX-XXXX"
                                                className={`${adminInput()} font-mono`}
                                                disabled={!isPaid || sending === item.orderItemId}
                                            />
                                        </div>

                                        <div>
                                            <label className={adminLabel}>
                                                Notas internas (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={newCodes[item.orderItemId]?.notes || ''}
                                                onChange={(e) => setNewCodes(prev => ({
                                                    ...prev,
                                                    [item.orderItemId]: { ...prev[item.orderItemId], notes: e.target.value }
                                                }))}
                                                placeholder="Ej: Código de Steam, válido hasta..."
                                                className={adminInput()}
                                                disabled={!isPaid || sending === item.orderItemId}
                                            />
                                        </div>

                                        {/* Compra al proveedor (C-60b): opcional, solo la ve el equipo */}
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div>
                                                <label htmlFor={`proveedor-${item.orderItemId}`} className={adminLabel}>Proveedor</label>
                                                <select
                                                    id={`proveedor-${item.orderItemId}`}
                                                    value={newCodes[item.orderItemId]?.supplier || ''}
                                                    onChange={(e) => setCampo(item.orderItemId, 'supplier', e.target.value)}
                                                    className={adminInput()}
                                                    disabled={!isPaid || sending === item.orderItemId}
                                                >
                                                    <option value="">Sin indicar</option>
                                                    {DIGITAL_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor={`referencia-${item.orderItemId}`} className={adminLabel}>Referencia de compra</label>
                                                <input
                                                    id={`referencia-${item.orderItemId}`}
                                                    type="text"
                                                    maxLength={120}
                                                    value={newCodes[item.orderItemId]?.supplierOrderRef || ''}
                                                    onChange={(e) => setCampo(item.orderItemId, 'supplierOrderRef', e.target.value)}
                                                    placeholder="N.º de pedido"
                                                    className={adminInput()}
                                                    disabled={!isPaid || sending === item.orderItemId}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`costo-${item.orderItemId}`} className={adminLabel}>Costo (USD)</label>
                                                <input
                                                    id={`costo-${item.orderItemId}`}
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={newCodes[item.orderItemId]?.supplierCostUSD || ''}
                                                    onChange={(e) => setCampo(item.orderItemId, 'supplierCostUSD', e.target.value)}
                                                    placeholder="0,00"
                                                    className={adminInput()}
                                                    disabled={!isPaid || sending === item.orderItemId}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => sendCode(item.orderItemId)}
                                            disabled={!isPaid || sending === item.orderItemId || !newCodes[item.orderItemId]?.code}
                                            className={`${index === 0 ? adminPrimaryButton : adminSecondaryButton} w-full`}
                                        >
                                            {sending === item.orderItemId ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSend className="w-4 h-4" />
                                                    Enviar Código al Cliente
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Items - Already sent */}
            {completedItems.length > 0 && (
                <div>
                    <h2 className={`${adminSectionTitle} mb-4 flex items-center gap-2`}>
                        <FiCheck className="text-success-strong" />
                        Códigos Entregados ({completedItems.length})
                    </h2>

                    <div className="space-y-4">
                        {completedItems.map((item) => (
                            <div
                                key={item.orderItemId}
                                className="bg-white rounded-xl border border-success-strong/20 overflow-hidden"
                            >
                                <div className="p-4 bg-success-strong/10 border-b border-success-strong/20">
                                    <div className="flex items-center gap-4">
                                        {item.image && (
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-line flex-shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.productName}
                                                    width={56}
                                                    height={56}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                            <div className="flex items-center gap-2 text-sm text-ink-soft mb-1">
                                                {getPlatformIcon(item.platform)}
                                                <span>{item.platform || 'Digital'}</span>
                                            </div>
                                            <h3 className="font-semibold text-ink">{item.productName}</h3>
                                            {compraProveedor(item) && <p className="text-xs text-muted">{compraProveedor(item)}</p>}
                                        </div>
                                        <div className={adminBadge('success')}>
                                            <FiCheck className="inline h-4 w-4 shrink-0" aria-hidden="true" />Entregado
                                        </div>
                                    </div>
                                </div>

                                {/* Show sent codes */}
                                <div className="p-4 space-y-2">
                                    {item.codes.map((code) => (
                                        <div
                                            key={code.id}
                                            className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3"
                                        >
                                            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                                <p className="font-mono text-sm text-ink">{code.code}</p>
                                                {code.notes && (
                                                    <p className="text-xs text-muted mt-1">{code.notes}</p>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {code.deliveredAt && new Date(code.deliveredAt).toLocaleDateString('es-VE')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All delivered message */}
            {data.isDelivered && (
                <div className={`mt-8 p-6 text-center ${adminNotice('success')}`}>
                    <FiCheck className="w-12 h-12 text-success-strong mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-success-strong mb-1">
                        Todos los códigos entregados
                    </h3>
                    <p className="text-sm text-success-strong/80">
                        El cliente ha recibido todos sus códigos digitales.
                    </p>
                </div>
            )}
        </div>
    );
}
