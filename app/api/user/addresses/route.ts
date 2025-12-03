import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/addresses - Get all addresses for logged user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ addresses: [] });
    }

    return NextResponse.json({ addresses: profile.addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { error: 'Error al obtener direcciones' },
      { status: 500 }
    );
  }
}

// POST /api/user/addresses - Create new address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      label,
      firstName,
      lastName,
      phone,
      state,
      city,
      municipality,
      parish,
      street,
      building,
      apartment,
      zipCode,
      reference,
      isDefault,
    } = body;

    // Validate required fields
    if (!label || !firstName || !lastName || !phone || !state || !city || !street) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: label, firstName, lastName, phone, state, city, street' },
        { status: 400 }
      );
    }

    // Get or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {},
      create: {
        userId: session.user.id,
        customerType: 'PERSON',
      },
    });

    // If this should be default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { profileId: profile.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        profileId: profile.id,
        label,
        firstName,
        lastName,
        phone,
        state,
        city,
        municipality,
        parish,
        street,
        building,
        apartment,
        zipCode,
        reference,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Error al crear dirección' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/addresses - Update address
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de dirección es requerido' },
        { status: 400 }
      );
    }

    // Verify address belongs to user
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { addresses: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    const addressBelongsToUser = profile.addresses.some(addr => addr.id === id);
    if (!addressBelongsToUser) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta dirección' },
        { status: 403 }
      );
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault === true) {
      await prisma.address.updateMany({
        where: { profileId: profile.id, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Error al actualizar dirección' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/addresses - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de dirección es requerido' },
        { status: 400 }
      );
    }

    // Verify address belongs to user
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { addresses: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    const addressBelongsToUser = profile.addresses.some(addr => addr.id === id);
    if (!addressBelongsToUser) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta dirección' },
        { status: 403 }
      );
    }

    await prisma.address.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Dirección eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Error al eliminar dirección' },
      { status: 500 }
    );
  }
}
