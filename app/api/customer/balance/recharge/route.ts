import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { montoDecimal } from '@/lib/pricing';
import { notifyRechargeRequested } from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';

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
    const companyPaymentMethodId = typeof body?.companyPaymentMethodId === 'string' && body.companyPaymentMethodId.trim()
      ? body.companyPaymentMethodId.trim()
      : null;
    const reference = typeof body?.reference === 'string' ? body.reference.trim().slice(0, 60) : null;
    const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 200) : null;

    // Validate amount (C-73: antes "abc" o 1e9 llegaban a la base de datos)
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: 'Monto inválido (entre $1 y $10.000)' }, { status: 400 });
    }

    // El método se elige por id y tiene que estar activo (C-101): antes se aceptaba cualquier texto
    // y el mínimo y el máximo del método no se aplicaban.
    if (!companyPaymentMethodId) {
      return NextResponse.json({ error: 'Método de pago requerido' }, { status: 400 });
    }

    const companyMethod = await prisma.companyPaymentMethod.findUnique({
      where: { id: companyPaymentMethodId },
    });
    if (!companyMethod || !companyMethod.isActive) {
      return NextResponse.json({ error: 'El método de pago seleccionado no está disponible' }, { status: 400 });
    }
    if (companyMethod.minAmount !== null && amount < Number(companyMethod.minAmount)) {
      return NextResponse.json({
        error: `El monto mínimo para este método es ${formatUSD(Number(companyMethod.minAmount))}`,
      }, { status: 400 });
    }
    if (companyMethod.maxAmount !== null && amount > Number(companyMethod.maxAmount)) {
      return NextResponse.json({
        error: `El monto máximo para este método es ${formatUSD(Number(companyMethod.maxAmount))}`,
      }, { status: 400 });
    }

    const resolvedMethodName = companyMethod.name;

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
        amount: montoDecimal(amount), // texto exacto (C-96)
        currency: 'USD',
        description: description || `Recarga de saldo - ${resolvedMethodName}`,
        reference: reference || null,
        paymentMethod: companyMethod.type,
        companyPaymentMethodId: companyMethod.id,
        metadata: JSON.stringify({
          paymentMethod: companyMethod.type,
          companyPaymentMethodId: companyMethod.id,
          companyPaymentMethodName: resolvedMethodName,
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
          ['Método', resolvedMethodName],
          ['Referencia', reference || 'Sin referencia'],
          ['Correo', session.user.email || ''],
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
