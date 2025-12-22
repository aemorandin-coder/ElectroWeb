'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4" role="main">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center" aria-hidden="true">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#212529] mb-3">
            Algo salió mal
          </h1>
          <p className="text-[#495057] mb-6">
            Lo sentimos, ha ocurrido un error inesperado. Por favor intenta de nuevo.
          </p>
          {error.digest && (
            <p className="text-xs text-[#6a6c6b] mb-4">
              Código de error: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd] focus-visible:ring-offset-2"
            aria-label="Intentar cargar la página de nuevo"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white text-[#2a63cd] font-semibold rounded-lg border-2 border-[#2a63cd] hover:bg-[#f8f9fa] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd] focus-visible:ring-offset-2"
            aria-label="Volver a la página de inicio"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
