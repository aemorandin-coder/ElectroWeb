import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import { createNotification } from '@/lib/notifications';

// GET - Get all product requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // SEGURIDAD: incluye nombre, correo y teléfono de los clientes; solo para el admin
    // (Solicitudes usa MANAGE_PRODUCTS y Mensajes y Alertas MANAGE_CONTENT)
    if (!isAuthorized(session, 'MANAGE_PRODUCTS') && !isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    const requests = await prisma.productRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching product requests:', error);
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 });
  }
}

// POST - Create new product request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // El dueño de la solicitud sale de la sesión (si hay), nunca del body
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const productRequest = await prisma.productRequest.create({
      data: {
        userId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        productName: body.productName,
        description: body.description,
        category: body.category,
        estimatedBudget: body.estimatedBudget ? parseFloat(body.estimatedBudget) : null,
        status: 'PENDING',
      },
    });

    // Create notification for new product request (if user is logged in)
    if (userId) {
      await createNotification({
        userId,
        type: 'SYSTEM_UPDATE',
        title: '📝 Solicitud de Producto Recibida',
        message: `Tu solicitud para "${body.productName}" ha sido recibida. Te notificaremos cuando tengamos novedades.`,
        link: `/customer`,
        icon: '📝',
      });
    }

    return NextResponse.json(productRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating product request:', error);
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 });
  }
}

// PATCH - Update product request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await request.json();

    const productRequest = await prisma.productRequest.update({
      where: { id },
      data: {
        status: body.status,
        adminNotes: body.adminNotes,
      },
    });

    return NextResponse.json(productRequest);
  } catch (error) {
    console.error('Error updating product request:', error);
    return NextResponse.json({ error: 'Error al actualizar solicitud' }, { status: 500 });
  }
}

// DELETE - Delete product request
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.productRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product request:', error);
    return NextResponse.json({ error: 'Error al eliminar solicitud' }, { status: 500 });
  }
}
