import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getApprovedCreator(userId: string) {
  return prisma.courseCreator.findFirst({
    where: { userId, status: 'APPROVED' },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as any).id;
    const creator = await getApprovedCreator(userId);
    if (!creator) return NextResponse.json({ error: 'Creador no aprobado' }, { status: 403 });

    const courses = await prisma.course.findMany({
      where: { creatorId: creator.id },
      include: {
        _count: { select: { enrollments: true, reviews: true, modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('GET /api/creator/courses error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as any).id;
    const creator = await getApprovedCreator(userId);
    if (!creator) return NextResponse.json({ error: 'Creador no aprobado' }, { status: 403 });

    const body = await request.json();
    const { title, shortDesc, description, trailerUrl, category, level, priceUSD, thumbnail } = body;

    if (!title || !description || priceUSD === undefined) {
      return NextResponse.json({ error: 'Título, descripción y precio son requeridos' }, { status: 400 });
    }

    let slug = toSlug(title);
    const exists = await prisma.course.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const course = await prisma.course.create({
      data: {
        title, slug,
        shortDesc: shortDesc || null,
        description,
        trailerUrl: trailerUrl || null,
        category: category || null,
        level: level || null,
        priceUSD: parseFloat(priceUSD),
        thumbnail: thumbnail || null,
        creatorId: creator.id,
        instructor: creator.displayName,
        isActive: false, // pending admin review
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('POST /api/creator/courses error:', error);
    return NextResponse.json({ error: 'Error al crear curso' }, { status: 500 });
  }
}
