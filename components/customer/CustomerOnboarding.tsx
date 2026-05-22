'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiCircle, FiMapPin, FiMail, FiShoppingBag, FiChevronRight, FiTruck, FiCreditCard, FiNavigation, FiChevronDown } from 'react-icons/fi';
import { useSession } from 'next-auth/react';

interface OnboardingProps {
    stats: any;
}

export default function CustomerOnboarding({ stats }: OnboardingProps) {
    const { data: session } = useSession();
    const isEmailVerified = (session?.user as any)?.emailVerified;
    const hasOrders = stats?.orders > 0;

    const [isDismissed, setIsDismissed] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // If they have done everything, we could hide this, or just show 100%
    const progress = [isEmailVerified, hasOrders].filter(Boolean).length;
    const totalSteps = 3; // Email, Address, Order
    const percentage = Math.round((progress / totalSteps) * 100);

    if (isDismissed) return null;

    return (
        <div className="bg-white rounded-2xl border border-[#e9ecef] p-4 lg:p-5 text-gray-800 shadow-sm relative overflow-hidden mb-3">
            {/* Soft decorative background glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row gap-4 lg:gap-6 items-center">
                {/* Left: Text & Progress */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-base lg:text-lg font-black text-gray-900 mb-0.5">¡Bienvenido a tu Panel!</h2>
                            <p className="text-[#6a6c6b] text-xs leading-tight">Completa estas misiones para disfrutar al máximo de la plataforma.</p>
                        </div>
                        <span className="text-xl lg:text-2xl font-black text-[#2a63cd]">
                            {percentage}%
                        </span>
                    </div>

                    <div className="w-full h-2 bg-gray-150 rounded-full overflow-hidden mt-3 mb-2">
                        <div 
                            className="h-full bg-gradient-to-r from-[#2a63cd] to-indigo-500 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {/* Right: Missions */}
                <div className="flex-1 w-full space-y-2">
                    {/* Mission 1: Verify */}
                    <Link href="/customer/settings" className="group flex items-center gap-3 bg-[#f8f9fa] hover:bg-[#e9ecef]/60 border border-[#e9ecef] p-2.5 rounded-xl transition-all">
                        {isEmailVerified ? (
                            <FiCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                            <FiCircle className="w-4 h-4 text-[#2a63cd] flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <FiMail className="w-3.5 h-3.5 text-[#2a63cd]" /> Verificar Correo
                            </h3>
                            <p className="text-[10px] text-[#6a6c6b]">Seguridad para tu cuenta</p>
                        </div>
                        {!isEmailVerified && <FiChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-transform" />}
                    </Link>

                    {/* Mission 2: Address */}
                    <Link href="/customer/addresses" className="group flex items-center gap-3 bg-[#f8f9fa] hover:bg-[#e9ecef]/60 border border-[#e9ecef] p-2.5 rounded-xl transition-all">
                        <FiCircle className="w-4 h-4 text-[#2a63cd] flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <FiMapPin className="w-3.5 h-3.5 text-[#2a63cd]" /> Agregar Dirección
                            </h3>
                            <p className="text-[10px] text-[#6a6c6b]">Para envíos físicos rápidos</p>
                        </div>
                        <FiChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    {/* Mission 3: First Order */}
                    <Link href="/" className="group flex items-center gap-3 bg-[#f8f9fa] hover:bg-[#e9ecef]/60 border border-[#e9ecef] p-2.5 rounded-xl transition-all">
                        {hasOrders ? (
                            <FiCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                            <FiCircle className="w-4 h-4 text-[#2a63cd] flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <FiShoppingBag className="w-3.5 h-3.5 text-[#2a63cd]" /> Tu Primer Pedido
                            </h3>
                            <p className="text-[10px] text-[#6a6c6b]">Explora nuestras ofertas</p>
                        </div>
                        {!hasOrders && <FiChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-transform" />}
                    </Link>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#e9ecef] my-4" />

            {/* Quick Purchase Guide Toggle Header */}
            <div className="relative z-10">
                <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between py-1 text-xs font-bold text-[#2a63cd] hover:text-[#1e4ba3] uppercase tracking-wider transition-colors outline-none"
                >
                    <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${showGuide ? 'bg-[#2a63cd]' : 'bg-blue-400 animate-pulse'}`} />
                        ¿Cómo funciona nuestra tienda?
                    </span>
                    <span className="text-xs font-semibold normal-case flex items-center gap-1">
                        {showGuide ? 'Ocultar guía' : 'Ver guía paso a paso'}
                        <FiChevronDown className={`w-4 h-4 transition-transform duration-300 ${showGuide ? 'rotate-180' : ''}`} />
                    </span>
                </button>

                {showGuide && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 animate-fadeIn">
                        {/* Step 1: Recharge Wallet */}
                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-xl p-3 flex flex-col gap-2 hover:border-[#2a63cd]/30 transition-all duration-300">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#2a63cd] flex-shrink-0">
                                <FiCreditCard className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 mb-0.5">1. Recarga tu Billetera</h4>
                                <p className="text-[11px] text-[#6a6c6b] leading-normal">
                                    Agrega saldo usando Pago Móvil BDV en <strong>Saldo y Pagos</strong>. Las recargas se validan de forma automática al instante.
                                </p>
                            </div>
                        </div>
                        {/* Step 2: Pay and Ship */}
                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-xl p-3 flex flex-col gap-2 hover:border-[#2a63cd]/30 transition-all duration-300">
                            <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 flex-shrink-0">
                                <FiTruck className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 mb-0.5">2. Compra y Despacho</h4>
                                <p className="text-[11px] text-[#6a6c6b] leading-normal">
                                    Usa tu saldo acumulado para pagar al instante. Los productos físicos viajan asegurados por <strong>MRW y ZOOM</strong>.
                                </p>
                            </div>
                        </div>
                        {/* Step 3: Floating Menu */}
                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-xl p-3 flex flex-col gap-2 hover:border-[#2a63cd]/30 transition-all duration-300">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <FiNavigation className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 mb-0.5">3. Menú de Navegación</h4>
                                <p className="text-[11px] text-[#6a6c6b] leading-normal">
                                    Encuentra cursos, servicios y soporte desde la barra flotante inferior en móviles o el header superior en PC.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Dismiss Button */}
            {percentage === 100 && (
                <button 
                    onClick={() => setIsDismissed(true)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xs underline"
                >
                    Ocultar
                </button>
            )}
        </div>
    );
}
