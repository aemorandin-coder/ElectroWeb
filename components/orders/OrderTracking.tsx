'use client';

import { FiFileText, FiCheckCircle, FiCreditCard, FiPackage, FiTruck, FiGift, FiShoppingBag, FiClock } from 'react-icons/fi';

interface OrderTrackingProps {
    status: string;
    createdAt: string;
    paidAt?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    deliveryMethod: string;
}

const statusSteps = [
    { key: 'PENDING', label: 'Pedido Creado', IconComponent: FiFileText },
    { key: 'CONFIRMED', label: 'Confirmado', IconComponent: FiCheckCircle },
    { key: 'PAID', label: 'Pago Aprobado', IconComponent: FiCreditCard },
    { key: 'PROCESSING', label: 'En Preparación', IconComponent: FiPackage },
    { key: 'SHIPPED', label: 'Enviado', IconComponent: FiTruck },
    { key: 'DELIVERED', label: 'Entregado', IconComponent: FiGift },
];

const pickupSteps = [
    { key: 'PENDING', label: 'Pedido Creado', IconComponent: FiFileText },
    { key: 'CONFIRMED', label: 'Confirmado', IconComponent: FiCheckCircle },
    { key: 'PAID', label: 'Pago Aprobado', IconComponent: FiCreditCard },
    { key: 'READY_FOR_PICKUP', label: 'Listo para Recoger', IconComponent: FiShoppingBag },
    { key: 'DELIVERED', label: 'Recogido', IconComponent: FiGift },
];

export default function OrderTracking({
    status,
    createdAt,
    paidAt,
    shippedAt,
    deliveredAt,
    deliveryMethod,
}: OrderTrackingProps) {
    const steps = deliveryMethod === 'PICKUP' ? pickupSteps : statusSteps;

    const getCurrentStepIndex = () => {
        const index = steps.findIndex(step => step.key === status);
        return index >= 0 ? index : 0;
    };

    const currentStepIndex = getCurrentStepIndex();
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    const getStepStatus = (index: number) => {
        if (index < currentStepIndex) return 'completed';
        if (index === currentStepIndex) return 'current';
        return 'pending';
    };

    const getStatusColor = () => {
        if (status === 'DELIVERED') return 'from-green-500 to-emerald-500';
        if (status === 'CANCELLED') return 'from-red-500 to-rose-500';
        if (currentStepIndex >= 2) return 'from-blue-500 to-indigo-500';
        return 'from-amber-500 to-orange-500';
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'DELIVERED':
                return '¡Tu pedido ha sido entregado! No olvides dejar una reseña.';
            case 'SHIPPED':
                return 'Tu pedido está en camino';
            case 'READY_FOR_PICKUP':
                return 'Tu pedido está listo para recoger';
            case 'PAID':
                return 'Pago confirmado, preparando tu pedido';
            case 'PENDING':
                return 'Esperando confirmación de pago';
            default:
                return 'Procesando tu pedido...';
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Rastreo de Pedido
            </h3>

            {/* Progress Bar */}
            <div className="relative mb-8">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-1000 ease-out relative`}
                        style={{ width: `${progress}%` }}
                    >
                        {/* Animated shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                </div>
                <div className="absolute -top-1 right-0 transform translate-x-1/2">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${getStatusColor()} animate-pulse shadow-lg`}></div>
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
                {steps.map((step, index) => {
                    const stepStatus = getStepStatus(index);
                    const isCompleted = stepStatus === 'completed';
                    const isCurrent = stepStatus === 'current';
                    const StepIcon = step.IconComponent;

                    return (
                        <div
                            key={step.key}
                            className={`relative flex items-start gap-4 transition-all duration-500 ${isCurrent ? 'scale-105' : ''
                                }`}
                        >
                            {/* Icon */}
                            <div
                                className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted
                                        ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30'
                                        : isCurrent
                                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30 animate-pulse'
                                            : 'bg-gray-200'
                                    }`}
                            >
                                {isCompleted ? (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <StepIcon className={`w-6 h-6 ${isCurrent ? 'text-white animate-bounce' : 'text-gray-400'}`} />
                                )}

                                {/* Connecting line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    ></div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-8">
                                <h4
                                    className={`font-bold text-lg ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                                        }`}
                                >
                                    {step.label}
                                </h4>
                                {isCurrent && (
                                    <p className="text-sm text-blue-600 font-medium mt-1 animate-pulse">
                                        Estado actual
                                    </p>
                                )}
                                {isCompleted && (
                                    <div className="flex items-center gap-1 text-sm text-green-600 font-medium mt-1">
                                        <FiCheckCircle className="w-4 h-4" />
                                        <span>Completado</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Status Message */}
            <div className={`mt-6 p-4 rounded-xl bg-gradient-to-r ${getStatusColor()} bg-opacity-10 flex items-start gap-3`}>
                {status === 'DELIVERED' && <FiGift className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                {status === 'SHIPPED' && <FiTruck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                {status === 'READY_FOR_PICKUP' && <FiShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                {status === 'PAID' && <FiCreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                {status === 'PENDING' && <FiClock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-semibold text-gray-900">
                    {getStatusMessage()}
                </p>
            </div>

            <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
        </div>
    );
}
