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
    const userId = (session.user as any).id;
    const { lessonId, completed } = await request.json();

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

    // Update completedLessons JSON array
    const completedLessons: string[] = enrollment.completedLessons
      ? JSON.parse(enrollment.completedLessons)
      : [];

    if (completed && !completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    } else if (!completed) {
      const idx = completedLessons.indexOf(lessonId);
      if (idx > -1) completedLessons.splice(idx, 1);
    }

    const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
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
      const userEmail = (session.user as any).email;
      const userName = (session.user as any).name || 'Estudiante';
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
