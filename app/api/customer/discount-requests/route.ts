import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// GET - List discount requests for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        const whereClause: Prisma.DiscountRequestWhereInput = {
            userId: (session.user as { id: string }).id,
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

// POST - Pedir un descuento: cerrado desde C-102 (decisión de Andrés, 25/09).
// La tienda crea ofertas y cupones; los descuentos ya aprobados se siguen respetando en el checkout hasta que venzan.
export async function POST() {
    return NextResponse.json(
        { error: 'Ya no se piden descuentos: mira las ofertas y cupones de la tienda.' },
        { status: 410 }
    );
}
