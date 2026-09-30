'use client';

import { FiCheckCircle, FiGift, FiPlus } from 'react-icons/fi';
import { FaMobileScreen } from 'react-icons/fa6';
import { formatPuntos, formatUSD } from '@/lib/currency';
import { repartirPuntos } from '@/lib/checkout-pago';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// C-132: pagar con Puntos ES. Si alcanzan, se paga con 1 clic ("Completar pedido"). Si alcanzan solo en parte, el
// resto se paga por Pago Móvil (pago mixto) o se recargan Puntos ES. Reemplaza el círculo SVG con colores fijos.

export default function PagoPuntosPanel({
  disponibleUSD,
  totalUSD,
  pagoMovilDisponible,
  onPagarRestoConPagoMovil,
  onRecargar,
  onGiftCard,
}: {
  disponibleUSD: number;
  totalUSD: number;
  pagoMovilDisponible: boolean;
  onPagarRestoConPagoMovil: () => void;
  onRecargar: () => void;
  onGiftCard: () => void;
}) {
  const reparto = repartirPuntos(disponibleUSD, totalUSD);
  const alcanza = totalUSD > 0 && reparto.restanteUSD === 0;
  const porcentaje = totalUSD > 0 ? Math.min(100, Math.round((disponibleUSD / totalUSD) * 100)) : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Tus Puntos ES</p>
          <p className="text-2xl font-bold tabular-nums text-ink">{formatUSD(disponibleUSD)} <span className="text-sm font-semibold text-ink-soft">Puntos ES</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted">Total</p>
          <p className="text-lg font-semibold tabular-nums text-ink">{formatUSD(totalUSD)}</p>
        </div>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Cuánto del total cubren tus Puntos ES"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${alcanza ? 'bg-success' : 'bg-brand-500'}`} style={{ width: `${porcentaje}%` }} />
      </div>

      {alcanza ? (
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-ink">Te alcanza.</strong> Completa el pedido y listo: te quedan {formatPuntos(disponibleUSD - totalUSD)}.
          </span>
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            Te faltan <strong className="font-semibold tabular-nums text-ink">{formatUSD(reparto.restanteUSD)}</strong>.
            {reparto.mixto && pagoMovilDisponible && ' Usa tus Puntos ES y paga solo la diferencia por Pago Móvil.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {reparto.mixto && pagoMovilDisponible && (
              <button type="button" onClick={onPagarRestoConPagoMovil} className={`${adminPrimaryButton} h-11 justify-center`}>
                <FaMobileScreen className="h-4 w-4" aria-hidden="true" />
                Pagar {formatUSD(reparto.restanteUSD)} por Pago Móvil
              </button>
            )}
            <button type="button" onClick={onRecargar} className={`${reparto.mixto && pagoMovilDisponible ? adminSecondaryButton : adminPrimaryButton} h-11 justify-center`}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Recargar Puntos ES
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={onGiftCard} className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
        <FiGift className="h-4 w-4" aria-hidden="true" /> ¿Tienes una gift card? Canjéala aquí
      </button>
    </div>
  );
}
