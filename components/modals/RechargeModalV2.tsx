'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    FiX, FiDollarSign, FiCheck, FiPhone, FiCreditCard, FiShield, FiArrowLeft, FiAlertTriangle
} from 'react-icons/fi';
import { SiBinance } from 'react-icons/si';
import { BsBank2 } from 'react-icons/bs';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import BalanceTermsModal from './BalanceTermsModal';
import VerificarPagoMovilForm from '@/components/pago-movil/VerificarPagoMovilForm';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'SELECT_METHOD' | 'PAYMENT_DETAILS' | 'VERIFY_PAYMENT';

export default function RechargeModalV2({ isOpen, onClose, onSuccess }: RechargeModalProps) {
    const { data: session } = useSession();
    const { confirm } = useConfirm();
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [processing, setProcessing] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<number>(0);
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [loadingMethods, setLoadingMethods] = useState(true);

    // Multi-step state
    const [step, setStep] = useState<Step>('SELECT_METHOD');
    const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);

    // Dynamic payment methods from database
    const [companyPaymentMethods, setCompanyPaymentMethods] = useState<Array<{
        id: string;
        type: string;
        name: string;
        bankName?: string;
        phone?: string;
        holderId?: string;
        holderName?: string;
        email?: string;
        walletAddress?: string;
        network?: string;
        displayNote?: string;
        qrCodeImage?: string;
        isActive: boolean;
    }>>([]);

    const quickAmounts = [10, 25, 50, 100, 200];

    // Fetch exchange rate and payment methods
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

        const fetchPaymentMethods = async () => {
            setLoadingMethods(true);
            try {
                const response = await fetch('/api/customer/company-payment-methods');
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setCompanyPaymentMethods(data.filter((m: any) => m.isActive));
                    }
                }
            } catch (error) {
                console.error('Error fetching payment methods:', error);
            } finally {
                setLoadingMethods(false);
            }
        };

        if (isOpen) {
            fetchRate();
            fetchPaymentMethods();
        }
    }, [isOpen]);

    // Helper function to get icon based on payment type
    const getMethodIcon = (type: string) => {
        switch (type) {
            case 'MOBILE_PAYMENT': return <FiPhone className="w-6 h-6 text-white" />;
            case 'CRYPTO': return <SiBinance className="w-6 h-6 text-white" />;
            case 'BANK_TRANSFER': return <BsBank2 className="w-6 h-6 text-white" />;
            case 'MERCANTIL_PANAMA': return (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M4 12c0-4.4 3.6-8 8-8 2.2 0 4.2.9 5.7 2.3L12 12l5.7 5.7c-1.5 1.4-3.5 2.3-5.7 2.3-4.4 0-8-3.6-8-8z" fill="white" />
                    <path d="M12 12l5.7-5.7c1.4 1.5 2.3 3.5 2.3 5.7s-.9 4.2-2.3 5.7L12 12z" fill="white" opacity="0.6" />
                </svg>
            );
            case 'ZELLE': return (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                    <path d="M5 5h14v2h-9.5l9.5 10v2H5v-2h9.5L5 7V5z" />
                    <rect x="10" y="2" width="4" height="2" rx="0.5" />
                    <rect x="10" y="20" width="4" height="2" rx="0.5" />
                </svg>
            );
            case 'PAYPAL': return <FiDollarSign className="w-6 h-6 text-white" />;
            default: return <FiDollarSign className="w-6 h-6 text-white" />;
        }
    };

    // Helper function to get gradient color - all blue for brand consistency
    const getMethodColor = () => {
        return 'from-[#2a63cd] to-[#1e4ba3]';
    };

    // Build details object for display
    const getMethodDetails = (method: any) => {
        const details: Record<string, string> = {};
        if (method.holderId) details['Cedula/RIF'] = method.holderId;
        if (method.phone) details['Telefono'] = method.phone;
        if (method.bankName) details['Banco'] = method.bankName;
        if (method.holderName) details['Titular'] = method.holderName;
        if (method.email) details['Email'] = method.email;
        if (method.walletAddress) details['Wallet'] = method.walletAddress;
        if (method.network) details['Red'] = method.network;
        return details;
    };

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

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('SELECT_METHOD');
            setAmount('');
            setReference('');
            setSelectedMethod('');
            setPendingTransactionId(null);
        }
    }, [isOpen]);

    // Calculate Bs amount
    const amountInBs = amount && exchangeRate ? (parseFloat(amount) * exchangeRate) : 0;

    // Check if mobile payment is selected
    const isMobilePayment = selectedMethod === 'MOBILE_PAYMENT';

    // Create pending transaction and proceed to verification
    const handleProceedToVerification = async () => {
        if (!amount || !selectedMethod) {
            toast.error('Por favor selecciona el monto y metodo de pago');
            return;
        }

        setProcessing(true);
        try {
            // Create pending transaction first
            const response = await fetch('/api/customer/balance/recharge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    paymentMethod: selectedMethod,
                    reference: 'PENDIENTE_VERIFICACION',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setPendingTransactionId(data.transaction?.id || null);
                setStep('VERIFY_PAYMENT');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al crear la solicitud');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al procesar la solicitud');
        } finally {
            setProcessing(false);
        }
    };

    // Handle traditional submit (for non-mobile payment methods)
    const handleTraditionalSubmit = async () => {
        if (!amount || !selectedMethod || !reference) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        const confirmed = await confirm({
            title: 'Confirmar Recarga',
            message: `¿Estas seguro de que deseas recargar $${parseFloat(amount).toFixed(2)} usando ${companyPaymentMethods.find(m => m.type === selectedMethod)?.name}?`,
            confirmText: 'Si, Recargar',
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
                toast.success('Solicitud de recarga enviada. Sera procesada en breve.');
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

    // Handle verification success
    const handleVerificationSuccess = (data: { verified: boolean; autoApproved?: boolean; amount?: string }) => {
        if (data.autoApproved) {
            toast.success('Tu recarga ha sido verificada y aprobada automaticamente. El saldo ya esta disponible.', {
                duration: 5000,
                icon: '🎉'
            });
        } else {
            toast.success('Pago verificado. Tu recarga sera procesada en breve.');
        }
        onSuccess();
        onClose();
    };

    // Handle verification error
    const handleVerificationError = (message: string) => {
        toast.error(message);
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
                            {step !== 'SELECT_METHOD' && (
                                <button
                                    onClick={() => setStep('SELECT_METHOD')}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-1"
                                >
                                    <FiArrowLeft className="w-5 h-5 text-white" />
                                </button>
                            )}
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                {step === 'VERIFY_PAYMENT' ? (
                                    <FiShield className="w-6 h-6 text-white" />
                                ) : (
                                    <FiDollarSign className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {step === 'VERIFY_PAYMENT' ? 'Verificar Pago' : 'Recargar Saldo'}
                                </h2>
                                <p className="text-sm text-blue-100">
                                    {step === 'VERIFY_PAYMENT'
                                        ? 'Verifica tu pago movil automaticamente'
                                        : 'Añade fondos a tu cuenta'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <FiX className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Step indicator for mobile payment */}
                    {isMobilePayment && step !== 'SELECT_METHOD' && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <div className={`w-8 h-1 rounded-full ${step === 'PAYMENT_DETAILS' || step === 'VERIFY_PAYMENT' ? 'bg-white' : 'bg-white/30'}`} />
                            <div className={`w-8 h-1 rounded-full ${step === 'VERIFY_PAYMENT' ? 'bg-white' : 'bg-white/30'}`} />
                        </div>
                    )}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* STEP 1: Select Method and Amount */}
                    {step === 'SELECT_METHOD' && (
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
                                        Metodo de Pago
                                    </label>
                                    {loadingMethods ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : companyPaymentMethods.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500">
                                            <p className="text-sm">No hay metodos de pago disponibles</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {companyPaymentMethods.map((method) => (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setSelectedMethod(method.type)}
                                                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-[1.02] active:scale-[0.98] ${selectedMethod === method.type
                                                        ? 'border-[#2a63cd] bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/5 shadow-lg'
                                                        : 'border-[#e9ecef] hover:border-[#2a63cd]/50 hover:bg-[#f8f9fa]'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getMethodColor()} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                                            {getMethodIcon(method.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h3 className="font-bold text-[#212529]">{method.name}</h3>
                                                                {method.type === 'MOBILE_PAYMENT' && (
                                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                                                        <FiShield className="w-3 h-3" />
                                                                        Verificacion Auto
                                                                    </span>
                                                                )}
                                                                {method.type === 'MERCANTIL_PANAMA' && (
                                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-[#2a63cd] rounded-full">
                                                                        Internacional
                                                                    </span>
                                                                )}
                                                                {selectedMethod === method.type && (
                                                                    <div className="w-5 h-5 bg-[#2a63cd] rounded-full flex items-center justify-center">
                                                                        <FiCheck className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {method.bankName && (
                                                                <p className="text-xs text-[#6a6c6b]">{method.bankName}</p>
                                                            )}
                                                            {method.displayNote && selectedMethod === method.type && (
                                                                <p className="text-xs text-[#2a63cd] mt-1 font-medium">
                                                                    {method.displayNote}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
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
                                                const method = companyPaymentMethods.find(m => m.type === selectedMethod);
                                                if (!method) return null;
                                                const details = getMethodDetails(method);
                                                return Object.entries(details).map(([key, value]) => (
                                                    <div key={key} className="flex items-center justify-between py-1 border-b border-[#e9ecef] last:border-0">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">{key}</span>
                                                            <span className="text-sm font-medium text-[#212529]">{value}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(value)}
                                                            className="text-[#2a63cd] hover:bg-blue-50 px-2 py-1 rounded transition-colors text-[10px] font-bold"
                                                        >
                                                            COPIAR
                                                        </button>
                                                    </div>
                                                ));
                                            })()}
                                            {/* QR Code if available */}
                                            {(() => {
                                                const method = companyPaymentMethods.find(m => m.type === selectedMethod);
                                                if (method?.qrCodeImage) {
                                                    return (
                                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                                            <p className="text-xs text-gray-500 mb-2">Escanea el codigo QR:</p>
                                                            <Image
                                                                src={method.qrCodeImage}
                                                                alt="QR Code"
                                                                width={120}
                                                                height={120}
                                                                className="rounded-lg border border-gray-200"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-[#6a6c6b]">
                                            <div className="w-10 h-10 bg-[#e9ecef] rounded-full flex items-center justify-center mx-auto mb-2">
                                                <FiDollarSign className="w-5 h-5 text-[#6a6c6b]" />
                                            </div>
                                            <p className="text-xs">Selecciona un metodo de pago</p>
                                        </div>
                                    )}
                                </div>

                                {/* Bs Conversion (For Mobile Payment and Bank Transfer) - Compact */}
                                {(selectedMethod === 'MOBILE_PAYMENT' || selectedMethod === 'BANK_TRANSFER') && (
                                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 border border-yellow-200 shadow-sm animate-fadeIn">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-500 rounded flex items-center justify-center">
                                                <span className="text-white font-black text-[10px]">Bs</span>
                                            </div>
                                            <span className="font-bold text-sm text-[#212529]">Monto en Bolivares</span>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-yellow-200">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-[#6a6c6b]">USD ${amount ? parseFloat(amount).toFixed(2) : '0.00'}</span>
                                                <span className="text-[#6a6c6b]">x {exchangeRate > 0 ? exchangeRate.toFixed(2) : '...'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-[#212529]">Total:</span>
                                                <span className="text-xl font-black text-orange-600">
                                                    Bs. {amountInBs ? amountInBs.toFixed(2) : '0.00'}
                                                </span>
                                            </div>
                                        </div>
                                        {amount && parseFloat(amount) > 0 && (
                                            <p className="text-[10px] text-orange-700 mt-1.5 flex items-center gap-1">
                                                <FiAlertTriangle className="w-3 h-3" />
                                                Transfiere este monto exacto
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Reference Number - Only for non-mobile payment */}
                                {selectedMethod && selectedMethod !== 'MOBILE_PAYMENT' && (
                                    <div>
                                        <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                                            Numero de Referencia
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
                                            Numero de confirmacion o ID de transaccion
                                        </p>
                                    </div>
                                )}

                                {/* Mobile Payment Info */}
                                {selectedMethod === 'MOBILE_PAYMENT' && (
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 animate-fadeIn">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <FiShield className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-green-800">Verificacion Automatica</h4>
                                                <p className="text-xs text-green-700 mt-1">
                                                    Al seleccionar Pago Movil, podras verificar tu pago automaticamente con el Banco de Venezuela.
                                                    Si la verificacion es exitosa, tu recarga sera aprobada al instante.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Verify Mobile Payment */}
                    {step === 'VERIFY_PAYMENT' && (
                        <VerificarPagoMovilForm
                            montoEsperado={parseFloat(amount)}
                            montoEnBs={amountInBs || undefined}
                            contexto="RECHARGE"
                            transactionId={pendingTransactionId || undefined}
                            onSuccess={handleVerificationSuccess}
                            onError={handleVerificationError}
                        />
                    )}
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

                        {step === 'SELECT_METHOD' && (
                            <>
                                {isMobilePayment ? (
                                    // Mobile Payment: Go to verification
                                    <button
                                        onClick={handleProceedToVerification}
                                        disabled={processing || !amount || !selectedMethod || !hasAcceptedTerms}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
                                                <FiShield className="w-5 h-5" />
                                                Continuar y Verificar Pago
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    // Other methods: Traditional submit
                                    <button
                                        onClick={handleTraditionalSubmit}
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
                                )}
                            </>
                        )}
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
