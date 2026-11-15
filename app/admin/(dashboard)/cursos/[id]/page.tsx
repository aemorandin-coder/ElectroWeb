import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistenteCurso from '../_components/AsistenteCurso';

// C-249e: cambiar un curso, por pasos (PLAN.md §1.9). El último paso dice qué cambia y a cuántos inscritos toca.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar curso' };

export default async function PaginaCambiarCurso({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_CONTENT')) redirect('/admin');
  const { id } = await params;
  const c = await prisma.course.findUnique({
    where: { id },
    include: {
      creator: { select: { displayName: true } },
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });
  if (!c) notFound();
  return (
    <AsistenteCurso
      key={c.updatedAt.toISOString()}
      curso={{
        id: c.id, slug: c.slug, title: c.title, shortDesc: c.shortDesc ?? '', description: c.description, category: c.category ?? '', level: c.level ?? '',
        instructor: c.instructor ?? '', priceUSD: Number(c.priceUSD), thumbnail: c.thumbnail ?? '', trailerUrl: c.trailerUrl ?? '', isFeatured: c.isFeatured,
        isActive: c.isActive, metaTitle: c.metaTitle ?? '', metaDescription: c.metaDescription ?? '', creador: c.creator?.displayName ?? null,
        rating: c.rating === null ? null : Number(c.rating), enrollmentCount: c.enrollmentCount, totalDuration: c.totalDuration,
        inscritos: c._count.enrollments, resenas: c._count.reviews,
        modulos: c.modules.map((m) => ({
          id: m.id, title: m.title,
          lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, description: l.description ?? '', videoUrl: l.videoUrl ?? '', duration: l.duration ? String(l.duration) : '', isFree: l.isFree })),
        })),
      }}
    />
  );
}
