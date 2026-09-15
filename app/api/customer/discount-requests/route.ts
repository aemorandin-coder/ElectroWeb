import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';

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

        const body = await request.json().catch(() => null);
        const productId = typeof body?.productId === 'string' ? body.productId : '';
        const requestedDiscount = Number(body?.requestedDiscount);
        const customerMessage = typeof body?.customerMessage === 'string' ? body.customerMessage.trim().slice(0, 500) || null : null;

        // Validate discount range (1-5%)
        if (!Number.isInteger(requestedDiscount) || requestedDiscount < 1 || requestedDiscount > 5) {
            return NextResponse.json({ error: 'El descuento debe ser entre 1% y 5%' }, { status: 400 });
        }

        // SEGURIDAD (C-73): nombre y precio salen de la base de datos. Antes llegaban del navegador y el
        // admin veía (y aprobaba) un producto y un precio escritos por el cliente.
        const product = productId
            ? await prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED' }, select: { name: true, priceUSD: true } })
            : null;
        if (!product) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }
        const productName = product.name;
        const originalPrice = product.priceUSD;

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

        const userName = session.user.name || session.user.email || 'Un cliente';
        const discountAmount = Number(originalPrice) * requestedDiscount / 100;
        emitAdminEvent({
            type: 'DISCOUNT_REQUESTED',
            title: `Solicitud de descuento · ${productName}`.slice(0, 150),
            summary: `${userName} pide ${requestedDiscount}% de descuento`,
            fields: [
                ['Producto', productName],
                ['Precio', formatUSD(Number(originalPrice))],
                ['Descuento', `${requestedDiscount}% (${formatUSD(discountAmount)})`],
                ['Mensaje', customerMessage],
            ],
            link: '/admin/discount-requests',
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
