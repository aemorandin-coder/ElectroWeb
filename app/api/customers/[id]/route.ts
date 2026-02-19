import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

// GET - Get customer details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = id;

    if (!customerId) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      include: {
        profile: true,
        addresses: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalUSD: true,
            createdAt: true,
            items: {
              select: {
                productName: true,
                quantity: true,
                priceUSD: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Calculate stats
    const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.totalUSD || 0), 0);
    const orderCount = customer.orders.length;
    const activeOrders = customer.orders.filter((o) =>
      ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status)
    ).length;

    return NextResponse.json({
      ...customer,
      stats: {
        totalSpent,
        orderCount,
        activeOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = id;

    if (!customerId) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, whatsapp, customerType, companyName, taxId } = body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: customerId },
        },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Este email ya está en uso' }, { status: 400 });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: customerId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
      },
    });

    // Update or create profile
    // Update or create profile
    if (phone !== undefined || whatsapp !== undefined || customerType !== undefined || companyName !== undefined || taxId !== undefined || body.businessVerificationStatus !== undefined) {
      await prisma.profile.upsert({
        where: { userId: customerId },
        update: {
          ...(phone !== undefined && { phone }),
          ...(whatsapp !== undefined && { whatsapp }),
          ...(customerType !== undefined && { customerType }),
          ...(companyName !== undefined && { companyName }),
          ...(taxId !== undefined && { taxId }),
          ...(body.businessVerificationStatus !== undefined && {
            businessVerificationStatus: body.businessVerificationStatus,
            businessVerified: body.businessVerificationStatus === 'APPROVED',
            businessVerifiedAt: body.businessVerificationStatus === 'APPROVED' ? new Date() : null,
            businessVerificationNotes: body.businessVerificationNotes
          }),
        },
        create: {
          userId: customerId,
          phone: phone || null,
          whatsapp: whatsapp || null,
          customerType: customerType || 'PERSON',
          companyName: companyName || null,
          taxId: taxId || null,
        },
      });
    }

    return NextResponse.json({ message: 'Cliente actualizado exitosamente', user: updatedUser });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El email ya está en uso' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = id;

    if (!customerId) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

    // Check if customer has orders
    const ordersCount = await prisma.order.count({
      where: { userId: customerId },
    });

    if (ordersCount > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar un cliente con órdenes asociadas',
        hasOrders: true,
      }, { status: 400 });
    }

    // Delete customer (profile will be deleted via cascade)
    await prisma.user.delete({
      where: { id: customerId },
    });

    return NextResponse.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}

