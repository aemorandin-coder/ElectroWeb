'use client';

import { FiFileText, FiCheckCircle, FiCreditCard, FiPackage, FiTruck, FiGift, FiShoppingBag, FiClock, FiExternalLink, FiMapPin, FiCalendar } from 'react-icons/fi';

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
                <div className="absolute top-4 left-4 right-4 h-1 bg-line rounded-full" />

                {/* Progress Line Filled */}
                <div
                    className={`absolute top-4 left-4 h-1 rounded-full transition-all duration-1000 ease-out overflow-hidden ${
                        isDelivered
                            ? 'bg-success-strong'
                            : isCancelled
                                ? 'bg-deal'
                                : 'bg-brand-500'
                    }`}
                    style={{
                        width: `calc(${progress}% - 16px)`
                    }}
                />

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
                                    transition-all duration-300
                                    ${isCompleted
                                        ? 'bg-success-strong text-white shadow-sm'
                                        : isCurrent
                                            ? `${isDelivered ? 'bg-success-strong' : 'bg-brand-500'} text-white shadow-sm`
                                            : 'bg-line text-subtle'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <svg
                                        className="w-4 h-4 text-white"
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
                                            ? 'text-white'
                                            : 'text-subtle'
                                            }`}
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <p
                                className={`
                                    mt-1.5 text-xs font-semibold text-center leading-tight max-w-[50px]
                                    transition-all duration-300
                                    ${isCompleted || isCurrent ? 'text-ink' : 'text-muted'}
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
                        ? 'bg-success-strong/10 text-success-strong border border-success-strong/20'
                        : isCancelled
                            ? 'bg-deal-bg text-deal border border-deal/30'
                            : 'bg-brand-50 text-brand-700 border border-brand-200'
                    }
                `}
            >
                {status === 'DELIVERED' && <FiGift className="w-3.5 h-3.5" />}
                {status === 'SHIPPED' && <FiTruck className="w-3.5 h-3.5" />}
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
                <div className="mt-3 p-3 bg-surface rounded-xl border border-line">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
                                <FiTruck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-ink">
                                    {shippingCarrier || 'Envío'}
                                </p>
                                <p className="text-xs text-muted">
                                    Guía: <span className="font-mono font-bold text-ink">{trackingNumber}</span>
                                </p>
                            </div>
                        </div>
                        {trackingUrl && (
                            <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition-colors"
                            >
                                <FiExternalLink className="w-3 h-3" />
                                Rastrear
                            </a>
                        )}
                    </div>
                    {shippingNotes && (
                        <p className="mt-2 text-xs text-brand-700 bg-brand-50 px-2 py-1 rounded inline-flex items-center gap-1">
                            <FiMapPin className="inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />{shippingNotes}
                        </p>
                    )}
                    {estimatedDelivery && status === 'SHIPPED' && (
                        <p className="mt-1.5 text-xs text-muted inline-flex items-center gap-1">
                            <FiCalendar className="inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />Entrega estimada: <span className="font-semibold text-ink">{new Date(estimatedDelivery).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
