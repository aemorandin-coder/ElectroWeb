'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type EnrolledCourse = {
  id: string;
  progress: number;
  completedAt: string | null;
  createdAt: string;
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

const LEVEL_LABELS: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

export default function MisCursosPage() {
  const { data: session } = useSession();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/enrollments');
        if (res.ok) setEnrollments(await res.json());
      } finally {
        setLoading(false);
      }
    }
    if (session) load();
  }, [session]);

  const filtered = enrollments.filter((e) => {
    if (filter === 'completed') return e.completedAt !== null;
    if (filter === 'in-progress') return e.completedAt === null && e.progress > 0;
    return true;
  });

  const completedCount = enrollments.filter((e) => e.completedAt).length;
  const inProgressCount = enrollments.filter((e) => !e.completedAt && e.progress > 0).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#212529]">Mis Cursos</h1>
        <p className="text-sm text-[#6a6c6b] mt-1">
          {enrollments.length} curso(s) inscrito(s)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#f8f9fa] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#2a63cd]">{enrollments.length}</p>
          <p className="text-xs text-[#6a6c6b] mt-0.5">Total</p>
        </div>
        <div className="bg-[#f8f9fa] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-orange-500">{inProgressCount}</p>
          <p className="text-xs text-[#6a6c6b] mt-0.5">En progreso</p>
        </div>
        <div className="bg-[#f8f9fa] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-green-600">{completedCount}</p>
          <p className="text-xs text-[#6a6c6b] mt-0.5">Completados</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'all', label: `Todos (${enrollments.length})` },
          { key: 'in-progress', label: `En progreso (${inProgressCount})` },
          { key: 'completed', label: `Completados (${completedCount})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === key ? 'bg-[#2a63cd] text-white' : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Course list */}
      {loading ? (
        <div className="text-center py-16 text-[#6a6c6b]">Cargando cursos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-[#6a6c6b] font-medium mb-2">
            {filter === 'all'
              ? 'No estás inscrito en ningún curso aún'
              : filter === 'completed'
              ? 'Aún no has completado ningún curso'
              : 'No tienes cursos en progreso'}
          </p>
          {filter === 'all' && (
            <Link
              href="/cursos"
              className="inline-block mt-3 px-5 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-xl hover:bg-[#1e4ba3] transition-colors"
            >
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
              <div key={enrollment.id} className="flex gap-4 bg-[#f8f9fa] rounded-xl p-4 hover:bg-[#e9ecef] transition-colors">
                {/* Thumbnail */}
                <div className="w-24 h-16 lg:w-32 lg:h-20 rounded-lg overflow-hidden bg-[#2a63cd]/10 shrink-0">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#2a63cd]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-[#212529] text-sm line-clamp-2">{course.title}</h3>
                    {isCompleted && (
                      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Completado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#6a6c6b] mb-2">{instructorName}</p>

                  {/* Progress */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-[#dee2e6] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-[#2a63cd]'}`}
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#6a6c6b] shrink-0">{enrollment.progress}%</span>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cursos/${course.slug}/aprender`}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${isCompleted
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-[#2a63cd] text-white hover:bg-[#1e4ba3]'
                      }`}
                    >
                      {isCompleted ? 'Repasar Curso' : enrollment.progress > 0 ? 'Continuar' : 'Comenzar'}
                    </Link>
                    <Link
                      href={`/cursos/${course.slug}`}
                      className="px-3 py-1.5 text-xs font-semibold text-[#6a6c6b] border border-[#dee2e6] rounded-lg hover:bg-white transition-colors"
                    >
                      Ver detalles
                    </Link>
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-xs text-yellow-600 font-semibold ml-1">
                        🏆 Certificado disponible
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Browse more CTA */}
      {enrollments.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-br from-[#2a63cd]/5 to-[#2a63cd]/10 rounded-xl border border-[#2a63cd]/20 text-center">
          <p className="text-sm font-semibold text-[#212529] mb-1">¿Quieres aprender más?</p>
          <p className="text-xs text-[#6a6c6b] mb-3">Explora nuevos cursos y sigue creciendo</p>
          <Link
            href="/cursos"
            className="inline-block px-5 py-2 bg-[#2a63cd] text-white text-sm font-bold rounded-xl hover:bg-[#1e4ba3] transition-colors"
          >
            Ver más cursos
          </Link>
        </div>
      )}
    </div>
  );
}
