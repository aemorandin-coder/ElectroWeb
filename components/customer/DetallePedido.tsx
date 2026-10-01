'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FiPackage, FiPrinter, FiX } from 'react-icons/fi';
import OrderTracking from '@/components/orders/OrderTracking';
import { formatUSD, formatVES } from '@/lib/currency';
import IvaIncluido from '@/components/ui/IvaIncluido';
import { formatOrderPaymentMethod } from '@/lib/format-helpers';
import { conditionBadge, warrantyDaysFor, type Condition, type Grade } from '@/lib/product-condition';
import { estadoParaCliente } from '@/lib/order-pasos';
import { adminBadge } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useSettings } from '@/contexts/SettingsContext';

// C-137: detalle de un pedido y su recibo. El seguimiento (C-100 y C-126) arriba y, abajo, lo que se compró y cómo se
// pagó. "Imprimir recibo" imprime solo el recibo (o lo guarda en PDF desde el mismo diálogo).
// Es un recibo, no una factura fiscal: la facturación es C-120.

export interface PedidoCliente {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  pointsUSD?: number | string | null;
  deliveryMethod?: string | null;
  subtotalUSD?: number | string | null;
  shippingUSD?: number | string | null;
  discountUSD?: number | string | null;
  /** C-146: la parte del total que es IVA (0 en pedidos de antes) */
  taxUSD?: number | string | null;
  totalUSD: number;
  totalVES?: number | string | null;
  exchangeRateVES?: number | string | null;
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingNotes?: string | null;
  estimatedDelivery?: string | null;
  shippingAddress?: string | null;
  shippingMode?: string | null;
  shippingPaidBy?: string | null;
  courierOfficeName?: string | null;
  courierOfficeAddress?: string | null;
  recipientName?: string | null;
  shipmentEvents?: Array<{ id: string; description: string; occurredAt: string }>;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    priceUSD: number;
    totalUSD: number;
    productImage?: string | null;
    digitalVariantLabel?: string | null;
    productCondition?: Condition | null;
    conditionGrade?: Grade | null;
    warrantyDays?: number | null;
    product?: { productType?: string | null; mainImage?: string | null } | null;
  }>;
}

const n = (v: unknown) => Number(v) || 0;

