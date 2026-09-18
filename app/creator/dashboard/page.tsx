'use client';
import { formatUSD } from '@/lib/currency';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { adminPageHeader, adminPageTitle, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

type Course = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  priceUSD: number;
  rating: number | null;
  totalLessons: number;
  createdAt: string;
  _count: { enrollments: number; reviews: number; modules: number };
};

type CreatorProfile = {
  id: string;
  displayName: string;
  bio: string | null;
  expertise: string | null;
  status: string;
  commissionRate: number;
  totalRevenue: number;
  _count: { courses: number };
};

// La API manda los Decimal de Prisma como texto ("4.5"): sin convertirlos, `rating.toFixed()`
// rompía la página entera ("Algo salió mal") en cuanto un curso tenía calificación o precio.
function aNumero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export default function CreatorDashboardPage() {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/creator')
      .then((r) => r.json())
      .then((c) => {
        if (c?.id) {
          setCreator({ ...c, commissionRate: aNumero(c.commissionRate), totalRevenue: aNumero(c.totalRevenue) });
          if (c.status === 'APPROVED') {
            return fetch('/api/creator/courses').then((r) => r.json());
          }
        }
        return [];
      })
      .then((cs: Course[]) =>
        setCourses(
          Array.isArray(cs)
            ? cs.map((c) => ({ ...c, priceUSD: aNumero(c.priceUSD), rating: c.rating === null ? null : aNumero(c.rating) }))
            : []
        )
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!creator || creator.status !== 'APPROVED') {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-white p-6 text-center sm:mt-12">
        <h2 className="text-xl font-bold text-ink mb-2">
          {creator?.status === 'PENDING' ? 'Solicitud en revisión' : 'Acceso no autorizado'}
        </h2>
        <p className="text-muted mb-6 text-sm">
          {creator?.status === 'PENDING'
            ? 'Tu solicitud está siendo revisada. Te avisaremos cuando sea aprobada.'
            : 'Necesitas ser un creador aprobado para acceder a este panel.'}
        </p>
        <Link href="/creator" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a la página de creadores
        </Link>
      </div>
    );
  }

  const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
  const totalReviews = courses.reduce((acc, c) => acc + c._count.reviews, 0);
  const ratedCourses = courses.filter((c) => c.rating);
  const avgRating = ratedCourses.length
    ? ratedCourses.reduce((acc, c) => acc + (c.rating ?? 0), 0) / ratedCourses.length
    : null;
  const activeCourses = courses.filter((c) => c.isActive).length;

  const stats = [
    { label: 'Ingresos', value: formatUSD(creator.totalRevenue), sub: `${creator.commissionRate}% tuyo por venta` },
    { label: 'Estudiantes', value: totalStudents.toString(), sub: 'matriculados en total' },
    { label: 'Cursos Activos', value: `${activeCourses}/${courses.length}`, sub: 'activos de total' },
    { label: 'Calificación', value: avgRating ? avgRating.toFixed(1) : '—', sub: `${totalReviews} reseñas` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Hola, {creator.displayName}</h1>
          <p className="text-muted text-sm mt-1">Aquí está el resumen de tu actividad como creador.</p>
        </div>
        <Link
          href="/creator/dashboard/cursos/nuevo"
          className={`${adminPrimaryButton} flex items-center gap-2 text-sm w-fit`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`min-w-0 rounded-2xl border border-line bg-white p-4 ${stat.label === 'Ingresos' || stat.label === 'Calificación' ? 'col-span-2 lg:col-span-1' : ''}`}>
            <p className="whitespace-nowrap text-xl font-bold tabular-nums text-ink sm:text-2xl">{stat.value}</p>
            <p className="text-muted text-xs font-semibold mt-0.5">{stat.label}</p>
            <p className="text-muted text-xs">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Mis Cursos</h2>
          <Link href="/creator/dashboard/cursos" className="text-brand-600 text-sm hover:underline">
            Ver todos <FiArrowRight className="inline h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-12 text-center">
              <p className="text-muted mb-4 text-sm">Aún no has creado ningún curso.</p>
            <Link
              href="/creator/dashboard/cursos/nuevo"
              className={`${adminPrimaryButton} inline-block text-sm`}
            >
              Crear mi primer curso
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-300 sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-ink font-semibold text-sm">{course.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      course.isActive
                        ? 'bg-success/15 text-success-strong'
                        : 'bg-warning/15 text-warning-strong'
                    }`}>
                      {course.isActive ? 'Activo' : 'En revisión'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                    <span>{course._count.enrollments} estudiantes</span>
                    <span>{course.rating?.toFixed(1) ?? '—'} rating</span>
                    <span>{course.totalLessons} lecciones</span>
                    <span className="text-ink font-semibold">{formatUSD(course.priceUSD)}</span>
                  </div>
                </div>
                <Link
                  href={`/creator/dashboard/cursos/${course.id}`}
                  className={`${adminSecondaryButton} w-full shrink-0 text-xs sm:w-auto`}
                >
                  Editar
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
        <h3 className="text-brand-700 font-bold mb-1.5 text-sm">¿Cómo funcionan tus ingresos?</h3>
        <p className="text-brand-950 text-xs leading-relaxed">
          Por cada venta recibes el{' '}
          <strong className="text-brand-700">{creator.commissionRate}%</strong> del precio del curso.
          El <strong className="text-brand-700">{100 - creator.commissionRate}%</strong> restante es la comisión
          de plataforma. Tus cursos son revisados por el equipo de ElectroShop antes de publicarse.
        </p>
      </div>
    </div>
  );
}
