import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyRechargeRequested } from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';
import { formatPaymentMethod } from '@/lib/format-helpers';

// Crear solicitud de recarga de saldo (requiere aprobación del admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const userName = session.user.name || session.user.email || 'Usuario';
    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    const paymentMethod = typeof body?.paymentMethod === 'string' ? body.paymentMethod.slice(0, 40) : '';
    const reference = typeof body?.reference === 'string' ? body.reference.trim().slice(0, 60) : null;
    const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 200) : null;

    // Validate amount (C-73: antes "abc" o 1e9 llegaban a la base de datos)
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: 'Monto inválido (entre $1 y $10.000)' }, { status: 400 });
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
        amount: amount,
        currency: 'USD',
        description: description || `Recarga de saldo - ${formatPaymentMethod(paymentMethod)}`,
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
      await notifyRechargeRequested(userId, amount);
      // Aviso al equipo (C-73)
      emitAdminEvent({
        type: 'RECHARGE_REQUESTED',
        title: `Recarga por aprobar · ${formatUSD(amount)}`,
        summary: `${userName} pidió recargar saldo`,
        fields: [
          ['Monto', formatUSD(amount)],
          ['Método', formatPaymentMethod(paymentMethod)],
          ['Referencia', reference],
          ['Correo', session.user.email],
        ],
        link: '/admin/transactions',
      });
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
