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

/** Tiempo para crear la gift card después de descontar el saldo (la página tarda ~6 s entre ambos pasos). */
const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

class PaymentAlreadyUsedError extends Error {}

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

            // SEGURIDAD (C-70): sin `pin` ni `codeHash`; el PIN tiene 4 dígitos y su hash se descifra al instante
            const giftCards = await prisma.giftCard.findMany({
                omit: { pin: true, codeHash: true },
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

        // SEGURIDAD (C-70): lista blanca. El código completo solo lo ve quien la recibió;
        // quien la compró para otra persona ve los últimos 4 (antes veía código y hash del PIN y podía canjearla)
        return NextResponse.json(giftCards.map((card) => {
            const isRecipient = !card.recipientEmail || card.recipientEmail === session.user.email;
            return {
                id: card.id,
                code: isRecipient ? card.code : null,
                codeLast4: card.codeLast4 ?? card.code.slice(-4),
                amountUSD: card.amountUSD,
                balanceUSD: card.balanceUSD,
                status: card.status,
                design: card.design,
                purchasedAt: card.purchasedAt,
                recipientName: card.recipientName,
                recipientEmail: card.recipientEmail,
                senderName: card.senderName,
                personalMessage: card.personalMessage,
                createdAt: card.createdAt,
            };
        }));

    } catch (error) {
        console.error('Error fetching gift cards:', error);
        return NextResponse.json({ error: 'Error al obtener gift cards' }, { status: 500 });
    }
}

// POST - Create a new gift card (purchase or admin generation)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
        }
        const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const body = await request.json();

        // Support both field naming conventions for backwards compatibility
        const amountUSD = Math.round(Number(body.amountUSD || body.amount) * 100) / 100;
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

        // Auto-detect if it's a gift when recipient email is provided (la compra de un cliente siempre es para un destinatario)
        const isGiftCard = !isAdmin || (isGift ?? !!recipientEmail);

        // Validate amount
        if (!Number.isFinite(amountUSD) || amountUSD < 5 || amountUSD > 500) {
            return NextResponse.json({ error: 'Monto inválido (min $5, max $500)' }, { status: 400 });
        }

        // SEGURIDAD (C-70): un cliente solo recibe una gift card si ya pagó su monto con saldo.
        // La página de Gift Cards descuenta el saldo (/api/customer/balance/deduct) y luego llama aquí:
        // se busca ese pago reciente, sin usar, y se marca como usado en la misma transacción que crea la tarjeta.
        let payment: { id: string } | null = null;
        if (!isAdmin) {
            if (!recipientEmail || typeof recipientEmail !== 'string') {
                return NextResponse.json({ error: 'Indica el correo de quien recibe la gift card' }, { status: 400 });
            }
            payment = await prisma.transaction.findFirst({
                where: {
                    balance: { userId: session.user.id },
                    type: 'PURCHASE',
                    status: 'COMPLETED',
                    amount: amountUSD,
                    metadata: null,
                    description: { startsWith: 'Gift Card' },
                    createdAt: { gte: new Date(Date.now() - PAYMENT_WINDOW_MS) },
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true },
            });
            if (!payment) {
                return NextResponse.json({ error: 'No encontramos el pago con saldo de esta gift card' }, { status: 402 });
            }
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
        const giftCard = await prisma.$transaction(async (tx) => {
            const created = await tx.giftCard.create({
                data: {
                    code,
                    codeHash,
                    codeLast4: getCodeLastFour(code),
                    pin: hashedPin, // Store hashed PIN
                    amountUSD,
                    balanceUSD: amountUSD,
                    status: 'ACTIVE',
                    designId: validDesignId,
                    purchasedBy: session.user.id,
                    purchasedAt: new Date(),
                    orderId: isAdmin ? orderId : null,
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

            if (payment) {
                // Marca el pago como usado: si otra petición ya lo usó, no se crea nada
                const claimed = await tx.transaction.updateMany({
                    where: { id: payment.id, metadata: null },
                    data: { metadata: JSON.stringify({ giftCardId: created.id }) },
                });
                if (claimed.count !== 1) throw new PaymentAlreadyUsedError();
            }

            return created;
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

        // Send email to recipient if it's a gift (antes exigía isGift, que la página no envía: el PIN nunca llegaba)
        if (isGiftCard && recipientEmail) {
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
            } catch (emailError) {
                console.error('[GIFT CARD] Failed to send email to recipient:', emailError);
                // Don't fail the request if email fails - gift card is still created
            }
        }

        return NextResponse.json({
            success: true,
            giftCard: {
                id: giftCard.id,
                // El cliente no necesita el código: le llega a quien la recibe, junto con el PIN
                code: isAdmin ? giftCard.code : null,
                amountUSD: giftCard.amountUSD,
                status: giftCard.status,
                design: giftCard.design
            }
        });

    } catch (error) {
        if (error instanceof PaymentAlreadyUsedError) {
            return NextResponse.json({ error: 'Ese pago ya se usó para otra gift card' }, { status: 409 });
        }
        console.error('Error creating gift card:', error);
        return NextResponse.json({ error: 'Error al crear gift card' }, { status: 500 });
    }
}
