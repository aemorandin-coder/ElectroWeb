'use client';

import { FiFileText, FiCheckCircle, FiCreditCard, FiPackage, FiTruck, FiGift, FiShoppingBag, FiClock, FiExternalLink } from 'react-icons/fi';

interface OrderTrackingProps {
    status: string;
    createdAt: string;
    paidAt?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    deliveryMethod: string;
    // Shipping info
    shippingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippingNotes?: string | null;
    estimatedDelivery?: string | null;
}

const statusSteps = [
    { key: 'PENDING', label: 'Pedido', IconComponent: FiFileText },
    { key: 'CONFIRMED', label: 'Confirmado', IconComponent: FiCheckCircle },
    { key: 'PAID', label: 'Pagado', IconComponent: FiCreditCard },
    { key: 'PROCESSING', label: 'Preparando', IconComponent: FiPackage },
    { key: 'SHIPPED', label: 'Enviado', IconComponent: FiTruck },
    { key: 'DELIVERED', label: 'Entregado', IconComponent: FiGift },
];

const pickupSteps = [
    { key: 'PENDING', label: 'Pedido', IconComponent: FiFileText },
    { key: 'CONFIRMED', label: 'Confirmado', IconComponent: FiCheckCircle },
    { key: 'PAID', label: 'Pagado', IconComponent: FiCreditCard },
    { key: 'READY_FOR_PICKUP', label: 'Listo', IconComponent: FiShoppingBag },
    { key: 'DELIVERED', label: 'Recogido', IconComponent: FiGift },
];

