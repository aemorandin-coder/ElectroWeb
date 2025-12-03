import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/customer/transactions - Obtener historial de transacciones
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);

    // Paginación
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filtros
    const type = searchParams.get('type'); // RECHARGE, PURCHASE, REFUND, etc.
    const status = searchParams.get('status'); // PENDING, COMPLETED, FAILED, CANCELLED

    // Obtener el balance del usuario
    const userBalance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!userBalance) {
      return NextResponse.json({
        transactions: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    // Construir filtros
    const where: any = {
      balanceId: userBalance.id,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    // Obtener transacciones con paginación
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}