'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
    IconoCarrito, IconoCerrar, IconoCheck, IconoConfirmado, IconoEntrar, IconoEnviar, IconoEnvio, IconoGiftCard, IconoPaquete,
    IconoTarjeta, type IconType,
} from '@/components/iconos';

// Step configuration interface
export interface ProcessingStep {
    id: number;
    title: string;
    description: string;
    icon: 'payment' | 'gift' | 'email' | 'rocket' | 'cart' | 'package' | 'check' | 'truck';
}

// Component props
interface ProcessingOverlayProps {
    isVisible: boolean;
    currentStep: number;
    steps: ProcessingStep[];
    error?: string | null;
    title?: string;
    subtitle?: string;
    logoUrl?: string | null; // Optional company logo URL
}

// Ícono de cada paso (C-188: los del pack propio; "Redirigiendo" era un rayo)
const Icons: Record<ProcessingStep['icon'], IconType> = {
    payment: IconoTarjeta,
    gift: IconoGiftCard,
    email: IconoEnviar,
    rocket: IconoEntrar,
    cart: IconoCarrito,
    package: IconoPaquete,
    check: IconoConfirmado,
    truck: IconoEnvio,
};

export default function ProcessingOverlay({
    isVisible,
    currentStep,
    steps,
    error,
    title = 'Procesando',
    subtitle = 'Por favor espera un momento...',
    logoUrl,
}: ProcessingOverlayProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    // Scroll to top when overlay becomes visible
    useEffect(() => {
        if (isVisible) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [isVisible]);
    useBodyScrollLock(isVisible);

    if (!isVisible) return null;

    const totalSteps = steps.length;
    const progress = (currentStep / totalSteps) * 100;
    const isComplete = currentStep >= totalSteps;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[var(--z-modal)] bg-ink/75 flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="processing-title"
        >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-line my-auto">
                {/* Error State */}
                {error ? (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-deal-bg flex items-center justify-center text-deal">
                            <IconoCerrar className="w-8 h-8" />
                        </div>
                        <h2 id="processing-title" className="text-xl font-bold text-ink mb-2">
                            Ocurrió un error
                        </h2>
                        <p className="text-deal text-sm font-semibold mb-3">{error}</p>
                        <p className="text-muted text-xs">Cerrando automáticamente...</p>
                    </div>
                ) : (
                    <>
                        {/* Header with animated logo or spinner */}
                        <div className="text-center mb-6">
                            {logoUrl ? (
                                <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-2 border-line border-t-brand-500 animate-spin" />
                                    <Image src={logoUrl} alt="Logo" width={64} height={64} className="object-contain" />
                                </div>
                            ) : (
                                <div className="w-14 h-14 mx-auto mb-4 rounded-full border-4 border-line border-t-brand-500 animate-spin" />
                            )}
                            <h2 id="processing-title" className="text-xl font-bold text-ink mb-1">
                                {title}
                            </h2>
                            <p className="text-xs text-muted">
                                {subtitle}
                            </p>
                        </div>

                        {/* Steps list */}
                        <div className="space-y-2.5">
                            {steps.map((step, index) => {
                                const stepNumber = index + 1;
                                const isActive = currentStep === stepNumber - 1;
                                const isCompleted = currentStep >= stepNumber;
                                const IconoPaso = Icons[step.icon];

                                return (
                                    <div
                                        key={step.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                            isCompleted
                                                ? 'bg-success/5 border-success/30'
                                                : isActive
                                                ? 'bg-brand-500/5 border-brand-500/40'
                                                : 'bg-surface border-line'
                                        }`}
                                    >
                                        {/* Step icon */}
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isCompleted
                                                    ? 'bg-success-strong text-white'
                                                    : isActive
                                                    ? 'bg-brand-500 text-white'
                                                    : 'bg-line text-subtle'
                                            }`}
                                        >
                                            {isActive && !isCompleted ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <IconoPaso className="w-4 h-4" />
                                            )}
                                        </div>

                                        {/* Step content */}
                                        <div className="flex-1 text-left min-w-0">
                                            <p
                                                className={`text-xs font-semibold truncate ${
                                                    isCompleted
                                                        ? 'text-ink'
                                                        : isActive
                                                        ? 'text-brand-600'
                                                        : 'text-muted'
                                                }`}
                                            >
                                                {step.title}
                                            </p>
                                            <p
                                                className={`text-[11px] truncate ${
                                                    isCompleted
                                                        ? 'text-muted'
                                                        : isActive
                                                        ? 'text-brand-700'
                                                        : 'text-subtle'
                                                }`}
                                            >
                                                {step.description}
                                            </p>
                                        </div>

                                        {/* Checkmark */}
                                        {isCompleted && (
                                            <IconoCheck className="w-4 h-4 text-success-strong flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-5">
                            <div className="h-1.5 bg-line rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-center text-muted text-xs mt-2">
                                {isComplete
                                    ? '¡Proceso completado!'
                                    : `Paso ${currentStep} de ${totalSteps}`}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Pre-defined step configurations for common use cases
export const GIFT_CARD_STEPS: ProcessingStep[] = [
    { id: 1, title: 'Verificando Pago', description: 'Confirmando el pago', icon: 'payment' },
    { id: 2, title: 'Creando Gift Card', description: 'Generando código único', icon: 'gift' },
    { id: 3, title: 'Enviando al correo', description: 'A la velocidad de la luz', icon: 'email' },
    { id: 4, title: 'Redirigiendo', description: 'Al panel de usuario', icon: 'rocket' },
];

export const CHECKOUT_STEPS: ProcessingStep[] = [
    { id: 1, title: 'Procesando orden', description: 'Verificando productos', icon: 'cart' },
    { id: 2, title: 'Confirmando pago', description: 'Validando transacción', icon: 'payment' },
    { id: 3, title: 'Preparando pedido', description: 'Generando detalles', icon: 'package' },
    { id: 4, title: 'Orden creada', description: 'Pedido registrado', icon: 'check' },
];
