import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { leerMetadata } from '@/lib/pago-movil/recarga';

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
        const userId = (session.user as { id: string }).id;

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

        // Only allow cancelling PENDING transactions (y solo recargas: antes servía con cualquier transacción pendiente)
        if (transaction.status !== 'PENDING' || transaction.type !== 'RECHARGE') {
            return NextResponse.json(
                { error: 'Solo se pueden cancelar transacciones pendientes' },
                { status: 400 }
            );
        }

        // S-06: con un Pago Móvil ya verificado, la recarga espera la revisión del equipo. Cancelarla dejaría el dinero
        // recibido sin recarga y fuera de la cola del panel
        const pagoVerificado = await prisma.pagoMovilVerificacion.findFirst({
            where: { transactionId, verificado: true },
            select: { id: true },
        });
        if (pagoVerificado) {
            return NextResponse.json(
                { error: 'Esta recarga ya tiene un pago verificado y la estamos revisando: no se puede cancelar.' },
                { status: 409 }
            );
        }

        // Update transaction status to CANCELLED
        // Condicional (C-72): si se aprobó en el mismo instante, no se marca cancelada una recarga ya acreditada
        const cancelled = await prisma.transaction.updateMany({
            where: { id: transactionId, status: 'PENDING' },
            data: {
                status: 'CANCELLED',
                metadata: JSON.stringify({
                    ...leerMetadata(transaction.metadata),
                    cancelledAt: new Date().toISOString(),
                    cancelledBy: 'USER',
                    reason: 'Modal cerrado sin completar verificación',
                }),
            },
        });

        if (cancelled.count !== 1) {
            return NextResponse.json(
                { error: 'Solo se pueden cancelar transacciones pendientes' },
                { status: 400 }
            );
        }

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