export default function OrderTracking({
    status,
    createdAt,
    paidAt,
    shippedAt,
    deliveredAt,
    deliveryMethod,
    shippingCarrier,
    trackingNumber,
    trackingUrl,
    shippingNotes,
    estimatedDelivery,
}: OrderTrackingProps) {
    const steps = deliveryMethod === 'PICKUP' ? pickupSteps : statusSteps;

    const getCurrentStepIndex = () => {
        const index = steps.findIndex(step => step.key === status);
        return index >= 0 ? index : 0;
    };

    const currentStepIndex = getCurrentStepIndex();
    const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

    const getStepStatus = (index: number) => {
        if (index < currentStepIndex) return 'completed';
        if (index === currentStepIndex) return 'current';
        return 'pending';
    };

    const isDelivered = status === 'DELIVERED';
    const isCancelled = status === 'CANCELLED';

    return (
        <div className="relative">
            {/* Compact Horizontal Timeline */}
            <div className="relative flex items-center justify-between">
                {/* Progress Line Background */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-gray-200 rounded-full" />

                {/* Progress Line Filled */}
                <div
                    className="absolute top-4 left-4 h-1 rounded-full transition-all duration-1000 ease-out overflow-hidden"
                    style={{
                        width: `calc(${progress}% - 16px)`,
                        background: isDelivered
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : isCancelled
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : 'linear-gradient(90deg, #2a63cd, #1e4ba3)'
                    }}
                >
                    {/* Epic Shimmer Animation */}
                    <div className="absolute inset-0 animate-epicShimmer">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    </div>
                    {/* Glow Effect */}
                    <div
                        className="absolute inset-0 animate-pulse"
                        style={{
                            boxShadow: isDelivered
                                ? '0 0 10px #10b981, 0 0 20px #10b981'
                                : '0 0 10px #2a63cd, 0 0 20px #2a63cd'
                        }}
                    />
                </div>

                {/* Steps */}
                {steps.map((step, index) => {
                    const stepStatus = getStepStatus(index);
                    const isCompleted = stepStatus === 'completed';
                    const isCurrent = stepStatus === 'current';
                    const StepIcon = step.IconComponent;

                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center">
                            {/* Icon Circle */}
                            <div
                                className={`
                                    relative w-8 h-8 rounded-full flex items-center justify-center
                                    transition-all duration-500 transform
                                    ${isCompleted
                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40 scale-100'
                                        : isCurrent
                                            ? `bg-gradient-to-br ${isDelivered ? 'from-emerald-400 to-emerald-600' : 'from-[#2a63cd] to-[#1e4ba3]'} shadow-lg ${isDelivered ? 'shadow-emerald-500/40' : 'shadow-blue-500/40'} scale-110 animate-epicPulse`
                                            : 'bg-gray-200 scale-90'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <svg
                                        className="w-4 h-4 text-white animate-checkDraw"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        style={{ strokeDasharray: 30, strokeDashoffset: 0 }}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <StepIcon
                                        className={`w-3.5 h-3.5 transition-all duration-300 ${isCurrent
                                            ? 'text-white animate-iconBounce'
                                            : 'text-gray-400'
                                            }`}
                                    />
                                )}

                                {/* Current Step Ping Animation */}
                                {isCurrent && (
                                    <>
                                        <span className={`absolute inset-0 rounded-full animate-ping opacity-30 ${isDelivered ? 'bg-emerald-400' : 'bg-[#2a63cd]'}`} />
                                        <span className={`absolute inset-0 rounded-full animate-epicRing ${isDelivered ? 'border-emerald-400' : 'border-[#2a63cd]'}`} />
                                    </>
                                )}
                            </div>

                            {/* Label */}
                            <p
                                className={`
                                    mt-1.5 text-[10px] font-semibold text-center leading-tight max-w-[50px]
                                    transition-all duration-300
                                    ${isCompleted || isCurrent ? 'text-gray-800' : 'text-gray-400'}
                                `}
                            >
                                {step.label}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Status Message - Compact */}
            <div
                className={`
                    mt-4 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium
                    ${isDelivered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isCancelled
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }
                `}
            >
                {status === 'DELIVERED' && <FiGift className="w-3.5 h-3.5 animate-bounce" />}
                {status === 'SHIPPED' && <FiTruck className="w-3.5 h-3.5 animate-truck" />}
                {status === 'READY_FOR_PICKUP' && <FiShoppingBag className="w-3.5 h-3.5" />}
                {status === 'PAID' && <FiCreditCard className="w-3.5 h-3.5" />}
                {status === 'PROCESSING' && <FiPackage className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />}
                {status === 'PENDING' && <FiClock className="w-3.5 h-3.5" />}
                {status === 'CONFIRMED' && <FiCheckCircle className="w-3.5 h-3.5" />}
                <span>
                    {status === 'DELIVERED' && '¡Entregado! Gracias por tu compra'}
                    {status === 'SHIPPED' && 'En camino a tu dirección'}
                    {status === 'READY_FOR_PICKUP' && 'Listo para recoger en tienda'}
                    {status === 'PAID' && 'Preparando tu pedido'}
                    {status === 'PROCESSING' && 'Empacando productos'}
                    {status === 'PENDING' && 'Esperando confirmación'}
                    {status === 'CONFIRMED' && 'Pedido confirmado'}
                    {status === 'CANCELLED' && 'Pedido cancelado'}
                </span>
            </div>

            {/* Shipping Information Card (when shipped) */}
            {(status === 'SHIPPED' || status === 'DELIVERED') && trackingNumber && (
                <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <FiTruck className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-900">
                                    {shippingCarrier || 'Envío'}
                                </p>
                                <p className="text-[10px] text-indigo-600">
                                    Guía: <span className="font-mono font-bold">{trackingNumber}</span>
                                </p>
                            </div>
                        </div>
                        {trackingUrl && (
                            <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <FiExternalLink className="w-3 h-3" />
                                Rastrear
                            </a>
                        )}
                    </div>
                    {shippingNotes && (
                        <p className="mt-2 text-[10px] text-indigo-700 bg-indigo-100/50 px-2 py-1 rounded">
                            📍 {shippingNotes}
                        </p>
                    )}
                    {estimatedDelivery && status === 'SHIPPED' && (
                        <p className="mt-1.5 text-[10px] text-indigo-600">
                            📅 Entrega estimada: <span className="font-semibold">{new Date(estimatedDelivery).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </p>
                    )}
                </div>
            )}

            <style jsx>{`
                @keyframes epicShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes epicPulse {
                    0%, 100% { 
                        transform: scale(1.1);
                        box-shadow: 0 0 0 0 rgba(42, 99, 205, 0.4);
                    }
                    50% { 
                        transform: scale(1.15);
                        box-shadow: 0 0 0 8px rgba(42, 99, 205, 0);
                    }
                }
                @keyframes epicRing {
                    0% { 
                        transform: scale(1);
                        opacity: 1;
                        border-width: 2px;
                    }
                    100% { 
                        transform: scale(1.8);
                        opacity: 0;
                        border-width: 1px;
                    }
                }
                @keyframes iconBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }
                @keyframes checkDraw {
                    from { stroke-dashoffset: 30; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes truck {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(2px); }
                    75% { transform: translateX(-2px); }
                }
                .animate-epicShimmer {
                    animation: epicShimmer 2s ease-in-out infinite;
                }
                .animate-epicPulse {
                    animation: epicPulse 2s ease-in-out infinite;
                }
                .animate-epicRing {
                    animation: epicRing 1.5s ease-out infinite;
                    border-style: solid;
                }
                .animate-iconBounce {
                    animation: iconBounce 1s ease-in-out infinite;
                }
                .animate-checkDraw {
                    animation: checkDraw 0.5s ease-out forwards;
                }
                .animate-truck {
                    animation: truck 0.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
