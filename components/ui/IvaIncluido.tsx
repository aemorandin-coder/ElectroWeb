import { formatUSD } from '@/lib/currency';
import { porcentajeIva } from '@/lib/pricing';

/**
 * "IVA incluido (16 %): $8,28 · Base imponible: $51,72" (C-146). Los precios de la tienda ya llevan el IVA: esto
 * no suma nada, dice cuánto del total es IVA. Sin IVA (órdenes de antes, o Configuración sin porcentaje) no pinta nada.
 */
export default function IvaIncluido({ totalUSD, ivaUSD, className = '' }: { totalUSD: number; ivaUSD: number; className?: string }) {
  if (!(ivaUSD > 0) || !(totalUSD > ivaUSD)) return null;
  return (
    <p className={`text-xs text-ink-soft ${className}`} data-iva>
      IVA incluido ({porcentajeIva(totalUSD, ivaUSD)} %): <strong className="font-semibold text-ink">{formatUSD(ivaUSD)}</strong>
      {' '}· Base imponible: {formatUSD(Math.round((totalUSD - ivaUSD) * 100) / 100)}
    </p>
  );
}
