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
      pendingCourses,
    ] = await Promise.all([
      // Órdenes pendientes
      prisma.order.count({ where: { status: 'PENDING' } }),

      // Transacciones RECHARGE pendientes
      prisma.transaction.count({ where: { status: 'PENDING', type: 'RECHARGE' } }),

      // Mensajes de contacto pendientes (Centro de Consultas)
      prisma.contactMessage.count({ where: { status: 'PENDING' } }),

      // Solicitudes de productos pendientes (Centro de Consultas)
      prisma.productRequest.count({ where: { status: 'PENDING' } }),

      // Notificaciones sin leer del admin (menú Notificaciones, C-73)
      prisma.notification.count({ where: { userId, read: false } }),

      // Solicitudes de descuento pendientes
      prisma.discountRequest.count({ where: { status: 'PENDING' } }),

      // Solicitudes de creadores de cursos pendientes (menú Creadores)
      prisma.courseCreator.count({ where: { status: 'PENDING' } }),

      // Cursos de creadores que esperan aprobación (menú Cursos, C-82)
      prisma.course.count({ where: { isActive: false, creatorId: { not: null } } }),
    ]);

    // Mensajes y Solicitudes = mensajes + solicitudes de producto (las notificaciones tienen su propio menú desde C-73)
    const pendingInquiries = pendingMessages + pendingProductRequests;

    return NextResponse.json({
      pendingOrders,
      pendingTransactions,
      pendingInquiries,
      pendingDiscounts,
      pendingCreators,
      pendingCourses,
      unreadNotifications,
    });
  } catch (error) {
    console.error('[SIDEBAR-COUNTS] Error:', error);
    return NextResponse.json({ error: 'Error al obtener conteos' }, { status: 500 });
  }
}
