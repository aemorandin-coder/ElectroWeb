'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiCircle, FiMapPin, FiMail, FiShoppingBag, FiChevronRight } from 'react-icons/fi';
import { useSession } from 'next-auth/react';

interface OnboardingProps {
    stats: any;
}

export default function CustomerOnboarding({ stats }: OnboardingProps) {
    const { data: session } = useSession();
    const isEmailVerified = (session?.user as any)?.emailVerified;
    const hasAddress = false; // We would need this from props ideally, but we can assume false or check later. For now let's just make it a visual guide.
    const hasOrders = stats?.orders > 0;

    const [isDismissed, setIsDismissed] = useState(false);

    // If they have done everything, we could hide this, or just show 100%
    const progress = [isEmailVerified, hasOrders].filter(Boolean).length;
    const totalSteps = 3; // Email, Address, Order
    const percentage = Math.round((progress / totalSteps) * 100);

    if (isDismissed) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-xl p-4 lg:p-6 text-white shadow-xl relative overflow-hidden mb-4">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                {/* Left: Text & Progress */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-lg lg:text-xl font-black mb-1">¡Bienvenido a tu Panel!</h2>
                            <p className="text-blue-200 text-xs lg:text-sm">Completa estas misiones para disfrutar al máximo.</p>
                        </div>
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                            {percentage}%
                        </span>
                    </div>

                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3 mb-4">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {/* Right: Missions */}
                <div className="flex-1 w-full space-y-2">
                    {/* Mission 1: Verify */}
                    <Link href="/customer/settings" className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-lg transition-colors">
                        {isEmailVerified ? (
                            <FiCheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        ) : (
                            <FiCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <FiMail className="w-3.5 h-3.5 text-blue-300" /> Verificar Correo
                            </h3>
                            <p className="text-[10px] text-blue-200">Seguridad para tu cuenta</p>
                        </div>
                        {!isEmailVerified && <FiChevronRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-transform" />}
                    </Link>

                    {/* Mission 2: Address */}
                    <Link href="/customer/addresses" className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-lg transition-colors">
                        <FiCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <FiMapPin className="w-3.5 h-3.5 text-blue-300" /> Agregar Dirección
                            </h3>
                            <p className="text-[10px] text-blue-200">Para envíos físicos rápidos</p>
                        </div>
                        <FiChevronRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* Mission 3: First Order */}
                    <Link href="/" className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-lg transition-colors">
                        {hasOrders ? (
                            <FiCheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        ) : (
                            <FiCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <FiShoppingBag className="w-3.5 h-3.5 text-blue-300" /> Tu Primer Pedido
                            </h3>
                            <p className="text-[10px] text-blue-200">Explora nuestras ofertas</p>
                        </div>
                        {!hasOrders && <FiChevronRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-transform" />}
                    </Link>
                </div>
            </div>
            
            {/* Dismiss Button */}
            {percentage === 100 && (
                <button 
                    onClick={() => setIsDismissed(true)}
                    className="absolute top-2 right-2 text-white/50 hover:text-white text-xs underline"
                >
                    Ocultar
                </button>
            )}
        </div>
    );
}
