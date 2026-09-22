'use client';

import { toast } from 'react-hot-toast';
import { FiCopy, FiExternalLink, FiMapPin, FiTruck, FiUser } from 'react-icons/fi';
import { adminBadge, adminSecondaryButton } from '@/lib/admin-ui';
import { ETIQUETA_ENTREGA, NOMBRE_EMPRESA, etiquetaModo, type EmpresaGuia } from '@/lib/envios/empresas';

// C-100: lo que el equipo necesita para despachar: destino, quién recibe, quién paga el flete,
// los datos listos para copiar en la guía de ZOOM o MRW, y el historial del envío.

export interface EntregaOrdenDatos {
  orderNumber: string;
  deliveryMethod?: string | null;
  shippingAddress?: string | null;
  shippingCarrier?: string | null;
  shippingMode?: string | null;
  shippingPaidBy?: string | null;
  shippingState?: string | null;
  shippingCity?: string | null;
  courierOfficeCode?: string | null;
  courierOfficeName?: string | null;
  courierOfficeAddress?: string | null;
  recipientName?: string | null;
  recipientIdNumber?: string | null;
  recipientPhone?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingNotes?: string | null;
  totalUSD?: number | string;
  items?: Array<{ quantity?: number; productName?: string | null; product?: { name?: string } | null }>;
  shipmentEvents?: Array<{ id: string; source: string; description: string; occurredAt: string }>;
}

const nombreEmpresa = (empresa?: string | null) => (empresa ? NOMBRE_EMPRESA[empresa as EmpresaGuia] ?? empresa : '');

/** Texto para pegar en el formulario de la guía de la empresa de envíos. */
function datosGuia(o: EntregaOrdenDatos): string {
  const contenido = (o.items ?? [])
    .map((i) => `${i.quantity ?? 1} x ${i.productName || i.product?.name || 'Producto'}`)
    .join(', ');
  const destino = o.shippingMode === 'OFFICE'
    ? `${o.shippingCarrier === 'MRW' ? 'Agencia' : 'Oficina'} ${o.courierOfficeName ?? ''} (código ${o.courierOfficeCode ?? '—'}), ${[o.shippingCity, o.shippingState].filter(Boolean).join(', ')}`
    : o.shippingAddress ?? '';
  return [
    `Orden: ${o.orderNumber}`,
    `Destinatario: ${o.recipientName ?? ''}`,
    `Cédula: ${o.recipientIdNumber ?? ''}`,
    `Teléfono: ${o.recipientPhone ?? ''}`,
    `Destino: ${destino}`,
    `Flete: ${o.shippingPaidBy === 'STORE' ? 'lo paga la tienda (envío gratis)' : 'cobro a destino'}`,
    `Contenido: ${contenido}`,
  ].join('\n');
}

export default function EntregaOrden({ orden }: { orden: EntregaOrdenDatos }) {
  const empresa = nombreEmpresa(orden.shippingCarrier);
  const conDatosNuevos = Boolean(orden.recipientName || orden.shippingMode);
  const esEnvio = orden.deliveryMethod === 'SHIPPING' || orden.deliveryMethod === 'HOME_DELIVERY';
  const eventos = orden.shipmentEvents ?? [];

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(datosGuia(orden));
      toast.success('Datos de la guía copiados');
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto a mano.');
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FiTruck className="h-4 w-4 text-brand-600" aria-hidden="true" />
          {ETIQUETA_ENTREGA[orden.deliveryMethod ?? ''] ?? 'Entrega'}
          {empresa && esEnvio ? ` · ${empresa}` : ''}
          {orden.shippingMode && esEnvio ? ` · ${etiquetaModo(orden.shippingMode)}` : ''}
        </h4>
        {esEnvio && orden.shippingPaidBy && (
          <span className={adminBadge(orden.shippingPaidBy === 'STORE' ? 'success' : 'warning')}>
            {orden.shippingPaidBy === 'STORE' ? 'Envío gratis: paga la tienda' : 'Cobro a destino'}
          </span>
        )}
      </div>

      {orden.shippingMode === 'OFFICE' && orden.courierOfficeName ? (
        <div className="text-sm">
          <p className="flex items-start gap-1.5 font-medium text-ink">
            <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            {orden.shippingCarrier === 'MRW' ? 'Agencia' : 'Oficina'} {orden.courierOfficeName}
            <span className="font-normal text-muted">(código {orden.courierOfficeCode})</span>
          </p>
          <p className="ml-5.5 text-muted">{[orden.shippingCity, orden.shippingState].filter(Boolean).join(', ')}</p>
          {orden.courierOfficeAddress && <p className="ml-5.5 text-xs text-muted">{orden.courierOfficeAddress}</p>}
        </div>
      ) : orden.shippingAddress ? (
        <p className="flex items-start gap-1.5 text-sm text-ink [overflow-wrap:anywhere]">
          <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /> {orden.shippingAddress}
        </p>
      ) : null}

      {orden.recipientName && (
        <p className="flex items-start gap-1.5 text-sm text-ink">
          <FiUser className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            {orden.recipientName}
            <span className="text-muted"> · {orden.recipientIdNumber} · {orden.recipientPhone}</span>
          </span>
        </p>
      )}

      {esEnvio && conDatosNuevos && (
        <button type="button" onClick={copiar} className={`${adminSecondaryButton} w-full sm:w-auto`}>
          <FiCopy className="h-4 w-4" aria-hidden="true" /> Copiar datos para la guía
        </button>
      )}

      {orden.trackingNumber && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-sm">
          <span className="text-muted">Guía:</span>
          <span className="font-mono font-semibold text-ink">{orden.trackingNumber}</span>
          {orden.trackingUrl && (
            <a href={orden.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700">
              <FiExternalLink className="h-4 w-4" aria-hidden="true" /> Rastrear en {empresa || 'la empresa'}
            </a>
          )}
        </div>
      )}
      {orden.shippingNotes && <p className="text-sm text-ink-soft">Notas: {orden.shippingNotes}</p>}

      {eventos.length > 0 && (
        <ol className="space-y-2 border-t border-line pt-3">
          {eventos.map((evento) => (
            <li key={evento.id} className="flex gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
              <span className="min-w-0">
                <span className="text-ink">{evento.description}</span>
                <span className="block text-xs text-muted">
                  {new Date(evento.occurredAt).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {evento.source === 'ZOOM' ? ' · ZOOM' : ''}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
