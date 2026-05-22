import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import CourseDetailClient from '@/components/cursos/CourseDetailClient';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, select: { title: true, shortDesc: true, metaTitle: true, metaDescription: true } });
  if (!course) return { title: 'Curso no encontrado' };
  return {
    title: course.metaTitle || course.title,
    description: course.metaDescription || course.shortDesc || undefined,
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [session, settings, course] = await Promise.all([
    getServerSession(authOptions),
    prisma.companySettings.findFirst(),
    prisma.course.findUnique({
      where: { slug, isActive: true },
      include: {
        creator: { select: { displayName: true, bio: true, avatar: true, expertise: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
        reviews: {
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    }),
  ]);

  if (!course) notFound();

  const userId = (session?.user as any)?.id;
  let enrollment = null;
  let userBalance = null;

  if (userId) {
    [enrollment, userBalance] = await Promise.all([
      prisma.courseEnrollment.findUnique({
        where: { courseId_userId: { courseId: course.id, userId } },
      }),
      prisma.userBalance.findUnique({ where: { userId }, select: { balance: true } }),
    ]);
  }

  // Gate videoUrl for non-enrolled users
  const gatedCourse = {
    ...course,
    modules: course.modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => ({
        ...lesson,
        videoUrl: lesson.isFree || !!enrollment ? lesson.videoUrl : null,
      })),
    })),
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />
      <CourseDetailClient
        course={JSON.parse(JSON.stringify(gatedCourse))}
        isEnrolled={!!enrollment}
        enrollment={enrollment ? JSON.parse(JSON.stringify(enrollment)) : null}
        userBalance={userBalance ? Number(userBalance.balance) : null}
        isLoggedIn={!!session}
      />
      <Footer />
    </div>
  );
}
