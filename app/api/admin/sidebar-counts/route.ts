import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { esAdminVerificado } from '@/lib/auth-helpers';
import { pagoSinOrdenWhere } from '@/lib/pago-movil-sin-orden';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Sidebar notification badge counts for admin panel
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 403 y no 401 para el admin sin los dos pasos: con 401 el panel cierra la sesión (C-140) y no podría configurarlos
    if (!esAdminVerificado(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const userId = session.user.id;

    const [
      pendingOrders,
      pendingTransactions,
      pendingMessages,
      pendingProductRequests,
      unreadNotifications,
      pendingDiscounts,
      pendingCreators,
      pendingCourses,
      pendingReviews,
      pendingWarranty,
      pendingQuotes,
      pendingVerifications,
    ] = await Promise.all([
      // Órdenes pendientes
      prisma.order.count({ where: { status: 'PENDING' } }),

      // Transacciones RECHARGE pendientes, más los Pagos Móvil de compra sin orden (C-114)
      Promise.all([
        prisma.transaction.count({ where: { status: 'PENDING', type: 'RECHARGE' } }),
        prisma.pagoMovilVerificacion.count({ where: pagoSinOrdenWhere }),
      ]).then(([recargas, sinOrden]) => recargas + sinOrden),

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

      // Reseñas por moderar (menú Reseñas, C-110)
      prisma.review.count({ where: { isApproved: false, rejectedAt: null } }),

      // Garantías por atender: nuevas o con respuesta del cliente (menú Garantías, C-122)
      prisma.warrantyClaim.count({ where: { awaitingStaff: true, status: { notIn: ['RESOLVED', 'REJECTED'] } } }),

      // Cotizaciones que pidió un cliente y esperan precios (menú Cotizaciones, C-148)
      prisma.quote.count({ where: { status: 'REQUESTED' } }),

      // Empresas que subieron sus documentos y esperan revisión (menú Verificaciones, C-150)
      prisma.profile.count({ where: { businessVerificationStatus: 'PENDING' } }),
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
      pendingReviews,
      pendingWarranty,
      pendingQuotes,
      pendingVerifications,
      unreadNotifications,
    });
  } catch (error) {
    console.error('[SIDEBAR-COUNTS] Error:', error);
    return NextResponse.json({ error: 'Error al obtener conteos' }, { status: 500 });
  }
}
