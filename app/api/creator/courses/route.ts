import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creatorCourseSchema } from '@/lib/validations/creator-course';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';

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

    const parsed = creatorCourseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Título, descripción y precio son requeridos' }, { status: 400 });
    }
    const { title, shortDesc, description, trailerUrl, category, level, priceUSD, thumbnail } = parsed.data;

    let slug = toSlug(title);
    const exists = await prisma.course.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const course = await prisma.course.create({
      data: {
        title, slug,
        shortDesc,
        description,
        trailerUrl,
        category,
        level,
        priceUSD,
        thumbnail,
        creatorId: creator.id,
        instructor: creator.displayName,
        isActive: false, // pending admin review
      },
    });

    emitAdminEvent({
      type: 'COURSE_SUBMITTED',
      title: `Curso por revisar · ${course.title}`.slice(0, 150),
      summary: `${creator.displayName} subió un curso nuevo`,
      fields: [['Precio', formatUSD(Number(course.priceUSD))], ['Categoría', course.category], ['Nivel', course.level]],
      link: '/admin/cursos',
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('POST /api/creator/courses error:', error);
    return NextResponse.json({ error: 'Error al crear curso' }, { status: 500 });
  }
}
