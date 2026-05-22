import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const course = await prisma.course.findUnique({
      where: { slug, isActive: true },
      include: {
        creator: { select: { displayName: true, bio: true, avatar: true, expertise: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                isFree: true,
                order: true,
                // Only expose videoUrl for free lessons or enrolled users (resolved below)
                videoUrl: true,
              },
            },
          },
        },
        reviews: {
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Check enrollment and creator access in parallel
    let isEnrolled = false;
    let isCreator = false;
    let enrollment = null;
    if (userId) {
      const [enrollmentResult, userCreator] = await Promise.all([
        prisma.courseEnrollment.findUnique({
          where: { courseId_userId: { courseId: course.id, userId } },
        }),
        prisma.courseCreator.findUnique({ where: { userId } }),
      ]);
      enrollment = enrollmentResult;
      isEnrolled = !!enrollment;
      isCreator = !!userCreator && userCreator.id === course.creatorId;
    }

    // Gate videoUrl: free lessons, enrolled users, or the course creator see the real URL
    const gatedCourse = {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((lesson) => ({
          ...lesson,
          videoUrl: lesson.isFree || isEnrolled || isCreator ? lesson.videoUrl : null,
        })),
      })),
      isEnrolled,
      isCreator,
      enrollment,
    };

    return NextResponse.json(gatedCourse);
  } catch (error) {
    console.error('GET /api/courses/[slug] error:', error);
    return NextResponse.json({ error: 'Error al obtener el curso' }, { status: 500 });
  }
}
