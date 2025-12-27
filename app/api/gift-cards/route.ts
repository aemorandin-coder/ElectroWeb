import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendGiftCardEmail } from '@/lib/email-service';
import {
    generateGiftCardCode,
    hashGiftCardCode,
    getCodeLastFour,
    generateSecurePin,
    hashPin
} from '@/lib/gift-card-crypto';


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

// POST - Create a new gift card (purchase or admin generation)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const body = await request.json();

        // Support both field naming conventions for backwards compatibility
        const amountUSD = body.amountUSD || body.amount;
        const designId = body.designId || body.design;
        const personalMessage = body.personalMessage || body.message;
        const {
            isGift,
            recipientName,
            recipientEmail,
            senderName,
            orderId,
            // Admin-specific fields
            forPrint = false, // Flag for physical cards
            quantity = 1      // Number of cards to generate
        } = body;

        // Auto-detect if it's a gift when recipient email is provided
        const isGiftCard = isGift ?? !!recipientEmail;

        // Validate amount
        if (!amountUSD || amountUSD < 5 || amountUSD > 500) {
            return NextResponse.json({ error: 'Monto inválido (min $5, max $500)' }, { status: 400 });
        }

        // Generate unique code with high entropy
        let code = generateGiftCardCode();
        let codeHash = hashGiftCardCode(code);
        let attempts = 0;

        // Check for uniqueness by hash
        while (await prisma.giftCard.findFirst({
            where: { OR: [{ code }, { codeHash }] }
        }) && attempts < 10) {
            code = generateGiftCardCode();
            codeHash = hashGiftCardCode(code);
            attempts++;
        }

        if (attempts >= 10) {
            return NextResponse.json({ error: 'Error generando código único' }, { status: 500 });
        }

        // Generate secure PIN and hash it
        const plainPin = generateSecurePin();
        const hashedPin = hashPin(plainPin);

        // Validate designId if provided
        let validDesignId = null;
        if (designId) {
            const designExists = await prisma.giftCardDesign.findUnique({
                where: { id: designId }
            });
            if (designExists) {
                validDesignId = designId;
            }
        }

        // Create gift card with security enhancements
        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                codeHash,
                codeLast4: getCodeLastFour(code),
                pin: hashedPin, // Store hashed PIN
                amountUSD,
                balanceUSD: amountUSD,
                status: 'ACTIVE',
                designId: validDesignId,
                purchasedBy: session?.user?.id || null,
                purchasedAt: new Date(),
                orderId,
                recipientName: isGiftCard ? recipientName : null,
                recipientEmail: isGiftCard ? recipientEmail : null,
                senderName: isGiftCard ? senderName : null,
                personalMessage: isGiftCard ? personalMessage : null,
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

        // Send email to recipient if it's a gift
        if (isGift && recipientEmail) {
            try {
                await sendGiftCardEmail(recipientEmail, {
                    code: giftCard.code,
                    pin: plainPin, // Send the plain PIN, not the hash
                    amount: amountUSD,
                    senderName: senderName || session?.user?.name || 'Un amigo',
                    recipientName: recipientName || 'Amigo/a',
                    personalMessage: personalMessage || undefined,
                    designName: giftCard.design?.name || undefined,
                });
                console.log('[GIFT CARD] Email sent to recipient:', recipientEmail);
            } catch (emailError) {
                console.error('[GIFT CARD] Failed to send email to recipient:', emailError);
                // Don't fail the request if email fails - gift card is still created
            }
        }

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
