'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

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

// Icon components for better organization
const Icons = {
    payment: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    ),
    gift: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    ),
    email: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    ),
    rocket: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
    cart: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
    package: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    ),
    check: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    truck: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    ),
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
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
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
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {Icons[step.icon]}
                                                </svg>
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
                                            <svg
                                                className="w-4 h-4 text-success-strong flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
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
    { id: 1, title: 'Verificando Pago', description: 'Confirmando saldo disponible', icon: 'payment' },
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
