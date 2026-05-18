import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import { notifyRechargeApproved, notifyRechargeRejected } from '@/lib/notifications';

// GET - Get all transactions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_ORDERS')) {
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

        // Stats-only mode — returns aggregate numbers, no list
        if (searchParams.get('summary') === '1') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const [pendingAgg, completedTodayAgg, cancelledTodayAgg, weekAgg] = await Promise.all([
                prisma.transaction.aggregate({
                    where: { status: 'PENDING', type: 'RECHARGE' },
                    _count: true,
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { status: 'COMPLETED', createdAt: { gte: today } },
                    _count: true,
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { status: 'CANCELLED', createdAt: { gte: today } },
                    _count: true,
                }),
                prisma.transaction.aggregate({
                    where: { status: 'COMPLETED', createdAt: { gte: weekAgo } },
                    _sum: { amount: true },
                    _count: true,
                }),
            ]);

            return NextResponse.json({
                pendingCount: pendingAgg._count,
                pendingAmount: Number(pendingAgg._sum.amount || 0),
                completedTodayCount: completedTodayAgg._count,
                completedTodayAmount: Number(completedTodayAgg._sum.amount || 0),
                cancelledTodayCount: cancelledTodayAgg._count,
                weekCount: weekAgg._count,
                weekAmount: Number(weekAgg._sum.amount || 0),
            });
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                balance: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
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
        if (!isAuthorized(session, 'MANAGE_ORDERS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { id, status, rejectionReason } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'ID y estado requeridos' }, { status: 400 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                balance: {
                    include: {
                        user: {
                            select: { id: true }
                        }
                    }
                }
            },
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
            const updateData: any = { status };
            if (status === 'CANCELLED' && rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }
            const updatedTransaction = await tx.transaction.update({
                where: { id },
                data: updateData,
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

        // Send notification to customer
        try {
            const customerId = transaction.balance.user.id;
            if (status === 'COMPLETED') {
                await notifyRechargeApproved(customerId, Number(transaction.amount));
                // Referral commission for recharge (fire-and-forget)
                const { recordConversion } = await import('@/lib/influencer-commission');
                recordConversion({
                    referredUserId: customerId,
                    type: 'RECHARGE',
                    grossAmount: Number(transaction.amount),
                    transactionId: transaction.id,
                }).catch(() => {});
            } else if (status === 'CANCELLED') {
                await notifyRechargeRejected(customerId, Number(transaction.amount), rejectionReason);
            }
        } catch (notifError) {
            console.error('Error sending notification:', notifError);
            // Don't fail if notification fails
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error updating transaction:', error);
        return NextResponse.json({ error: 'Error al actualizar transacción' }, { status: 500 });
    }
}
