'use client';

import Link from 'next/link';
import { FiHome, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import { PiHeartBreakBold } from 'react-icons/pi';
import { adminEmpty, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

export default function CustomerNotFound() {
    return (
        <div className={`${adminEmpty} min-h-[50vh] my-6`}>
            <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20 mb-4 text-brand-500">
                <PiHeartBreakBold className="w-7 h-7" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-ink mb-2">
                Página no encontrada
            </h1>
            <p className="text-sm text-muted max-w-md mx-auto leading-relaxed mb-6">
                Lo sentimos, la página que buscas no existe o ha sido movida a otra ubicación.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className={`${adminSecondaryButton} gap-2`}
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Volver atrás
                </button>
                <Link
                    href="/customer"
                    className={`${adminPrimaryButton} gap-2`}
                >
                    <FiHome className="w-4 h-4" />
                    Ir al Panel
                </Link>
                <Link
                    href="/productos"
                    className={`${adminSecondaryButton} gap-2`}
                >
                    <FiShoppingBag className="w-4 h-4" />
                    Ver Productos
                </Link>
            </div>
        </div>
    );
}
