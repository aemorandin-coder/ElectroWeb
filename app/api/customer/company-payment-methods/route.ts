import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const methods = await prisma.companyPaymentMethod.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(methods);
    } catch (error) {
        console.error('Error fetching company payment methods:', error);
        return NextResponse.json({ error: 'Error al obtener métodos de pago de la empresa' }, { status: 500 });
    }
}
