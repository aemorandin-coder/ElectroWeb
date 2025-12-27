import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
    checkRateLimit,
    getClientIP,
    getRateLimitHeaders,
    recordFailedAttempt,
    isBlocked,
    resetFailedAttempts
} from '@/lib/rate-limit';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';
import {
    hashGiftCardCode,
    verifyPin,
    generateIdempotencyKey
} from '@/lib/gift-card-crypto';

// Rate limit config for gift card operations
const GIFT_CARD_RATE_LIMIT = {
    maxRequests: 5,
    windowSeconds: 60, // 5 attempts per minute
};

const GIFT_CARD_CHECK_RATE_LIMIT = {
    maxRequests: 10,
    windowSeconds: 60, // 10 checks per minute
};

// POST - Redeem a gift card (add balance to user's wallet)
export async function POST(request: NextRequest) {
    const operationId = generateIdempotencyKey(); // For tracking this specific request

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Debes iniciar sesión para canjear una Gift Card' },
                { status: 401 }
            );
        }

        const userId = (session.user as any).id;
        const clientIP = getClientIP(request);
        const identifier = `${userId}:${clientIP}`;

        // Check if user is blocked due to too many failed attempts
        const blockStatus = isBlocked(identifier, 'gift-card:redeem');
        if (blockStatus.blocked) {
            const metadata = getRequestMetadata(request);
            await createAuditLog({
                action: 'SECURITY_ACCESS_DENIED',
                userId,
                userEmail: session.user.email || undefined,
                severity: 'WARNING',
                details: {
                    reason: 'Blocked due to too many failed attempts',
                    blockedFor: blockStatus.blockedFor,
                    totalAttempts: blockStatus.attempts,
                },
                ...metadata,
            });

            return NextResponse.json(
                {
                    error: `Tu cuenta está temporalmente bloqueada. Intenta de nuevo en ${Math.ceil(blockStatus.blockedFor / 60)} minutos.`,
                    blockedFor: blockStatus.blockedFor
                },
                { status: 403 }
            );
        }

        // Rate limiting - prevent brute force code guessing
        const rateLimit = checkRateLimit(identifier, 'gift-card:redeem', GIFT_CARD_RATE_LIMIT);

        if (!rateLimit.success) {
            const metadata = getRequestMetadata(request);
            await createAuditLog({
                action: 'SECURITY_RATE_LIMIT_HIT',
                userId,
                userEmail: session.user.email || undefined,
                severity: 'WARNING',
                details: {
                    endpoint: '/api/gift-cards/redeem',
                    action: 'Gift card redeem rate limited',
                },
                ...metadata,
            });

            return NextResponse.json(
                {
                    error: 'Has realizado demasiados intentos. Espera un minuto antes de intentar nuevamente.',
                    retryAfter: rateLimit.resetIn
                },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit, GIFT_CARD_RATE_LIMIT)
                }
            );
        }

        const body = await request.json();
        const { code, pin, idempotencyKey } = body;

        // Check idempotency - prevent duplicate redemptions
        if (idempotencyKey) {
            const existingTransaction = await prisma.giftCardTransaction.findFirst({
                where: {
                    description: { contains: idempotencyKey }
                }
            });

            if (existingTransaction) {
                return NextResponse.json({
                    success: true,
                    message: 'Esta transacción ya fue procesada.',
                    alreadyProcessed: true,
                    transactionId: existingTransaction.id
                });
            }
        }

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Código de Gift Card requerido' }, { status: 400 });
        }

        // Sanitize code - only alphanumeric
        const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (sanitizedCode.length < 8 || sanitizedCode.length > 20) {
            return NextResponse.json({ error: 'Formato de código inválido' }, { status: 400 });
        }

        // Hash the code for lookup
        const codeHash = hashGiftCardCode(sanitizedCode);

        // Find the gift card - try by hash first, fallback to code for backwards compatibility
        let giftCard = await prisma.giftCard.findFirst({
            where: {
                OR: [
                    { codeHash },
                    { code: sanitizedCode } // Backwards compatibility
                ]
            },
            include: { design: true }
        });

        if (!giftCard) {
            // Record failed attempt
            const failedResult = recordFailedAttempt(identifier, 'gift-card:redeem');

            const metadata = getRequestMetadata(request);
            await createAuditLog({
                action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                userId,
                userEmail: session.user.email || undefined,
                severity: failedResult.attempts >= 3 ? 'WARNING' : 'INFO',
                details: {
                    attempt: 'Invalid gift card code',
                    codeLength: sanitizedCode.length,
                    totalAttempts: failedResult.attempts,
                    operationId,
                },
                ...metadata,
            });

            return NextResponse.json({
                error: 'Gift Card no encontrada',
                attemptsRemaining: Math.max(0, 5 - failedResult.attempts)
            }, { status: 404 });
        }

        // Check status
        const statusErrors: Record<string, string> = {
            DEPLETED: 'Esta Gift Card ya fue utilizada completamente',
            EXPIRED: 'Esta Gift Card ha expirado',
            SUSPENDED: 'Esta Gift Card está suspendida',
            CANCELLED: 'Esta Gift Card fue cancelada',
            INACTIVE: 'Esta Gift Card no está activa',
        };

        if (statusErrors[giftCard.status]) {
            return NextResponse.json({ error: statusErrors[giftCard.status] }, { status: 400 });
        }

        // Check PIN if required - use secure comparison
        if (giftCard.pin) {
            if (!pin) {
                return NextResponse.json({ error: 'PIN requerido para esta Gift Card' }, { status: 400 });
            }

            // Check if PIN is hashed (64 chars = SHA-256 hex)
            const isHashed = giftCard.pin.length === 64;
            const pinValid = isHashed
                ? verifyPin(pin, giftCard.pin)
                : pin === giftCard.pin; // Backwards compatibility

            if (!pinValid) {
                const failedResult = recordFailedAttempt(identifier, 'gift-card:redeem');

                const metadata = getRequestMetadata(request);
                await createAuditLog({
                    action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                    userId,
                    userEmail: session.user.email || undefined,
                    severity: 'WARNING',
                    details: {
                        attempt: 'Wrong gift card PIN',
                        giftCardId: giftCard.id,
                        totalAttempts: failedResult.attempts,
                        operationId,
                    },
                    ...metadata,
                });

                return NextResponse.json({
                    error: 'PIN incorrecto',
                    attemptsRemaining: Math.max(0, 5 - failedResult.attempts)
                }, { status: 400 });
            }
        }

        // Check balance
        const balance = Number(giftCard.balanceUSD);
        if (balance <= 0) {
            return NextResponse.json({ error: 'Esta Gift Card no tiene saldo disponible' }, { status: 400 });
        }

        // Get or create user's wallet balance
        let userBalance = await prisma.userBalance.findUnique({
            where: { userId }
        });

        if (!userBalance) {
            userBalance = await prisma.userBalance.create({
                data: {
                    userId,
                    balance: 0,
                    currency: 'USD',
                    totalSpent: 0,
                    totalRecharges: 0
                }
            });
        }

        const currentBalance = Number(userBalance.balance);
        const newBalance = currentBalance + balance;

        // Use interactive transaction with isolation for atomicity
        // This prevents race conditions with row-level locking
        const result = await prisma.$transaction(async (tx) => {
            // Re-fetch gift card within transaction to ensure data consistency
            const lockedGiftCard = await tx.giftCard.findUnique({
                where: { id: giftCard.id }
            });

            // Double-check status hasn't changed (race condition protection)
            if (!lockedGiftCard || lockedGiftCard.status === 'DEPLETED') {
                throw new Error('ALREADY_REDEEMED');
            }

            if (Number(lockedGiftCard.balanceUSD) <= 0) {
                throw new Error('NO_BALANCE');
            }

            // Update user balance
            const updatedUserBalance = await tx.userBalance.update({
                where: { userId },
                data: {
                    balance: newBalance,
                    totalRecharges: { increment: balance }
                }
            });

            // Create wallet transaction with idempotency key
            const walletTransaction = await tx.transaction.create({
                data: {
                    balanceId: userBalance!.id,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    amount: balance,
                    currency: 'USD',
                    description: `Canje de Gift Card ****${giftCard.code.slice(-4)}${idempotencyKey ? ` [${idempotencyKey}]` : ''}`,
                    reference: giftCard.id,
                    paymentMethod: 'GIFT_CARD'
                }
            });

            // Update gift card
            await tx.giftCard.update({
                where: { id: giftCard.id },
                data: {
                    balanceUSD: 0,
                    status: 'DEPLETED',
                    redeemedBy: userId,
                    redeemedAt: new Date(),
                    lastUsedAt: new Date(),
                    usageCount: { increment: 1 }
                }
            });

            // Create gift card transaction (ledger entry)
            await tx.giftCardTransaction.create({
                data: {
                    giftCardId: giftCard.id,
                    type: 'REDEMPTION',
                    amountUSD: balance,
                    balanceBefore: balance,
                    balanceAfter: 0,
                    userId,
                    userEmail: session.user.email,
                    description: `Gift Card canjeada por usuario${idempotencyKey ? ` [${idempotencyKey}]` : ''}`
                }
            });

            return { updatedUserBalance, walletTransaction };
        });

        // Reset failed attempts on successful redemption
        resetFailedAttempts(identifier, 'gift-card:redeem');

        // Audit log for successful redemption
        const metadata = getRequestMetadata(request);
        await createAuditLog({
            action: 'GIFT_CARD_REDEEMED',
            userId,
            userEmail: session.user.email || undefined,
            severity: 'INFO',
            targetType: 'GIFT_CARD',
            targetId: giftCard.id,
            details: {
                codeLast4: giftCard.code.slice(-4), // Don't log full code
                amount: balance,
                previousBalance: currentBalance,
                newBalance,
                operationId,
                transactionId: result.walletTransaction.id,
            },
            ...metadata,
        });

        return NextResponse.json({
            success: true,
            message: `¡Gift Card canjeada exitosamente! Se acreditaron $${balance.toFixed(2)} a tu saldo.`,
            amountRedeemed: balance,
            newBalance: newBalance,
            transactionId: result.walletTransaction.id
        });

    } catch (error: any) {
        console.error('Error redeeming gift card:', error);

        // Handle specific errors
        if (error.message === 'ALREADY_REDEEMED') {
            return NextResponse.json({
                error: 'Esta Gift Card ya fue canjeada por otro proceso'
            }, { status: 409 }); // Conflict
        }

        if (error.message === 'NO_BALANCE') {
            return NextResponse.json({
                error: 'Esta Gift Card no tiene saldo disponible'
            }, { status: 400 });
        }

        return NextResponse.json({ error: 'Error al canjear Gift Card' }, { status: 500 });
    }
}

