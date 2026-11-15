import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistenteTrabajo from '../_components/AsistenteTrabajo';

// C-249e: cambiar un trabajo del portafolio de Servicios, por pasos (PLAN.md §1.9). El último paso dice qué cambia.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar trabajo realizado' };

export default async function PaginaCambiarTrabajo({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_CONTENT')) redirect('/admin');
  const { id } = await params;
  const v = await prisma.techServiceVideo.findUnique({ where: { id }, include: { reviews: { select: { rating: true } } } });
  if (!v) notFound();
  return (
    <AsistenteTrabajo
      key={v.updatedAt.toISOString()}
      ordenSugerido={v.order}
      trabajo={{
        id: v.id, title: v.title, description: v.description ?? '', videoUrl: v.videoUrl, thumbnail: v.thumbnail ?? '', platform: v.platform || 'YOUTUBE',
        category: v.category ?? '', beforeImage: v.beforeImage ?? '', afterImage: v.afterImage ?? '', customerName: v.customerName ?? '',
        testimonial: v.testimonial ?? '', isActive: v.isActive, order: v.order,
        avgRating: v.reviews.length ? v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length : null, reviewCount: v.reviews.length,
      }}
    />
  );
}
