import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/customer/payment-methods - Obtener todos los métodos de pago del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const paymentMethods = await prisma.savedPaymentMethod.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Error al obtener métodos de pago' }, { status: 500 });
  }
}

// POST /api/customer/payment-methods - Crear nuevo método de pago
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    const {
      type,
      name,
      bankName,
      accountNumber,
      accountType,
      holderName,
      holderId,
      phone,
      walletAddress,
      network,
      isDefault,
    } = body;

    // Validaciones
    if (!type || !name) {
      return NextResponse.json(
        { error: 'Tipo y nombre son requeridos' },
        { status: 400 }
      );
    }

    // Validar según el tipo
    if (type === 'BANK_TRANSFER' && (!bankName || !accountNumber || !holderName)) {
      return NextResponse.json(
        { error: 'Para transferencia bancaria: banco, número de cuenta y titular son requeridos' },
        { status: 400 }
      );
    }

    if (type === 'MOBILE_PAYMENT' && (!bankName || !phone || !holderId)) {
      return NextResponse.json(
        { error: 'Para pago móvil: banco, teléfono y cédula son requeridos' },
        { status: 400 }
      );
    }

    if (type === 'CRYPTO' && (!walletAddress || !network)) {
      return NextResponse.json(
        { error: 'Para criptomoneda: dirección de wallet y red son requeridos' },
        { status: 400 }
      );
    }

    // Si se marca como predeterminado, desmarcar los demás
    if (isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Crear el método de pago
    const paymentMethod = await prisma.savedPaymentMethod.create({
      data: {
        userId,
        type,
        name,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountType: accountType || null,
        holderName: holderName || null,
        holderId: holderId || null,
        phone: phone || null,
        walletAddress: walletAddress || null,
        network: network || null,
        isDefault: isDefault || false,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Método de pago creado exitosamente',
      paymentMethod,
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json({ error: 'Error al crear método de pago' }, { status: 500 });
  }
}

// PATCH /api/customer/payment-methods - Actualizar método de pago
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Verificar que el método de pago pertenece al usuario
    const existingMethod = await prisma.savedPaymentMethod.findFirst({
      where: { id, userId },
    });

    if (!existingMethod) {
      return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 });
    }

    // Si se marca como predeterminado, desmarcar los demás
    if (updates.isDefault === true) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Actualizar el método de pago
    const paymentMethod = await prisma.savedPaymentMethod.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      message: 'Método de pago actualizado exitosamente',
      paymentMethod,
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json({ error: 'Error al actualizar método de pago' }, { status: 500 });
  }
}

// DELETE /api/customer/payment-methods - Eliminar método de pago
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Verificar que el método de pago pertenece al usuario
    const existingMethod = await prisma.savedPaymentMethod.findFirst({
      where: { id, userId },
    });

    if (!existingMethod) {
      return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 });
    }

    // Eliminar el método de pago
    await prisma.savedPaymentMethod.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Método de pago eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json({ error: 'Error al eliminar método de pago' }, { status: 500 });
  }
}