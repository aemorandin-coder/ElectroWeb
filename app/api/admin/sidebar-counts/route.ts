import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Sidebar notification badge counts for admin panel
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPPORT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const userId = (session.user as any).id;

    const [
      pendingOrders,
      pendingTransactions,
      pendingMessages,
      pendingProductRequests,
      unreadNotifications,
      pendingDiscounts,
      pendingCreators,
    ] = await Promise.all([
      // Órdenes pendientes
      prisma.order.count({ where: { status: 'PENDING' } }),

      // Transacciones RECHARGE pendientes
      prisma.transaction.count({ where: { status: 'PENDING', type: 'RECHARGE' } }),

      // Mensajes de contacto pendientes (Centro de Consultas)
      prisma.contactMessage.count({ where: { status: 'PENDING' } }),

      // Solicitudes de productos pendientes (Centro de Consultas)
      prisma.productRequest.count({ where: { status: 'PENDING' } }),

      // Alertas del sistema sin leer del admin (Centro de Consultas - tab Alertas)
      prisma.notification.count({ where: { userId, read: false } }),

      // Solicitudes de descuento pendientes
      prisma.discountRequest.count({ where: { status: 'PENDING' } }),

      // Solicitudes de creadores de cursos pendientes (Marketing)
      prisma.courseCreator.count({ where: { status: 'PENDING' } }),
    ]);

    // Centro de Consultas = mensajes + solicitudes + alertas sin leer
    const pendingInquiries = pendingMessages + pendingProductRequests + unreadNotifications;

    return NextResponse.json({
      pendingOrders,
      pendingTransactions,
      pendingInquiries,
      pendingDiscounts,
      pendingCreators, // Para Marketing badge
    });
  } catch (error) {
    console.error('[SIDEBAR-COUNTS] Error:', error);
    return NextResponse.json({ error: 'Error al obtener conteos' }, { status: 500 });
  }
}