// GET - Check gift card status (public but rate limited)
// SECURITY: Balance only revealed to authenticated users
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const clientIP = getClientIP(request);

        // Rate limiting for balance checks
        const rateLimit = checkRateLimit(clientIP, 'gift-card:check', GIFT_CARD_CHECK_RATE_LIMIT);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Demasiadas consultas. Intenta más tarde.' },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit, GIFT_CARD_CHECK_RATE_LIMIT)
                }
            );
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
        }

        // Sanitize code
        const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const codeHash = hashGiftCardCode(sanitizedCode);

        // Find by hash or code (backwards compatibility)
        const giftCard = await prisma.giftCard.findFirst({
            where: {
                OR: [
                    { codeHash },
                    { code: sanitizedCode }
                ]
            },
            select: {
                code: true,
                status: true,
                balanceUSD: true,
                expiresAt: true,
                design: {
                    select: {
                        name: true,
                        category: true
                    }
                }
            }
        });

        if (!giftCard) {
            return NextResponse.json({
                error: 'Gift Card no encontrada',
                isValid: false
            }, { status: 404 });
        }

        const hasBalance = giftCard.status === 'ACTIVE' && Number(giftCard.balanceUSD) > 0;

        // Build response - only show balance to authenticated users
        const responseData: any = {
            codeLast4: giftCard.code.slice(-4), // Only last 4 chars
            status: giftCard.status,
            isValid: hasBalance,
            expiresAt: giftCard.expiresAt,
            design: giftCard.design,
            message: hasBalance
                ? (session?.user ? 'Gift Card válida. Lista para canjear.' : 'Gift Card válida. Inicia sesión para canjearla.')
                : 'Esta Gift Card no está disponible para canje.'
        };

        // Only reveal balance to authenticated users
        if (session?.user && hasBalance) {
            responseData.balanceUSD = Number(giftCard.balanceUSD);
        }

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Error checking gift card:', error);
        return NextResponse.json({ error: 'Error al verificar Gift Card' }, { status: 500 });
    }
}
