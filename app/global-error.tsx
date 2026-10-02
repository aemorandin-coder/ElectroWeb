'use client';

import { useEffect } from 'react';
import { FiAlertTriangle, FiHome, FiRefreshCw } from 'react-icons/fi';
import { adminCard, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import './globals.css';

// Error en el layout raíz (C-160). Esta pantalla reemplaza al layout: lleva sus propias etiquetas <html> y <body> y
// sus estilos (por eso importa globals.css). Es la última red: sin proveedores ni datos, solo texto y dos botones.
// Mismo diseño que app/error.tsx, con los tokens de PLAN.md §1. `retry` vuelve a pedir la página al servidor.

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
          <div className={`${adminCard} w-full max-w-md p-8 text-center`}>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-deal/30 bg-deal-bg text-deal" aria-hidden="true">
              <FiAlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-ink sm:text-2xl">Algo salió mal</h1>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              Ha ocurrido un error inesperado. Intenta de nuevo; si el problema sigue, escríbenos por WhatsApp.
            </p>
            {error.digest && (
              <p className="mb-6 inline-block rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs text-subtle">
                Código de error: {error.digest}
              </p>
            )}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => (typeof retry === 'function' ? retry() : window.location.reload())}
                className={`${adminPrimaryButton} flex-1 justify-center gap-2 py-2.5`}
              >
                <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                Intentar de nuevo
              </button>
              {/* Un enlace normal a propósito: con el layout caído, la navegación del cliente puede no funcionar */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className={`${adminSecondaryButton} flex-1 justify-center gap-2 py-2.5`}>
                <FiHome className="h-4 w-4" aria-hidden="true" />
                Ir al inicio
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
