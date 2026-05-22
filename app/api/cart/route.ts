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

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { savedCart: true }
    });

    if (!profile || !profile.savedCart) {
      return NextResponse.json({ cartItems: [] });
    }

    try {
      const cartItems = JSON.parse(profile.savedCart);
      return NextResponse.json({ cartItems });
    } catch (e) {
      console.error('Error parsing saved cart JSON:', e);
      return NextResponse.json({ cartItems: [] });
    }
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    let cartItems = [];
    if (Array.isArray(body)) {
      cartItems = body;
    } else if (body && Array.isArray(body.cartItems)) {
      cartItems = body.cartItems;
    } else {
      return NextResponse.json({ error: 'Formato de datos no válido' }, { status: 400 });
    }

    // Save as JSON string using upsert to avoid issues if profile doesn't exist yet
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        savedCart: JSON.stringify(cartItems)
      },
      create: {
        userId: session.user.id,
        savedCart: JSON.stringify(cartItems)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving cart:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
