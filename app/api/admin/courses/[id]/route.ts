import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        creator: { select: { displayName: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });

    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    console.error('GET /api/admin/courses/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener curso' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle curriculum save (modules + lessons upsert)
    if (body.curriculum) {
      const modules: any[] = body.curriculum;
      // Delete removed modules then upsert
      const incomingModuleIds = modules.filter((m) => m.id).map((m) => m.id);
      await prisma.courseModule.deleteMany({
        where: { courseId: id, id: { notIn: incomingModuleIds } },
      });

      for (const mod of modules) {
        const savedModule = await prisma.courseModule.upsert({
          where: { id: mod.id || '__new__' },
          create: { courseId: id, title: mod.title, order: mod.order ?? 0 },
          update: { title: mod.title, order: mod.order ?? 0 },
        });

        if (mod.lessons?.length) {
          const incomingLessonIds = mod.lessons.filter((l: any) => l.id).map((l: any) => l.id);
          await prisma.courseLesson.deleteMany({
            where: { moduleId: savedModule.id, id: { notIn: incomingLessonIds } },
          });

          for (const lesson of mod.lessons) {
            await prisma.courseLesson.upsert({
              where: { id: lesson.id || '__new__' },
              create: {
                moduleId: savedModule.id,
                title: lesson.title,
                description: lesson.description || null,
                videoUrl: lesson.videoUrl || null,
                duration: lesson.duration ? parseInt(lesson.duration) : null,
                isFree: lesson.isFree ?? false,
                order: lesson.order ?? 0,
                resources: lesson.resources ? JSON.stringify(lesson.resources) : null,
              },
              update: {
                title: lesson.title,
                description: lesson.description || null,
                videoUrl: lesson.videoUrl || null,
                duration: lesson.duration ? parseInt(lesson.duration) : null,
                isFree: lesson.isFree ?? false,
                order: lesson.order ?? 0,
                resources: lesson.resources ? JSON.stringify(lesson.resources) : null,
              },
            });
          }
        }
      }

      // Recompute totalLessons
      const count = await prisma.courseLesson.count({
        where: { module: { courseId: id } },
      });
      await prisma.course.update({ where: { id }, data: { totalLessons: count } });

      return NextResponse.json({ ok: true });
    }

    // Regular field update
    const { curriculum: _c, ...fields } = body;
    if (fields.tags && Array.isArray(fields.tags)) {
      fields.tags = JSON.stringify(fields.tags);
    }
    if (fields.priceUSD !== undefined) fields.priceUSD = parseFloat(fields.priceUSD);

    const course = await prisma.course.update({ where: { id }, data: fields });
    return NextResponse.json(course);
  } catch (error) {
    console.error('PATCH /api/admin/courses/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar curso' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/courses/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar curso' }, { status: 500 });
  }
}
