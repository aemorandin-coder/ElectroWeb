'use client';

import type { IconType } from 'react-icons';
import { FiCheck, FiCreditCard, FiDollarSign, FiGlobe, FiHash } from 'react-icons/fi';
import { FaMobileScreen } from 'react-icons/fa6';
import { SiBinance, SiPaypal, SiZelle } from 'react-icons/si';
import { formatPuntos, formatUSD, formatVES } from '@/lib/currency';
import { montoBs } from '@/lib/pago-movil/monto';
import { esPagoManual, monedaPagoManual, type TipoPagoManual } from '@/lib/checkout-pago';

// C-132: "¿Cómo deseas pagar?". Una tarjeta por método activo, con el monto en su moneda antes de elegir.
// Antes el checkout mostraba "Pagar con Puntos ES", Pago Móvil y gift card fijos, y los métodos que la tienda activaba
// en el panel (Binance Pay, PayPal…) solo aparecían como texto: "recarga tus Puntos ES".

/** Lo que devuelve GET /api/customer/company-payment-methods (lista blanca de C-101). */
export interface MetodoPagoEmpresa {
  id: string;
  type: string;
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  holderName?: string | null;
  holderId?: string | null;
  phone?: string | null;
  email?: string | null;
  payId?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  qrCodeImage?: string | null;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  displayNote?: string | null;
}

/** El método elegido: Puntos ES, Pago Móvil o un método manual por su id. */
export type MetodoCheckout = 'WALLET' | 'PAGO_MOVIL' | `MANUAL:${string}`;

interface Opcion {
  id: MetodoCheckout;
  titulo: string;
  /** El monto en la moneda del método, o lo que el cliente tiene */
  detalle: string;
  etiqueta: string;
  Icono: IconType;
  /** Por qué no se puede elegir (mínimo o máximo del método) */
  motivo?: string;
}

export const ICONO_METODO: Record<string, IconType> = {
  BINANCE_PAY: SiBinance,
  CRYPTO: SiBinance,
  PAYPAL: SiPaypal,
  ZELLE: SiZelle,
  ZINLI: FiCreditCard,
  BANK_TRANSFER: FiHash,
  MERCANTIL_PANAMA: FiGlobe,
  OTHER: FiDollarSign,
};

/** "12,50 USDT": el mismo formato de la tienda, sin el signo de dólar. */
export function formatUSDT(monto: number): string {
  return `${formatUSD(monto).replace('$', '').trim()} USDT`;
}

export function montoEnMoneda(tipo: TipoPagoManual, totalUSD: number, tasa: number): string {
  const moneda = monedaPagoManual(tipo);
  if (moneda === 'USDT') return formatUSDT(totalUSD);
  if (moneda === 'BS') return tasa > 0 ? formatVES(montoBs(totalUSD, tasa)) : formatUSD(totalUSD);
  return formatUSD(totalUSD);
}

/** Por qué un método manual no sirve para este total (su mínimo o su máximo). */
export function fueraDeRango(metodo: MetodoPagoEmpresa, totalUSD: number): string | null {
  const min = metodo.minAmount !== null && metodo.minAmount !== undefined ? Number(metodo.minAmount) : null;
  const max = metodo.maxAmount !== null && metodo.maxAmount !== undefined ? Number(metodo.maxAmount) : null;
  if (min !== null && totalUSD < min) return `Desde ${formatUSD(min)}`;
  if (max !== null && totalUSD > max) return `Hasta ${formatUSD(max)}`;
  return null;
}

export function opcionesDePago(p: {
  totalUSD: number;
  puntosUSD: number;
  tasa: number;
  pagoMovilDirecto: boolean;
  metodos: MetodoPagoEmpresa[];
}): Opcion[] {
  const opciones: Opcion[] = [
    {
      id: 'WALLET',
      titulo: 'Puntos ES',
      detalle: p.puntosUSD >= p.totalUSD && p.totalUSD > 0 ? `Tienes ${formatPuntos(p.puntosUSD)}: pagas con 1 clic` : `Tienes ${formatPuntos(p.puntosUSD)}`,
      etiqueta: 'Al instante',
      Icono: FiDollarSign,
    },
  ];
  if (p.pagoMovilDirecto) {
    opciones.push({
      id: 'PAGO_MOVIL',
      titulo: 'Pago Móvil',
      detalle: p.tasa > 0 ? `${formatVES(montoBs(p.totalUSD, p.tasa))} · tasa BCV ${formatVES(p.tasa).replace('Bs. ', '')}` : 'En bolívares, a la tasa BCV del día',
      etiqueta: 'Verificado por el BDV',
      Icono: FaMobileScreen,
    });
  }
  for (const metodo of p.metodos) {
    if (!esPagoManual(metodo.type)) continue;
    opciones.push({
      id: `MANUAL:${metodo.id}`,
      titulo: metodo.name,
      detalle: `${montoEnMoneda(metodo.type, p.totalUSD, p.tasa)} · sin recargo`,
      etiqueta: 'Lo confirma el equipo',
      Icono: ICONO_METODO[metodo.type] ?? FiDollarSign,
      motivo: fueraDeRango(metodo, p.totalUSD) ?? undefined,
    });
  }
  return opciones;
}

export default function PaymentMethodSelector({
  opciones,
  value,
  onChange,
}: {
  opciones: Opcion[];
  value: MetodoCheckout;
  onChange: (metodo: MetodoCheckout) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-base font-semibold text-ink">¿Cómo deseas pagar?</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {opciones.map(({ id, titulo, detalle, etiqueta, Icono, motivo }) => {
          const elegido = value === id;
          return (
            <label
              key={id}
              className={`relative flex min-h-16 items-center gap-3 rounded-xl border-2 p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                motivo ? 'cursor-not-allowed border-line bg-surface opacity-60'
                  : elegido ? 'cursor-pointer border-brand-500 bg-brand-50' : 'cursor-pointer border-line bg-white hover:border-brand-200'
              }`}
            >
              <input
                type="radio"
                name="metodo-pago"
                value={id}
                checked={elegido}
                disabled={Boolean(motivo)}
                onChange={() => onChange(id)}
                className="sr-only"
              />
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${elegido ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
                <Icono className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`text-sm font-semibold ${elegido ? 'text-brand-700' : 'text-ink'}`}>{titulo}</span>
                  <span className="text-xs font-medium text-muted">{motivo ?? etiqueta}</span>
                </span>
                <span className="block text-xs text-ink-soft tabular-nums [overflow-wrap:anywhere]">{detalle}</span>
              </span>
              {elegido && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white" aria-hidden="true">
                  <FiCheck className="h-3.5 w-3.5" />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
