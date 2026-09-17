import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creatorCoursePatchSchema, curriculumSchema } from '@/lib/validations/creator-course';

async function getApprovedCreator(userId: string) {
  return prisma.courseCreator.findFirst({ where: { userId, status: 'APPROVED' } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const creator = await getApprovedCreator(userId);
    if (!creator) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { id, creatorId: creator.id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    console.error('GET /api/creator/courses/[id] error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const creator = await getApprovedCreator(userId);
    if (!creator) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.course.findFirst({ where: { id, creatorId: creator.id } });
    if (!existing) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

    // Handle curriculum save
    if (body.curriculum) {
      const parsed = curriculumSchema.safeParse(body.curriculum);
      if (!parsed.success) return NextResponse.json({ error: 'Temario inválido' }, { status: 400 });
      const modules = parsed.data;

      // SEGURIDAD (C-72): los ids que llegan deben ser de este curso. Antes el upsert por id editaba módulos
      // y lecciones de cursos de otros creadores.
      const [ownModules, ownLessons] = await Promise.all([
        prisma.courseModule.findMany({ where: { courseId: id }, select: { id: true } }),
        prisma.courseLesson.findMany({ where: { module: { courseId: id } }, select: { id: true } }),
      ]);
      const ownModuleIds = new Set(ownModules.map((m) => m.id));
      const ownLessonIds = new Set(ownLessons.map((l) => l.id));
      const foreign = modules.some((m) => (m.id && !ownModuleIds.has(m.id)) || (m.lessons ?? []).some((l) => l.id && !ownLessonIds.has(l.id)));
      if (foreign) return NextResponse.json({ error: 'Temario inválido' }, { status: 400 });

      const toMinutes = (value: string | number | null | undefined) => {
        const minutes = parseInt(String(value ?? ''), 10);
        return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
      };

      await prisma.$transaction(async (tx) => {
        const keptModuleIds = modules.filter((m) => m.id).map((m) => m.id as string);
        await tx.courseModule.deleteMany({ where: { courseId: id, id: { notIn: keptModuleIds } } });
        for (const mod of modules) {
          const moduleData = { title: mod.title, order: mod.order ?? 0 };
          const savedModule = mod.id
            ? await tx.courseModule.update({ where: { id: mod.id }, data: moduleData })
            : await tx.courseModule.create({ data: { courseId: id, ...moduleData } });
          const lessons = mod.lessons ?? [];
          const keptLessonIds = lessons.filter((l) => l.id).map((l) => l.id as string);
          await tx.courseLesson.deleteMany({ where: { moduleId: savedModule.id, id: { notIn: keptLessonIds } } });
          for (const lesson of lessons) {
            const lessonData = {
              title: lesson.title,
              description: lesson.description || null,
              videoUrl: lesson.videoUrl,
              duration: toMinutes(lesson.duration),
              isFree: lesson.isFree ?? false,
              order: lesson.order ?? 0,
            };
            if (lesson.id) {
              // Una lección puede cambiar de módulo, pero siempre dentro del mismo curso
              await tx.courseLesson.update({ where: { id: lesson.id }, data: { ...lessonData, moduleId: savedModule.id } });
            } else {
              await tx.courseLesson.create({ data: { moduleId: savedModule.id, ...lessonData } });
            }
          }
        }
        const count = await tx.courseLesson.count({ where: { module: { courseId: id } } });
        await tx.course.update({ where: { id }, data: { totalLessons: count } });
      });
      return NextResponse.json({ ok: true });
    }

    // SEGURIDAD (C-72): lista blanca. Antes el cuerpo iba entero a course.update: un creador podía cambiarse
    // de dueño el curso, marcarlo destacado o inflar inscritos y calificación.
    const parsed = creatorCoursePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
    }
    const course = await prisma.course.update({ where: { id }, data: parsed.data });
    return NextResponse.json(course);
  } catch (error) {
    console.error('PATCH /api/creator/courses/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const creator = await getApprovedCreator(userId);
    if (!creator) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.course.findFirst({ where: { id, creatorId: creator.id } });
    if (!existing) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/creator/courses/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
