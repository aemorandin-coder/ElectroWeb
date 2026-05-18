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
  PENDING:    { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pendiente'   },
  CONFIRMED:  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Confirmado'  },
  PROCESSING: { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Procesando'  },
  COMPLETED:  { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500',   label: 'Completado'  },
  CANCELLED:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Cancelado'   },
  DELIVERED:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Entregado'   },
  SHIPPED:    { bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'Enviado'     },
  REFUNDED:   { bg: 'bg-gray-100',    text: 'text-gray-700',    dot: 'bg-gray-500',    label: 'Reembolsado' },
  // Pagos
  PAID:       { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500',   label: 'Pagado'      },
  UNPAID:     { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Sin Pagar'   },
  VERIFYING:  { bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-500',  label: 'Verificando' },
};

interface StatusBadgeProps {
  status: string;
  /** Mostrar un dot indicator antes del label */
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = false, className = '' }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status?.toUpperCase()] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
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
    text: 'text-gray-600',
    label: status ?? 'Desconocido',
  };
  return <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>;
}
