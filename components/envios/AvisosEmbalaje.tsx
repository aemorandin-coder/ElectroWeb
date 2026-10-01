import { FiBox, FiGift } from 'react-icons/fi';
import { formatUSD } from '@/lib/currency';
import { resumenEmbalaje } from '@/lib/embalaje';
import type { ShippingBreakdown } from '@/lib/pricing';

/**
 * Avisos del embalaje en el carrito y en el pago (C-153): cuánto falta para que sea gratis y en qué viaja el pedido.
 * `envio` es el cálculo para un envío por ZOOM o MRW. Solo dice lo que el cálculo de la orden va a cumplir.
 */
export function AvisosEmbalaje({ envio, umbralEmbalaje, umbralEnvio, className = '' }: {
  envio: ShippingBreakdown;
  /** Montos de Configuración, para la barra de avance */
  umbralEmbalaje: number | null;
  umbralEnvio: number | null;
  className?: string;
}) {
  // De los dos umbrales se avisa el que está más cerca: al llegar, aparece el siguiente
  const metas = [
    envio.missingFreePackagingUSD !== null && umbralEmbalaje
      ? { falta: envio.missingFreePackagingUSD, umbral: umbralEmbalaje, texto: 'el embalaje gratis', detalle: 'No pagas embalaje; el flete se lo pagas a la empresa al retirar.' }
      : null,
    envio.missingFreeShippingUSD !== null && umbralEnvio
      ? { falta: envio.missingFreeShippingUSD, umbral: umbralEnvio, texto: 'el envío gratis', detalle: 'La tienda paga el embalaje y el flete.' }
      : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null).sort((a, b) => a.falta - b.falta);
  const meta = metas[0];
  const plan = envio.packaging;
  const cobra = envio.packagingFee > 0;

  if (!meta && !(plan && cobra && (plan.conEspacio || plan.piezas > 1))) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {meta && (
        <div className="rounded-lg bg-success/10 p-3">
          <p className="flex items-start gap-1.5 text-sm font-semibold text-success-strong">
            <FiGift className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Te faltan {formatUSD(meta.falta)} en productos para {meta.texto}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
            <div className="h-full rounded-full bg-success-strong" style={{ width: `${Math.min(100, Math.max(4, ((meta.umbral - meta.falta) / meta.umbral) * 100))}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">Desde {formatUSD(meta.umbral)} en productos físicos. {meta.detalle}</p>
        </div>
      )}
      {plan && cobra && plan.piezas > 1 && (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <FiBox className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Tu pedido viaja en {plan.piezas} paquetes:{' '}
            {plan.bultos.map((b) => `${b.cantidad} × ${b.tipo === 'PROPIO' ? 'en su propia caja' : b.nombre} (${formatUSD(b.precioUSD)}${b.cantidad > 1 ? ' cada uno' : ''})`).join(', ')}.
          </span>
        </p>
      )}
      {plan && cobra && plan.conEspacio && (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <FiBox className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Todo cabe en un solo paquete ({resumenEmbalaje(plan)}) y le queda espacio. El embalaje se cobra por paquete, no por producto.</span>
        </p>
      )}
    </div>
  );
}
