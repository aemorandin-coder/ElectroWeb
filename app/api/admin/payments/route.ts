import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { validateAndSanitizePaymentMethod } from '@/lib/validations/payment-methods';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const methods = await prisma.companyPaymentMethod.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json(methods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Error al obtener métodos de pago' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 });
    }

    const validation = validateAndSanitizePaymentMethod(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const method = await prisma.companyPaymentMethod.create({
      data: validation.data
    });

    revalidateStorefront();
    return NextResponse.json(method, { status: 201 });
  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json({ error: 'Error al crear método de pago' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { id, ...data } = body;

    // Caso 1: Toggle rápido de activación/desactivación
    if (Object.keys(data).length === 1 && typeof data.isActive === 'boolean') {
      const updated = await prisma.companyPaymentMethod.update({
        where: { id },
        data: { isActive: data.isActive }
      });
      revalidateStorefront();
      return NextResponse.json(updated);
    }

    // Caso 2: Actualización de orden de visualización
    if (Object.keys(data).length === 1 && typeof data.sortOrder === 'number') {
      const updated = await prisma.companyPaymentMethod.update({
        where: { id },
        data: { sortOrder: data.sortOrder }
      });
      revalidateStorefront();
      return NextResponse.json(updated);
    }

    // Caso 3: Edición completa del método con validación y saneamiento por tipo
    const validation = validateAndSanitizePaymentMethod({ ...data, id });
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updated = await prisma.companyPaymentMethod.update({
      where: { id },
      data: validation.data
    });

    revalidateStorefront();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json({ error: 'Error al actualizar método de pago' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.companyPaymentMethod.delete({
      where: { id }
    });

    revalidateStorefront();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json({ error: 'Error al eliminar método de pago' }, { status: 500 });
  }
}
