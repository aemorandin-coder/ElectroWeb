// Cómo se pagó una orden, en palabras (C-126). Módulo puro: panel de órdenes y panel del cliente.
// Antes el modal decía "Pago: WALLET · PAID", con los códigos de la base.

import { formatVES } from '@/lib/currency';
import { PAYMENT_METHOD_LABELS } from '@/lib/format-helpers';
import { getBancoPorCodigo } from '@/lib/pago-movil/bancos-venezuela';
import { ETIQUETA_ENTREGA, NOMBRE_EMPRESA, esRetiro, etiquetaModo, usaEmpresa, type EmpresaGuia } from '@/lib/envios/empresas';

export type TonoPago = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/** Estado del pago con su color: "Pagado" en verde, "Por validar" en amarillo. */
export const ESTADO_PAGO: Record<string, { label: string; tono: TonoPago }> = {
  PAID: { label: 'Pagado', tono: 'success' },
  PENDING: { label: 'Por validar', tono: 'warning' },
  FAILED: { label: 'Fallido', tono: 'danger' },
  REFUNDED: { label: 'Reembolsado', tono: 'neutral' },
};

export function estadoPago(paymentStatus: string | null | undefined): { label: string; tono: TonoPago } {
  return ESTADO_PAGO[paymentStatus ?? ''] ?? { label: 'Sin estado', tono: 'neutral' };
}

/** Color del estado de la orden (el mismo en la lista y en el detalle). */
export function tonoEstadoOrden(status: string): TonoPago {
  switch (status) {
    case 'PENDING': return 'warning';
    case 'CANCELLED': return 'danger';
    case 'DELIVERED': return 'success';
    case 'REFUNDED': return 'neutral';
    default: return 'brand';
  }
}

/** Un Pago Móvil verificado por el banco y vinculado a la orden. */
export interface PagoMovilResumen {
  referencia: string;
  bancoOrigen: string;
  importeBs: number;
  fechaPago: string;
  tasa: number | null;
}

export interface DescripcionPago {
  /** "Saldo para compras", "Pago Móvil · Banesco" */
  titulo: string;
  /** "Saldo a favor del cliente", "Ref. 123456 · Bs. 2.190,00" */
  detalle: string | null;
}

/** El método de pago en palabras, con el origen de los fondos cuando se conoce. */
export function describirPago(method: string | null | undefined, pagosMovil: PagoMovilResumen[] = []): DescripcionPago {
  switch (method) {
    case 'WALLET':
    case 'BALANCE':
      // C-129: sin "billetera": es la palabra con la que SUDEBAN describe los servicios de pago que exigen licencia
      return { titulo: 'Saldo para compras', detalle: 'Pago anticipado del cliente en la tienda (recargas, devoluciones o pagos de más)' };
    case 'MOBILE_PAYMENT': {
      if (pagosMovil.length === 0) return { titulo: 'Pago Móvil', detalle: 'Sin verificación del banco vinculada' };
      const bancos = [...new Set(pagosMovil.map((p) => getBancoPorCodigo(p.bancoOrigen)?.nombreCorto ?? p.bancoOrigen))];
      return {
        titulo: `Pago Móvil · ${bancos.join(' y ')}`,
        detalle: pagosMovil.map((p) => `Ref. ${p.referencia} · ${formatVES(p.importeBs)}`).join(' + '),
      };
    }
    default:
      return { titulo: method ? PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ') : 'Sin método', detalle: null };
  }
}

/** "Envío nacional · ZOOM · Retiro en oficina", "Retiro en tienda", "Digital". */
export function describirEntrega(o: { deliveryMethod?: string | null; shippingCarrier?: string | null; shippingMode?: string | null }): string {
  const base = ETIQUETA_ENTREGA[o.deliveryMethod ?? ''] ?? 'Entrega';
  if (esRetiro(o.deliveryMethod) || !usaEmpresa(o.deliveryMethod)) return base;
  const empresa = o.shippingCarrier ? NOMBRE_EMPRESA[o.shippingCarrier as EmpresaGuia] ?? o.shippingCarrier : null;
  return [base, empresa, o.shippingMode ? etiquetaModo(o.shippingMode) : null].filter(Boolean).join(' · ');
}
