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
          take: 20, // Get more transactions for better history
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

    // Convert Decimal fields to numbers for proper JSON serialization
    const formattedTransactions = userBalance.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      amount: Number(tx.amount),
      currency: tx.currency,
      description: tx.description,
      reference: tx.reference,
      paymentMethod: tx.paymentMethod,
      rejectionReason: tx.rejectionReason,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    }));

    return NextResponse.json({
      balance: Number(userBalance.balance),
      currency: userBalance.currency,
      totalRecharges: Number(userBalance.totalRecharges),
      totalSpent: Number(userBalance.totalSpent),
      recentTransactions: formattedTransactions,
      createdAt: userBalance.createdAt,
      updatedAt: userBalance.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Error al obtener el saldo' }, { status: 500 });
  }
}

