'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                ¡Algo salió mal!
              </h1>

              {/* Description */}
              <p className="text-slate-500 mb-6">
                Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado y estamos trabajando para solucionarlo.
              </p>

              {/* Error ID */}
              {error.digest && (
                <p className="text-xs text-slate-400 mb-6 font-mono">
                  ID del error: {error.digest}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-[#2a63cd] text-white font-bold rounded-xl hover:bg-[#1e4ba3] transition-all shadow-lg"
                >
                  Intentar de nuevo
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Ir al inicio
                </Link>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 mt-6">
              Si el problema persiste, contáctanos por WhatsApp
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
