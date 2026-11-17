import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendCourseCertificateEmail } from '@/lib/email-templates/CourseCertificate';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = (session.user as { id: string }).id;
    // Un cuerpo que no sea JSON llega como lessonId vacío y se rechaza con 400 más abajo (antes: error 500)
    const { lessonId, completed } = (await request.json().catch(() => null)) ?? {};

    const course = await prisma.course.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        creator: { select: { displayName: true } },
        instructor: true,
        modules: { select: { lessons: { select: { id: true } } } },
      },
    });

    if (!course) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId } },
    });

    if (!enrollment) return NextResponse.json({ error: 'No inscrito' }, { status: 403 });

    // S-12: solo cuentan las lecciones de este curso. Antes cualquier lessonId se guardaba y el porcentaje llegaba a 100
    // (y al certificado) sin ver las lecciones.
    const leccionesDelCurso = new Set(course.modules.flatMap((m) => m.lessons.map((l) => l.id)));
    if (typeof lessonId !== 'string' || !leccionesDelCurso.has(lessonId)) {
      return NextResponse.json({ error: 'Esa lección no es de este curso' }, { status: 400 });
    }

    // Update completedLessons JSON array: sin repetidos y sin lecciones que ya no son del curso
    let guardadas: unknown = [];
    try {
      guardadas = enrollment.completedLessons ? JSON.parse(enrollment.completedLessons) : [];
    } catch {
      guardadas = [];
    }
    const hechas = new Set(
      (Array.isArray(guardadas) ? guardadas : []).filter((id): id is string => typeof id === 'string' && leccionesDelCurso.has(id))
    );

    if (completed) hechas.add(lessonId);
    else hechas.delete(lessonId);
    const completedLessons = [...hechas];

    const totalLessons = leccionesDelCurso.size;
    const progress = totalLessons > 0 ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100)) : 0;
    const completedAt = progress === 100 ? new Date() : null;

    // Generate certificate token on first completion
    let certificateId = enrollment.certificateId;
    const justCompleted = progress === 100 && !certificateId;
    if (justCompleted) {
      certificateId = crypto.randomUUID();
    }

    const updated = await prisma.courseEnrollment.update({
      where: { courseId_userId: { courseId: course.id, userId } },
      data: {
        completedLessons: JSON.stringify(completedLessons),
        progress,
        completedAt: completedAt ?? enrollment.completedAt,
        ...(certificateId ? { certificateId } : {}),
      },
    });

    // Send certificate email asynchronously (don't block the response)
    if (justCompleted && certificateId) {
      const user = session.user as { email?: string | null; name?: string | null };
      const userEmail = user.email || '';
      const userName = user.name || 'Estudiante';
      const instructorName = course.creator?.displayName || course.instructor || 'ElectroShop';
      const completedAtDate = completedAt ?? new Date();

      sendCourseCertificateEmail(userEmail, {
        studentName: userName,
        courseTitle: course.title,
        instructorName,
        certificateId,
        completedAt: completedAtDate,
      }).catch((err) => console.error('[Certificate email error]', err));
    }

    return NextResponse.json({
      progress,
      completedLessons,
      completedAt: updated.completedAt,
      certificateId: updated.certificateId,
    });
  } catch (error) {
    console.error('PATCH progress error:', error);
    return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 });
  }
}
