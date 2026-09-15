import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { eventTypesOf, type AdminEventCategory, CATEGORY_LABELS } from '@/lib/admin-events/catalog';

const MAX_LIMIT = 100;

/**
 * GET /api/notifications — notificaciones del usuario de la sesión.
 * ?limit (1-100) &cursor (id de la última recibida) &unread=1 &category=ventas (avisos del equipo, C-73)
 *
 * C-73: antes `limit` no tenía tope (limit=1000000 leía toda la tabla) y la campana contaba las no leídas
 * solo entre las últimas 50. El POST para crear notificaciones a cualquier usuario, sin uso, se quitó.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get('limit') || '30', 10) || 30));
    const cursor = params.get('cursor');
    const unreadOnly = params.get('unread') === '1' || params.get('unreadOnly') === 'true';
    const category = params.get('category');

    const where: Prisma.NotificationWhereInput = { userId: session.user.id };
    if (unreadOnly) where.read = false;
    if (category) {
      if (!Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category)) {
        return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
      }
      where.type = { in: eventTypesOf(category as AdminEventCategory) };
    }

    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, type: true, title: true, message: true, link: true, icon: true, read: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId: session.user.id, read: false } }),
    ]);

    const hasMore = rows.length > limit;
    const notifications = hasMore ? rows.slice(0, limit) : rows;
    return NextResponse.json({
      notifications,
      unreadCount,
      nextCursor: hasMore ? notifications[notifications.length - 1].id : null,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}
