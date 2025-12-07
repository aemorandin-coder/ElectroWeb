import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

// GET - Get specific terms acceptance by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const acceptance = await prisma.balanceTermsAcceptance.findUnique({
            where: { id: params.id },
        });

        if (!acceptance) {
            return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
        }

        return NextResponse.json(acceptance);
    } catch (error) {
        console.error('Error fetching terms acceptance:', error);
        return NextResponse.json({ error: 'Error al obtener documento' }, { status: 500 });
    }
}
