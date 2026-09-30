'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FiCheck, FiClock, FiCopy, FiInfo } from 'react-icons/fi';
import { montoBs, montoParaCopiar } from '@/lib/pago-movil/monto';
import { RESERVA_PAGO_MANUAL_HORAS, ayudaReferencia, leerReferenciaManual, monedaPagoManual, type TipoPagoManual } from '@/lib/checkout-pago';
import { fueraDeRango, montoEnMoneda, type MetodoPagoEmpresa } from '@/components/checkout/PaymentMethodSelector';
import { adminNotice } from '@/lib/admin-ui';

// C-132: pago directo con Binance Pay, PayPal, Zelle, Zinli o transferencia. Decisión de Andrés (29/09): el cliente
// paga, escribe la referencia y la orden queda "Por validar"; el equipo la confirma en Órdenes. Binance es una cuenta
// personal: no hay API para verificar ni QR dinámico, así que se muestra el QR fijo que se sube en Métodos de pago.

function BotonCopiar({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const alCopiar = () => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      toast.success(`${etiqueta} copiado`);
      setTimeout(() => setCopiado(false), 1500);
    }).catch(() => toast.error('No se pudo copiar'));
  };
  return (
    <button
      type="button"
      onClick={alCopiar}
      aria-label={`Copiar ${etiqueta.toLowerCase()}`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50"
    >
      {copiado ? <FiCheck className="h-4 w-4" aria-hidden="true" /> : <FiCopy className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  // Etiqueta arriba y valor abajo: a 360 px un Pay ID o un correo no se parte a la mitad
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted">{etiqueta}</dt>
        <dd className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{valor}</dd>
      </div>
      <BotonCopiar etiqueta={etiqueta} texto={valor} />
    </div>
  );
}

export default function PagoManualPanel({
  metodo,
  totalUSD,
  tasa,
  referencia,
  onReferencia,
  listo,
}: {
  metodo: MetodoPagoEmpresa & { type: TipoPagoManual };
  totalUSD: number;
  tasa: number;
  referencia: string;
  onReferencia: (valor: string) => void;
  /** El servidor confirmó el total y nada impide crear la orden */
  listo: boolean;
}) {
  const moneda = monedaPagoManual(metodo.type);
  const monto = montoEnMoneda(metodo.type, totalUSD, tasa);
  // Lo que se pega en la app: número con punto decimal ("12.50") o el monto exacto en Bs.
  const montoCopia = moneda === 'BS' && tasa > 0 ? montoParaCopiar(montoBs(totalUSD, tasa)) : totalUSD.toFixed(2);
  const ayuda = ayudaReferencia(metodo.type);
  const rango = fueraDeRango(metodo, totalUSD);
  const referenciaValida = leerReferenciaManual(referencia) !== null;

  if (!listo) {
    return <p className={adminNotice('neutral')}>Calculando el total exacto de tu compra… Los datos para pagar aparecen cuando esté listo.</p>;
  }
  if (rango) {
    return <p className={adminNotice('warning')}>{metodo.name} acepta compras {rango.toLowerCase()}. Elige otro método.</p>;
  }

  const datos: Array<[string, string | null | undefined]> = [
    ['Binance Pay ID', metodo.payId],
    ['Correo', metodo.email],
    ['Titular', metodo.holderName],
    ['Banco', metodo.bankName],
    ['Cuenta', metodo.accountNumber],
    ['Tipo de cuenta', metodo.accountType],
    ['Cédula o RIF', metodo.holderId],
    ['Teléfono', metodo.phone],
    ['Red', metodo.network],
    ['Dirección de depósito', metodo.walletAddress],
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">1. Paga el monto exacto</p>
          <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white px-3 py-2">
            <span className="text-2xl font-bold tabular-nums text-ink">{monto}</span>
            <BotonCopiar etiqueta="Monto" texto={montoCopia} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Sin recargo: la comisión de {metodo.name} la paga Electro Shop.
            {moneda === 'USDT' && ' 1 USDT = 1 dólar.'}
          </p>
          <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-white px-3">
            {datos.filter(([, v]) => v && v.trim()).map(([etiqueta, valor]) => (
              <Dato key={etiqueta} etiqueta={etiqueta} valor={valor as string} />
            ))}
          </dl>
          {metodo.displayNote && (
            <p className="mt-2 flex items-start gap-2 text-xs text-ink-soft">
              <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> {metodo.displayNote}
            </p>
          )}
        </div>
        {metodo.qrCodeImage && (
          <div className="shrink-0 self-center rounded-xl border border-line bg-white p-2 sm:self-start">
            <Image src={metodo.qrCodeImage} alt={`Código QR de ${metodo.name}`} width={160} height={160} className="h-40 w-40 object-contain" unoptimized />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="referencia-pago" className="text-xs font-semibold uppercase tracking-wide text-muted">
          2. {ayuda.etiqueta}
        </label>
        <input
          id="referencia-pago"
          value={referencia}
          onChange={(e) => onReferencia(e.target.value.slice(0, 100))}
          placeholder={ayuda.ejemplo}
          autoComplete="off"
          aria-invalid={referencia.length > 0 && !referenciaValida}
          aria-describedby="referencia-pago-ayuda"
          className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p id="referencia-pago-ayuda" className={`mt-1 text-xs ${referencia.length > 0 && !referenciaValida ? 'font-medium text-deal' : 'text-muted'}`}>
          {referencia.length > 0 && !referenciaValida
            ? 'Solo letras, números, guion o punto, de 4 a 100 caracteres.'
            : 'Está en el comprobante de tu pago.'}
        </p>
      </div>

      <p className="flex items-start gap-2 text-xs text-ink-soft">
        <FiClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">3. Completa el pedido.</strong> Te apartamos los productos {RESERVA_PAGO_MANUAL_HORAS} horas
          mientras el equipo confirma tu pago, y te avisamos al confirmarlo.
        </span>
      </p>
    </div>
  );
}
