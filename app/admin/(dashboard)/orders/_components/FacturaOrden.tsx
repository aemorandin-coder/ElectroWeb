'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiCopy, FiFileText, FiUserX } from 'react-icons/fi';
import { adminBadge, adminHint, adminInput, adminLabel, adminSecondaryButton } from '@/lib/admin-ui';
import { NUMERO_FACTURA, textoParaFacturar } from '@/lib/facturacion';
import { describirPago, type PagoMovilResumen } from '@/lib/order-pago';

// Facturación de la orden (C-147). La web no emite la factura: aquí están los datos a nombre de quién va
// (la copia que guardó la orden al comprar), el botón para pasarlos a SADES o al talonario, y el número de la factura emitida.

export interface OrdenFactura {
  id: string;
  orderNumber: string;
  createdAt: string;
  user: { name: string; email: string; profile?: { companyName: string | null; taxId: string | null; businessVerified?: boolean | null; phone?: string | null; idNumber?: string | null } } | null;
  guestEmail?: string | null;
  billingType?: string | null;
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  invoiceNumber?: string | null;
  invoicedAt?: string | null;
  items: Array<{ productName?: string; quantity?: number; priceUSD?: number; totalUSD?: number; product?: { name?: string } }>;
  discountUSD?: number | string | null;
  shippingUSD?: number | string | null;
  taxUSD?: number | string | null;
  totalUSD: number | string;
  totalVES?: number | string | null;
  exchangeRateVES?: number | string | null;
  paymentMethod: string;
  pagosMovil?: PagoMovilResumen[];
  pointsUSD?: number | string | null;
  paymentReference?: string | null;
}

export default function FacturaOrden({ orden, onGuardada }: { orden: OrdenFactura; onGuardada: (datos: { invoiceNumber: string | null; invoicedAt: string | null }) => void }) {
  const [numero, setNumero] = useState(orden.invoiceNumber ?? '');
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const perfil = orden.user?.profile;
  const empresa = orden.billingType === 'COMPANY';
  const limpio = numero.trim();
  const valido = limpio === '' || NUMERO_FACTURA.test(limpio);
  const cambio = limpio !== (orden.invoiceNumber ?? '');

  const copiar = async () => {
    const pago = describirPago(orden.paymentMethod, orden.pagosMovil, { puntosUSD: orden.pointsUSD, referencia: orden.paymentReference });
    const texto = textoParaFacturar({
      ...orden,
      taxUSD: orden.taxUSD ?? 0,
      respaldo: { name: orden.user?.name, idNumber: perfil?.idNumber },
      phone: perfil?.phone,
      email: orden.user?.email ?? orden.guestEmail,
      items: orden.items.map((item) => ({
        productName: item.productName || item.product?.name || 'Producto',
        quantity: item.quantity ?? 1,
        priceUSD: item.priceUSD ?? 0,
        totalUSD: item.totalUSD ?? 0,
      })),
      pago: [pago.titulo, pago.detalle].filter(Boolean).join(' · '),
    });
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto a mano.');
    }
  };

  const guardar = async () => {
    if (!valido || !cambio) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/orders/${orden.id}/factura`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber: limpio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'No se pudo guardar el número de factura');
        return;
      }
      onGuardada({ invoiceNumber: data.invoiceNumber ?? null, invoicedAt: data.invoicedAt ?? null });
      toast.success(data.invoiceNumber ? 'Número de factura guardado' : 'Número de factura borrado');
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3 text-sm [overflow-wrap:anywhere]">
      {orden.billingName ? (
        <div className="space-y-0.5">
          <p className="text-xs text-muted">Factura a nombre de {empresa ? 'la empresa' : 'la persona'}</p>
          <p className="font-semibold text-ink">{orden.billingName}</p>
          {orden.billingTaxId && <p className="tabular-nums text-ink">{empresa ? 'RIF' : 'Cédula'} {orden.billingTaxId}</p>}
          {orden.billingAddress && <p className="text-muted">Domicilio fiscal: {orden.billingAddress}</p>}
        </div>
      ) : orden.user ? (
        // Órdenes de antes de C-147: no guardaron la copia, se muestran los datos de la cuenta
        <div className="space-y-0.5">
          <p className="font-semibold text-ink">{orden.user.name || 'Sin nombre'}</p>
          {perfil?.idNumber && <p className="tabular-nums text-muted">Cédula {perfil.idNumber}</p>}
          {perfil?.companyName && (
            <p className="text-ink">
              {perfil.companyName}
              {perfil.taxId && <span className="text-muted"> · RIF {perfil.taxId}</span>}
              {!perfil.businessVerified && <span className="text-muted"> · sin verificar</span>}
            </p>
          )}
        </div>
      ) : orden.guestEmail ? (
        <p className="font-semibold text-ink">Invitado</p>
      ) : (
        <span className={adminBadge('neutral')}><FiUserX className="h-3.5 w-3.5" aria-hidden="true" /> Cliente eliminado</span>
      )}

      {(orden.user || orden.guestEmail) && (
        <div className="space-y-0.5">
          {empresa && orden.user && <p className="text-muted">Compró: {orden.user.name}</p>}
          <p><a href={`mailto:${orden.user?.email ?? orden.guestEmail}`} className="text-brand-600 hover:text-brand-700">{orden.user?.email ?? orden.guestEmail}</a></p>
          {perfil?.phone && (
            <p><a href={`tel:${perfil.phone}`} className="tabular-nums text-brand-600 hover:text-brand-700">{perfil.phone}</a></p>
          )}
        </div>
      )}

      <button type="button" onClick={copiar} className={`${adminSecondaryButton} w-full ${copiado ? 'border-success-strong text-success-strong' : ''}`} aria-live="polite">
        {copiado ? <FiCheck className="h-4 w-4" aria-hidden="true" /> : <FiCopy className="h-4 w-4" aria-hidden="true" />}
        {copiado ? '¡Copiado!' : 'Copiar datos para facturar'}
      </button>

      <div>
        <label htmlFor="orden-factura-numero" className={adminLabel}>N.º de la factura emitida</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <FiFileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="orden-factura-numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void guardar(); } }}
              maxLength={30}
              inputMode="text"
              autoComplete="off"
              placeholder="Ej: 000123"
              aria-invalid={!valido}
              aria-describedby="orden-factura-ayuda"
              className={`${adminInput(!valido)} pl-9 tabular-nums`}
            />
          </div>
          <button type="button" onClick={guardar} disabled={guardando || !cambio || !valido} className={`${adminSecondaryButton} shrink-0`}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <p id="orden-factura-ayuda" className={adminHint}>
          {!valido ? 'Solo letras, números, guiones, puntos o barras.'
            : 'La factura se hace en SADES o en el talonario. El cliente ve este número en su pedido.'}
        </p>
      </div>
    </div>
  );
}
