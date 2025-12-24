'use client';

import Link from 'next/link';
import { FiHome, FiArrowLeft, FiSettings } from 'react-icons/fi';

export default function AdminNotFound() {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[60vh]">
            {/* 404 Visual */}
            <div className="flex flex-col items-center gap-2 mb-8">
                <span className="text-[100px] font-black bg-gradient-to-br from-[#e9ecef] to-[#dee2e6] bg-clip-text text-transparent leading-none select-none">
                    404
                </span>
                <div className="w-16 h-16 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-[#2a63cd]/20 shadow-lg -mt-4">
                    <FiSettings className="w-8 h-8 text-[#2a63cd]" />
                </div>
            </div>

            {/* Title & Description */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#212529] mb-3">
                Página no encontrada
            </h1>
            <p className="text-base text-[#6a6c6b] max-w-md mx-auto leading-relaxed mb-8">
                La sección que buscas no existe o ha sido movida.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f8f9fa] text-[#212529] font-bold rounded-xl border border-[#e9ecef] hover:bg-[#e9ecef] transition-all hover:scale-105"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Volver atrás
                </button>
                <Link
                    href="/admin"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-lg transition-all hover:scale-105"
                >
                    <FiHome className="w-4 h-4" />
                    Panel de Admin
                </Link>
            </div>
        </div>
    );
}
