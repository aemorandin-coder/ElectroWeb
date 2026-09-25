'use client';

import toast from 'react-hot-toast';
import { FiCheck, FiScissors } from 'react-icons/fi';
import { useCart } from '@/contexts/CartContext';
import { formatUSD } from '@/lib/currency';
import type { CuponPublico } from '@/lib/promotions';

/**
 * Cupones públicos que sirven para este producto (C-102), como el "Aplicar cupón" de Amazon:
 * un toque y queda guardado en el carrito; el descuento lo calcula el servidor al pagar.
 */
export default function CouponOffers({ coupons }: { coupons: CuponPublico[] }) {
  const { couponCode, setCouponCode } = useCart();
  if (coupons.length === 0) return null;

  return (
    <ul className="space-y-2" aria-label="Cupones disponibles">
      {coupons.slice(0, 2).map((c) => {
        const valor = c.percentOff ? `${c.percentOff}%` : formatUSD(c.amountOffUSD ?? 0);
        const aplicado = couponCode === c.code;
        return (
          <li key={c.code} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed border-success-strong/50 bg-success/5 px-3 py-2">
            <FiScissors className="h-4 w-4 shrink-0 text-success-strong" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-ink">
                Cupón: {valor} de descuento{c.label ? ` · ${c.label}` : ''}
              </p>
              <p className="text-xs text-muted">
                Código {c.code}
                {c.minSubtotalUSD ? ` · en compras desde ${formatUSD(c.minSubtotalUSD)}` : ''}
                {' · '}No se suma a otras ofertas del mismo producto
              </p>
            </div>
            {aplicado ? (
              <span className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-success-strong">
                <FiCheck className="h-4 w-4" aria-hidden="true" /> Aplicado
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCouponCode(c.code);
                  toast.success(`Cupón ${c.code} guardado: se descuenta al pagar`);
                }}
                className="min-h-11 rounded-lg bg-success-strong px-3 text-sm font-semibold text-white hover:bg-success-strong/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-strong"
              >
                Aplicar cupón
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
