import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get user balance and statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get or create user balance
    let userBalance = await prisma.userBalance.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!userBalance) {
      userBalance = await prisma.userBalance.create({
        data: {
          userId,
          balance: 0,
          currency: 'USD',
          totalRecharges: 0,
          totalSpent: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return NextResponse.json({
      balance: userBalance.balance,
      currency: userBalance.currency,
      totalRecharges: userBalance.totalRecharges,
      totalSpent: userBalance.totalSpent,
      recentTransactions: userBalance.transactions,
      createdAt: userBalance.createdAt,
      updatedAt: userBalance.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Error al obtener el saldo' }, { status: 500 });
  }
}
