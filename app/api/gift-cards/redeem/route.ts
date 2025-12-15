import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Redeem a gift card (add balance to user's wallet)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Debes iniciar sesión para canjear una Gift Card' }, { status: 401 });
        }

        const body = await request.json();
        const { code, pin } = body;

        if (!code) {
            return NextResponse.json({ error: 'Código de Gift Card requerido' }, { status: 400 });
        }

        // Find the gift card
        const giftCard = await prisma.giftCard.findUnique({
            where: { code: code.toUpperCase() },
            include: { design: true }
        });

        if (!giftCard) {
            return NextResponse.json({ error: 'Gift Card no encontrada' }, { status: 404 });
        }

        // Check status
        if (giftCard.status === 'DEPLETED') {
            return NextResponse.json({ error: 'Esta Gift Card ya fue utilizada completamente' }, { status: 400 });
        }

        if (giftCard.status === 'EXPIRED') {
            return NextResponse.json({ error: 'Esta Gift Card ha expirado' }, { status: 400 });
        }

        if (giftCard.status === 'SUSPENDED') {
            return NextResponse.json({ error: 'Esta Gift Card está suspendida' }, { status: 400 });
        }

        if (giftCard.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Esta Gift Card fue cancelada' }, { status: 400 });
        }

        if (giftCard.status === 'INACTIVE') {
            return NextResponse.json({ error: 'Esta Gift Card no está activa' }, { status: 400 });
        }

        // Check PIN if required
        if (giftCard.pin && pin !== giftCard.pin) {
            return NextResponse.json({ error: 'PIN incorrecto' }, { status: 400 });
        }

        // Check balance
        const balance = Number(giftCard.balanceUSD);
        if (balance <= 0) {
            return NextResponse.json({ error: 'Esta Gift Card no tiene saldo disponible' }, { status: 400 });
        }

        // Get or create user's wallet balance
        let userBalance = await prisma.userBalance.findUnique({
            where: { userId: session.user.id }
        });

        if (!userBalance) {
            userBalance = await prisma.userBalance.create({
                data: {
                    userId: session.user.id,
                    balance: 0,
                    currency: 'USD',
                    totalSpent: 0,
                    totalRecharges: 0
                }
            });
        }

        const currentBalance = Number(userBalance.balance);
        const newBalance = currentBalance + balance;

        // Update user balance
        await prisma.userBalance.update({
            where: { userId: session.user.id },
            data: {
                balance: newBalance,
                totalRecharges: { increment: balance }
            }
        });

        // Create wallet transaction
        await prisma.transaction.create({
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
        });

        // Update gift card
        await prisma.giftCard.update({
            where: { id: giftCard.id },
            data: {
                balanceUSD: 0,
                status: 'DEPLETED',
                redeemedBy: session.user.id,
                redeemedAt: new Date(),
                lastUsedAt: new Date(),
                usageCount: { increment: 1 }
            }
        });

        // Create gift card transaction
        await prisma.giftCardTransaction.create({
            data: {
                giftCardId: giftCard.id,
                type: 'REDEMPTION',
                amountUSD: balance,
                balanceBefore: balance,
                balanceAfter: 0,
                userId: session.user.id,
                userEmail: session.user.email,
                description: `Gift Card canjeada por usuario ${session.user.email}`
            }
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

// GET - Check gift card balance (public)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
        }

        const giftCard = await prisma.giftCard.findUnique({
            where: { code: code.toUpperCase() },
            select: {
                code: true,
                status: true,
                balanceUSD: true,
                amountUSD: true,
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

        return NextResponse.json({
            code: giftCard.code,
            status: giftCard.status,
            balanceUSD: giftCard.balanceUSD,
            originalAmount: giftCard.amountUSD,
            expiresAt: giftCard.expiresAt,
            design: giftCard.design
        });

    } catch (error) {
        console.error('Error checking gift card:', error);
        return NextResponse.json({ error: 'Error al verificar Gift Card' }, { status: 500 });
    }
}
