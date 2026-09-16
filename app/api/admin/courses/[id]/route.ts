import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { adminCoursePatchSchema, curriculumSchema } from '@/lib/validations/creator-course';

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
      const curriculum = curriculumSchema.safeParse(body.curriculum);
      if (!curriculum.success) {
        return NextResponse.json({ error: curriculum.error.issues[0]?.message || 'Currículum inválido' }, { status: 400 });
      }
      const modules = curriculum.data;
      // Delete removed modules then upsert
      const incomingModuleIds = modules.filter((m) => m.id).map((m) => m.id as string);
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
          const incomingLessonIds = mod.lessons.filter((l) => l.id).map((l) => l.id as string);
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
                duration: lesson.duration ? parseInt(String(lesson.duration)) : null,
                isFree: lesson.isFree ?? false,
                order: lesson.order ?? 0,
              },
              update: {
                title: lesson.title,
                description: lesson.description || null,
                videoUrl: lesson.videoUrl || null,
                duration: lesson.duration ? parseInt(String(lesson.duration)) : null,
                isFree: lesson.isFree ?? false,
                order: lesson.order ?? 0,
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

    // Campos del curso: solo los de la lista blanca (C-82)
    const parsed = adminCoursePatchSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const campo = issue?.path.join('.');
      return NextResponse.json(
        { error: issue?.code === 'unrecognized_keys' ? 'Hay campos que no se pueden cambiar desde el panel.' : `${campo ? campo + ': ' : ''}${issue?.message ?? 'Datos inválidos'}` },
        { status: 400 }
      );
    }

    const previo = await prisma.course.findUnique({
      where: { id },
      select: { isActive: true, title: true, slug: true, creator: { select: { userId: true } } },
    });
    if (!previo) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const course = await prisma.course.update({ where: { id }, data: parsed.data });

    // Curso de un creador que pasa a activo: se le avisa (antes no se enteraba de que se aprobó)
    if (parsed.data.isActive === true && !previo.isActive && previo.creator?.userId) {
      await createNotification({
        userId: previo.creator.userId,
        type: 'SYSTEM_UPDATE',
        title: 'Curso aprobado',
        message: `Tu curso "${previo.title}" ya está publicado en el catálogo.`,
        link: `/cursos/${previo.slug}`,
        icon: 'confirm',
      });
    }

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
