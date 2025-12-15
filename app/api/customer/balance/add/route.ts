import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Add balance to user's wallet
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

        // Get or create user balance
        let userBalance = await prisma.userBalance.findUnique({
            where: { userId }
        });

        if (!userBalance) {
            userBalance = await prisma.userBalance.create({
                data: {
                    userId,
                    balance: 0,
                    currency: 'USD',
                    totalRecharges: 0,
                    totalSpent: 0,
                }
            });
        }

        // Calculate new balance
        const previousBalance = Number(userBalance.balance);
        const newBalance = previousBalance + amount;

        // Update balance
        const updatedBalance = await prisma.userBalance.update({
            where: { userId },
            data: {
                balance: newBalance,
                totalRecharges: { increment: amount },
            }
        });

        // Create transaction record
        await prisma.transaction.create({
            data: {
                balanceId: userBalance.id,
                type: 'DEPOSIT',
                status: 'COMPLETED',
                amount: amount,
                currency: 'USD',
                description: description || 'Recarga de saldo - Gift Card para mí',
            }
        });

        return NextResponse.json({
            success: true,
            previousBalance,
            addedAmount: amount,
            newBalance: Number(updatedBalance.balance),
        });

    } catch (error) {
        console.error('Error adding balance:', error);
        return NextResponse.json({ error: 'Error al agregar saldo' }, { status: 500 });
    }
}
