'use client';
import { formatUSD } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiExternalLink } from 'react-icons/fi';
import { adminPageHeader, adminPageTitle, adminPrimaryButton } from '@/lib/admin-ui';
import { useRouter } from 'next/navigation';

type Course = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  priceUSD: number;
  rating: number | null;
  totalLessons: number;
  category: string | null;
  level: string | null;
  createdAt: string;
  _count: { enrollments: number; reviews: number; modules: number };
};

// La API manda los Decimal de Prisma como texto ("4.5"): sin convertirlos, `rating.toFixed()`
// rompía la página entera ("Algo salió mal") en cuanto un curso tenía calificación o precio.
function aNumero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export default function CreatorCoursesPage() {
  const { confirm } = useConfirm();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/creator/courses')
      .then((r) => r.json())
      .then((data: Course[]) =>
        setCourses(
          Array.isArray(data)
            ? data.map((c) => ({ ...c, priceUSD: aNumero(c.priceUSD), rating: c.rating === null ? null : aNumero(c.rating) }))
            : []
        )
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    const confirmed = await confirm({ title: 'Eliminar curso', message: `¿Eliminar "${title}"? Esta acción no se puede deshacer.`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!confirmed) return;
    setDeleting(id);
    try {
      await fetch(`/api/creator/courses/${id}`, { method: 'DELETE' });
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Mis Cursos</h1>
          <p className="text-muted text-sm mt-1">{courses.length} curso{courses.length !== 1 ? 's' : ''} en total</p>
        </div>
        <Link
          href="/creator/dashboard/cursos/nuevo"
          className={`${adminPrimaryButton} flex items-center gap-2 text-sm`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center sm:p-16">
          <h2 className="text-ink font-bold text-lg mb-2">Sin cursos aún</h2>
          <p className="text-muted text-sm mb-6">Crea tu primer curso y comparte tu conocimiento.</p>
          <Link
            href="/creator/dashboard/cursos/nuevo"
            className={`${adminPrimaryButton} inline-block text-sm`}
          >
            Crear primer curso
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-300 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-ink font-bold">{course.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      course.isActive
                        ? 'bg-success/15 text-success-strong'
                        : 'bg-warning/15 text-warning-strong'
                    }`}>
                      {course.isActive ? 'Activo' : 'En revisión'}
                    </span>
                    {course.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-ink-soft border border-line">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-5 text-xs text-muted flex-wrap">
                    <span>{course._count.enrollments} estudiantes</span>
                    <span>{course.rating?.toFixed(1) ?? '—'} ({course._count.reviews} reseñas)</span>
                    <span>{course.totalLessons} lecciones</span>
                    <span>{course._count.modules} módulos</span>
                    <span className="whitespace-nowrap text-ink font-bold tabular-nums">{formatUSD(course.priceUSD)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {course.isActive && (
                    <Link
                      href={`/cursos/${course.slug}`}
                      target="_blank"
                      className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-line/50 hover:text-ink"
                      title="Ver en catálogo"
                    >
                      <FiExternalLink className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Ver
                    </Link>
                  )}
                  <Link
                    href={`/creator/dashboard/cursos/${course.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg bg-brand-100 px-4 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-200"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id, course.title)}
                    disabled={deleting === course.id}
                    className="min-h-10 rounded-lg px-3 text-xs font-semibold text-deal transition-colors hover:bg-deal-bg disabled:opacity-50"
                  >
                    {deleting === course.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
