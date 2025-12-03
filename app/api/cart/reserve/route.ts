import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reserveStock } from '@/lib/stock';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { items } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
        }

        // Reserve stock
        const expiresAt = await reserveStock(session.user.id, items);

        return NextResponse.json({
            success: true,
            expiresAt,
            message: 'Stock reservado por 15 minutos'
        });
    } catch (error: any) {
        console.error('Error reserving stock:', error);
        return NextResponse.json({
            error: error.message || 'Error al reservar stock'
        }, { status: 400 });
    }
}
