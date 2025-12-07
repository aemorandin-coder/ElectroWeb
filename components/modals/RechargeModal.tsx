'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiX, FiDollarSign, FiCheck, FiPhone } from 'react-icons/fi';
import { SiBinance } from 'react-icons/si';
import { BsBank2 } from 'react-icons/bs';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import BalanceTermsModal from './BalanceTermsModal';

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
    const [exchangeRate, setExchangeRate] = useState<number>(0);
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const quickAmounts = [10, 25, 50, 100, 200];

    // Fetch exchange rate
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const response = await fetch('/api/exchange-rates');
                if (response.ok) {
                    const data = await response.json();
                    setExchangeRate(data.VES || 0);
                }
            } catch (error) {
                console.error('Error fetching exchange rate:', error);
            }
        };
        if (isOpen) {
            fetchRate();
        }
    }, [isOpen]);

    // Check if user has accepted terms
    useEffect(() => {
        const checkTerms = async () => {
            if (!isOpen || !session?.user) return;
            try {
                const response = await fetch('/api/customer/balance/terms');
                if (response.ok) {
                    const data = await response.json();
                    setHasAcceptedTerms(data.hasAccepted);
                    if (!data.hasAccepted) {
                        setShowTermsModal(true);
                    }
                }
            } catch (error) {
                console.error('Error checking terms:', error);
                setHasAcceptedTerms(false);
            }
        };
        checkTerms();
    }, [isOpen, session]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const companyPaymentMethods = [
        {
            id: 'PAGO_MOVIL',
            name: 'Pago Móvil',
            icon: <FiPhone className="w-6 h-6 text-white" />,
            details: {
                rif: 'J-405903333',
                phone: '04245172100',
                bank: 'Banco Venezuela'
            },
            color: 'from-yellow-500 to-orange-500'
        },
        {
            id: 'BINANCE',
            name: 'Binance',
            icon: <SiBinance className="w-6 h-6 text-white" />,
            details: {
                email: 'aemorandin@gmail.com',
                network: 'USDT (TRC20)'
            },
            color: 'from-yellow-400 to-yellow-600'
        },
        {
            id: 'MERCANTIL_PANAMA',
            name: 'Mercantil Panamá',
            icon: <BsBank2 className="w-6 h-6 text-white" />,
            details: {
                email: 'aemorandin@gmail.com',
                type: 'Transferencia Bancaria'
            },
            color: 'from-blue-500 to-blue-700'
        },
        {
            id: 'ZELLE',
            name: 'Zelle',
            icon: <FiDollarSign className="w-6 h-6 text-white" />,
            details: {
                status: 'Por Agregar',
                note: 'Próximamente disponible'
            },
            color: 'from-purple-500 to-purple-700',
            disabled: true
        }
    ];

    // Calculate Bs amount
    const amountInBs = amount && exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0.00';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] p-6 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <FiDollarSign className="w-6 h-6 text-white" />
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

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Amount & Method */}
                        <div className="space-y-6">
                            {/* Amount Selection - Epic Design */}
                            <div>
                                <label className="block text-sm font-bold text-[#212529] mb-3 uppercase tracking-wider">
                                    Monto a Recargar (USD)
                                </label>

                                {/* Quick Amount Buttons - Epic Design */}
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                    {quickAmounts.map((quickAmount, index) => (
                                        <button
                                            key={quickAmount}
                                            onClick={() => setAmount(quickAmount.toString())}
                                            className={`group relative overflow-hidden rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${amount === quickAmount.toString()
                                                ? 'bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] text-white shadow-lg shadow-[#2a63cd]/40 ring-2 ring-[#2a63cd] ring-offset-2'
                                                : 'bg-gradient-to-br from-slate-100 to-slate-200 text-[#212529] hover:from-[#2a63cd]/10 hover:to-[#1e4ba3]/10 hover:shadow-md'
                                                }`}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {/* Shimmer effect */}
                                            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ${amount === quickAmount.toString() ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>

                                            <div className="relative py-3 px-2 flex flex-col items-center">
                                                <span className={`text-[10px] font-bold tracking-wider mb-0.5 ${amount === quickAmount.toString() ? 'text-blue-200' : 'text-[#6a6c6b]'
                                                    }`}>USD</span>
                                                <span className="text-lg font-black">{quickAmount}</span>
                                            </div>

                                            {/* Selection indicator */}
                                            {amount === quickAmount.toString() && (
                                                <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                                                    <FiCheck className="w-3 h-3 text-[#2a63cd]" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount Input */}
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b]">
                                        <FiDollarSign className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Otro monto..."
                                        className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] text-lg font-semibold transition-all"
                                    />
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            <div>
                                <label className="block text-sm font-bold text-[#212529] mb-3 uppercase tracking-wider">
                                    Método de Pago
                                </label>
                                <div className="space-y-2">
                                    {companyPaymentMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => !method.disabled && setSelectedMethod(method.id)}
                                            disabled={method.disabled}
                                            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-[1.02] active:scale-[0.98] ${selectedMethod === method.id
                                                ? 'border-[#2a63cd] bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/5 shadow-lg'
                                                : method.disabled
                                                    ? 'border-[#e9ecef] bg-[#f8f9fa] opacity-50 cursor-not-allowed'
                                                    : 'border-[#e9ecef] hover:border-[#2a63cd]/50 hover:bg-[#f8f9fa]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                                    {method.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className="font-bold text-[#212529]">{method.name}</h3>
                                                        {selectedMethod === method.id && (
                                                            <div className="w-5 h-5 bg-[#2a63cd] rounded-full flex items-center justify-center">
                                                                <FiCheck className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {method.disabled ? (
                                                        <p className="text-xs text-orange-600 font-medium">Próximamente</p>
                                                    ) : (
                                                        <p className="text-xs text-[#6a6c6b]">
                                                            {selectedMethod === method.id ? 'Seleccionado' : 'Click para seleccionar'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Details & Reference */}
                        <div className="space-y-4">
                            {/* Selected Method Details */}
                            <div className="bg-gradient-to-br from-[#f8f9fa] to-white rounded-xl p-4 border border-[#e9ecef] shadow-sm">
                                <h3 className="font-bold text-sm text-[#212529] mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-[#2a63cd] rounded-full"></div>
                                    Datos para el pago
                                </h3>

                                {selectedMethod ? (
                                    <div className="space-y-2">
                                        {(() => {
                                            const method = companyPaymentMethods.find(m => m.id === selectedMethod);
                                            if (!method) return null;
                                            return Object.entries(method.details).map(([key, value]) => (
                                                <div key={key} className="flex items-center justify-between py-1 border-b border-[#e9ecef] last:border-0">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">{key}</span>
                                                        <span className="text-sm font-medium text-[#212529]">{value}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(value as string)}
                                                        className="text-[#2a63cd] hover:bg-blue-50 px-2 py-1 rounded transition-colors text-[10px] font-bold"
                                                    >
                                                        COPIAR
                                                    </button>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-[#6a6c6b]">
                                        <div className="w-10 h-10 bg-[#e9ecef] rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FiDollarSign className="w-5 h-5 text-[#6a6c6b]" />
                                        </div>
                                        <p className="text-xs">Selecciona un método de pago</p>
                                    </div>
                                )}
                            </div>

                            {/* Bs Conversion (Only for Pago Movil) - Compact */}
                            {selectedMethod === 'PAGO_MOVIL' && (
                                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 border border-yellow-200 shadow-sm animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-500 rounded flex items-center justify-center">
                                            <span className="text-white font-black text-[10px]">Bs</span>
                                        </div>
                                        <span className="font-bold text-sm text-[#212529]">Monto en Bolívares</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-[#6a6c6b]">USD ${amount ? parseFloat(amount).toFixed(2) : '0.00'}</span>
                                            <span className="text-[#6a6c6b]">× {exchangeRate > 0 ? exchangeRate.toFixed(2) : '...'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[#212529]">Total:</span>
                                            <span className="text-xl font-black text-orange-600">
                                                Bs. {amount && exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0.00'}
                                            </span>
                                        </div>
                                    </div>
                                    {amount && parseFloat(amount) > 0 && (
                                        <p className="text-[10px] text-orange-700 mt-1.5">
                                            ⚠️ Transfiere este monto exacto
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Reference Number - Compact */}
                            <div>
                                <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                                    Número de Referencia
                                </label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Ej: 123456789"
                                    className="w-full px-3 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm"
                                />
                                <p className="text-[10px] text-[#6a6c6b] mt-1 flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-blue-100 text-[#2a63cd] flex items-center justify-center text-[8px] font-bold">i</span>
                                    Número de confirmación o ID de transacción
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions - Fixed at bottom */}
                <div className="p-6 border-t border-[#e9ecef] bg-white flex-shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-[#f8f9fa] text-[#212529] font-semibold rounded-xl hover:bg-[#e9ecef] transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={processing || !amount || !selectedMethod || !reference || !hasAcceptedTerms}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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

            {/* Balance Terms Modal */}
            <BalanceTermsModal
                isOpen={showTermsModal}
                onClose={() => {
                    setShowTermsModal(false);
                    if (!hasAcceptedTerms) {
                        onClose();
                    }
                }}
                onAccept={() => {
                    setHasAcceptedTerms(true);
                    setShowTermsModal(false);
                }}
            />
        </div>
    );
}
