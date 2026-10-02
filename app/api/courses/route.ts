import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { idsPorTexto } from '@/lib/busqueda-sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');

    const where: Prisma.CourseWhereInput = { isActive: true };
    if (category) where.category = category;
    if (level) where.level = level;
    if (featured === 'true') where.isFeatured = true;
    if (search) {
      // Sin acentos ni mayúsculas (C-160): "programacion" encuentra "Programación"
      where.id = { in: await idsPorTexto('courses', ['title', 'shortDesc', 'description'], search) };
    }

    const courses = await prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        shortDesc: true,
        thumbnail: true,
        category: true,
        level: true,
        priceUSD: true,
        rating: true,
        enrollmentCount: true,
        totalDuration: true,
        totalLessons: true,
        isFeatured: true,
        instructor: true,
        creator: { select: { displayName: true, avatar: true } },
        createdAt: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { enrollmentCount: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('GET /api/courses error:', error);
    return NextResponse.json({ error: 'Error al obtener cursos' }, { status: 500 });
  }
}
