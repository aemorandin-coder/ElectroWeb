'use client';

import { useState, useEffect, useRef } from 'react';
import {
    FiPlus, FiEdit2, FiTrash2, FiCreditCard, FiSmartphone, FiDollarSign,
    FiMoreHorizontal, FiToggleLeft, FiToggleRight, FiUpload, FiImage,
    FiCheck, FiX, FiInfo, FiMove
} from 'react-icons/fi';
import { SiPaypal, SiBitcoin, SiEthereum } from 'react-icons/si';
import { FaBuildingColumns, FaMobile, FaQrcode, FaMoneyBillWave } from 'react-icons/fa6';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface PaymentMethod {
    id: string;
    type: string;
    name: string;
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    holderName?: string;
    holderId?: string;
    phone?: string;
    email?: string;
    walletAddress?: string;
    network?: string;
    instructions?: string;
    logo?: string;
    qrCodeImage?: string;
    sortOrder?: number;
    minAmount?: number;
    maxAmount?: number;
    displayNote?: string;
    isActive: boolean;
}

const PAYMENT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
    BANK_TRANSFER: {
        icon: <FaBuildingColumns className="w-5 h-5" />,
        label: 'Transferencia Bancaria',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    MOBILE_PAYMENT: {
        icon: <FaMobile className="w-5 h-5" />,
        label: 'Pago Móvil',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    ZELLE: {
        // Zelle logo real: Z con líneas horizontales atravesándola (como símbolo de dólar)
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 5h14v2h-9.5l9.5 10v2H5v-2h9.5L5 7V5z" />
                <rect x="10" y="2" width="4" height="2" rx="0.5" />
                <rect x="10" y="20" width="4" height="2" rx="0.5" />
            </svg>
        ),
        label: 'Zelle',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    PAYPAL: {
        icon: <SiPaypal className="w-5 h-5" />,
        label: 'PayPal',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    CRYPTO: {
        icon: <SiBitcoin className="w-5 h-5" />,
        label: 'Criptomonedas',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    CASH: {
        icon: <FaMoneyBillWave className="w-5 h-5" />,
        label: 'Efectivo',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    MERCANTIL_PANAMA: {
        // Mercantil Panamá logo real: Ala/media luna curva azul-naranja
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M4 12c0-4.4 3.6-8 8-8 2.2 0 4.2.9 5.7 2.3L12 12l5.7 5.7c-1.5 1.4-3.5 2.3-5.7 2.3-4.4 0-8-3.6-8-8z" fill="currentColor" />
                <path d="M12 12l5.7-5.7c1.4 1.5 2.3 3.5 2.3 5.7s-.9 4.2-2.3 5.7L12 12z" fill="currentColor" opacity="0.6" />
            </svg>
        ),
        label: 'Mercantil Panamá',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
    OTHER: {
        icon: <FiCreditCard className="w-5 h-5" />,
        label: 'Otro',
        color: 'text-[#2a63cd]',
        bgColor: 'bg-blue-100'
    },
};

export default function PaymentsPage() {
    const { confirm } = useConfirm();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [uploadingQR, setUploadingQR] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const qrInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<PaymentMethod>>({
        type: 'BANK_TRANSFER',
        name: '',
        isActive: true,
        sortOrder: 0
    });

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/payments');
            if (response.ok) {
                const data = await response.json();
                console.log('Payment methods loaded:', data.length, 'methods');
                // Sort by sortOrder
                data.sort((a: PaymentMethod, b: PaymentMethod) => (a.sortOrder || 0) - (b.sortOrder || 0));
                setMethods(data);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error:', response.status, errorData);
                toast.error(errorData.error || 'Error al cargar métodos de pago');
            }
        } catch (error) {
            console.error('Error fetching methods:', error);
            toast.error('Error de conexión al cargar métodos de pago');
        } finally {
            setLoading(false);
        }
    };

    const seedInitialMethods = async () => {
        try {
            const response = await fetch('/api/admin/payments/seed', {
                method: 'POST',
            });
            const data = await response.json();

            if (data.seeded) {
                toast.success(`✨ ${data.count} métodos de pago creados exitosamente`);
                fetchMethods();
            } else if (data.count > 0) {
                toast('Ya existen métodos de pago configurados', { icon: 'ℹ️' });
            } else {
                toast.error(data.error || 'Error al crear métodos');
            }
        } catch (error) {
            console.error('Error seeding:', error);
            toast.error('Error de conexión');
        }
    };

    const handleImageUpload = async (file: File, field: 'qrCodeImage' | 'logo') => {
        const setUploading = field === 'qrCodeImage' ? setUploadingQR : setUploadingLogo;
        setUploading(true);

        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('folder', 'payment-methods');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload,
            });

            if (response.ok) {
                const data = await response.json();
                setFormData(prev => ({ ...prev, [field]: data.url }));
                toast.success(`${field === 'qrCodeImage' ? 'Código QR' : 'Logo'} subido correctamente`);
            } else {
                toast.error('Error al subir imagen');
            }
        } catch (error) {
            console.error('Error uploading:', error);
            toast.error('Error al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = '/api/admin/payments';
            const method = editingMethod ? 'PATCH' : 'POST';
            const body = editingMethod ? { ...formData, id: editingMethod.id } : formData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                toast.success(editingMethod ? 'Método actualizado' : 'Método creado');
                closeModal();
                fetchMethods();
            } else {
                toast.error('Error al guardar');
            }
        } catch (error) {
            console.error('Error saving method:', error);
            toast.error('Error de conexión');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Eliminar Método de Pago',
            message: '¿Estás seguro de eliminar este método de pago? Esta acción no se puede deshacer.',
            confirmText: 'Sí, Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmed) return;
        try {
            const response = await fetch(`/api/admin/payments?id=${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                toast.success('Método eliminado');
                fetchMethods();
            }
        } catch (error) {
            console.error('Error deleting method:', error);
        }
    };

    const handleEdit = (method: PaymentMethod) => {
        setEditingMethod(method);
        setFormData(method);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingMethod(null);
        setFormData({ type: 'BANK_TRANSFER', name: '', isActive: true, sortOrder: 0 });
    };

    const toggleStatus = async (method: PaymentMethod) => {
        try {
            const response = await fetch('/api/admin/payments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: method.id, isActive: !method.isActive }),
            });
            if (response.ok) {
                toast.success(method.isActive ? 'Método desactivado' : 'Método activado');
                fetchMethods();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const getTypeConfig = (type: string) => {
        return PAYMENT_TYPE_CONFIG[type] || PAYMENT_TYPE_CONFIG.OTHER;
    };

    // Count stats
    const activeCount = methods.filter(m => m.isActive).length;
    const inactiveCount = methods.filter(m => !m.isActive).length;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 space-y-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Métodos de Pago</h1>
                        <p className="text-sm text-gray-500 mt-1">Configura los métodos de pago disponibles para tus clientes</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingMethod(null);
                            setFormData({ type: 'BANK_TRANSFER', name: '', isActive: true, sortOrder: methods.length });
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-xl hover:shadow-lg hover:shadow-[#2a63cd]/25 transition-all flex items-center gap-2 font-medium"
                    >
                        <FiPlus className="w-5 h-5" /> Nuevo Método
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FiCreditCard className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{methods.length}</p>
                                <p className="text-xs text-gray-500">Total Métodos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <FiCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                                <p className="text-xs text-gray-500">Activos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FiX className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
                                <p className="text-xs text-gray-500">Inactivos</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Methods Grid */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : methods.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-gray-200">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                            <FiCreditCard className="w-10 h-10 text-[#2a63cd]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay métodos de pago</h3>
                        <p className="text-sm text-gray-500 mb-6 px-6 text-center max-w-md">
                            Configura los métodos de pago para que tus clientes puedan realizar compras
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={seedInitialMethods}
                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.08 5.1 7.63 12 4.18z" />
                                </svg>
                                Cargar Predefinidos
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-5 py-2.5 bg-[#2a63cd] text-white rounded-xl hover:bg-[#1e4ba3] transition-all flex items-center gap-2 font-medium"
                            >
                                <FiPlus className="w-5 h-5" /> Crear Manual
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                            <FiInfo className="w-3 h-3" />
                            Los predefinidos incluyen: Transferencia, Pago Móvil, Cripto, Mercantil Panamá y Zelle
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {methods.map((method) => {
                            const config = getTypeConfig(method.type);
                            return (
                                <div
                                    key={method.id}
                                    className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all group relative ${!method.isActive ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-gray-200'
                                        }`}
                                >
                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${method.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {method.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgColor} ${config.color}`}>
                                            {method.logo ? (
                                                <Image src={method.logo} alt={method.name} width={32} height={32} className="rounded-lg object-cover" />
                                            ) : (
                                                config.icon
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-16">
                                            <h3 className="font-bold text-gray-900 truncate">{method.name}</h3>
                                            <p className="text-xs text-gray-500 font-medium">{config.label}</p>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 text-sm mb-4">
                                        {method.bankName && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Banco:</span>
                                                <span className="font-medium text-gray-900">{method.bankName}</span>
                                            </div>
                                        )}
                                        {method.accountNumber && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Cuenta:</span>
                                                <span className="font-medium text-gray-900 font-mono text-xs">{method.accountNumber}</span>
                                            </div>
                                        )}
                                        {method.phone && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Teléfono:</span>
                                                <span className="font-medium text-gray-900">{method.phone}</span>
                                            </div>
                                        )}
                                        {method.holderId && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Cédula/RIF:</span>
                                                <span className="font-medium text-gray-900">{method.holderId}</span>
                                            </div>
                                        )}
                                        {method.email && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Email:</span>
                                                <span className="font-medium text-gray-900 truncate max-w-[150px]">{method.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* QR Code Preview */}
                                    {method.qrCodeImage && (
                                        <div className="mb-4 p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                                            <FaQrcode className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs text-gray-600">Código QR disponible</span>
                                        </div>
                                    )}

                                    {/* Display Note */}
                                    {method.displayNote && (
                                        <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-700">{method.displayNote}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => toggleStatus(method)}
                                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${method.isActive
                                                ? 'text-gray-600 hover:bg-gray-100'
                                                : 'text-green-600 hover:bg-green-50'
                                                }`}
                                        >
                                            {method.isActive ? (
                                                <>
                                                    <FiToggleRight className="w-4 h-4" /> Desactivar
                                                </>
                                            ) : (
                                                <>
                                                    <FiToggleLeft className="w-4 h-4" /> Activar
                                                </>
                                            )}
                                        </button>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(method)}
                                                className="p-2 text-gray-400 hover:text-[#2a63cd] hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <FiEdit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(method.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
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
            </div>

            {/* Modal - Using Portal-like positioning */}
            {isModalOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
                        onClick={closeModal}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Modal Content */}
                    <div
                        className="fixed inset-0 z-[10000] overflow-y-auto"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div
                                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {editingMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">Configura los detalles del método de pago</p>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <FiX className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                                    {/* Type Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">Tipo de Método</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {Object.entries(PAYMENT_TYPE_CONFIG).map(([type, config]) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center min-h-[80px] ${formData.type === type
                                                        ? 'border-[#2a63cd] bg-blue-50 shadow-md'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 ${config.bgColor} ${config.color}`}>
                                                        {config.icon}
                                                    </div>
                                                    <span className={`text-[10px] font-medium leading-tight text-center line-clamp-2 ${formData.type === type ? 'text-[#2a63cd]' : 'text-gray-600'}`}>
                                                        {config.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">Nombre para mostrar *</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ej: Banco de Venezuela"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] text-base"
                                            required
                                        />
                                    </div>

                                    {/* Conditional Fields based on Type */}
                                    {(formData.type === 'BANK_TRANSFER' || formData.type === 'MOBILE_PAYMENT') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Banco</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankName || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                                    placeholder="Banco de Venezuela"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Cédula / RIF</label>
                                                <input
                                                    type="text"
                                                    value={formData.holderId || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, holderId: e.target.value }))}
                                                    placeholder="V-12345678"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {formData.type === 'BANK_TRANSFER' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Número de Cuenta</label>
                                                <input
                                                    type="text"
                                                    value={formData.accountNumber || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                                    placeholder="0102-0000-00-0000000000"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Tipo de Cuenta</label>
                                                <select
                                                    value={formData.accountType || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                                >
                                                    <option value="">Seleccionar</option>
                                                    <option value="Corriente">Corriente</option>
                                                    <option value="Ahorro">Ahorro</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {formData.type === 'MOBILE_PAYMENT' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Teléfono (Pago Móvil)</label>
                                                <input
                                                    type="text"
                                                    value={formData.phone || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="0412-1234567"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                                />
                                            </div>

                                            {/* QR Code Upload */}
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                    <FaQrcode className="inline w-4 h-4 mr-2" />
                                                    Código QR (Pago Móvil)
                                                </label>
                                                <div className="flex items-start gap-4">
                                                    {formData.qrCodeImage ? (
                                                        <div className="relative flex-shrink-0">
                                                            <Image
                                                                src={formData.qrCodeImage}
                                                                alt="QR Code"
                                                                width={120}
                                                                height={120}
                                                                className="rounded-lg border border-gray-200"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, qrCodeImage: undefined }))}
                                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                                            >
                                                                <FiX className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => qrInputRef.current?.click()}
                                                            className="w-32 h-32 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#2a63cd] hover:bg-blue-50/50 transition-colors"
                                                        >
                                                            {uploadingQR ? (
                                                                <div className="w-6 h-6 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <FaQrcode className="w-8 h-8 text-gray-400 mb-2" />
                                                                    <span className="text-xs text-gray-500">Subir QR</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <input
                                                        ref={qrInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'qrCodeImage')}
                                                        className="hidden"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-600 mb-2">
                                                            Sube una imagen del código QR de tu Pago Móvil para que los clientes puedan escanearlo directamente.
                                                        </p>
                                                        <p className="text-xs text-gray-400">Formatos: JPG, PNG. Máximo 2MB.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(formData.type === 'ZELLE' || formData.type === 'PAYPAL') && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="correo@ejemplo.com"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                            />
                                        </div>
                                    )}

                                    {formData.type === 'CRYPTO' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Dirección de Wallet</label>
                                                <input
                                                    type="text"
                                                    value={formData.walletAddress || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                                                    placeholder="0x..."
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Red</label>
                                                <select
                                                    value={formData.network || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, network: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                                >
                                                    <option value="">Seleccionar red</option>
                                                    <option value="BTC">Bitcoin (BTC)</option>
                                                    <option value="ETH">Ethereum (ETH)</option>
                                                    <option value="BSC">Binance Smart Chain (BSC)</option>
                                                    <option value="USDT-TRC20">USDT (TRC20 - Tron)</option>
                                                    <option value="USDT-ERC20">USDT (ERC20 - Ethereum)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Instructions */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">Instrucciones (internas)</label>
                                        <textarea
                                            value={formData.instructions || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                                            placeholder="Notas internas para el equipo..."
                                            rows={2}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] resize-none"
                                        />
                                    </div>

                                    {/* Display Note */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            <FiInfo className="inline w-4 h-4 mr-1" />
                                            Nota para el cliente
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.displayNote || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, displayNote: e.target.value }))}
                                            placeholder="Ej: Incluir número de referencia en el concepto"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Este texto será visible para los clientes en el checkout.</p>
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div>
                                            <p className="font-semibold text-gray-900">Estado Activo</p>
                                            <p className="text-sm text-gray-500">Este método estará disponible en el checkout</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                            className={`relative w-14 h-7 rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${formData.isActive ? 'left-8' : 'left-1'
                                                }`} />
                                        </button>
                                    </div>
                                </form>

                                {/* Actions - Fixed at bottom */}
                                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        onClick={handleSubmit}
                                        className="flex-1 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-xl hover:shadow-lg font-semibold transition-all"
                                    >
                                        {editingMethod ? 'Guardar Cambios' : 'Crear Método'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
