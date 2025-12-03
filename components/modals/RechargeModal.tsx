'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiX, FiDollarSign, FiCheck, FiPhone } from 'react-icons/fi';
import { SiBinance } from 'react-icons/si';
import { BsBank2 } from 'react-icons/bs';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RechargeModal({ isOpen, onClose, onSuccess }: RechargeModalProps) {
    const { data: session } = useSession();
    const { confirm } = useConfirm();
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [processing, setProcessing] = useState(false);

    const quickAmounts = [10, 25, 50, 100, 200];

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const companyPaymentMethods = [
        {
            id: 'PAGO_MOVIL',
            name: 'Pago Móvil',
            icon: <FiPhone className="w-6 h-6 text-yellow-600" />,
            details: {
                rif: 'J-405903333',
                phone: '04245172100',
                bank: 'Banco Venezuela'
            },
            color: 'from-yellow-500 to-yellow-600'
        },
        {
            id: 'BINANCE',
            name: 'Binance',
            icon: <SiBinance className="w-6 h-6 text-yellow-500" />,
            details: {
                email: 'aemorandin@gmail.com',
                network: 'USDT (TRC20)'
            },
            color: 'from-yellow-400 to-orange-500'
        },
        {
            id: 'MERCANTIL_PANAMA',
            name: 'Mercantil Panamá',
            icon: <BsBank2 className="w-6 h-6 text-blue-600" />,
            details: {
                email: 'aemorandin@gmail.com',
                type: 'Transferencia Bancaria'
            },
            color: 'from-blue-500 to-blue-600'
        },
        {
            id: 'ZELLE',
            name: 'Zelle',
            icon: <FiDollarSign className="w-6 h-6 text-purple-600" />,
            details: {
                status: 'Por Agregar',
                note: 'Próximamente disponible'
            },
            color: 'from-purple-500 to-purple-600',
            disabled: true
        }
    ];

    const handleSubmit = async () => {
        if (!amount || !selectedMethod || !reference) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        const confirmed = await confirm({
            title: 'Confirmar Recarga',
            message: `¿Estás seguro de que deseas recargar $${parseFloat(amount).toFixed(2)} usando ${companyPaymentMethods.find(m => m.id === selectedMethod)?.name}?`,
            confirmText: 'Sí, Recargar',
            cancelText: 'Cancelar',
            variant: 'info'
        });

        if (!confirmed) return;

        setProcessing(true);
        try {
            const response = await fetch('/api/customer/balance/recharge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    paymentMethod: selectedMethod,
                    reference: reference,
                }),
            });

            if (response.ok) {
                toast.success('Solicitud de recarga enviada. Será procesada en breve.');
                setAmount('');
                setReference('');
                setSelectedMethod('');
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al procesar la recarga');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al procesar la recarga');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scaleIn max-h-[85vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] p-6 rounded-t-2xl flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FiDollarSign className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Recargar Saldo</h2>
                                    <p className="text-sm text-blue-100">Añade fondos a tu cuenta</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        {/* Amount Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-[#212529] mb-3">
                                Monto a Recargar (USD)
                            </label>
                            <div className="grid grid-cols-5 gap-2 mb-3">
                                {quickAmounts.map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        onClick={() => setAmount(quickAmount.toString())}
                                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1 ${amount === quickAmount.toString()
                                            ? 'bg-[#2a63cd] text-white shadow-lg'
                                            : 'bg-[#f8f9fa] text-[#212529] hover:bg-[#e9ecef]'
                                            }`}
                                    >
                                        <span className={`text-[10px] font-bold opacity-60 ${amount === quickAmount.toString() ? 'text-white' : 'text-[#212529]'}`}>USD</span>
                                        <span>{quickAmount}</span>
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Otro monto"
                                className="w-full px-4 py-3 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] text-lg font-semibold"
                            />
                        </div>

                        {/* Payment Method Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-[#212529] mb-3">
                                Método de Pago
                            </label>
                            <div className="space-y-2">
                                {companyPaymentMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => !method.disabled && setSelectedMethod(method.id)}
                                        disabled={method.disabled}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedMethod === method.id
                                            ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                                            : method.disabled
                                                ? 'border-[#e9ecef] bg-[#f8f9fa] opacity-50 cursor-not-allowed'
                                                : 'border-[#e9ecef] hover:border-[#2a63cd]/30 hover:bg-[#f8f9fa]'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0`}>
                                                {method.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-[#212529]">{method.name}</h3>
                                                    {selectedMethod === method.id && (
                                                        <FiCheck className="w-4 h-4 text-[#2a63cd]" />
                                                    )}
                                                </div>
                                                <div className="text-xs text-[#6a6c6b] space-y-0.5">
                                                    {Object.entries(method.details).map(([key, value]) => (
                                                        <p key={key}>
                                                            <span className="font-medium capitalize">{key}:</span> {value}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reference Number */}
                        <div>
                            <label className="block text-sm font-semibold text-[#212529] mb-2">
                                Número de Referencia
                            </label>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Ej: 123456789"
                                className="w-full px-4 py-3 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                            />
                            <p className="text-xs text-[#6a6c6b] mt-2">
                                Ingresa el número de confirmación de tu pago
                            </p>
                        </div>
                    </div>

                    {/* Actions - Fixed at bottom */}
                    <div className="p-6 border-t border-[#e9ecef] bg-white flex-shrink-0">
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-[#f8f9fa] text-[#212529] font-semibold rounded-lg hover:bg-[#e9ecef] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={processing || !amount || !selectedMethod || !reference}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <FiCheck className="w-5 h-5" />
                                        Confirmar Recarga
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
