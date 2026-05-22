import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CertificatePage from './CertificatePage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { certificateId: token, progress: 100 },
    select: { user: { select: { name: true } }, course: { select: { title: true } } },
  });
  if (!enrollment) return { title: 'Certificado — ElectroShop', robots: { index: false } };
  return {
    title: `Certificado de ${enrollment.user.name} — ${enrollment.course.title}`,
    description: `Certificado de finalización emitido por ElectroShop. Verifica su autenticidad en nuestra web.`,
    robots: { index: false, follow: false }, // don't index personal certificates
  };
}

export default async function CertificadoPage({ params }: { params: Promise<{ token: string }> }) {
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
    notFound();
  }

  return (
    <CertificatePage
      certificateId={enrollment.certificateId!}
      studentName={enrollment.user.name ?? 'Estudiante'}
      completedAt={enrollment.completedAt!.toISOString()}
      course={{
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        category: enrollment.course.category ?? null,
        totalLessons: enrollment.course.totalLessons ?? 0,
        instructorName: enrollment.course.creator?.displayName || enrollment.course.instructor || 'ElectroShop',
        instructorAvatar: enrollment.course.creator?.avatar ?? null,
      }}
    />
  );
}
