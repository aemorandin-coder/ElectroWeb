import { formatUSD } from '@/lib/currency';
import { porcentajeIva } from '@/lib/pricing';

/**
 * "IVA incluido (16 %): $8,28 · Base imponible: $51,72" (C-146). Los precios de la tienda ya llevan el IVA: esto
 * no suma nada, dice cuánto del total es IVA. Sin IVA (órdenes de antes, o Configuración sin porcentaje) no pinta nada.
 * C-151: `totalUSD` es lo que lleva IVA. En una compra con productos físicos y digitales (que no lo llevan) es solo la
 * parte física: `soloFisicos` lo dice, para que la base no parezca la de toda la compra.
 */
export default function IvaIncluido({ totalUSD, ivaUSD, soloFisicos = false, className = '' }: { totalUSD: number; ivaUSD: number; soloFisicos?: boolean; className?: string }) {
  if (!(ivaUSD > 0) || !(totalUSD > ivaUSD)) return null;
  return (
    <p className={`text-xs text-ink-soft ${className}`} data-iva>
      IVA incluido{soloFisicos ? ' en los productos físicos' : ''} ({porcentajeIva(totalUSD, ivaUSD)} %): <strong className="font-semibold text-ink">{formatUSD(ivaUSD)}</strong>
      {' '}· Base imponible: {formatUSD(Math.round((totalUSD - ivaUSD) * 100) / 100)}
    </p>
  );
}
