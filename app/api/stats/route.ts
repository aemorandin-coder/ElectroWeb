import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [
      totalProducts,
      publishedProducts,
      draftProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalCustomers,
      salesData,
      salesHistoryRaw,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'PUBLISHED' } }),
      prisma.product.count({ where: { status: 'DRAFT' } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.user.count(),
      // Calculate total sales (PAID, SHIPPED, DELIVERED)
      prisma.order.aggregate({
        _sum: { totalUSD: true },
        where: {
          status: { in: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
        }
      }),
      // Get last 7 days of sales for chart
      prisma.order.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        },
        select: {
          createdAt: true,
          totalUSD: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Process sales history
    const salesHistoryMap = new Map<string, number>();
    const today = new Date();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
      salesHistoryMap.set(dateStr, 0);
    }

    // Fill with actual data
    salesHistoryRaw.forEach(order => {
      const dateStr = new Date(order.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
      if (salesHistoryMap.has(dateStr)) {
        salesHistoryMap.set(dateStr, (salesHistoryMap.get(dateStr) || 0) + Number(order.totalUSD || 0));
      }
    });

    const salesHistory = Array.from(salesHistoryMap.entries()).map(([date, amount]) => ({
      date,
      amount
    }));

    return NextResponse.json({
      products: {
        total: totalProducts,
        published: publishedProducts,
        draft: draftProducts,
        outOfStock: outOfStockProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
      },
      customers: {
        total: totalCustomers,
      },
      sales: {
        total: Number(salesData._sum.totalUSD || 0),
        history: salesHistory
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json({
      error: 'Error al obtener estadísticas',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}
