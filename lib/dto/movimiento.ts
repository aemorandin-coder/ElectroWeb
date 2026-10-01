// Movimientos de Puntos ES como los ve el cliente (C-139). Lista blanca: `metadata` trae datos internos
// (quién del equipo lo hizo, ids de verificaciones del banco) y nunca sale del servidor.
import type { Transaction } from '@prisma/client';
import { formatPaymentMethod, isCreditTransaction } from '@/lib/format-helpers';

/**
 * - COMPLETADO: los Puntos ES ya entraron o salieron.
 * - POR_CONFIRMAR: recarga que la tienda todavía no confirmó. No suma.
 * - RECHAZADO: la tienda no pudo confirmar el pago (con el motivo, si lo escribió). No suma.
 * - NO_COMPLETADO: el cliente cerró la recarga antes de terminarla. No suma.
 */
export type EstadoMovimiento = 'COMPLETADO' | 'POR_CONFIRMAR' | 'RECHAZADO' | 'NO_COMPLETADO';

export interface MovimientoDTO {
  id: string;
  tipo: string;
  /** Suma Puntos ES (recarga, abono, devolución) o los gasta (compra) */
  entra: boolean;
  estado: EstadoMovimiento;
  monto: number;
  descripcion: string;
  metodo: string | null;
  /** La referencia del pago que escribió el cliente al recargar */
  referencia: string | null;
  motivo: string | null;
  fecha: string;
  /** El pedido de la compra o de la devolución, si es de este cliente */
  pedido: { id: string; numero: string } | null;
}

const NUMERO_ORDEN = /ORD-\d{4}-\d{3,}/;
// "tu saldo" → "tus Puntos ES", "del saldo" → "de Puntos ES"
const PLURAL: Record<string, string> = { del: 'de', al: 'a', tu: 'tus', su: 'sus' };

function leerMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const datos = JSON.parse(metadata);
    return datos && typeof datos === 'object' ? (datos as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** El número de orden de un movimiento: la referencia de las compras, o el que guardó la devolución. */
export function numeroDeOrden(tx: Pick<Transaction, 'reference' | 'description' | 'metadata'>): string | null {
  const meta = leerMetadata(tx.metadata);
  const candidatos = [tx.reference, typeof meta.orderNumber === 'string' ? meta.orderNumber : null, tx.description];
  for (const texto of candidatos) {
    const numero = texto ? NUMERO_ORDEN.exec(texto)?.[0] : null;
    if (numero) return numero;
  }
  return null;
}

/**
 * La descripción guardada, en limpio: los movimientos de antes de C-131 dicen "saldo" o "billetera" (se llaman
 * Puntos ES), el canje de gift card lleva una clave interna al final y el ajuste manual nombra al "admin".
 */
function descripcionLimpia(tx: Pick<Transaction, 'type' | 'description'>): string {
  const base = (tx.description ?? '').trim();
  if (!base) return isCreditTransaction(tx.type) ? 'Puntos ES acreditados' : 'Compra con Puntos ES';
  return base
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .replace(/^Ajuste manual por admin:\s*(Sin razón especificada)?/i, (_, sinRazon) => (sinRazon ? 'Ajuste de la tienda' : 'Ajuste de la tienda: '))
    .replace(/\b(del|al|tu|su)\s+(saldo|billetera|monedero|wallet)\b/gi, (_, prep: string) => `${PLURAL[prep.toLowerCase()]} Puntos ES`)
    .replace(/\b(saldo|billetera|monedero|wallet)\b/gi, 'Puntos ES')
    .trim();
}

function estadoDe(tx: Pick<Transaction, 'status' | 'metadata'>): EstadoMovimiento {
  if (tx.status === 'COMPLETED') return 'COMPLETADO';
  if (tx.status === 'PENDING') return 'POR_CONFIRMAR';
  return leerMetadata(tx.metadata).cancelledBy === 'USER' ? 'NO_COMPLETADO' : 'RECHAZADO';
}

export function aMovimientoDTO(tx: Transaction, pedidos: Map<string, string>): MovimientoDTO {
  const estado = estadoDe(tx);
  const numero = numeroDeOrden(tx);
  const pedidoId = numero ? pedidos.get(numero) : undefined;
  const esRecarga = tx.type === 'RECHARGE';
  // Los Puntos ES no son un "método" de sí mismos: solo se muestra cómo se pagó una recarga o de dónde vino un abono
  const metodo = tx.paymentMethod && !['WALLET', 'BALANCE'].includes(tx.paymentMethod)
    ? ({ GIFT_CARD: 'Gift card', REFERRAL: 'Comisión de promotor' } as Record<string, string>)[tx.paymentMethod] ?? formatPaymentMethod(tx.paymentMethod)
    : null;
  return {
    id: tx.id,
    tipo: tx.type,
    entra: isCreditTransaction(tx.type),
    estado,
    monto: Number(tx.amount),
    descripcion: descripcionLimpia(tx),
    metodo,
    referencia: esRecarga && tx.reference ? tx.reference.slice(0, 40) : null,
    motivo: estado === 'RECHAZADO' && tx.rejectionReason ? tx.rejectionReason : null,
    fecha: tx.createdAt.toISOString(),
    pedido: numero && pedidoId ? { id: pedidoId, numero } : null,
  };
}
