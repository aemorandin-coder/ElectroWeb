'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function CreatorDashboardPage() {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/creator')
      .then((r) => r.json())
      .then((c) => {
        if (c?.id) {
          setCreator(c);
          if (c.status === 'APPROVED') {
            return fetch('/api/creator/courses').then((r) => r.json());
          }
        }
        return [];
      })
      .then((cs) => setCourses(Array.isArray(cs) ? cs : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!creator || creator.status !== 'APPROVED') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-xl font-bold text-white mb-2">
          {creator?.status === 'PENDING' ? 'Solicitud en revisión' : 'Acceso no autorizado'}
        </h2>
        <p className="text-white/50 mb-6 text-sm">
          {creator?.status === 'PENDING'
            ? 'Tu solicitud está siendo revisada. Te avisaremos cuando sea aprobada.'
            : 'Necesitas ser un creador aprobado para acceder a este panel.'}
        </p>
        <Link href="/creator" className="text-[#60a5fa] text-sm hover:underline">
          ← Volver a la página de creadores
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
    { label: 'Estudiantes', value: totalStudents.toString(), sub: 'matriculados en total', color: 'from-blue-500/20 to-blue-600/5' },
    { label: 'Ingresos', value: `$${creator.totalRevenue.toFixed(2)}`, sub: `${creator.commissionRate}% tuyo por venta`, color: 'from-emerald-500/20 to-emerald-600/5' },
    { label: 'Cursos Activos', value: `${activeCourses}/${courses.length}`, sub: 'activos de total', color: 'from-purple-500/20 to-purple-600/5' },
    { label: 'Calificación', value: avgRating ? avgRating.toFixed(1) : '—', sub: `${totalReviews} reseñas`, color: 'from-yellow-500/20 to-yellow-600/5' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Hola, {creator.displayName}</h1>
          <p className="text-white/40 text-sm mt-1">Aquí está el resumen de tu actividad como creador.</p>
        </div>
        <Link
          href="/creator/dashboard/cursos/nuevo"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-sm w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border border-white/10 rounded-2xl p-5`}>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-white/70 text-xs font-semibold mt-0.5">{stat.label}</p>
            <p className="text-white/30 text-xs">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Mis Cursos</h2>
          <Link href="/creator/dashboard/cursos" className="text-[#60a5fa] text-sm hover:underline">
            Ver todos →
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/60 mb-4 text-sm">Aún no has creado ningún curso.</p>
            <Link
              href="/creator/dashboard/cursos/nuevo"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Crear mi primer curso
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:border-white/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-white font-semibold text-sm">{course.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      course.isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {course.isActive ? 'Activo' : 'En revisión'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
                    <span>{course._count.enrollments} estudiantes</span>
                    <span>{course.rating?.toFixed(1) ?? '—'} rating</span>
                    <span>{course.totalLessons} lecciones</span>
                    <span className="text-white/60 font-semibold">${course.priceUSD.toFixed(2)}</span>
                  </div>
                </div>
                <Link
                  href={`/creator/dashboard/cursos/${course.id}`}
                  className="flex-shrink-0 px-4 py-1.5 bg-white/10 text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-colors"
                >
                  Editar
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-[#2a63cd]/20 to-cyan-500/20 border border-[#2a63cd]/30 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-1.5 text-sm">¿Cómo funcionan tus ingresos?</h3>
        <p className="text-white/60 text-xs leading-relaxed">
          Por cada venta recibes el{' '}
          <strong className="text-white">{creator.commissionRate}%</strong> del precio del curso.
          El <strong className="text-white">{100 - creator.commissionRate}%</strong> restante es la comisión
          de plataforma. Tus cursos son revisados por el equipo de ElectroShop antes de publicarse.
        </p>
      </div>
    </div>
  );
}
