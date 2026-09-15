'use client';
import { formatUSD } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminPageHeader, adminPageTitle, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
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

export default function CreatorCoursesPage() {
  const { confirm } = useConfirm();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/creator/courses')
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
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
        <div className="bg-white border border-line rounded-2xl p-16 text-center">
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
              className="bg-white border border-line rounded-2xl p-5 hover:border-brand-300 transition-colors"
            >
              <div className="flex items-start gap-4">
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
                    <span className="text-ink font-bold">{formatUSD(course.priceUSD)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {course.isActive && (
                    <Link
                      href={`/cursos/${course.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-white/5 text-white/80 text-xs font-semibold rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                      title="Ver en catálogo"
                    >
                      Ver ↗
                    </Link>
                  )}
                  <Link
                    href={`/creator/dashboard/cursos/${course.id}`}
                    className="px-4 py-1.5 bg-brand-500/30 text-brand-600 text-xs font-semibold rounded-lg hover:bg-brand-500/50 transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id, course.title)}
                    disabled={deleting === course.id}
                    className="px-3 py-1.5 text-danger hover:bg-danger/10 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
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
