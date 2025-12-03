import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔔 Seeding notifications...');

  // Sample notifications
  const notifications = [
    {
      type: NotificationType.NEW_ORDER,
      priority: NotificationPriority.HIGH,
      title: 'Nueva Orden Recibida',
      message: 'Se ha recibido una nueva orden #ORD-2025-0001 por $450.00',
      actionUrl: '/admin/orders',
    },
    {
      type: NotificationType.LOW_STOCK,
      priority: NotificationPriority.MEDIUM,
      title: 'Stock Bajo',
      message: 'El producto "Laptop Gaming ASUS ROG" tiene solo 3 unidades en stock',
      actionUrl: '/admin/products',
    },
    {
      type: NotificationType.STOCK_CRITICAL,
      priority: NotificationPriority.URGENT,
      title: '⚠️ Stock Crítico',
      message: '¡URGENTE! El producto "Mouse Logitech G502" tiene solo 1 unidad en stock',
      actionUrl: '/admin/products',
    },
    {
      type: NotificationType.ORDER_PAID,
      priority: NotificationPriority.MEDIUM,
      title: 'Pago Confirmado',
      message: 'La orden #ORD-2025-0002 ha sido pagada mediante Transferencia bancaria',
      actionUrl: '/admin/orders',
    },
    {
      type: NotificationType.PRODUCT_REQUEST,
      priority: NotificationPriority.MEDIUM,
      title: 'Solicitud de Producto',
      message: 'Juan Pérez solicitó: "RTX 4090 Ti"',
      actionUrl: '/admin/notifications',
    },
    {
      type: NotificationType.OUT_OF_STOCK,
      priority: NotificationPriority.HIGH,
      title: 'Producto Agotado',
      message: 'El producto "Teclado Mecánico Razer" se ha agotado',
      actionUrl: '/admin/products',
    },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: notif,
    });
  }

  console.log('✅ Notifications seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notifications:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
