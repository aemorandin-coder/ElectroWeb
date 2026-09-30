// Reservas de stock que apartan de verdad (C-132). Solo servidor, dentro de una transacción.
//
// Antes una reserva no apartaba nada: la compra confirmada solo miraba `stock >= cantidad`, así que el producto de un
// pago por verificar se lo podía llevar otro cliente, y "Marcar pagado" descontaba menos unidades sin avisar.
// Ahora lo disponible para una orden es el stock menos lo apartado por las demás órdenes con reserva vigente.

import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Unidades apartadas por reservas vigentes, sin contar las de `excluirOrdenId`. */
export async function apartadoPorOtros(tx: Tx, productId: string, excluirOrdenId?: string): Promise<number> {
  const suma = await tx.stockReservation.aggregate({
    _sum: { quantity: true },
    where: {
      productId,
      expiresAt: { gt: new Date() },
      ...(excluirOrdenId ? { OR: [{ orderId: null }, { orderId: { not: excluirOrdenId } }] } : {}),
    },
  });
  return suma._sum.quantity ?? 0;
}

/**
 * Descuenta `cantidad` si alcanza lo que no está apartado por otras órdenes. Devuelve false si no alcanza
 * (sin tocar nada). El `updateMany` con `gte` hace que dos compras simultáneas no dejen el stock negativo.
 */
export async function descontarDisponible(tx: Tx, productId: string, cantidad: number, excluirOrdenId?: string): Promise<boolean> {
  const apartado = await apartadoPorOtros(tx, productId, excluirOrdenId);
  const hecho = await tx.product.updateMany({
    where: { id: productId, stock: { gte: cantidad + apartado } },
    data: { stock: { decrement: cantidad } },
  });
  return hecho.count > 0;
}

/** ¿Hay `cantidad` sin apartar? Para crear una reserva nueva. */
export async function hayDisponible(tx: Tx, productId: string, cantidad: number): Promise<boolean> {
  // En serie: una transacción interactiva usa una sola conexión
  const producto = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
  const apartado = await apartadoPorOtros(tx, productId);
  return (producto?.stock ?? 0) - apartado >= cantidad;
}
