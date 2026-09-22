'use client';

import { toast } from 'react-hot-toast';
import { FiFileText, FiCheckCircle, FiCreditCard, FiPackage, FiTruck, FiGift, FiShoppingBag, FiClock, FiExternalLink, FiMapPin, FiCalendar, FiCopy, FiUser } from 'react-icons/fi';
import { NOMBRE_EMPRESA, esRetiro, type EmpresaGuia } from '@/lib/envios/empresas';

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
    // C-100: destino, quién recibe, quién paga el flete e historial del envío
    shippingAddress?: string | null;
    shippingMode?: string | null;
    shippingPaidBy?: string | null;
    courierOfficeName?: string | null;
    courierOfficeAddress?: string | null;
    recipientName?: string | null;
    shipmentEvents?: Array<{ id: string; description: string; occurredAt: string }>;
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
    deliveryMethod,
    shippingCarrier,
    trackingNumber,
    trackingUrl,
    shippingNotes,
    estimatedDelivery,
    shippingAddress,
    shippingMode,
    shippingPaidBy,
    courierOfficeName,
    courierOfficeAddress,
    recipientName,
    shipmentEvents = [],
}: OrderTrackingProps) {
    const retiro = esRetiro(deliveryMethod);
    const steps = retiro ? pickupSteps : statusSteps;
    const empresa = shippingCarrier ? NOMBRE_EMPRESA[shippingCarrier as EmpresaGuia] ?? shippingCarrier : '';
    const enOficina = shippingMode === 'OFFICE';
    const local = deliveryMethod === 'LOCAL_DELIVERY';
    const mensajeEnviado = local
        ? 'Va en camino a tu dirección en Guanare'
        : enOficina
            ? `En camino a la oficina${courierOfficeName ? ` ${courierOfficeName}` : ''}`
            : 'En camino a tu dirección';

    const copiarGuia = async () => {
        if (!trackingNumber) return;
        try {
            await navigator.clipboard.writeText(trackingNumber);
            toast.success('Guía copiada');
        } catch {
            toast.error('No se pudo copiar la guía');
        }
    };

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
                {status === 'PROCESSING' && <FiPackage className="w-3.5 h-3.5" />}
                {status === 'PENDING' && <FiClock className="w-3.5 h-3.5" />}
                {status === 'CONFIRMED' && <FiCheckCircle className="w-3.5 h-3.5" />}
                <span>
                    {status === 'DELIVERED' && '¡Entregado! Gracias por tu compra'}
                    {status === 'SHIPPED' && mensajeEnviado}
                    {status === 'READY_FOR_PICKUP' && 'Listo para recoger en tienda'}
                    {status === 'PAID' && 'Preparando tu pedido'}
                    {status === 'PROCESSING' && 'Empacando productos'}
                    {status === 'PENDING' && 'Esperando confirmación'}
                    {status === 'CONFIRMED' && 'Pedido confirmado'}
                    {status === 'CANCELLED' && 'Pedido cancelado'}
                </span>
            </div>

            {/* Destino y quién recibe (C-100) */}
            {!retiro && (courierOfficeName || shippingAddress) && status !== 'CANCELLED' && (
                <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-white p-3 text-xs">
                    <p className="flex items-start gap-1.5 text-ink">
                        <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                            {enOficina && courierOfficeName ? (
                                <>
                                    Retiras en {empresa ? `${empresa} ` : ''}<strong>{courierOfficeName}</strong>
                                    {courierOfficeAddress && <span className="block text-muted">{courierOfficeAddress}</span>}
                                </>
                            ) : shippingAddress}
                        </span>
                    </p>
                    {recipientName && (
                        <p className="flex items-center gap-1.5 text-ink-soft">
                            <FiUser className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" /> Recibe {recipientName}
                        </p>
                    )}
                    {shippingPaidBy === 'CUSTOMER' && (
                        <p className="rounded-lg bg-warning/10 px-2 py-1.5 font-medium text-warning-strong">
                            Cobro a destino: el flete se lo pagas a {empresa || 'la empresa'} al {enOficina ? 'retirar' : 'recibir'}. Lleva tu cédula.
                        </p>
                    )}
                    {shippingPaidBy === 'STORE' && (
                        <p className="rounded-lg bg-success/10 px-2 py-1.5 font-medium text-success-strong">Envío gratis: lo paga la tienda.</p>
                    )}
                </div>
            )}

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
                                    {empresa || 'Envío'}
                                </p>
                                <p className="text-xs text-muted">
                                    Guía: <span className="font-mono font-bold text-ink">{trackingNumber}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button
                                type="button"
                                onClick={copiarGuia}
                                className="flex min-h-9 items-center gap-1 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-ink hover:bg-surface"
                            >
                                <FiCopy className="w-3 h-3" aria-hidden="true" />
                                Copiar
                            </button>
                            {trackingUrl && (
                                <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex min-h-9 items-center gap-1 px-2 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition-colors"
                                >
                                    <FiExternalLink className="w-3 h-3" aria-hidden="true" />
                                    Rastrear
                                </a>
                            )}
                        </div>
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

            {/* Historial del envío: lo que marca la tienda y lo que dice ZOOM (C-100) */}
            {shipmentEvents.length > 0 && (
                <ol className="mt-3 space-y-2 rounded-xl border border-line bg-white p-3">
                    {[...shipmentEvents].reverse().map((evento, index) => (
                        <li key={evento.id} className="flex gap-2 text-xs">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-brand-500' : 'bg-line-strong'}`} aria-hidden="true" />
                            <span className="min-w-0">
                                <span className={index === 0 ? 'font-semibold text-ink' : 'text-ink-soft'}>{evento.description}</span>
                                <span className="block text-muted">
                                    {new Date(evento.occurredAt).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
