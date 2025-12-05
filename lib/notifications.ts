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
  | 'STOCK_ALERT';

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
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification for order confirmed
 */
export async function notifyOrderConfirmed(userId: string, orderNumber: string, orderId: string) {
  return createNotification({
    userId,
    type: 'ORDER_CONFIRMED',
    title: '¡Pedido Confirmado!',
    message: `Tu pedido #${orderNumber} ha sido confirmado y está siendo procesado.`,
    link: `/customer/orders`,
    icon: '✅',
  });
}

/**
 * Create notification for order shipped
 */
export async function notifyOrderShipped(userId: string, orderNumber: string, orderId: string) {
  return createNotification({
    userId,
    type: 'ORDER_SHIPPED',
    title: '📦 Pedido Enviado',
    message: `Tu pedido #${orderNumber} ha sido enviado y está en camino.`,
    link: `/customer/orders`,
    icon: '📦',
  });
}

/**
 * Create notification for order delivered
 */
export async function notifyOrderDelivered(userId: string, orderNumber: string, orderId: string) {
  return createNotification({
    userId,
    type: 'ORDER_DELIVERED',
    title: '✅ Pedido Entregado',
    message: `Tu pedido #${orderNumber} ha sido entregado. ¡Esperamos que lo disfrutes!`,
    link: `/customer/orders`,
    icon: '✅',
  });
}

/**
 * Create notification for review approved
 */
export async function notifyReviewApproved(userId: string, productName: string, productSlug: string) {
  return createNotification({
    userId,
    type: 'REVIEW_APPROVED',
    title: '⭐ Reseña Publicada',
    message: `Tu reseña de "${productName}" ha sido aprobada y ahora es visible para otros clientes.`,
    link: `/productos/${productSlug}#reviews`,
    icon: '⭐',
  });
}

/**
 * Create notification for promotion
 */
export async function notifyPromotion(userId: string, title: string, message: string, link?: string) {
  return createNotification({
    userId,
    type: 'PROMOTION',
    title,
    message,
    link,
    icon: '🎁',
  });
}

/**
 * Create notification for stock alert
 */
export async function notifyStockAlert(userId: string, productName: string, productSlug: string) {
  return createNotification({
    userId,
    type: 'STOCK_ALERT',
    title: '🎉 Producto Disponible',
    message: `"${productName}" está de vuelta en stock. ¡Consíguelo antes de que se agote!`,
    link: `/productos/${productSlug}`,
    icon: '🎉',
  });
}

/**
 * Get unread notifications count for a user
 */
export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}

/**
 * Delete old read notifications (cleanup)
 */
export async function deleteOldNotifications(daysOld: number = 30) {
  const date = new Date();
  date.setDate(date.getDate() - daysOld);

  return prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: {
        lt: date,
      },
    },
  });
}

