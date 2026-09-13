'use client';

import Link from 'next/link';
import { FiHome, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import { PiHeartBreakBold } from 'react-icons/pi';

export default function CustomerNotFound() {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[60vh]">
            {/* 404 Visual */}
            <div className="flex flex-col items-center gap-2 mb-8">
                <span className="text-[100px] font-bold bg-gradient-to-br from-line to-line-strong bg-clip-text text-transparent leading-none select-none">
                    404
                </span>
                <div className="w-16 h-16 bg-gradient-to-br from-brand-500/10 to-brand-600/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-brand-500/20 shadow-lg -mt-4">
                    <PiHeartBreakBold className="w-8 h-8 text-brand-500" />
                </div>
            </div>

            {/* Title & Description */}
            <h1 className="text-2xl md:text-3xl font-bold text-ink mb-3">
                Página no encontrada
            </h1>
            <p className="text-base text-muted max-w-md mx-auto leading-relaxed mb-8">
                Lo sentimos, la página que buscas no existe o ha sido movida a otra ubicación.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface text-ink font-bold rounded-xl border border-line hover:bg-line transition-all hover:scale-105"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Volver atrás
                </button>
                <Link
                    href="/customer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-xl hover:shadow-lg transition-all hover:scale-105"
                >
                    <FiHome className="w-4 h-4" />
                    Ir al Panel
                </Link>
                <Link
                    href="/productos"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-500 font-bold rounded-xl border-2 border-brand-500 hover:bg-blue-50 transition-all hover:scale-105"
                >
                    <FiShoppingBag className="w-4 h-4" />
                    Ver Productos
                </Link>
            </div>
        </div>
    );
}
