'use client';

import Link from 'next/link';
import { FiHome, FiArrowLeft, FiSettings } from 'react-icons/fi';

export default function AdminNotFound() {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[60vh]">
            {/* 404 Visual */}
            <div className="flex flex-col items-center gap-2 mb-8">
                <span className="text-[100px] font-bold text-line-strong leading-none select-none">
                    404
                </span>
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center border border-brand-200 -mt-4">
                    <FiSettings className="w-8 h-8 text-brand-500" />
                </div>
            </div>

            {/* Title & Description */}
            <h1 className="text-2xl md:text-3xl font-bold text-ink mb-3">
                Página no encontrada
            </h1>
            <p className="text-base text-muted max-w-md mx-auto leading-relaxed mb-8">
                La sección que buscas no existe o ha sido movida.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface text-ink font-bold rounded-xl border border-line hover:bg-line transition-all "
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Volver atrás
                </button>
                <Link
                    href="/admin"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all"
                >
                    <FiHome className="w-4 h-4" />
                    Panel de Admin
                </Link>
            </div>
        </div>
    );
}
