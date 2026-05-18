import Link from 'next/link';

/**
 * ErrorState — Issue #28 (Bloque 3 Audit)
 *
 * Componente unificado de estado de error con botón retry y link a soporte.
 * Reemplaza los mensajes de error inline dispersos por toda la aplicación.
 */

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showContact?: boolean;
  /** Variante compacta para usar dentro de tablas o cards */
  compact?: boolean;
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
  onRetry,
  showContact = true,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      {/* Ícono de error */}
      <div
        className={`bg-red-50 rounded-2xl flex items-center justify-center mb-4 ${
          compact ? 'w-12 h-12' : 'w-16 h-16'
        }`}
      >
        <svg
          className={`text-red-400 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3
        className={`font-bold text-slate-800 mb-2 ${
          compact ? 'text-base' : 'text-lg'
        }`}
      >
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reintentar
          </button>
        )}
        {showContact && (
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Contactar soporte
          </Link>
        )}
      </div>
    </div>
  );
}
