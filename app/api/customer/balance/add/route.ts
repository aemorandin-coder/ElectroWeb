import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';

/**
 * POST - Add balance to user's wallet
 * 
 * SECURITY: This endpoint is restricted to ADMIN/SUPER_ADMIN only.
 * Users cannot add balance to their own accounts directly.
 * Balance can only be added through:
 * - Gift card redemption
 * - Verified payment (Pago Móvil)
 * - Admin manual adjustment
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // SECURITY: Only admins can add balance directly
        if (!isAuthorized(session, 'MANAGE_ORDERS')) {
            // Log suspicious attempt
            const metadata = getRequestMetadata(request);
            await createAuditLog({
                action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                userId: (session.user as any).id,
                userEmail: session.user.email || undefined,
                severity: 'WARNING',
                details: {
                    attempt: 'Unauthorized balance add attempt',
                    endpoint: '/api/customer/balance/add',
                },
                ...metadata,
            });

            return NextResponse.json(
                { error: 'No tienes permisos para realizar esta acción' },
                { status: 403 }
            );
        }

        // Rate limiting for admins too
        const adminId = (session.user as any).id;
        const rateLimit = checkRateLimit(adminId, 'admin:balance-add', RATE_LIMITS.SENSITIVE);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Demasiadas operaciones. Espera unos minutos.' },
                { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.SENSITIVE) }
            );
        }

        const body = await request.json();
        const { userId, amount, description, reason } = body;

        // Validate target user ID
        if (!userId) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
            return NextResponse.json(
                { error: 'Monto inválido. Debe ser un número positivo menor a $10,000' },
                { status: 400 }
            );
        }

        // Verify target user exists
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
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

        // Use transaction for atomicity
        const [updatedBalance, transaction] = await prisma.$transaction([
            prisma.userBalance.update({
                where: { userId },
                data: {
                    balance: newBalance,
                    totalRecharges: { increment: amount },
                }
            }),
            prisma.transaction.create({
                data: {
                    balanceId: userBalance.id,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    amount: amount,
                    currency: 'USD',
                    description: description || `Ajuste manual por admin: ${reason || 'Sin razón especificada'}`,
                }
            })
        ]);

        // Audit log for balance modification
        const metadata = getRequestMetadata(request);
        await createAuditLog({
            action: 'USER_BALANCE_MODIFIED',
            userId: adminId,
            userEmail: session.user.email || undefined,
            severity: 'WARNING',
            targetType: 'USER',
            targetId: userId,
            details: {
                targetEmail: targetUser.email,
                previousBalance,
                addedAmount: amount,
                newBalance,
                reason: reason || 'No especificada',
                transactionId: transaction.id,
            },
            ...metadata,
        });

        return NextResponse.json({
            success: true,
            previousBalance,
            addedAmount: amount,
            newBalance: Number(updatedBalance.balance),
            transactionId: transaction.id,
        });

    } catch (error) {
        console.error('Error adding balance:', error);
        return NextResponse.json({ error: 'Error al agregar saldo' }, { status: 500 });
    }
}
