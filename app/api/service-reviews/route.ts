import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId requerido' }, { status: 400 });
    }

    const reviews = await prisma.serviceReview.findMany({
      where: { serviceVideoId: videoId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('GET service-reviews error:', error);
    return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para dejar una reseña' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceVideoId, rating, comment } = body;

    if (!serviceVideoId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const review = await prisma.serviceReview.upsert({
      where: { serviceVideoId_userId: { serviceVideoId, userId } },
      create: { serviceVideoId, userId, rating, comment: comment || null },
      update: { rating, comment: comment || null },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('POST service-review error:', error);
    return NextResponse.json({ error: 'Error al guardar reseña' }, { status: 500 });
  }
}
