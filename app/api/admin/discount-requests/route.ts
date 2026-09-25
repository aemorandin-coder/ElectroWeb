import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { formatUSD } from '@/lib/currency';

// GET - List all discount requests for admin
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as { role?: string } | undefined)?.role;
        if (!session || !userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const whereClause: Prisma.DiscountRequestWhereInput = {};
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
        const userRole = (session?.user as { role?: string } | undefined)?.role;
        if (!session || !userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
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

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
        }
        const respuesta = typeof adminResponse === 'string' ? adminResponse.trim().slice(0, 500) || null : null;

        // C-102: valores acotados. Antes se aceptaba cualquier número (un 150% dejaba el producto gratis)
        const updateData: Prisma.DiscountRequestUpdateInput = { adminResponse: respuesta };
        let hours = 24;
        if (action === 'approve') {
            const discountVal = Number(approvedDiscount ?? discountRequest.requestedDiscount);
            hours = expirationHours === undefined || expirationHours === null ? 24 : Number(expirationHours);
            if (!Number.isInteger(discountVal) || discountVal < 1 || discountVal > 50) {
                return NextResponse.json({ error: 'El descuento aprobado debe ser un entero entre 1% y 50%' }, { status: 400 });
            }
            if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
                return NextResponse.json({ error: 'La vigencia va de 1 hora a 30 días' }, { status: 400 });
            }
            updateData.status = 'APPROVED';
            updateData.approvedDiscount = discountVal;
            updateData.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        } else {
            updateData.status = 'REJECTED';
        }

        // Cambio condicional: dos clics (o dos admins a la vez) ya no la aprueban dos veces ni mandan dos avisos
        const claimed = await prisma.discountRequest.updateMany({
            where: { id: requestId, status: 'PENDING' },
            data: updateData as Prisma.DiscountRequestUpdateManyMutationInput,
        });
        if (claimed.count !== 1) {
            return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 409 });
        }
        const updated = await prisma.discountRequest.findUniqueOrThrow({ where: { id: requestId } });

        if (updated.status === 'APPROVED') {
            const discountAmount = Number(discountRequest.originalPrice) * Number(updated.approvedDiscount) / 100;
            await prisma.notification.create({
                data: {
                    userId: discountRequest.userId,
                    type: 'DISCOUNT_APPROVED',
                    title: 'Descuento aprobado',
                    message: `Tu descuento de ${updated.approvedDiscount}% (${formatUSD(discountAmount)}) para "${discountRequest.productName}" fue aprobado. Tienes ${hours} horas para usarlo.`,
                    link: `/productos/${discountRequest.productId}`,
                    icon: 'FiCheckCircle',
                },
            });
        } else {
            await prisma.notification.create({
                data: {
                    userId: discountRequest.userId,
                    type: 'DISCOUNT_REJECTED',
                    title: 'Solicitud de descuento',
                    message: `Tu solicitud de descuento para "${discountRequest.productName}" no pudo ser aprobada${respuesta ? `: ${respuesta}` : '.'}`,
                    link: '/customer/wishlist',
                    icon: 'FiXCircle',
                },
            });
        }

        if (updated.status === 'APPROVED' || updated.status === 'REJECTED') {
            await registrarAccionAdmin(session, updated.status === 'APPROVED' ? 'DISCOUNT_REQUEST_APPROVED' : 'DISCOUNT_REQUEST_REJECTED', { type: 'DISCOUNT_REQUEST', id: requestId }, {
                producto: discountRequest.productName,
                cliente: discountRequest.user.email,
                precio: Number(discountRequest.originalPrice),
                ...(updated.status === 'APPROVED' ? { descuento: Number(updated.approvedDiscount), vence: updated.expiresAt } : {}),
            }, request);
        }

        return NextResponse.json({
            success: true,
            discountRequest: updated,
        });
    } catch (error) {
        console.error('Error updating discount request:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
