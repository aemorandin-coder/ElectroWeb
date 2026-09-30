import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/customer/profile - Get customer profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    // Return profile data in the format expected by the frontend
    return NextResponse.json({
      name: user.name || '',
      email: user.email || '',
      phone: user.profile?.phone || '',
      bio: '', // Not in schema yet, but frontend expects it
      birthdate: '', // Not in schema yet, but frontend expects it
      gender: '', // Not in schema yet, but frontend expects it
      image: user.image || '',
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { error: 'Error al obtener perfil' },
      { status: 500 }
    );
  }
}

// C-130: sin PATCH. Guardaba nombre y teléfono sin validar (se saltaba las reglas de C-84) y la tienda no lo usa:
// el perfil se edita con PATCH /api/user/profile.
