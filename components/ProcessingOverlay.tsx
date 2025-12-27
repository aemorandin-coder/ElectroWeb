'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

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

// Step icon gradient colors
const stepGradients = [
    'from-blue-400 to-blue-600',
    'from-indigo-400 to-indigo-600',
    'from-cyan-400 to-cyan-600',
    'from-emerald-400 to-emerald-600',
];

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
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isVisible]);

    if (!isVisible) return null;

    const totalSteps = steps.length;
    const progress = (currentStep / totalSteps) * 100;
    const isComplete = currentStep >= totalSteps;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 backdrop-blur-md flex justify-center pt-8 sm:pt-16 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="processing-title"
        >
            <div className="max-w-md w-full h-fit px-4 sm:px-0">
                {/* Error State */}
                {error ? (
                    <div className="text-center animate-[shake_0.5s_ease-in-out]">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 id="processing-title" className="text-2xl font-bold text-white mb-2">
                            Ocurrió un error
                        </h2>
                        <p className="text-red-400 text-lg mb-4">{error}</p>
                        <p className="text-gray-400 text-sm">Cerrando automáticamente...</p>
                    </div>
                ) : (
                    <>
                        {/* Header with animated logo or icon */}
                        <div className="text-center mb-8">
                            <div className="relative w-28 h-28 mx-auto mb-4">
                                {/* Outer ring pulse */}
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-pulse" />
                                {/* Spinning ring */}
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"
                                    style={{ animationDuration: '1.5s' }}
                                />
                                {/* Inner content - Logo or Icon */}
                                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/40 overflow-hidden">
                                    {isComplete ? (
                                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : logoUrl ? (
                                        <Image
                                            src={logoUrl}
                                            alt="Logo"
                                            width={80}
                                            height={80}
                                            className="w-full h-full object-contain p-2"
                                            priority
                                        />
                                    ) : (
                                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {steps[0]?.icon && Icons[steps[0].icon]}
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <h2 id="processing-title" className="text-2xl font-bold text-white mb-2">
                                {isComplete ? '¡Proceso completado!' : title}
                            </h2>
                            <p className="text-gray-400">
                                {isComplete ? 'Redirigiendo...' : subtitle}
                            </p>
                        </div>


                        {/* Steps */}
                        <div className="space-y-3">
                            {steps.map((step, index) => {
                                const stepNumber = index + 1;
                                const isActive = currentStep === stepNumber - 1;
                                const isCompleted = currentStep >= stepNumber;
                                const gradient = stepGradients[index % stepGradients.length];

                                return (
                                    <div
                                        key={step.id}
                                        className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${isCompleted
                                            ? 'bg-blue-500/20 border border-blue-500/40'
                                            : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        {/* Step icon */}
                                        <div
                                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${isCompleted
                                                ? `bg-gradient-to-br ${gradient} text-white shadow-lg`
                                                : isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-white/10 text-gray-400'
                                                }`}
                                        >
                                            {isActive && !isCompleted ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : isCompleted ? (
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {Icons[step.icon]}
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {Icons[step.icon]}
                                                </svg>
                                            )}
                                        </div>

                                        {/* Step content */}
                                        <div className="flex-1 text-center">
                                            <p
                                                className={`font-semibold transition-colors ${isCompleted
                                                    ? 'text-white'
                                                    : isActive
                                                        ? 'text-gray-200'
                                                        : 'text-gray-400'
                                                    }`}
                                            >
                                                {step.title}
                                            </p>
                                            <p
                                                className={`text-sm transition-colors ${isCompleted ? 'text-blue-200' : 'text-gray-500'
                                                    }`}
                                            >
                                                {step.description}
                                            </p>
                                        </div>

                                        {/* Checkmark */}
                                        {isCompleted && (
                                            <svg
                                                className="w-6 h-6 text-green-400 flex-shrink-0"
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
                        <div className="mt-8">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-center text-gray-400 text-sm mt-3">
                                {isComplete
                                    ? '¡Proceso completado!'
                                    : `Paso ${currentStep} de ${totalSteps}`}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-500/20 rounded-full animate-pulse"
                        style={{
                            left: `${10 + i * 6}%`,
                            top: `${20 + ((i * 7) % 60)}%`,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: `${2 + (i % 3)}s`,
                        }}
                    />
                ))}
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
