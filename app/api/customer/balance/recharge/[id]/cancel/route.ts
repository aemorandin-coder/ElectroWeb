import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/customer/balance/recharge/[id]/cancel
 * Cancela una transacción de recarga pendiente
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { id: transactionId } = await params;
        const userId = (session.user as any).id;

        // Find the transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { balance: true },
        });

        if (!transaction) {
            return NextResponse.json(
                { error: 'Transacción no encontrada' },
                { status: 404 }
            );
        }

        // Verify the transaction belongs to the user
        if (transaction.balance.userId !== userId) {
            return NextResponse.json(
                { error: 'No autorizado para cancelar esta transacción' },
                { status: 403 }
            );
        }

        // Only allow cancelling PENDING transactions
        if (transaction.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Solo se pueden cancelar transacciones pendientes' },
                { status: 400 }
            );
        }

        // Update transaction status to CANCELLED
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'CANCELLED',
                metadata: JSON.stringify({
                    ...JSON.parse(transaction.metadata || '{}'),
                    cancelledAt: new Date().toISOString(),
                    cancelledBy: 'USER',
                    reason: 'Modal cerrado sin completar verificación',
                }),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Transacción cancelada',
        });
    } catch (error) {
        console.error('Error cancelling transaction:', error);
        return NextResponse.json(
            { error: 'Error al cancelar la transacción' },
            { status: 500 }
        );
    }
}
