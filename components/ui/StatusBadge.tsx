/**
 * StatusBadge — Issue #5.3 (Bloque 2 Audit)
 *
 * Componente unificado para mostrar el estado de un pedido/producto.
 * Reemplaza los badges de estado inline duplicados en:
 *   - app/admin/pedidos/
 *   - app/mis-pedidos/
 *   - components/orders/
 *   - app/customer/
 */

interface StatusConfig {
  bg: string;
  text: string;
  label: string;
  dot?: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Pedidos
  PENDING:    { bg: 'bg-warning/15',          text: 'text-warning-strong', dot: 'bg-warning-strong', label: 'Pendiente'   },
  CONFIRMED:  { bg: 'bg-brand-50',            text: 'text-brand-700',      dot: 'bg-brand-500',    label: 'Confirmado'  },
  PROCESSING: { bg: 'bg-brand-50',            text: 'text-brand-700',      dot: 'bg-brand-500',    label: 'Procesando'  },
  COMPLETED:  { bg: 'bg-success-strong/10',   text: 'text-success-strong', dot: 'bg-success-strong', label: 'Completado' },
  CANCELLED:  { bg: 'bg-deal-bg',             text: 'text-deal',           dot: 'bg-deal',         label: 'Cancelado'   },
  DELIVERED:  { bg: 'bg-success-strong/10',   text: 'text-success-strong', dot: 'bg-success-strong', label: 'Entregado'   },
  SHIPPED:    { bg: 'bg-brand-50',            text: 'text-brand-700',      dot: 'bg-brand-500',    label: 'Enviado'     },
  REFUNDED:   { bg: 'bg-surface',             text: 'text-ink-soft',       dot: 'bg-subtle',       label: 'Reembolsado' },
  // Pagos
  PAID:       { bg: 'bg-success-strong/10',   text: 'text-success-strong', dot: 'bg-success-strong', label: 'Pagado'      },
  UNPAID:     { bg: 'bg-deal-bg',             text: 'text-deal',           dot: 'bg-deal',         label: 'Sin Pagar'   },
  VERIFYING:  { bg: 'bg-warning/15',          text: 'text-warning-strong', dot: 'bg-warning-strong', label: 'Verificando' },
};

interface StatusBadgeProps {
  status: string;
  /** Mostrar un dot indicator antes del label */
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = false, className = '' }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status?.toUpperCase()] ?? {
    bg: 'bg-surface',
    text: 'text-ink-soft',
    dot: 'bg-subtle',
    label: status ?? 'Desconocido',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      )}
      {cfg.label}
    </span>
  );
}

/** Variante de texto plano sin fondo (para tablas compactas) */
export function StatusText({ status }: { status: string }) {
  const cfg = STATUS_MAP[status?.toUpperCase()] ?? {
    text: 'text-muted',
    label: status ?? 'Desconocido',
  };
  return <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>;
}
