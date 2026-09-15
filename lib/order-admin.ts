import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * Reglas del panel de órdenes (C-74).
 *
 * Lo que el admin puede cambiar está en una lista blanca: antes el endpoint hacía
 * `updateData = { ...body }` y cualquiera con MANAGE_ORDERS podía reescribir `totalUSD`,
 * `userId` o `paidAt` desde el navegador.
 */

/** Campos que el panel puede tocar. Todo lo demás del body se ignora. */
export const orderPatchSchema = z
  .object({
    status: z.nativeEnum(OrderStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    notes: z.string().trim().max(1000).optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    shippingCarrier: z.string().trim().max(120).optional(),
    trackingNumber: z.string().trim().max(120).optional(),
    trackingUrl: z.string().trim().max(500).optional(),
    shippingNotes: z.string().trim().max(1000).optional(),
    estimatedDelivery: z.string().datetime({ offset: true }).or(z.string().date()).nullable().optional(),
  })
  .strict();

export type OrderPatch = z.infer<typeof orderPatchSchema>;

/**
 * Transiciones permitidas. Antes se podía ir de ENTREGADA a PENDIENTE, y cada ida y vuelta
 * a CANCELADA devolvía el stock otra vez.
 *
 * Decisión de Andrés (2026-09-15): una orden ENVIADA o ENTREGADA ya no se cancela;
 * para eso está el reembolso. CANCELLED y REFUNDED son terminales.
 */
const TRANSICIONES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'PAID', 'PROCESSING', 'CANCELLED'],
  CONFIRMED: ['PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'CANCELLED'],
  PAID: ['PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function transicionPermitida(desde: OrderStatus, hasta: OrderStatus): boolean {
  if (desde === hasta) return true;
  return TRANSICIONES[desde]?.includes(hasta) ?? false;
}

export function estadosSiguientes(desde: OrderStatus): OrderStatus[] {
  return TRANSICIONES[desde] ?? [];
}

/** Etiquetas en español para los mensajes de error del panel. */
export const ETIQUETA_ESTADO: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PAID: 'Pagada',
  PROCESSING: 'En preparación',
  READY_FOR_PICKUP: 'Lista para recoger',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
};

/**
 * Marcar la orden como pagada equivale a confirmar el pago, venga del botón "Marcar pagado"
 * (que manda `status: 'PAID'`) o del selector de estado de pago. Antes solo contaba el segundo,
 * así que el botón del panel no descontaba stock, no llenaba `paidAt` y dejaba los pedidos
 * digitales sin poder entregar.
 */
export function pideConfirmarPago(patch: OrderPatch): boolean {
  return patch.status === OrderStatus.PAID || patch.paymentStatus === PaymentStatus.PAID;
}

/** El stock físico se descuenta al confirmar el pago; solo entonces hay que devolverlo. */
export function stockYaDescontado(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === PaymentStatus.PAID;
}

/** Evita que el motivo de cancelación entre crudo en el correo o en el HTML del panel. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const MOTIVO_CANCELACION_MINIMO = 10;

export type LineaOrden = { productId: string; quantity: number };

/**
 * Devuelve al stock lo que se había descontado, solo de productos físicos.
 * Antes se devolvía siempre: órdenes sin pagar (que nunca descontaron) y productos digitales
 * terminaban sumando existencias que no existían.
 */
export async function devolverStock(tx: Prisma.TransactionClient, lineas: LineaOrden[]): Promise<void> {
  for (const linea of lineas) {
    const producto = await tx.product.findUnique({
      where: { id: linea.productId },
      select: { productType: true },
    });
    if (!producto || producto.productType === 'DIGITAL') continue;
    await tx.product.update({
      where: { id: linea.productId },
      data: { stock: { increment: linea.quantity } },
    });
  }
}

/**
 * Libera las reservas de esta orden (las de 5 minutos del pago directo).
 * `StockReservation` no guarda el id de la orden, así que se borra una reserva por línea
 * que coincida en producto y cantidad; antes se borraban **todas** las del cliente y otras
 * órdenes pendientes suyas perdían la suya.
 */
export async function liberarReservas(
  tx: Prisma.TransactionClient,
  userId: string | null,
  lineas: LineaOrden[]
): Promise<void> {
  if (!userId) return;
  for (const linea of lineas) {
    const reserva = await tx.stockReservation.findFirst({
      where: { userId, productId: linea.productId, quantity: linea.quantity },
      orderBy: { expiresAt: 'asc' },
      select: { id: true },
    });
    if (reserva) {
      await tx.stockReservation.delete({ where: { id: reserva.id } });
    }
  }
}
