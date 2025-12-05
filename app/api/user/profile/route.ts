import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      profile: user.profile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Update user name
    if (body.name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: body.name },
      });
    }

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        customerType: body.customerType || 'PERSON',
        companyName: body.companyName || null,
        taxId: body.taxId || null,
      },
      create: {
        userId: session.user.id,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        customerType: body.customerType || 'PERSON',
        companyName: body.companyName || null,
        taxId: body.taxId || null,
      },
    });

    // Update or create default address
    if (body.address) {
      const defaultAddress = await prisma.address.findFirst({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
      });

      if (defaultAddress) {
        await prisma.address.update({
          where: { id: defaultAddress.id },
          data: {
            state: body.address.state || defaultAddress.state,
            city: body.address.city || defaultAddress.city,
            street: body.address.street || defaultAddress.street,
            zipCode: body.address.zipCode || defaultAddress.zipCode,
          },
        });
      } else if (body.address.street && body.address.city && body.address.state) {
        await prisma.address.create({
          data: {
            userId: session.user.id,
            name: session.user.name || 'Principal',
            phone: body.phone || '',
            state: body.address.state,
            city: body.address.city,
            street: body.address.street,
            zipCode: body.address.zipCode || '',
            country: 'Venezuela',
            isDefault: true,
          },
        });
      }
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}

