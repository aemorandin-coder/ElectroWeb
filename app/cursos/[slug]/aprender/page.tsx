import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CoursePlayer from '@/components/cursos/CoursePlayer';

export default async function CoursePlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/login?redirect=/cursos/${slug}/aprender`);
  }

  const userId = (session.user as any).id;

  const course = await prisma.course.findUnique({
    where: { slug, isActive: true },
    include: {
      creator: { select: { displayName: true, avatar: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!course) notFound();

  const [enrollment, userCreator] = await Promise.all([
    prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId } },
    }),
    prisma.courseCreator.findUnique({ where: { userId } }),
  ]);

  const isCreator = !!userCreator && userCreator.id === course.creatorId;

  if (!enrollment && !isCreator) {
    redirect(`/cursos/${slug}`);
  }

  const completedLessons: string[] = enrollment?.completedLessons
    ? JSON.parse(enrollment.completedLessons)
    : [];

  return (
    <CoursePlayer
      course={JSON.parse(JSON.stringify(course))}
      isCreatorPreview={isCreator && !enrollment}
      enrollment={enrollment ? {
        progress: enrollment.progress,
        completedLessons,
        completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
        certificateId: enrollment.certificateId ?? null,
      } : null}
    />
  );
}
