'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { IconoCheck, IconoCursos, IconoLista, IconoPremio, IconoReloj } from '@/components/iconos';
import Filtros, { type Filtro } from '@/components/admin/Filtros';
import { adminBadge, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// Mis cursos. C-251: el certificado se abre desde aquí (antes "Certificado disponible" era un texto ámbar sin enlace); a
// 360 px la tarjeta ya no se sale del marco; los números y "Completado" con los colores del kit; los botones de 44 px; y si
// la lista no carga, lo dice con "Reintentar" (antes decía "No estás inscrito en ningún curso").

type EnrolledCourse = {
  id: string;
  progress: number;
  completedAt: string | null;
  createdAt: string;
  /** El enlace del certificado (/certificado/<id>) cuando termina el curso */
  certificateId?: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    shortDesc?: string | null;
    thumbnail?: string | null;
    category?: string | null;
    level?: string | null;
    totalLessons?: number | null;
    instructor?: string | null;
    creator?: { displayName: string } | null;
  };
};

type FiltroCursos = 'all' | 'in-progress' | 'completed';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function MisCursosPage() {
  const { data: session } = useSession();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [filter, setFilter] = useState<FiltroCursos>('all');

  useEffect(() => {
    let vigente = true;
    async function load() {
      try {
        const res = await fetch('/api/user/enrollments');
        if (!res.ok) throw new Error(String(res.status));
        const datos = await res.json();
        if (vigente) { setEnrollments(datos); setError(false); }
      } catch {
        if (vigente) setError(true);
      } finally {
        if (vigente) setLoading(false);
      }
    }
    if (session) void load();
    return () => { vigente = false; };
  }, [session, intento]);

  const filtered = enrollments.filter((e) => {
    if (filter === 'completed') return e.completedAt !== null;
    if (filter === 'in-progress') return e.completedAt === null && e.progress > 0;
    return true;
  });

  const completedCount = enrollments.filter((e) => e.completedAt).length;
  const inProgressCount = enrollments.filter((e) => !e.completedAt && e.progress > 0).length;

  const filtros: ReadonlyArray<Filtro<FiltroCursos>> = [
    { valor: 'all', etiqueta: 'Todos', ayuda: 'Tus cursos', Icono: IconoLista, cuenta: enrollments.length },
    { valor: 'in-progress', etiqueta: 'En progreso', ayuda: 'Ya empezaste', Icono: IconoReloj, cuenta: inProgressCount },
    { valor: 'completed', etiqueta: 'Completados', ayuda: 'Con certificado', Icono: IconoPremio, cuenta: completedCount },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Mis cursos</h1>
        <p className="text-sm text-muted mt-1">
          {plural(enrollments.length, 'curso inscrito', 'cursos inscritos')}
        </p>
      </div>

      {/* Stats: números en neutro (PLAN.md §1.1: el ámbar no destaca un número) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-ink">{enrollments.length}</p>
          <p className="text-xs text-muted mt-0.5">Total</p>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-ink">{inProgressCount}</p>
          <p className="text-xs text-muted mt-0.5">En progreso</p>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-ink">{completedCount}</p>
          <p className="text-xs text-muted mt-0.5">Completados</p>
        </div>
      </div>

      {/* Filtros en píldoras (PLAN.md §1.7) */}
      <div className="mb-6">
        <Filtros filtros={filtros} valor={filter} onCambiar={setFilter} etiqueta="Filtrar cursos" />
      </div>

      {/* Course list */}
      {loading ? (
        <div className="text-center py-16 text-muted">Cargando cursos...</div>
      ) : error ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-ink" role="alert">
          No se pudieron cargar tus cursos.
          <button type="button" onClick={() => { setLoading(true); setIntento((n) => n + 1); }} className={`${adminSecondaryButton} ml-2`}>Reintentar</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <IconoCursos className="mx-auto mb-4 h-12 w-12 text-muted" aria-hidden="true" />
          <p className="text-muted font-medium mb-2">
            {filter === 'all'
              ? 'No estás inscrito en ningún curso aún'
              : filter === 'completed'
              ? 'Aún no has completado ningún curso'
              : 'No tienes cursos en progreso'}
          </p>
          {filter === 'all' && (
            <Link href="/cursos" className={`${adminPrimaryButton} mt-3`}>
              Ver catálogo de cursos
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((enrollment) => {
            const course = enrollment.course;
            const instructorName = course.creator?.displayName || course.instructor || 'ElectroShop';
            const isCompleted = !!enrollment.completedAt;

            return (
              <div key={enrollment.id} className="flex gap-3 bg-surface rounded-xl p-3 sm:gap-4 sm:p-4">
                {/* Thumbnail */}
                <div className="w-20 h-14 sm:w-24 sm:h-16 lg:w-32 lg:h-20 rounded-lg overflow-hidden bg-brand-500/10 shrink-0">
                  {course.thumbnail ? (
                    <Image src={course.thumbnail} alt={course.title} width={128} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconoCursos className="w-8 h-8 text-brand-500/30" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* C-251: el sello baja bajo el título en el teléfono (antes lo apretaba a "Repara de…") */}
                  <div className="mb-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <h3 className="min-w-0 font-semibold text-ink text-sm line-clamp-2">{course.title}</h3>
                    {isCompleted && (
                      <span className={`${adminBadge('success')} shrink-0`}>
                        <IconoCheck className="h-3 w-3" aria-hidden="true" />
                        Completado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted mb-2">{instructorName}</p>

                  {/* Progress */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-line-strong rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isCompleted ? 'bg-success-strong' : 'bg-brand-500'}`}
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted shrink-0">{enrollment.progress}%</span>
                  </div>

                  {/* CTA: 44 px, y el certificado como enlace */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/cursos/${course.slug}/aprender`} className={isCompleted ? adminSecondaryButton : adminPrimaryButton}>
                      {isCompleted ? 'Repasar el curso' : enrollment.progress > 0 ? 'Continuar' : 'Comenzar'}
                    </Link>
                    <Link href={`/cursos/${course.slug}`} className={adminSecondaryButton}>
                      Ver detalles
                    </Link>
                    {isCompleted && (enrollment.certificateId ? (
                      <Link href={`/certificado/${enrollment.certificateId}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                        <IconoPremio className="h-4 w-4 shrink-0" aria-hidden="true" /> Ver mi certificado
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <IconoPremio className="h-4 w-4 shrink-0" aria-hidden="true" /> Tu certificado está en el curso
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Browse more CTA */}
      {enrollments.length > 0 && (
        <div className="mt-8 p-6 bg-brand-50 rounded-xl border border-brand-200 text-center">
          <p className="text-sm font-semibold text-ink mb-1">¿Quieres aprender más?</p>
          <p className="text-xs text-muted mb-3">Explora nuevos cursos y sigue creciendo</p>
          <Link href="/cursos" className={adminPrimaryButton}>
            Ver más cursos
          </Link>
        </div>
      )}
    </div>
  );
}
