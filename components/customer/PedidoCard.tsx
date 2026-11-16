'use client';

import Image from 'next/image';
import { LogoEmpresa } from '@/components/envios/LogoEmpresa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { IconoAbrirAparte, IconoChevronDerecha, IconoDigital, IconoPaquete, IconoReloj } from '@/components/iconos';
import { formatUSD, formatVES } from '@/lib/currency';
import { adminBadge } from '@/lib/admin-ui';
import { estadoParaCliente, lineaDeSalida, pasosPedido } from '@/lib/order-pasos';
import { calendarioDe } from '@/lib/horarios';
import { useSettings } from '@/contexts/SettingsContext';
import { NOMBRE_EMPRESA, type EmpresaGuia } from '@/lib/envios/empresas';
import { eventoEsEnOficina } from '@/lib/envios/zoom';
import OrderStepper from '@/components/customer/OrderStepper';
import type { PedidoCliente } from '@/components/customer/DetallePedido';

// C-137: un pedido en "Mis pedidos". Cabecera (número, fecha, estado), fotos de 48 px, total en USD y Bs., el paso a
// paso mientras está en curso, y las acciones directas: rastrear, códigos digitales y detalle con el recibo.
// C-265 (la A que eligió el equipo): del tamaño de lo que lleva, para ir en dos columnas. En la computadora: fotos |
// número, fecha y producto | estado y monto; en el teléfono, número y estado arriba, fotos y monto abajo. Dice qué se
// compró (antes solo las fotos) y las acciones quedan abajo, parejas con la tarjeta de al lado.

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
  const { settings: ajustes } = useSettings();
  const estado = estadoParaCliente(pedido);
  const enCurso = !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(pedido.status);
  // Como en el inicio del panel (C-128): ZOOM avisó que llegó a la oficina de destino
  const enOficina = (pedido.shipmentEvents ?? []).some((e) => eventoEsEnOficina(e.description));
  const pasos = enCurso ? pasosPedido({ ...pedido, enOficina }) : null;
  // C-251 (C-234): el día que sale, también en la tarjeta (antes solo en el detalle)
  const salida = enCurso ? lineaDeSalida(pedido, calendarioDe(ajustes)) : null;
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

  const primero = pedido.items[0]?.productName ?? 'Pedido';

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-3 sm:p-4" aria-labelledby={`pedido-${pedido.id}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <header className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
          <h3 id={`pedido-${pedido.id}`} className="font-mono text-sm font-bold text-ink">#{pedido.orderNumber}</h3>
          <p className="text-xs text-muted">
            {fechaCorta(pedido.createdAt)} · {unidades} {unidades === 1 ? 'producto' : 'productos'}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-soft" title={primero}>{primero}{pedido.items.length > 1 ? ` y ${pedido.items.length - 1} más` : ''}</p>
        </header>
        <span className="col-start-2 row-start-1 justify-self-end sm:col-start-3"><span className={adminBadge(estado.tono)}>{estado.label}</span></span>

        <ul className="col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:row-span-2 sm:row-start-1" aria-label="Productos del pedido">
          {pedido.items.slice(0, MAX_FOTOS).map((item) => {
            const foto = fotoDe(item);
            return (
              <li key={item.id} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white" title={item.productName}>
                {foto ? (
                  <Image src={foto} alt={item.productName} fill sizes="48px" className="object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center text-subtle"><IconoPaquete className="h-5 w-5" aria-hidden="true" /></span>
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
        <div className="col-start-2 row-start-2 self-end text-right sm:col-start-3 sm:self-start">
          <p className="text-lg font-bold tabular-nums text-ink">{formatUSD(pedido.totalUSD)}</p>
          {Number(pedido.totalVES) > 0 && <p className="text-xs tabular-nums text-muted">{formatVES(Number(pedido.totalVES))}</p>}
        </div>
      </div>

      {pasos && !pasos.cancelado && pasos.pasos.length > 0 && (
        <div className="mb-3 mt-4 space-y-3">
          <OrderStepper pasos={pasos.pasos} />
          {/* C-265: lo que pasa ahora y el día que sale, en la nota de la tarjeta del inicio (antes, dos líneas centradas) */}
          {(pasos.nota || salida) && (
            <p className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-ink-soft">
              <IconoReloj className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span>
                {pasos.nota}
                {salida && <span className="block font-semibold text-brand-700">{salida}</span>}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Abajo, parejas con la tarjeta de al lado. Lo que ya terminó, sin la raya: solo lleva "Detalle y recibo" (y los códigos) */}
      <div className={`mt-auto flex flex-wrap gap-2 pt-3 ${pasos && !pasos.cancelado && pasos.pasos.length > 0 ? 'border-t border-line' : ''}`}>
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
              <IconoAbrirAparte className="h-4 w-4 text-brand-600" aria-hidden="true" /> Rastrear en{' '}
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
            <IconoDigital className="h-4 w-4" aria-hidden="true" /> Ver mis códigos
          </Link>
        )}
        <button
          type="button"
          onClick={onDetalle}
          className="ml-auto inline-flex h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface"
        >
          Detalle y recibo <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
