'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  duration?: string;
  level?: string;
  instructor?: string;
  priceUSD: number;
  isOnline: boolean;
  isInPerson: boolean;
  maxStudents?: number;
  isFeatured: boolean;
}

interface CursosClientProps {
  courses: Course[];
}

export default function CursosClient({ courses }: CursosClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No hay cursos disponibles</h3>
          <p className="text-gray-500">Vuelve más tarde para ver nuestros cursos de tecnología.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/cursos/${course.slug}`}
              className="group bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Course Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] overflow-hidden">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                {course.isFeatured && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-lg">
                    ⭐ Destacado
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#212529] mb-2 line-clamp-2 group-hover:text-[#2a63cd] transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-[#6a6c6b] mb-4 line-clamp-3">
                  {course.description}
                </p>

                {/* Course Details */}
                <div className="space-y-2 mb-4">
                  {course.duration && (
                    <div className="flex items-center gap-2 text-xs text-[#6a6c6b]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.duration}
                    </div>
                  )}
                  {course.level && (
                    <div className="flex items-center gap-2 text-xs text-[#6a6c6b]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Nivel: {course.level}
                    </div>
                  )}
                  {course.instructor && (
                    <div className="flex items-center gap-2 text-xs text-[#6a6c6b]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {course.instructor}
                    </div>
                  )}
                </div>

                {/* Mode badges */}
                <div className="flex gap-2 mb-4">
                  {course.isOnline && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      Online
                    </span>
                  )}
                  {course.isInPerson && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      Presencial
                    </span>
                  )}
                </div>

                {/* Price & Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-[#6a6c6b]">Precio</p>
                    <p className="text-2xl font-black text-[#2a63cd]">${course.priceUSD.toFixed(2)}</p>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-bold rounded-xl group-hover:shadow-lg transition-all">
                    Ver Más
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-16 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-[#212529] mb-4">
          ¿Quieres aprender reparación de equipos?
        </h2>
        <p className="text-[#6a6c6b] mb-6 max-w-2xl mx-auto">
          Ofrecemos cursos prácticos de reparación de computadoras, laptops y consolas. ¡Aprende una habilidad valiosa!
        </p>
        <Link
          href="/contacto"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contactar para Inscripción
        </Link>
      </div>
    </main>
  );
}
