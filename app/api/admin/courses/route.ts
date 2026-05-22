import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      include: {
        creator: { select: { displayName: true } },
        _count: { select: { enrollments: true, reviews: true, modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('GET /api/admin/courses error:', error);
    return NextResponse.json({ error: 'Error al obtener cursos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { title, shortDesc, description, trailerUrl, category, tags, level, instructor,
            creatorId, priceUSD, thumbnail, isFeatured, isActive, metaTitle, metaDescription } = body;

    if (!title || !description || priceUSD === undefined) {
      return NextResponse.json({ error: 'Título, descripción y precio son requeridos' }, { status: 400 });
    }

    let slug = toSlug(title);
    const exists = await prisma.course.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        shortDesc: shortDesc || null,
        description,
        trailerUrl: trailerUrl || null,
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        level: level || null,
        instructor: instructor || null,
        creatorId: creatorId || null,
        priceUSD: parseFloat(priceUSD),
        thumbnail: thumbnail || null,
        isFeatured: isFeatured ?? false,
        isActive: isActive ?? true,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/courses error:', error);
    return NextResponse.json({ error: 'Error al crear curso' }, { status: 500 });
  }
}
