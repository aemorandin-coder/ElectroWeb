import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalProducts, totalCustomers, totalOrders] = await Promise.all([
      prisma.product.count({
        where: {
          status: 'PUBLISHED'
        }
      }),
      prisma.user.count(),
      prisma.order.count(),
    ]);

    return NextResponse.json({
      totalProducts,
      totalCustomers,
      totalOrders,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json(
      {
        totalProducts: 0,
        totalCustomers: 0,
        totalOrders: 0
      },
      { status: 200 }
    );
  }
}
