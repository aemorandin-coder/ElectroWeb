// Pasos de un pedido para el cliente (C-128). Módulo puro: el stepper del inicio de su cuenta.
// Los pasos dependen de cómo se entrega: por ZOOM o MRW, retiro en tienda, delivery en Guanare o digital.

import { NOMBRE_EMPRESA, esRetiro, type EmpresaGuia } from '@/lib/envios/empresas';

export type EstadoPaso = 'hecho' | 'actual' | 'pendiente';

export interface PasoPedido {
  label: string;
  estado: EstadoPaso;
}

export interface PasosPedido {
  pasos: PasoPedido[];
  /** Una frase con lo que pasa ahora: "Estamos validando tu pago" */
  nota: string | null;
  cancelado: boolean;
}

export interface PedidoParaPasos {
  status: string;
  paymentStatus?: string | null;
  deliveryMethod?: string | null;
  shippingCarrier?: string | null;
  shippingMode?: string | null;
  courierOfficeName?: string | null;
  /** ZOOM avisó que el paquete llegó a la oficina de destino */
  enOficina?: boolean;
}

const ENVIADA = ['SHIPPED', 'READY_FOR_PICKUP'];

/** En qué paso va (0 = confirmar). -1: cancelado. */
function indice(o: PedidoParaPasos, total: number): number {
  switch (o.status) {
    case 'CANCELLED':
    case 'REFUNDED':
      return -1;
    case 'PENDING':
      return o.paymentStatus === 'PAID' ? 1 : 0;
    case 'CONFIRMED':
    case 'PAID':
    case 'PROCESSING':
      return 1;
    case 'SHIPPED':
    case 'READY_FOR_PICKUP':
      return o.enOficina ? Math.min(3, total - 1) : 2;
    case 'DELIVERED':
      return total; // todo hecho
    default:
      return 0;
  }
}

export function pasosPedido(o: PedidoParaPasos): PasosPedido {
  const empresa = o.shippingCarrier ? NOMBRE_EMPRESA[o.shippingCarrier as EmpresaGuia] ?? o.shippingCarrier : null;
  const oficina = o.shippingMode !== 'DOOR';

  let etiquetas: string[];
  if (o.deliveryMethod === 'DIGITAL') etiquetas = ['Confirmado', 'Preparando tus códigos', 'Entregado'];
  else if (esRetiro(o.deliveryMethod)) etiquetas = ['Confirmado', 'En preparación', 'Listo para retirar', 'Entregado'];
  else if (o.deliveryMethod === 'LOCAL_DELIVERY') etiquetas = ['Confirmado', 'En preparación', 'En camino', 'Entregado'];
  else etiquetas = ['Confirmado', 'En preparación', empresa ? `Despachado a ${empresa}` : 'Despachado', oficina ? 'Listo para retiro' : 'Entregado'];

  const actual = indice(o, etiquetas.length);
  if (actual < 0) return { pasos: [], nota: o.status === 'REFUNDED' ? 'Pedido reembolsado' : 'Pedido cancelado', cancelado: true };

  // Con el pago sin validar, el primer paso todavía no es "Confirmado"
  if (actual === 0 && o.paymentStatus !== 'PAID') etiquetas[0] = 'Pago por validar';

  const pasos = etiquetas.map((label, i): PasoPedido => ({
    label,
    estado: i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente',
  }));

  let nota: string | null = null;
  if (o.status === 'PENDING' && o.paymentStatus !== 'PAID') nota = 'Estamos validando tu pago';
  else if (actual === 1) nota = o.deliveryMethod === 'DIGITAL' ? 'Estamos preparando tus códigos' : 'Estamos preparando tu pedido';
  else if (o.status === 'READY_FOR_PICKUP') nota = 'Ya puedes retirarlo en la tienda';
  else if (ENVIADA.includes(o.status) && o.enOficina) nota = `Llegó a ${o.courierOfficeName ?? 'la oficina'}: retíralo con tu cédula`;
  else if (o.status === 'SHIPPED') nota = o.deliveryMethod === 'LOCAL_DELIVERY' ? 'Va en camino a tu dirección' : empresa ? `Va en camino con ${empresa}` : 'Va en camino';

  return { pasos, nota, cancelado: false };
}

export type TonoEstado = 'warning' | 'brand' | 'success' | 'danger' | 'neutral';

/**
 * C-137: el estado del pedido en palabras del cliente, con su color. "Verificando pago" si pagó por un método manual
 * y dejó la referencia (C-132); "Por pagar" si todavía no hay pago.
 */
export function estadoParaCliente(o: { status: string; paymentStatus?: string | null; paymentReference?: string | null }): { label: string; tono: TonoEstado } {
  switch (o.status) {
    case 'CANCELLED': return { label: 'Cancelado', tono: 'danger' };
    case 'REFUNDED': return { label: 'Reembolsado', tono: 'neutral' };
    case 'DELIVERED': return { label: 'Entregado', tono: 'success' };
    case 'SHIPPED': return { label: 'Despachado', tono: 'brand' };
    case 'READY_FOR_PICKUP': return { label: 'Listo para retirar', tono: 'brand' };
    case 'PENDING':
      if (o.paymentStatus !== 'PAID') return o.paymentReference ? { label: 'Verificando pago', tono: 'warning' } : { label: 'Por pagar', tono: 'warning' };
      return { label: 'En preparación', tono: 'brand' };
    default: return { label: 'En preparación', tono: 'brand' };
  }
}

/** Filtros de "Mis pedidos": cada uno junta los estados que el cliente ve con el mismo nombre. */
export const FILTROS_PEDIDOS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'POR_PAGAR', label: 'Por pagar' },
  { id: 'PREPARACION', label: 'En preparación' },
  { id: 'DESPACHADO', label: 'Despachados' },
  { id: 'ENTREGADO', label: 'Entregados' },
  { id: 'CANCELADO', label: 'Cancelados' },
] as const;
export type FiltroPedidos = (typeof FILTROS_PEDIDOS)[number]['id'];

export function pasaFiltro(o: { status: string; paymentStatus?: string | null }, filtro: FiltroPedidos): boolean {
  switch (filtro) {
    case 'TODOS': return true;
    case 'POR_PAGAR': return o.status === 'PENDING' && o.paymentStatus !== 'PAID';
    case 'PREPARACION': return ['CONFIRMED', 'PAID', 'PROCESSING'].includes(o.status) || (o.status === 'PENDING' && o.paymentStatus === 'PAID');
    case 'DESPACHADO': return o.status === 'SHIPPED' || o.status === 'READY_FOR_PICKUP';
    case 'ENTREGADO': return o.status === 'DELIVERED';
    case 'CANCELADO': return o.status === 'CANCELLED' || o.status === 'REFUNDED';
  }
}
