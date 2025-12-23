import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST - Deduct balance from user's wallet
 * 
 * SECURITY:
 * - Uses atomic transaction to prevent race conditions
 * - Supports idempotency key to prevent double charges
 * - Rate limited to prevent abuse
 * - Requires orderId or reference for traceability
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Rate limiting
        const rateLimit = checkRateLimit(userId, 'balance:deduct', RATE_LIMITS.SENSITIVE);
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Demasiadas operaciones. Espera unos minutos.' },
                { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.SENSITIVE) }
            );
        }

        const body = await request.json();
        const { amount, description, orderId, idempotencyKey } = body;

        // Validate amount
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
        }

        // Maximum single deduction limit
        if (amount > 10000) {
            return NextResponse.json(
                { error: 'El monto máximo por transacción es $10,000' },
                { status: 400 }
            );
        }

        // Require orderId or description for traceability
        if (!orderId && !description) {
            return NextResponse.json(
                { error: 'Se requiere orderId o descripción para la transacción' },
                { status: 400 }
            );
        }

        // IDEMPOTENCY: Check if this transaction was already processed
        if (idempotencyKey) {
            const existingTransaction = await prisma.transaction.findFirst({
                where: {
                    reference: idempotencyKey,
                    balance: { userId },
                    type: 'PURCHASE',
                    status: 'COMPLETED',
                }
            });

            if (existingTransaction) {
                // Return success but indicate it was already processed
                return NextResponse.json({
                    success: true,
                    alreadyProcessed: true,
                    transactionId: existingTransaction.id,
                    message: 'Esta transacción ya fue procesada anteriormente',
                });
            }
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
            return NextResponse.json({
                error: 'Saldo insuficiente',
                currentBalance: previousBalance,
                required: amount,
            }, { status: 400 });
        }

        // ATOMIC TRANSACTION: Ensure balance update and transaction record are atomic
        const result = await prisma.$transaction(async (tx) => {
            // Update balance with optimistic locking check
            const updatedBalance = await tx.userBalance.update({
                where: {
                    userId,
                    // Extra check: ensure balance hasn't changed since we read it
                    balance: userBalance.balance,
                },
                data: {
                    balance: { decrement: amount },
                    totalSpent: { increment: amount },
                }
            });

            // Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    balanceId: userBalance.id,
                    type: 'PURCHASE',
                    status: 'COMPLETED',
                    amount: amount,
                    currency: 'USD',
                    description: description || `Pago de orden ${orderId || 'N/A'}`,
                    reference: idempotencyKey || orderId || undefined,
                    metadata: orderId ? JSON.stringify({ orderId }) : undefined,
                }
            });

            return { updatedBalance, transaction };
        });

        return NextResponse.json({
            success: true,
            previousBalance,
            deductedAmount: amount,
            newBalance: Number(result.updatedBalance.balance),
            transactionId: result.transaction.id,
        });

    } catch (error: any) {
        console.error('Error deducting balance:', error);

        // Handle optimistic locking failure (balance changed during transaction)
        if (error.code === 'P2025') {
            return NextResponse.json({
                error: 'El saldo cambió durante la operación. Por favor, intenta de nuevo.',
                retry: true,
            }, { status: 409 }); // Conflict
        }

        return NextResponse.json({ error: 'Error al deducir saldo' }, { status: 500 });
    }
}
