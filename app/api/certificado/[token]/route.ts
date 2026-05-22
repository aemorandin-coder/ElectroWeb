import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { certificateId: token },
      select: {
        certificateId: true,
        completedAt: true,
        progress: true,
        user: { select: { name: true } },
        course: {
          select: {
            title: true,
            slug: true,
            category: true,
            totalLessons: true,
            creator: { select: { displayName: true, avatar: true } },
            instructor: true,
          },
        },
      },
    });

    if (!enrollment || enrollment.progress < 100) {
      return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      certificateId: enrollment.certificateId,
      completedAt: enrollment.completedAt,
      studentName: enrollment.user.name,
      course: {
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        category: enrollment.course.category,
        totalLessons: enrollment.course.totalLessons,
        instructorName: enrollment.course.creator?.displayName || enrollment.course.instructor || 'ElectroShop',
        instructorAvatar: enrollment.course.creator?.avatar ?? null,
      },
    });
  } catch (error) {
    console.error('GET /api/certificado/[token] error:', error);
    return NextResponse.json({ error: 'Error al verificar certificado' }, { status: 500 });
  }
}
