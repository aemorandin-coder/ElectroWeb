import { prisma } from './prisma';

export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'ORDER_PAID'
  | 'ORDER_CANCELLED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_REPLIED'
  | 'SYSTEM_UPDATE'
  | 'SYSTEM_MAINTENANCE'
  | 'PROMOTION'
  | 'STOCK_ALERT'
  | 'BALANCE_RECHARGED'
  | 'BALANCE_PENDING'
  | 'RECHARGE_APPROVED'
  | 'RECHARGE_REJECTED'
  | 'NEW_CUSTOMER'
  | 'NEW_RECHARGE_REQUEST'
  | 'NEW_ORDER'
  | 'PRODUCT_REQUEST'
  | 'NEW_CREATOR_REQUEST';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  icon?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        icon: params.icon,
      },
    });

    return notification;
  } catch (error) {
    // Sin relanzar (C-73): una notificación fallida no puede convertir en error una venta o recarga ya guardada
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create notification for order confirmed
 */
export async function notifyOrderConfirmed(userId: string, orderNumber: string, orderId: string) {
  void orderId;
  return createNotification({
    userId,
    type: 'ORDER_CONFIRMED',
    title: 'Pedido Confirmado',
    message: `Tu pedido #${orderNumber} ha sido confirmado y está siendo procesado.`,
    link: `/customer/orders`,
    icon: 'check-circle',
  });
}

/**
 * Create notification for order shipped
 */
export async function notifyOrderShipped(userId: string, orderNumber: string, orderId: string) {
  void orderId;
  return createNotification({
    userId,
    type: 'ORDER_SHIPPED',
    title: 'Pedido Enviado',
    message: `Tu pedido #${orderNumber} ha sido enviado y está en camino.`,
    link: `/customer/orders`,
    icon: 'package',
  });
}

/**
 * Create notification for order delivered
 */
export async function notifyOrderDelivered(userId: string, orderNumber: string, orderId: string) {
  void orderId;
  return createNotification({
    userId,
    type: 'ORDER_DELIVERED',
    title: 'Pedido Entregado',
    message: `Tu pedido #${orderNumber} ha sido entregado. Esperamos que lo disfrutes.`,
    link: `/customer/orders`,
    icon: 'check-circle',
  });
}

/**
 * Create notification for review approved
 */
export async function notifyReviewApproved(userId: string, productName: string, productSlug: string) {
  return createNotification({
    userId,
    type: 'REVIEW_APPROVED',
    title: 'Reseña Publicada',
    message: `Tu reseña de "${productName}" ha sido aprobada y ahora es visible para otros clientes.`,
    link: `/productos/${productSlug}#reviews`,
    icon: 'star',
  });
}

/**
 * Notify customer when their recharge request is submitted
 */
export async function notifyRechargeRequested(userId: string, amount: number) {
  return createNotification({
    userId,
    type: 'BALANCE_PENDING',
    title: 'Recarga en Proceso',
    message: `Tu solicitud de recarga por $${amount.toFixed(2)} ha sido recibida y está pendiente de aprobación.`,
    link: '/customer/balance',
    icon: 'clock',
  });
}

/**
 * Notify customer when their recharge is approved
 */
export async function notifyRechargeApproved(userId: string, amount: number) {
  return createNotification({
    userId,
    type: 'RECHARGE_APPROVED',
    title: 'Recarga Aprobada',
    message: `Tu recarga de $${amount.toFixed(2)} ha sido aprobada. El saldo ya está disponible en tu cuenta.`,
    link: '/customer/balance',
    icon: 'dollar-sign',
  });
}

/**
 * Notify customer when their recharge is rejected
 */
export async function notifyRechargeRejected(userId: string, amount: number, reason?: string) {
  const reasonText = reason ? ` Motivo: ${reason}` : '';
  return createNotification({
    userId,
    type: 'RECHARGE_REJECTED',
    title: 'Recarga Rechazada',
    message: `Tu solicitud de recarga por $${amount.toFixed(2)} ha sido rechazada.${reasonText}`,
    link: '/customer/balance',
    icon: 'x-circle',
  });
}

