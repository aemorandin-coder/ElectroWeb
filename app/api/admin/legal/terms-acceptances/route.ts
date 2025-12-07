import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

// GET - Get all terms acceptances for admin
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { userName: { contains: search } },
                { userEmail: { contains: search } },
                { userIdNumber: { contains: search } },
            ];
        }

        const [acceptances, total] = await Promise.all([
            prisma.balanceTermsAcceptance.findMany({
                where,
                orderBy: { acceptedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.balanceTermsAcceptance.count({ where }),
        ]);

        return NextResponse.json({
            acceptances,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching terms acceptances:', error);
        return NextResponse.json({ error: 'Error al obtener aceptaciones' }, { status: 500 });
    }
}
