import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const course = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const reviews = await prisma.courseReview.findMany({
      where: { courseId: course.id },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('GET course reviews error:', error);
    return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para dejar una reseña' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = (session.user as any).id;
    const { rating, comment } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Calificación inválida (1-5)' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    // Must be enrolled
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'Debes estar inscrito para dejar una reseña' }, { status: 403 });
    }

    const isVerified = enrollment.progress >= 20;

    const review = await prisma.courseReview.upsert({
      where: { courseId_userId: { courseId: course.id, userId } },
      create: { courseId: course.id, userId, rating, comment: comment || null, isVerified },
      update: { rating, comment: comment || null, isVerified },
    });

    // Update cached rating on course
    const agg = await prisma.courseReview.aggregate({
      where: { courseId: course.id },
      _avg: { rating: true },
    });
    await prisma.course.update({
      where: { id: course.id },
      data: { rating: agg._avg.rating ?? null },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('POST course review error:', error);
    return NextResponse.json({ error: 'Error al guardar reseña' }, { status: 500 });
  }
}
