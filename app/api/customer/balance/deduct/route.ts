import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Deduct balance from user's wallet
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const { amount, description } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
        }

        // Get user balance
        const userBalance = await prisma.userBalance.findUnique({
            where: { userId }
        });

        if (!userBalance) {
            return NextResponse.json({ error: 'No tienes saldo disponible' }, { status: 400 });
        }

        const previousBalance = Number(userBalance.balance);

        if (previousBalance < amount) {
            return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
        }

        // Calculate new balance
        const newBalance = previousBalance - amount;

        // Update balance
        const updatedBalance = await prisma.userBalance.update({
            where: { userId },
            data: {
                balance: newBalance,
                totalSpent: { increment: amount },
            }
        });

        // Create transaction record
        await prisma.transaction.create({
            data: {
                balanceId: userBalance.id,
                type: 'PURCHASE',
                status: 'COMPLETED',
                amount: amount,
                currency: 'USD',
                description: description || 'Débito de saldo',
            }
        });

        return NextResponse.json({
            success: true,
            previousBalance,
            deductedAmount: amount,
            newBalance: Number(updatedBalance.balance),
        });

    } catch (error) {
        console.error('Error deducting balance:', error);
        return NextResponse.json({ error: 'Error al deducir saldo' }, { status: 500 });
    }
}
