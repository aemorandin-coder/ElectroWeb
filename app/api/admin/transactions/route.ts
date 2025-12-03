import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get all transactions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any).permissions?.includes('MANAGE_ORDERS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');

        const where: any = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (type && type !== 'all') {
            where.type = type;
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                balance: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
    }
}

// PATCH - Update transaction status (Approve/Reject)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any).permissions?.includes('MANAGE_ORDERS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'ID y estado requeridos' }, { status: 400 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { balance: true },
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
        }

        if (transaction.status !== 'PENDING') {
            return NextResponse.json({ error: 'La transacción ya fue procesada' }, { status: 400 });
        }

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update transaction status
            const updatedTransaction = await tx.transaction.update({
                where: { id },
                data: { status },
            });

            // If approved (COMPLETED) and it's a RECHARGE, update user balance
            if (status === 'COMPLETED' && transaction.type === 'RECHARGE') {
                await tx.userBalance.update({
                    where: { id: transaction.balanceId },
                    data: {
                        balance: { increment: transaction.amount },
                        totalRecharges: { increment: transaction.amount },
                    },
                });
            }

            return updatedTransaction;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error updating transaction:', error);
        return NextResponse.json({ error: 'Error al actualizar transacción' }, { status: 500 });
    }
}
