import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Generate unique gift card code
function generateGiftCardCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar chars (0,O,1,I)
    let code = 'ESMC'; // Electro Shop Money Card
    for (let i = 0; i < 3; i++) {
        code += '-';
        for (let j = 0; j < 4; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return code;
}

// Generate PIN
function generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// GET - Get gift cards (admin) or user's gift cards
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'admin' or 'user'

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Admin access
        if (type === 'admin') {
            if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
            }

            const giftCards = await prisma.giftCard.findMany({
                include: {
                    design: true,
                    transactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(giftCards);
        }

        // User's gift cards (purchased or received)
        const giftCards = await prisma.giftCard.findMany({
            where: {
                OR: [
                    { purchasedBy: session.user.id },
                    { recipientEmail: session.user.email }
                ]
            },
            include: {
                design: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(giftCards);

    } catch (error) {
        console.error('Error fetching gift cards:', error);
        return NextResponse.json({ error: 'Error al obtener gift cards' }, { status: 500 });
    }
}

// POST - Create a new gift card (purchase)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const body = await request.json();

        const {
            amountUSD,
            designId,
            isGift,
            recipientName,
            recipientEmail,
            senderName,
            personalMessage,
            orderId
        } = body;

        // Validate amount
        if (!amountUSD || amountUSD < 5 || amountUSD > 500) {
            return NextResponse.json({ error: 'Monto inválido (min $5, max $500)' }, { status: 400 });
        }

        // Generate unique code
        let code = generateGiftCardCode();
        let attempts = 0;
        while (await prisma.giftCard.findUnique({ where: { code } }) && attempts < 10) {
            code = generateGiftCardCode();
            attempts++;
        }

        if (attempts >= 10) {
            return NextResponse.json({ error: 'Error generando código único' }, { status: 500 });
        }

        // Create gift card
        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                pin: generatePin(),
                amountUSD,
                balanceUSD: amountUSD,
                status: 'ACTIVE',
                designId: designId || null,
                purchasedBy: session?.user?.id || null,
                purchasedAt: new Date(),
                orderId,
                recipientName: isGift ? recipientName : null,
                recipientEmail: isGift ? recipientEmail : null,
                senderName: isGift ? senderName : null,
                personalMessage: isGift ? personalMessage : null,
                activatedAt: new Date(),
                // No expiration for Electro Shop gift cards
            },
            include: {
                design: true
            }
        });

        // Create initial transaction
        await prisma.giftCardTransaction.create({
            data: {
                giftCardId: giftCard.id,
                type: 'PURCHASE',
                amountUSD,
                balanceBefore: 0,
                balanceAfter: amountUSD,
                userId: session?.user?.id || null,
                userEmail: session?.user?.email || null,
                description: 'Purchase of gift card'
            }
        });

        // TODO: Send email to recipient if isGift

        return NextResponse.json({
            success: true,
            giftCard: {
                id: giftCard.id,
                code: giftCard.code,
                amountUSD: giftCard.amountUSD,
                status: giftCard.status,
                design: giftCard.design
            }
        });

    } catch (error) {
        console.error('Error creating gift card:', error);
        return NextResponse.json({ error: 'Error al crear gift card' }, { status: 500 });
    }
}