export default function DetallePedido({ pedido, onCerrar }: { pedido: PedidoCliente; onCerrar: () => void }) {
  const { settings: ajustes } = useSettings();
  const tienda = { nombre: ajustes?.companyName || 'Electro Shop Morandin C.A.', address: ajustes?.address, city: ajustes?.city, state: ajustes?.state, phone: ajustes?.phone, email: ajustes?.email };
  const estado = estadoParaCliente(pedido);
  useBodyScrollLock(true);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const subtotal = n(pedido.subtotalUSD) || pedido.items.reduce((s, i) => s + i.totalUSD, 0);
  const descuento = n(pedido.discountUSD);
  const envio = n(pedido.shippingUSD);
  const tasa = n(pedido.exchangeRateVES) || (n(pedido.totalVES) && pedido.totalUSD ? n(pedido.totalVES) / pedido.totalUSD : 0);
  const fecha = new Date(pedido.createdAt).toLocaleString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return createPortal(
    <div className="recibo-portal fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center sm:p-4 print:static print:block" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo">
      <div className="absolute inset-0 bg-ink/50 print:hidden" onClick={onCerrar} aria-hidden="true" />
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-lg sm:rounded-2xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 print:hidden">
          <div className="min-w-0">
            <h2 id="detalle-titulo" className="font-mono text-base font-bold text-ink">Pedido #{pedido.orderNumber}</h2>
            <p className="text-xs text-muted">{fecha}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={adminBadge(estado.tono)}>{estado.label}</span>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink">
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 print:overflow-visible">
          <section className="print:hidden" aria-label="Seguimiento">
            <OrderTracking
              status={pedido.status}
              paymentStatus={pedido.paymentStatus}
              createdAt={pedido.createdAt}
              paidAt={pedido.paidAt ?? undefined}
              shippedAt={pedido.shippedAt ?? undefined}
              deliveredAt={pedido.deliveredAt ?? undefined}
              deliveryMethod={pedido.deliveryMethod || 'SHIPPING'}
              shippingCarrier={pedido.shippingCarrier ?? undefined}
              trackingNumber={pedido.trackingNumber ?? undefined}
              trackingUrl={pedido.trackingUrl}
              shippingNotes={pedido.shippingNotes ?? undefined}
              estimatedDelivery={pedido.estimatedDelivery ?? undefined}
              shippingAddress={pedido.shippingAddress}
              shippingMode={pedido.shippingMode}
              shippingPaidBy={pedido.shippingPaidBy}
              courierOfficeName={pedido.courierOfficeName}
              courierOfficeAddress={pedido.courierOfficeAddress}
              recipientName={pedido.recipientName}
              shipmentEvents={pedido.shipmentEvents}
            />
          </section>

          {/* Recibo: lo único que sale al imprimir */}
          <section aria-labelledby="recibo-titulo" className="recibo-imprimible space-y-3">
            <div className="hidden print:block">
              <p className="text-lg font-bold text-ink">{tienda.nombre}</p>
              {[tienda.address, tienda.city, tienda.state].filter(Boolean).length > 0 && (
                <p className="text-xs text-ink-soft">{[tienda.address, tienda.city, tienda.state].filter(Boolean).join(', ')}</p>
              )}
              <p className="text-xs text-ink-soft">{[tienda.phone, tienda.email].filter(Boolean).join(' · ')}</p>
              <p className="mt-3 font-mono text-sm font-bold text-ink">Recibo del pedido #{pedido.orderNumber}</p>
              <p className="text-xs text-ink-soft">{fecha} · {estado.label}</p>
            </div>
            <h3 id="recibo-titulo" className="text-sm font-semibold text-ink print:hidden">Recibo</h3>

            <ul className="divide-y divide-line rounded-xl border border-line">
              {pedido.items.map((item) => {
                const foto = item.productImage || item.product?.mainImage;
                const condicion = conditionBadge(item.productCondition, item.conditionGrade);
                return (
                  <li key={item.id} className="flex items-center gap-3 p-2.5">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white print:hidden">
                      {foto ? <Image src={foto} alt="" fill sizes="48px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-subtle"><FiPackage className="h-5 w-5" aria-hidden="true" /></span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink [overflow-wrap:anywhere]">{item.productName}</span>
                      {item.digitalVariantLabel && <span className="block text-xs text-ink-soft">{item.digitalVariantLabel}</span>}
                      {condicion && (
                        <span className="block text-xs text-ink-soft">{condicion} · garantía {warrantyDaysFor(item.productCondition, item.warrantyDays)} días</span>
                      )}
                      <span className="block text-xs tabular-nums text-muted">{item.quantity} × {formatUSD(item.priceUSD)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatUSD(item.totalUSD)}</span>
                  </li>
                );
              })}
            </ul>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums text-ink">{formatUSD(subtotal)}</dd></div>
              {descuento > 0 && <div className="flex justify-between gap-3"><dt className="text-ink-soft">Descuento</dt><dd className="tabular-nums text-success-strong">−{formatUSD(descuento)}</dd></div>}
              {envio > 0 && <div className="flex justify-between gap-3"><dt className="text-ink-soft">Envío y embalaje</dt><dd className="tabular-nums text-ink">{formatUSD(envio)}</dd></div>}
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="text-right">
                  <span className="block text-lg font-bold tabular-nums text-ink">{formatUSD(pedido.totalUSD)}</span>
                  {n(pedido.totalVES) > 0 && (
                    <span className="block text-xs tabular-nums text-muted">
                      {formatVES(n(pedido.totalVES))}{tasa > 0 ? ` a ${formatVES(tasa)} por dólar` : ''}
                    </span>
                  )}
                </dd>
              </div>
              <IvaIncluido totalUSD={pedido.totalUSD} ivaUSD={n(pedido.taxUSD)} className="text-right" />
              {pedido.paymentMethod && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Pago</dt>
                  <dd className="text-right text-ink">
                    {formatOrderPaymentMethod(pedido)}
                    {n(pedido.pointsUSD) > 0 && pedido.paymentMethod !== 'WALLET' && <span className="block text-xs text-muted">{formatUSD(n(pedido.pointsUSD))} en Puntos ES</span>}
                    {pedido.paymentReference && <span className="block text-xs text-muted">Ref. {pedido.paymentReference}</span>}
                  </dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-muted">Este recibo no es una factura fiscal.</p>
          </section>
        </div>

        <footer className="flex gap-2 border-t border-line bg-surface p-3 print:hidden">
          <button type="button" onClick={() => window.print()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-ink hover:bg-surface">
            <FiPrinter className="h-4 w-4" aria-hidden="true" /> Imprimir recibo
          </button>
          <button type="button" onClick={onCerrar} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">
            Cerrar
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
