'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mis Cursos</h1>
          <p className="text-white/40 text-sm mt-1">{courses.length} curso{courses.length !== 1 ? 's' : ''} en total</p>
        </div>
        <Link
          href="/creator/dashboard/cursos/nuevo"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <h2 className="text-white font-bold text-lg mb-2">Sin cursos aún</h2>
          <p className="text-white/50 text-sm mb-6">Crea tu primer curso y comparte tu conocimiento.</p>
          <Link
            href="/creator/dashboard/cursos/nuevo"
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Crear primer curso
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-white font-bold">{course.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      course.isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {course.isActive ? 'Activo' : 'En revisión'}
                    </span>
                    {course.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-5 text-xs text-white/40 flex-wrap">
                    <span>{course._count.enrollments} estudiantes</span>
                    <span>{course.rating?.toFixed(1) ?? '—'} ({course._count.reviews} reseñas)</span>
                    <span>{course.totalLessons} lecciones</span>
                    <span>{course._count.modules} módulos</span>
                    <span className="text-white/60 font-bold">${course.priceUSD.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {course.isActive && (
                    <Link
                      href={`/cursos/${course.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-white/5 text-white/50 text-xs font-semibold rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                      title="Ver en catálogo"
                    >
                      Ver ↗
                    </Link>
                  )}
                  <Link
                    href={`/creator/dashboard/cursos/${course.id}`}
                    className="px-4 py-1.5 bg-[#2a63cd]/30 text-[#60a5fa] text-xs font-semibold rounded-lg hover:bg-[#2a63cd]/50 transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id, course.title)}
                    disabled={deleting === course.id}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
