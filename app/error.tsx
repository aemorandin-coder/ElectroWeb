'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { adminCard, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged quietly for debugging
  }, [error]);

  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center p-4" role="main">
      <div className={`${adminCard} max-w-md w-full text-center p-8`}>
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-deal-bg text-deal flex items-center justify-center border border-deal/30" aria-hidden="true">
          <FiAlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Lo sentimos, ha ocurrido un error inesperado. Por favor intenta de nuevo.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-subtle mb-6 bg-surface py-1.5 px-3 rounded-lg border border-line inline-block">
            Código de error: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className={`${adminPrimaryButton} flex-1 justify-center gap-2 py-2.5`}
            aria-label="Intentar cargar la página de nuevo"
          >
            <FiRefreshCw className="w-4 h-4" />
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className={`${adminSecondaryButton} flex-1 justify-center gap-2 py-2.5`}
            aria-label="Volver a la página de inicio"
          >
            <FiHome className="w-4 h-4" />
            Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
