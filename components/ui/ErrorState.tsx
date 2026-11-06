import Link from 'next/link';
import { IconoActualizar, IconoChat, IconoError } from '@/components/iconos';

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
        className={`bg-deal-bg rounded-2xl flex items-center justify-center mb-4 ${
          compact ? 'w-12 h-12' : 'w-16 h-16'
        }`}
      >
        <IconoError className={`text-deal ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      </div>

      <h3
        className={`font-bold text-ink mb-2 ${
          compact ? 'text-base' : 'text-lg'
        }`}
      >
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted max-w-xs mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm"
          >
            <IconoActualizar className="w-4 h-4" />
            Reintentar
          </button>
        )}
        {showContact && (
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-line text-ink-soft rounded-xl text-sm font-semibold hover:bg-surface hover:text-ink transition-colors"
          >
            <IconoChat className="w-4 h-4" />
            Contactar soporte
          </Link>
        )}
      </div>
    </div>
  );
}
