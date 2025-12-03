'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCreditCard, FiSmartphone, FiDollarSign, FiCpu, FiMoreHorizontal, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';

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
    isActive: boolean;
}

export default function PaymentsPage() {
    const { confirm } = useConfirm();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [formData, setFormData] = useState<Partial<PaymentMethod>>({
        type: 'BANK_TRANSFER',
        name: '',
        isActive: true
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
                setMethods(data);
            }
        } catch (error) {
            console.error('Error fetching methods:', error);
        } finally {
            setLoading(false);
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
                setIsModalOpen(false);
                setEditingMethod(null);
                setFormData({ type: 'BANK_TRANSFER', name: '', isActive: true });
                fetchMethods();
            } else {
                toast.error('Error al guardar');
            }
        } catch (error) {
            console.error('Error saving method:', error);
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

    const toggleStatus = async (method: PaymentMethod) => {
        try {
            const response = await fetch('/api/admin/payments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: method.id, isActive: !method.isActive }),
            });
            if (response.ok) {
                fetchMethods();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'BANK_TRANSFER': return <FiCreditCard className="w-5 h-5" />;
            case 'MOBILE_PAYMENT': return <FiSmartphone className="w-5 h-5" />;
            case 'CASH': return <FiDollarSign className="w-5 h-5" />;
            case 'CRYPTO': return <FiCpu className="w-5 h-5" />;
            default: return <FiCreditCard className="w-5 h-5" />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Métodos de Pago</h1>
                <button
                    onClick={() => {
                        setEditingMethod(null);
                        setFormData({ type: 'BANK_TRANSFER', name: '', isActive: true });
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <FiPlus /> Nuevo Método
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {methods.map((method) => (
                    <div key={method.id} className={`bg-white rounded-xl border p-6 shadow-sm relative group ${!method.isActive ? 'opacity-75 bg-gray-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                {getIcon(method.type)}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleStatus(method)} className="text-gray-400 hover:text-blue-600">
                                    {method.isActive ? <FiToggleRight className="w-6 h-6 text-green-500" /> : <FiToggleLeft className="w-6 h-6" />}
                                </button>
                                <button onClick={() => handleEdit(method)} className="text-gray-400 hover:text-blue-600">
                                    <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(method.id)} className="text-gray-400 hover:text-red-600">
                                    <FiTrash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-bold text-gray-900 mb-1">{method.name}</h3>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-4">{method.type.replace('_', ' ')}</p>

                        <div className="space-y-2 text-sm text-gray-600">
                            {method.bankName && <p><span className="font-medium">Banco:</span> {method.bankName}</p>}
                            {method.accountNumber && <p><span className="font-medium">Cuenta:</span> {method.accountNumber}</p>}
                            {method.phone && <p><span className="font-medium">Teléfono:</span> {method.phone}</p>}
                            {method.email && <p><span className="font-medium">Email:</span> {method.email}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-xl font-bold mb-6">{editingMethod ? 'Editar Método' : 'Nuevo Método'}</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="BANK_TRANSFER">Transferencia Bancaria</option>
                                    <option value="MOBILE_PAYMENT">Pago Móvil</option>
                                    <option value="ZELLE">Zelle</option>
                                    <option value="PAYPAL">PayPal</option>
                                    <option value="CASH">Efectivo</option>
                                    <option value="CRYPTO">Criptomonedas</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre para mostrar</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Banco Venezuela"
                                    className="w-full p-2 border rounded-lg"
                                    required
                                />
                            </div>

                            {/* Dynamic Fields based on Type */}
                            {(formData.type === 'BANK_TRANSFER' || formData.type === 'MOBILE_PAYMENT') && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                                        <input
                                            type="text"
                                            value={formData.bankName || ''}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cédula / RIF Titular</label>
                                        <input
                                            type="text"
                                            value={formData.holderId || ''}
                                            onChange={(e) => setFormData({ ...formData, holderId: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.type === 'BANK_TRANSFER' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                                        <input
                                            type="text"
                                            value={formData.accountNumber || ''}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta</label>
                                        <select
                                            value={formData.accountType || ''}
                                            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                        >
                                            <option value="">Seleccionar</option>
                                            <option value="Corriente">Corriente</option>
                                            <option value="Ahorro">Ahorro</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {formData.type === 'MOBILE_PAYMENT' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                            )}

                            {(formData.type === 'ZELLE' || formData.type === 'PAYPAL') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones Adicionales</label>
                                <textarea
                                    value={formData.instructions || ''}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
