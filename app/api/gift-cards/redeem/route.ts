import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';

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

        // Rate limiting - prevent brute force code guessing
        const rateLimit = checkRateLimit(
            `${userId}:${clientIP}`,
            'gift-card:redeem',
            GIFT_CARD_RATE_LIMIT
        );

        if (!rateLimit.success) {
            // Log suspicious activity
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
        const { code, pin } = body;

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Código de Gift Card requerido' }, { status: 400 });
        }

        // Sanitize code - only alphanumeric
        const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (sanitizedCode.length < 8 || sanitizedCode.length > 20) {
            return NextResponse.json({ error: 'Formato de código inválido' }, { status: 400 });
        }

        // Find the gift card
        const giftCard = await prisma.giftCard.findUnique({
            where: { code: sanitizedCode },
            include: { design: true }
        });

        if (!giftCard) {
            // Log failed attempt (potential enumeration)
            const metadata = getRequestMetadata(request);
            await createAuditLog({
                action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                userId,
                userEmail: session.user.email || undefined,
                severity: 'INFO',
                details: {
                    attempt: 'Invalid gift card code',
                    codeLength: sanitizedCode.length,
                },
                ...metadata,
            });

            return NextResponse.json({ error: 'Gift Card no encontrada' }, { status: 404 });
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

        // Check PIN if required
        if (giftCard.pin && pin !== giftCard.pin) {
            // Log failed PIN attempt
            const metadata = getRequestMetadata(request);
            await createAuditLog({
                action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                userId,
                userEmail: session.user.email || undefined,
                severity: 'WARNING',
                details: {
                    attempt: 'Wrong gift card PIN',
                    giftCardId: giftCard.id,
                },
                ...metadata,
            });

            return NextResponse.json({ error: 'PIN incorrecto' }, { status: 400 });
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

        // Use transaction for atomicity - all or nothing
        await prisma.$transaction([
            // Update user balance
            prisma.userBalance.update({
                where: { userId },
                data: {
                    balance: newBalance,
                    totalRecharges: { increment: balance }
                }
            }),
            // Create wallet transaction
            prisma.transaction.create({
                data: {
                    balanceId: userBalance.id,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    amount: balance,
                    currency: 'USD',
                    description: `Canje de Gift Card ${giftCard.code}`,
                    reference: giftCard.id,
                    paymentMethod: 'GIFT_CARD'
                }
            }),
            // Update gift card
            prisma.giftCard.update({
                where: { id: giftCard.id },
                data: {
                    balanceUSD: 0,
                    status: 'DEPLETED',
                    redeemedBy: userId,
                    redeemedAt: new Date(),
                    lastUsedAt: new Date(),
                    usageCount: { increment: 1 }
                }
            }),
            // Create gift card transaction
            prisma.giftCardTransaction.create({
                data: {
                    giftCardId: giftCard.id,
                    type: 'REDEMPTION',
                    amountUSD: balance,
                    balanceBefore: balance,
                    balanceAfter: 0,
                    userId,
                    userEmail: session.user.email,
                    description: `Gift Card canjeada por usuario ${session.user.email}`
                }
            })
        ]);

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
                code: giftCard.code,
                amount: balance,
                previousBalance: currentBalance,
                newBalance,
            },
            ...metadata,
        });

        return NextResponse.json({
            success: true,
            message: `¡Gift Card canjeada exitosamente! Se acreditaron $${balance.toFixed(2)} a tu saldo.`,
            amountRedeemed: balance,
            newBalance: newBalance
        });

    } catch (error) {
        console.error('Error redeeming gift card:', error);
        return NextResponse.json({ error: 'Error al canjear Gift Card' }, { status: 500 });
    }
}

// GET - Check gift card status (public but rate limited)
// SECURITY: Does NOT reveal balance amount to prevent enumeration
export async function GET(request: NextRequest) {
    try {
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

        const giftCard = await prisma.giftCard.findUnique({
            where: { code: sanitizedCode },
            select: {
                code: true,
                status: true,
                // SECURITY: Do NOT expose balanceUSD to prevent enumeration attacks
                // balanceUSD: true, <- REMOVED
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
            return NextResponse.json({ error: 'Gift Card no encontrada' }, { status: 404 });
        }

        // Only reveal if card is valid (has balance) or not
        const hasBalance = giftCard.status === 'ACTIVE';

        return NextResponse.json({
            code: giftCard.code,
            status: giftCard.status,
            isValid: hasBalance,
            expiresAt: giftCard.expiresAt,
            design: giftCard.design,
            // Message based on status
            message: hasBalance
                ? 'Gift Card válida. Inicia sesión para canjearla.'
                : 'Esta Gift Card no está disponible para canje.'
        });

    } catch (error) {
        console.error('Error checking gift card:', error);
        return NextResponse.json({ error: 'Error al verificar Gift Card' }, { status: 500 });
    }
}
