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

    // Update user name and image
    const userUpdateData: any = {};
    if (body.name) {
      userUpdateData.name = body.name;
    }
    if (body.image !== undefined) {
      userUpdateData.image = body.image;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdateData,
      });
    }

    // Extract profile data from body or body.profile
    const profileData = body.profile || body;

    // Prepare profile update data
    const profileUpdateData: any = {};

    if (profileData.phone !== undefined) profileUpdateData.phone = profileData.phone || null;
    if (profileData.whatsapp !== undefined) profileUpdateData.whatsapp = profileData.whatsapp || null;
    if (profileData.idNumber !== undefined) profileUpdateData.idNumber = profileData.idNumber || null;
    if (profileData.bio !== undefined) profileUpdateData.bio = profileData.bio || null;
    if (profileData.birthdate !== undefined) profileUpdateData.birthdate = profileData.birthdate || null;
    if (profileData.gender !== undefined) profileUpdateData.gender = profileData.gender || null;
    if (profileData.avatar !== undefined) profileUpdateData.avatar = profileData.avatar || null;
    if (profileData.city !== undefined) profileUpdateData.city = profileData.city || null;
    if (profileData.state !== undefined) profileUpdateData.state = profileData.state || null;
    if (profileData.country !== undefined) profileUpdateData.country = profileData.country || 'Venezuela';
    if (profileData.customerType !== undefined) profileUpdateData.customerType = profileData.customerType || 'PERSON';
    if (profileData.companyName !== undefined) profileUpdateData.companyName = profileData.companyName || null;
    if (profileData.taxId !== undefined) profileUpdateData.taxId = profileData.taxId || null;

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: profileUpdateData,
      create: {
        userId: session.user.id,
        ...profileUpdateData,
      },
    });

    // Update or create default address if provided
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
            phone: profileData.phone || '',
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

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar perfil'
    }, { status: 500 });
  }
}

