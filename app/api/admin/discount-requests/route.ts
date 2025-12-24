import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List all discount requests for admin
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const whereClause: any = {};
        if (status && status !== 'all') {
            whereClause.status = status;
        }

        const requests = await prisma.discountRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get stats
        const stats = await prisma.discountRequest.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        return NextResponse.json({
            requests,
            stats: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {}),
        });
    } catch (error) {
        console.error('Error fetching discount requests:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

// PATCH - Approve or reject a discount request
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { requestId, action, approvedDiscount, adminResponse, expirationHours } = body;

        if (!requestId || !action) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const discountRequest = await prisma.discountRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (!discountRequest) {
            return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
        }

        if (discountRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 400 });
        }

        let updateData: any = {
            adminResponse,
        };

        if (action === 'approve') {
            const hours = expirationHours || 24; // Default 24 hours
            updateData.status = 'APPROVED';
            updateData.approvedDiscount = approvedDiscount || discountRequest.requestedDiscount;
            updateData.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

            // Notify customer of approval
            const discountAmount = (Number(discountRequest.originalPrice) * updateData.approvedDiscount / 100).toFixed(2);
            await prisma.notification.create({
                data: {
                    userId: discountRequest.userId,
                    type: 'DISCOUNT_APPROVED',
                    title: '¡Descuento Aprobado!',
                    message: `Tu descuento de ${updateData.approvedDiscount}% ($${discountAmount}) para "${discountRequest.productName}" ha sido aprobado. Tienes ${hours} horas para usarlo.`,
                    link: `/productos/${discountRequest.productId}`,
                    icon: 'FiCheckCircle',
                },
            });
        } else if (action === 'reject') {
            updateData.status = 'REJECTED';

            // Notify customer of rejection
            await prisma.notification.create({
                data: {
                    userId: discountRequest.userId,
                    type: 'DISCOUNT_REJECTED',
                    title: 'Solicitud de Descuento',
                    message: `Tu solicitud de descuento para "${discountRequest.productName}" no pudo ser aprobada${adminResponse ? `: ${adminResponse}` : '.'}`,
                    link: '/customer/wishlist',
                    icon: 'FiXCircle',
                },
            });
        }

        const updated = await prisma.discountRequest.update({
            where: { id: requestId },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            discountRequest: updated,
        });
    } catch (error) {
        console.error('Error updating discount request:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
