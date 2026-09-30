'use client';

import Image from 'next/image';
import { LogoEmpresa } from '@/components/envios/LogoEmpresa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiChevronRight, FiExternalLink, FiPackage } from 'react-icons/fi';
import { BsCardList } from 'react-icons/bs';
import { formatUSD, formatVES } from '@/lib/currency';
import { adminBadge } from '@/lib/admin-ui';
import { estadoParaCliente, pasosPedido } from '@/lib/order-pasos';
import { NOMBRE_EMPRESA, type EmpresaGuia } from '@/lib/envios/empresas';
import { eventoEsEnOficina } from '@/lib/envios/zoom';
import OrderStepper from '@/components/customer/OrderStepper';
import type { PedidoCliente } from '@/components/customer/DetallePedido';

// C-137: un pedido en "Mis pedidos". Cabecera (número, fecha, estado), fotos de 48 px, total en USD y Bs., el paso a
// paso mientras está en curso, y las acciones directas: rastrear, códigos digitales y detalle con el recibo.

const MAX_FOTOS = 4;

export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  const mismoAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', ...(mismoAno ? {} : { year: 'numeric' }) });
}

export function fotoDe(item: PedidoCliente['items'][number]): string | null {
  return item.productImage || item.product?.mainImage || null;
}

export default function PedidoCard({ pedido, onDetalle }: { pedido: PedidoCliente; onDetalle: () => void }) {
  const estado = estadoParaCliente(pedido);
  const enCurso = !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(pedido.status);
  // Como en el inicio del panel (C-128): ZOOM avisó que llegó a la oficina de destino
  const enOficina = (pedido.shipmentEvents ?? []).some((e) => eventoEsEnOficina(e.description));
  const pasos = enCurso ? pasosPedido({ ...pedido, enOficina }) : null;
  const unidades = pedido.items.reduce((s, i) => s + i.quantity, 0);
  const empresa = pedido.shippingCarrier ? NOMBRE_EMPRESA[pedido.shippingCarrier as EmpresaGuia] ?? pedido.shippingCarrier : 'la empresa de envíos';
  const conCodigos = pedido.items.some((i) => i.product?.productType === 'DIGITAL') && pedido.paymentStatus === 'PAID';

  const rastrear = () => {
    // El enlace de rastreo no siempre toma la guía (C-126): se copia para pegarla si la página la pide
    if (pedido.trackingNumber) {
      navigator.clipboard?.writeText(pedido.trackingNumber).then(
        () => toast.success(`Guía ${pedido.trackingNumber} copiada: pégala si ${empresa} la pide`),
        () => {},
      );
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-white p-4" aria-labelledby={`pedido-${pedido.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`pedido-${pedido.id}`} className="font-mono text-sm font-bold text-ink">#{pedido.orderNumber}</h3>
          <p className="text-xs text-muted">
            {fechaCorta(pedido.createdAt)} · {unidades} {unidades === 1 ? 'producto' : 'productos'}
          </p>
        </div>
        <span className={adminBadge(estado.tono)}>{estado.label}</span>
      </header>

      {/* flex-wrap: con 4 fotos y "+N" el total baja a su propia línea a 360 px en vez de quedar tapado */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex min-w-0 items-center gap-1.5" aria-label="Productos del pedido">
          {pedido.items.slice(0, MAX_FOTOS).map((item) => {
            const foto = fotoDe(item);
            return (
              <li key={item.id} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white" title={item.productName}>
                {foto ? (
                  <Image src={foto} alt={item.productName} fill sizes="48px" className="object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center text-subtle"><FiPackage className="h-5 w-5" aria-hidden="true" /></span>
                )}
                {item.quantity > 1 && (
                  <span className="absolute bottom-0 right-0 rounded-tl-md bg-ink/80 px-1 text-[11px] font-semibold text-white">×{item.quantity}</span>
                )}
              </li>
            );
          })}
          {pedido.items.length > MAX_FOTOS && (
            <li className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-semibold text-ink-soft">
              +{pedido.items.length - MAX_FOTOS}
            </li>
          )}
        </ul>
        <div className="ml-auto shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-ink">{formatUSD(pedido.totalUSD)}</p>
          {Number(pedido.totalVES) > 0 && <p className="text-xs tabular-nums text-muted">{formatVES(Number(pedido.totalVES))}</p>}
        </div>
      </div>

      {pasos && !pasos.cancelado && pasos.pasos.length > 0 && (
        <div className="mt-4 space-y-2">
          <OrderStepper pasos={pasos.pasos} />
          {pasos.nota && <p className="text-center text-xs font-medium text-ink-soft">{pasos.nota}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        {pedido.trackingNumber && (
          pedido.trackingUrl ? (
            <a
              href={pedido.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={rastrear}
              // Fondo blanco: el logo azul de ZOOM no se ve sobre el azul de la tienda
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-sm font-semibold text-ink hover:bg-brand-50"
            >
              <FiExternalLink className="h-4 w-4 text-brand-600" aria-hidden="true" /> Rastrear en{' '}
              {pedido.shippingCarrier === 'ZOOM' || pedido.shippingCarrier === 'MRW'
                ? <LogoEmpresa empresa={pedido.shippingCarrier} className="h-4" />
                : empresa}
            </a>
          ) : (
            <button type="button" onClick={rastrear} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface">
              Copiar guía {pedido.trackingNumber}
            </button>
          )
        )}
        {conCodigos && (
          <Link href={`/customer/orders/${pedido.id}/digital`} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600">
            <BsCardList className="h-4 w-4" aria-hidden="true" /> Ver mis códigos
          </Link>
        )}
        <button
          type="button"
          onClick={onDetalle}
          className="ml-auto inline-flex h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface"
        >
          Detalle y recibo <FiChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
