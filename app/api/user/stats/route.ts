import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        orders: true,
        balance: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const totalOrders = user.orders.length;
    const pendingOrders = user.orders.filter(order =>
      order.status === 'PENDING' || order.status === 'PROCESSING'
    ).length;
    const completedOrders = user.orders.filter(order =>
      order.status === 'DELIVERED'
    ).length;

    const totalSpent = user.orders
      .filter(order => order.status !== 'CANCELLED' && order.status !== 'REFUNDED')
      .reduce((sum, order) => sum + Number(order.totalUSD), 0);

    const balance = user.balance ? Number(user.balance.balance) : 0;

    return NextResponse.json({
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent,
        balance
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
