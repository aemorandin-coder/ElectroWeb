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
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';
import {
    hashGiftCardCode,
    verifyPin,
    generateIdempotencyKey
} from '@/lib/gift-card-crypto';
import { countPinFailures, GIFT_CARD_MAX_PIN_FAILURES, GIFT_CARD_PIN_FAILURE_ACTION } from '@/lib/gift-card-lock';

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

        const userId = (session.user as { id: string }).id;
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
            // Solo transacciones del mismo usuario (antes cualquier clave coincidía con canjes ajenos)
            const existingTransaction = await prisma.giftCardTransaction.findFirst({
                where: {
                    userId,
                    description: { contains: String(idempotencyKey) }
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
        const giftCard = await prisma.giftCard.findFirst({
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
            INACTIVE: 'Esta Gift Card aún no está activa. Las tarjetas impresas se activan al pagarlas en la tienda.',
        };

        if (statusErrors[giftCard.status]) {
            return NextResponse.json({ error: statusErrors[giftCard.status] }, { status: 400 });
        }

        // Check PIN if required (tarjetas impresas). Las digitales desde C-71 no llevan PIN.
        if (giftCard.pin) {
            // Bloqueo por tarjeta, persistente (C-71): no se esquiva con otra cuenta ni con un reinicio
            const failures = await countPinFailures(giftCard.id);
            if (failures >= GIFT_CARD_MAX_PIN_FAILURES) {
                return NextResponse.json({
                    error: 'Esta Gift Card está bloqueada por intentos fallidos de PIN. Escríbenos para desbloquearla.',
                    locked: true
                }, { status: 423 });
            }

            if (!pin) {
                return NextResponse.json({ error: 'Escribe el PIN que está bajo el raspadito de la tarjeta', requiresPin: true }, { status: 400 });
            }

            if (!verifyPin(String(pin), giftCard.pin)) {
                recordFailedAttempt(identifier, 'gift-card:redeem');

                const metadata = getRequestMetadata(request);
                await createAuditLog({
                    action: GIFT_CARD_PIN_FAILURE_ACTION,
                    userId,
                    userEmail: session.user.email || undefined,
                    severity: 'WARNING',
                    targetType: 'GIFT_CARD_PIN',
                    targetId: giftCard.id,
                    details: {
                        attempt: 'Wrong gift card PIN',
                        codeLast4: giftCard.code.slice(-4),
                        cardFailures: failures + 1,
                        operationId,
                    },
                    ...metadata,
                });

                const remaining = Math.max(0, GIFT_CARD_MAX_PIN_FAILURES - (failures + 1));
                if (remaining === 0) {
                    emitAdminEvent({
                        type: 'GIFT_CARD_PIN_LOCKED',
                        title: `Gift card bloqueada · termina en ${giftCard.code.slice(-4)}`,
                        summary: `${GIFT_CARD_MAX_PIN_FAILURES} PIN equivocados en 24 horas. El último intento fue de ${session.user.email || 'una cuenta'}.`,
                        fields: [['Monto', formatUSD(Number(giftCard.balanceUSD))], ['IP', metadata.ipAddress]],
                        link: '/admin/gift-cards',
                    });
                }
                return NextResponse.json({
                    error: remaining > 0 ? `PIN incorrecto. Te quedan ${remaining} intentos.` : 'PIN incorrecto. La tarjeta quedó bloqueada.',
                    attemptsRemaining: remaining
                }, { status: 400 });
            }
        }

        // Check balance
        const balance = Number(giftCard.balanceUSD);
        if (balance <= 0) {
            return NextResponse.json({ error: 'Esta Gift Card no tiene saldo disponible' }, { status: 400 });
        }

        // ATÓMICO (C-71): la tarjeta se marca canjeada con una actualización condicional, y el saldo se incrementa.
        // Antes se releía la tarjeta sin bloquearla y se escribía un saldo calculado fuera de la transacción:
        // dos canjes simultáneos acreditaban dos veces, y una recarga al mismo tiempo se perdía.
        const result = await prisma.$transaction(async (tx) => {
            const claimed = await tx.giftCard.updateMany({
                where: { id: giftCard.id, status: giftCard.status, balanceUSD: { gt: 0 } },
                data: {
                    balanceUSD: 0,
                    status: 'DEPLETED',
                    redeemedBy: userId,
                    redeemedAt: new Date(),
                    lastUsedAt: new Date(),
                    usageCount: { increment: 1 }
                }
            });
            if (claimed.count !== 1) {
                throw new Error('ALREADY_REDEEMED');
            }

            const updatedUserBalance = await tx.userBalance.upsert({
                where: { userId },
                create: { userId, balance: balance, currency: 'USD', totalSpent: 0, totalRecharges: balance },
                update: { balance: { increment: balance }, totalRecharges: { increment: balance } }
            });

            // Create wallet transaction with idempotency key
            const walletTransaction = await tx.transaction.create({
                data: {
                    balanceId: updatedUserBalance.id,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    amount: balance,
                    currency: 'USD',
                    description: `Canje de Gift Card ****${giftCard.code.slice(-4)}${idempotencyKey ? ` [${idempotencyKey}]` : ''}`,
                    reference: giftCard.id,
                    paymentMethod: 'GIFT_CARD'
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

        const newBalance = Number(result.updatedUserBalance.balance);
        const currentBalance = newBalance - balance;

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

        emitAdminEvent({
            type: 'GIFT_CARD_REDEEMED',
            title: `Gift card canjeada · ${formatUSD(balance)}`,
            summary: `${session.user.name || session.user.email || 'Un cliente'} pasó una gift card a su saldo`,
            fields: [['Tarjeta', `termina en ${giftCard.code.slice(-4)}`], ['Saldo nuevo del cliente', formatUSD(newBalance)]],
            link: '/admin/gift-cards',
        });

        return NextResponse.json({
            success: true,
            message: `¡Gift Card canjeada exitosamente! Se acreditaron $${balance.toFixed(2)} a tu saldo.`,
            amountRedeemed: balance,
            newBalance: newBalance,
            transactionId: result.walletTransaction.id
        });

    } catch (err: unknown) {
        const error = err as { message?: string; code?: string };
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
                pin: true,
                status: true,
                balanceUSD: true,
                expiresAt: true,
                design: {
                    select: {
                        slug: true,
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
        const responseData: Record<string, unknown> = {
            codeLast4: giftCard.code.slice(-4), // Only last 4 chars
            status: giftCard.status,
            isValid: hasBalance,
            // Solo si hace falta: nunca el PIN ni su hash (C-71)
            requiresPin: Boolean(giftCard.pin),
            expiresAt: giftCard.expiresAt,
            design: giftCard.design,
            message: hasBalance
                ? (session?.user ? 'Gift Card válida. Lista para canjear.' : 'Gift Card válida. Inicia sesión para canjearla.')
                : giftCard.status === 'INACTIVE'
                    ? 'Esta Gift Card aún no está activa. Las tarjetas impresas se activan al pagarlas en la tienda.'
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
