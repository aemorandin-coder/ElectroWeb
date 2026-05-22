import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const userId = (session.user as any).id;
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

    const userId = (session.user as any).id;
    const creator = await getApprovedCreator(userId);
    if (!creator) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.course.findFirst({ where: { id, creatorId: creator.id } });
    if (!existing) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const body = await request.json();

    // Handle curriculum save
    if (body.curriculum) {
      const modules: any[] = body.curriculum;
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
              create: { moduleId: savedModule.id, title: lesson.title, description: lesson.description || null, videoUrl: lesson.videoUrl || null, duration: lesson.duration ? parseInt(lesson.duration) : null, isFree: lesson.isFree ?? false, order: lesson.order ?? 0 },
              update: { title: lesson.title, description: lesson.description || null, videoUrl: lesson.videoUrl || null, duration: lesson.duration ? parseInt(lesson.duration) : null, isFree: lesson.isFree ?? false, order: lesson.order ?? 0 },
            });
          }
        }
      }
      const count = await prisma.courseLesson.count({ where: { module: { courseId: id } } });
      await prisma.course.update({ where: { id }, data: { totalLessons: count } });
      return NextResponse.json({ ok: true });
    }

    const { curriculum: _c, ...fields } = body;
    if (fields.priceUSD !== undefined) fields.priceUSD = parseFloat(fields.priceUSD);
    // Creators cannot publish directly — admin activates
    delete fields.isActive;

    const course = await prisma.course.update({ where: { id }, data: fields });
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

    const userId = (session.user as any).id;
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
