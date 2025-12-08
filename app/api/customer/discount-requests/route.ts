import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List discount requests for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        const whereClause: any = {
            userId: (session.user as any).id,
        };

        if (productId) {
            whereClause.productId = productId;
        }

        const requests = await prisma.discountRequest.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });

        // Check for active (approved and not expired) discounts
        const activeDiscounts = requests.filter(r =>
            r.status === 'APPROVED' &&
            r.expiresAt &&
            new Date(r.expiresAt) > new Date()
        );

        return NextResponse.json({
            requests,
            activeDiscounts,
        });
    } catch (error) {
        console.error('Error fetching discount requests:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

// POST - Create a new discount request
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, productName, originalPrice, requestedDiscount, customerMessage } = body;

        // Validate discount range (1-5%)
        if (!requestedDiscount || requestedDiscount < 1 || requestedDiscount > 5) {
            return NextResponse.json({ error: 'El descuento debe ser entre 1% y 5%' }, { status: 400 });
        }

        // Check if there's already a pending request for this product
        const existingRequest = await prisma.discountRequest.findFirst({
            where: {
                userId: (session.user as any).id,
                productId,
                status: { in: ['PENDING', 'APPROVED'] },
            },
        });

        if (existingRequest) {
            if (existingRequest.status === 'PENDING') {
                return NextResponse.json({
                    error: 'Ya tienes una solicitud pendiente para este producto'
                }, { status: 400 });
            }
            if (existingRequest.status === 'APPROVED' && existingRequest.expiresAt && new Date(existingRequest.expiresAt) > new Date()) {
                return NextResponse.json({
                    error: 'Ya tienes un descuento activo para este producto'
                }, { status: 400 });
            }
        }

        // Create the discount request
        const discountRequest = await prisma.discountRequest.create({
            data: {
                userId: (session.user as any).id,
                productId,
                productName,
                originalPrice,
                requestedDiscount,
                customerMessage,
            },
        });

        // Create notification for all admins
        const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { id: true },
        });

        const userName = session.user.name || session.user.email;
        const discountAmount = (Number(originalPrice) * requestedDiscount / 100).toFixed(2);

        await prisma.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.id,
                type: 'DISCOUNT_REQUEST',
                title: 'Nueva Solicitud de Descuento',
                message: `${userName} solicita ${requestedDiscount}% de descuento ($${discountAmount}) en "${productName}"`,
                link: '/admin/discount-requests',
                icon: 'FiPercent',
            })),
        });

        // Create notification for the customer
        await prisma.notification.create({
            data: {
                userId: (session.user as any).id,
                type: 'DISCOUNT_REQUEST',
                title: 'Solicitud Enviada',
                message: `Tu solicitud de ${requestedDiscount}% de descuento para "${productName}" ha sido enviada. Te notificaremos cuando sea revisada.`,
                link: '/customer/wishlist',
                icon: 'FiPercent',
            },
        });

        return NextResponse.json({
            success: true,
            discountRequest,
            message: 'Solicitud enviada correctamente'
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating discount request:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
