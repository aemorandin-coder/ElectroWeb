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
        profile: {
          include: {
            addresses: true,
          },
        },
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
          profileId: profile.id,
          isDefault: true,
        },
      });

      if (defaultAddress) {
        await prisma.address.update({
          where: { id: defaultAddress.id },
          data: {
            state: body.address.state || '',
            city: body.address.city || '',
            municipality: body.address.municipality || null,
            street: body.address.street || '',
            building: body.address.building || null,
            apartment: body.address.apartment || null,
            zipCode: body.address.zipCode || null,
            reference: body.address.reference || null,
          },
        });
      } else {
        await prisma.address.create({
          data: {
            profileId: profile.id,
            label: 'Principal',
            firstName: session.user.name?.split(' ')[0] || '',
            lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
            phone: body.phone || '',
            state: body.address.state || '',
            city: body.address.city || '',
            municipality: body.address.municipality || null,
            street: body.address.street || '',
            building: body.address.building || null,
            apartment: body.address.apartment || null,
            zipCode: body.address.zipCode || null,
            reference: body.address.reference || null,
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

