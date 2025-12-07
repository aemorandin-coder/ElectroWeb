import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyRechargeRequested, notifyAdminsNewRecharge } from '@/lib/notifications';

// Crear solicitud de recarga de saldo (requiere aprobación del admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || session.user.email || 'Usuario';
    const { amount, paymentMethod, reference, description } = await req.json();

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Método de pago requerido' }, { status: 400 });
    }

    // Get or create user balance
    let userBalance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!userBalance) {
      userBalance = await prisma.userBalance.create({
        data: {
          userId,
          balance: 0,
          currency: 'USD',
          totalRecharges: 0,
          totalSpent: 0,
        },
      });
    }

    // Create transaction as PENDING (requiere aprobación del admin)
    const transaction = await prisma.transaction.create({
      data: {
        balanceId: userBalance.id,
        type: 'RECHARGE',
        status: 'PENDING',
        amount: parseFloat(amount),
        currency: 'USD',
        description: description || `Recarga de saldo - ${paymentMethod}`,
        reference: reference || null,
        paymentMethod,
        metadata: JSON.stringify({
          paymentMethod,
          reference,
          requestedAt: new Date().toISOString(),
        }),
      },
    });

    // Send notifications
    try {
      // Notify customer
      await notifyRechargeRequested(userId, parseFloat(amount));
      // Notify all admins
      await notifyAdminsNewRecharge(userName, parseFloat(amount));
    } catch (notifError) {
      console.error('Error sending notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de recarga creada exitosamente. Pendiente de aprobación del administrador.',
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating recharge request:', error);
    return NextResponse.json({ error: 'Error al crear la solicitud de recarga' }, { status: 500 });
  }
}
