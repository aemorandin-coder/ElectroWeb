'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiArrowLeft, FiSend, FiCheck, FiPackage, FiClock,
    FiAlertCircle, FiUser, FiMail, FiPhone, FiZap, FiCopy,
    FiPlus, FiTrash2, FiEdit
} from 'react-icons/fi';
import { SiSteam, SiPlaystation, SiNintendoswitch, SiRoblox } from 'react-icons/si';
import { FaGamepad } from 'react-icons/fa';
import toast from 'react-hot-toast';

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
    NINTENDO: <SiNintendoswitch className="w-5 h-5" />,
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
    const [newCodes, setNewCodes] = useState<Record<string, { code: string; notes: string }>>({});

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
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
                const initialCodes: Record<string, { code: string; notes: string }> = {};
                result.digitalItems.forEach((item: DigitalItem) => {
                    if (item.codes.length < item.quantity) {
                        initialCodes[item.orderItemId] = { code: '', notes: '' };
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
                }),
            });

            if (response.ok) {
                toast.success('¡Código enviado exitosamente!');
                // Clear the form and refresh data
                setNewCodes(prev => ({
                    ...prev,
                    [orderItemId]: { code: '', notes: '' }
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

    const getPlatformIcon = (platform: string | null) => {
        if (!platform) return <FaGamepad className="w-5 h-5" />;
        return platformIcons[platform.toUpperCase()] || <FaGamepad className="w-5 h-5" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <FiAlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-800 mb-2">Orden no encontrada</h1>
                <Link href="/admin/orders" className="text-blue-600 hover:underline">
                    Volver a órdenes
                </Link>
            </div>
        );
    }

    const isPaid = data.paymentStatus === 'PAID';
    const pendingItems = data.digitalItems.filter(item => item.codes.length < item.quantity);
    const completedItems = data.digitalItems.filter(item => item.codes.length >= item.quantity);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/admin/orders"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
                >
                    <FiArrowLeft /> Volver a órdenes
                </Link>

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white">
                                <FiZap className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Códigos Digitales
                                </h1>
                                <p className="text-gray-500">Orden #{data.orderNumber}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${isPaid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {isPaid ? '✓ Pagado' : '⏳ Pendiente de pago'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Warning if not paid */}
            {!isPaid && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800">Orden no pagada</p>
                        <p className="text-sm text-yellow-700">
                            No puedes enviar códigos hasta que el pago sea confirmado.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FiPackage className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{data.digitalItems.length}</p>
                            <p className="text-xs text-gray-500">Productos digitales</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <FiClock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{pendingItems.length}</p>
                            <p className="text-xs text-gray-500">Pendientes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FiCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{completedItems.length}</p>
                            <p className="text-xs text-gray-500">Entregados</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Items - Need to send codes */}
            {pendingItems.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiClock className="text-amber-500" />
                        Pendientes de Envío ({pendingItems.length})
                    </h2>

                    <div className="space-y-4">
                        {pendingItems.map((item) => (
                            <div
                                key={item.orderItemId}
                                className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden"
                            >
                                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                                    <div className="flex items-center gap-4">
                                        {item.image && (
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.productName}
                                                    width={56}
                                                    height={56}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                {getPlatformIcon(item.platform)}
                                                <span>{item.platform || 'Digital'}</span>
                                                {item.region && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <span>{item.region}</span>
                                                    </>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                                            <p className="text-sm text-gray-500">
                                                {item.codes.length} de {item.quantity} código(s) enviado(s)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Send Code Form */}
                                <div className="p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                disabled={!isPaid || sending === item.orderItemId}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                disabled={!isPaid || sending === item.orderItemId}
                                            />
                                        </div>

                                        <button
                                            onClick={() => sendCode(item.orderItemId)}
                                            disabled={!isPaid || sending === item.orderItemId || !newCodes[item.orderItemId]?.code}
                                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${isPaid && newCodes[item.orderItemId]?.code
                                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
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
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiCheck className="text-green-500" />
                        Códigos Entregados ({completedItems.length})
                    </h2>

                    <div className="space-y-4">
                        {completedItems.map((item) => (
                            <div
                                key={item.orderItemId}
                                className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden"
                            >
                                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                                    <div className="flex items-center gap-4">
                                        {item.image && (
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.productName}
                                                    width={56}
                                                    height={56}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                {getPlatformIcon(item.platform)}
                                                <span>{item.platform || 'Digital'}</span>
                                            </div>
                                            <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                                        </div>
                                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                            ✓ Entregado
                                        </div>
                                    </div>
                                </div>

                                {/* Show sent codes */}
                                <div className="p-4 space-y-2">
                                    {item.codes.map((code, idx) => (
                                        <div
                                            key={code.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="font-mono text-sm text-gray-800">{code.code}</p>
                                                {code.notes && (
                                                    <p className="text-xs text-gray-500 mt-1">{code.notes}</p>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400">
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
                <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 text-center">
                    <FiCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-green-800 mb-1">
                        ¡Todos los códigos han sido entregados!
                    </h3>
                    <p className="text-sm text-green-600">
                        El cliente ha recibido todos sus códigos digitales.
                    </p>
                </div>
            )}
        </div>
    );
}
