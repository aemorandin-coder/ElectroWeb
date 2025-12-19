import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get digital codes for a specific order
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
        }

        // Verify user owns this order or is admin
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                productType: true,
                                digitalPlatform: true,
                                digitalRegion: true,
                                mainImage: true,
                                redemptionInstructions: true,
                            } as any
                        }
                    }
                }
            }
        }) as any;

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const isOwner = order.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Get digital codes for this order
        const digitalCodes = await prisma.digitalCode.findMany({
            where: { orderId },
            select: {
                id: true,
                code: true,
                status: true,
                productId: true,
                deliveredAt: true,
                soldAt: true,
                notes: true,
                product: {
                    select: {
                        name: true,
                        digitalPlatform: true,
                        digitalRegion: true,
                        mainImage: true,
                    }
                }
            }
        });

        // Filter sensitive data based on permissions
        const filteredCodes = digitalCodes.map(dc => ({
            ...dc,
            code: (isOwner || isAdmin) ? dc.code : '****',
            notes: isAdmin ? dc.notes : null,
        }));

        // Map digital items from order
        const digitalItems = order.items.filter((item: any) => item.product.productType === 'DIGITAL').map((item: any) => ({
            orderItemId: item.id,
            productId: item.productId,
            productName: item.productName || item.product.name,
            platform: item.product.digitalPlatform,
            region: item.product.digitalRegion,
            image: item.productImage || item.product.mainImage,
            quantity: item.quantity,
            codes: filteredCodes.filter(dc => dc.productId === item.productId),
            redemptionInstructions: item.product.redemptionInstructions || null,
        }));

        return NextResponse.json({
            orderId,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            digitalItems,
            isDelivered: filteredCodes.every(dc => dc.status === 'DELIVERED'),
        });
    } catch (error) {
        console.error('Error fetching digital codes:', error);
        return NextResponse.json({ error: 'Error al obtener códigos' }, { status: 500 });
    }
}

// POST - Admin sends digital code to customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, productId, code, notes } = body;

        if (!orderId || !productId || !code) {
            return NextResponse.json({
                error: 'Faltan campos requeridos: orderId, productId, code'
            }, { status: 400 });
        }

        // Verify order exists and is paid
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: {
                    where: { productId },
                    include: {
                        product: {
                            select: {
                                name: true,
                                productType: true,
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        if (order.paymentStatus !== 'PAID') {
            return NextResponse.json({
                error: 'La orden no está pagada'
            }, { status: 400 });
        }

        const orderItem = order.items[0];
        if (!orderItem || orderItem.product.productType !== 'DIGITAL') {
            return NextResponse.json({
                error: 'Producto no encontrado o no es digital'
            }, { status: 400 });
        }

        // Create or update digital code
        const digitalCode = await prisma.digitalCode.create({
            data: {
                productId,
                code,
                status: 'DELIVERED',
                orderId,
                orderItemId: orderItem.id,
                soldAt: new Date(),
                deliveredAt: new Date(),
                addedBy: session.user.email || session.user.id,
                notes,
            }
        });

        // Create notification for customer
        if (order.userId) {
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    type: 'ORDER',
                    title: '🎮 ¡Tu código digital está listo!',
                    message: `El código de ${orderItem.product.name} ya está disponible en tu cuenta.`,
                    link: `/customer/orders/${orderId}/digital`,
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Código digital enviado exitosamente',
            digitalCode: {
                id: digitalCode.id,
                status: digitalCode.status,
                deliveredAt: digitalCode.deliveredAt,
            }
        });
    } catch (error) {
        console.error('Error sending digital code:', error);
        return NextResponse.json({ error: 'Error al enviar código' }, { status: 500 });
    }
}
