'use client';
import { formatUSD } from '@/lib/currency';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheck } from 'react-icons/fi';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  isFree: boolean;
  order: number;
};

type Module = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  isVerified: boolean;
  createdAt: string;
  user: { name?: string | null; image?: string | null };
};

type Course = {
  id: string;
  title: string;
  slug: string;
  shortDesc?: string | null;
  description: string;
  trailerUrl?: string | null;
  category?: string | null;
  level?: string | null;
  instructor?: string | null;
  priceUSD: any;
  rating?: any;
  enrollmentCount: number;
  totalLessons?: number | null;
  totalDuration?: number | null;
  isFeatured: boolean;
  thumbnail?: string | null;
  creator?: { displayName: string; bio?: string | null; avatar?: string | null; expertise?: string | null } | null;
  modules: Module[];
  reviews: Review[];
  _count: { enrollments: number; reviews: number };
};

type Props = {
  course: Course;
  isEnrolled: boolean;
  enrollment: { progress: number } | null;
  userBalance: number | null;
  isLoggedIn: boolean;
};

const LEVEL_LABELS: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-line fill-line'}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function CourseDetailClient({ course, isEnrolled, enrollment, userBalance, isLoggedIn }: Props) {
  const [openModule, setOpenModule] = useState<string | null>(course.modules[0]?.id || null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  useBodyScrollLock(Boolean(activeLesson));
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const price = Number(course.priceUSD);
  const rating = course.rating ? Number(course.rating) : null;
  const instructorName = course.creator?.displayName || course.instructor || 'ElectroShop';
  const isFree = price === 0;
  const canEnroll = isLoggedIn && !isEnrolled;
  const hasBalance = userBalance !== null && userBalance >= price;

  async function handleEnroll() {
    setEnrolling(true);
    setEnrollError('');
    try {
      const res = await fetch(`/api/courses/${course.slug}/enroll`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setEnrollError(data.error || 'Error al inscribirse');
      } else {
        setEnrollSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setEnrollError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleReview() {
    if (!myRating) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${course.slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: myRating, comment: myComment }),
      });
      if (res.ok) {
        setReviewSubmitted(true);
        setTimeout(() => window.location.reload(), 1000);
      }
    } finally {
      setSubmittingReview(false);
    }
  }

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ===== LEFT COLUMN ===== */}
        <div className="flex-1 min-w-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <Link href="/cursos" className="hover:text-brand-500 transition-colors">Cursos</Link>
            <span>/</span>
            {course.category && <span>{course.category}</span>}
            {course.category && <span>/</span>}
            <span className="text-ink font-medium truncate">{course.title}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3">{course.title}</h1>
          {course.shortDesc && <p className="text-lg text-muted mb-4">{course.shortDesc}</p>}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {rating && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-warning-strong">{rating.toFixed(1)}</span>
                <StarRow rating={rating} />
                <span className="text-sm text-muted">({course._count.reviews} reseñas)</span>
              </div>
            )}
            <span className="text-sm text-muted">{course._count.enrollments} estudiantes</span>
            {course.level && (
              <span className="px-2 py-0.5 bg-surface border border-line-strong rounded-full text-xs font-semibold text-ink">
                {LEVEL_LABELS[course.level] || course.level}
              </span>
            )}
          </div>

          <p className="text-sm text-muted mb-6">Instructor: <span className="font-semibold text-ink">{instructorName}</span></p>

          {/* Mobile CTA card */}
          <div className="lg:hidden mb-6 bg-white rounded-xl border border-line shadow-md p-5">
            <EnrollCard
              price={price}
              isFree={isFree}
              isEnrolled={isEnrolled}
              canEnroll={canEnroll}
              isLoggedIn={isLoggedIn}
              hasBalance={hasBalance}
              userBalance={userBalance}
              enrolling={enrolling}
              enrollError={enrollError}
              enrollSuccess={enrollSuccess}
              progress={enrollment?.progress ?? 0}
              slug={course.slug}
              onEnroll={handleEnroll}
              thumbnail={course.thumbnail}
              trailerUrl={course.trailerUrl}
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-line p-6 mb-6">
            <h2 className="text-lg font-bold text-ink mb-3">Descripción del Curso</h2>
            <p className="text-muted whitespace-pre-line leading-relaxed">{course.description}</p>
          </div>

          {/* Curriculum */}
          {course.modules.length > 0 && (
            <div className="bg-white rounded-xl border border-line p-6 mb-6">
              <h2 className="text-lg font-bold text-ink mb-1">Contenido del Curso</h2>
              <p className="text-sm text-muted mb-4">{course.modules.length} módulos · {totalLessons} lecciones</p>

              <div className="space-y-2">
                {course.modules.map((mod) => (
                  <div key={mod.id} className="border border-line rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpenModule(openModule === mod.id ? null : mod.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-surface text-left hover:bg-line transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className={`w-4 h-4 text-muted transition-transform ${openModule === mod.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-semibold text-sm text-ink">{mod.title}</span>
                      </div>
                      <span className="text-xs text-muted">{mod.lessons.length} lecciones</span>
                    </button>

                    {openModule === mod.id && (
                      <div className="divide-y divide-surface">
                        {mod.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface transition-colors">
                            <div className="flex items-center gap-3">
                              {lesson.videoUrl ? (
                                <button
                                  onClick={() => setActiveLesson(lesson)}
                                  className="flex items-center gap-2 text-sm text-brand-500 hover:underline"
                                >
                                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  {lesson.title}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted">
                                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  {lesson.title}
                                </div>
                              )}
                              {lesson.isFree && (
                                <span className="px-1.5 py-0.5 bg-success/15 text-success-strong text-xs font-semibold rounded">Preview</span>
                              )}
                            </div>
                            {lesson.duration && (
                              <span className="text-xs text-muted shrink-0">{formatDuration(lesson.duration)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructor bio */}
          {course.creator && (
            <div className="bg-white rounded-xl border border-line p-6 mb-6">
              <h2 className="text-lg font-bold text-ink mb-4">Sobre el Instructor</h2>
              <div className="flex items-start gap-4">
                {course.creator.avatar ? (
                  <Image src={course.creator.avatar} alt={course.creator.displayName} width={56} height={56} className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-brand-500">{course.creator.displayName[0]}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-ink">{course.creator.displayName}</h3>
                  {course.creator.expertise && (
                    <p className="text-sm text-brand-500 mb-2">{course.creator.expertise}</p>
                  )}
                  {course.creator.bio && (
                    <p className="text-sm text-muted">{course.creator.bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-xl border border-line p-6">
            <h2 className="text-lg font-bold text-ink mb-4">
              Reseñas de Estudiantes ({course._count.reviews})
            </h2>

            {/* Write review (enrolled users only) */}
            {isEnrolled && !reviewSubmitted && (
              <div className="bg-surface rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-ink mb-2">Deja tu reseña</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setMyRating(s)}>
                      <svg className={`w-7 h-7 transition-colors ${s <= myRating ? 'text-warning fill-warning' : 'text-line fill-line hover:text-warning hover:fill-warning'}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:outline-none focus:border-brand-500 resize-none mb-2"
                  placeholder="Comparte tu experiencia con este curso..."
                />
                <button
                  onClick={handleReview}
                  disabled={!myRating || submittingReview}
                  className="px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {submittingReview ? 'Enviando...' : 'Publicar Reseña'}
                </button>
              </div>
            )}

            {course.reviews.length === 0 ? (
              <p className="text-sm text-muted">Este curso aún no tiene reseñas. ¡Sé el primero!</p>
            ) : (
              <div className="space-y-4">
                {course.reviews.map((review) => (
                  <div key={review.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-brand-500">
                      {review.user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-ink">{review.user.name || 'Usuario'}</span>
                        {review.isVerified && <span className="inline-flex items-center gap-1 text-xs text-success-strong font-medium"><FiCheck className="inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />Verificado</span>}
                      </div>
                      <StarRow rating={review.rating} />
                      {review.comment && <p className="text-sm text-muted mt-1">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT COLUMN (sticky, desktop) ===== */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-line shadow-lg overflow-hidden">
            <EnrollCard
              price={price}
              isFree={isFree}
              isEnrolled={isEnrolled}
              canEnroll={canEnroll}
              isLoggedIn={isLoggedIn}
              hasBalance={hasBalance}
              userBalance={userBalance}
              enrolling={enrolling}
              enrollError={enrollError}
              enrollSuccess={enrollSuccess}
              progress={enrollment?.progress ?? 0}
              slug={course.slug}
              onEnroll={handleEnroll}
              thumbnail={course.thumbnail}
              trailerUrl={course.trailerUrl}
            />
          </div>
        </div>
      </div>

      {/* Lesson video modal */}
      {activeLesson && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-ink/90 p-4" onClick={() => setActiveLesson(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{activeLesson.title}</h3>
              <button onClick={() => setActiveLesson(null)} className="text-white/70 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {activeLesson.videoUrl && getEmbedUrl(activeLesson.videoUrl) ? (
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={getEmbedUrl(activeLesson.videoUrl)!}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-ink flex items-center justify-center">
                <p className="text-white/80 text-sm">Video no disponible</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type EnrollCardProps = {
  price: number;
  isFree: boolean;
  isEnrolled: boolean;
  canEnroll: boolean;
  isLoggedIn: boolean;
  hasBalance: boolean;
  userBalance: number | null;
  enrolling: boolean;
  enrollError: string;
  enrollSuccess: boolean;
  progress: number;
  slug: string;
  thumbnail?: string | null;
  trailerUrl?: string | null;
  onEnroll: () => void;
};

function EnrollCard({
  price, isFree, isEnrolled, isLoggedIn, hasBalance,
  userBalance, enrolling, enrollError, enrollSuccess, progress,
  slug, thumbnail, trailerUrl, onEnroll,
}: EnrollCardProps) {
  const [showTrailer, setShowTrailer] = useState(false);

  function getEmbedUrl(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    return null;
  }

  return (
    <div className="p-5">
      {/* Thumbnail / Trailer preview */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-ink mb-4">
        {showTrailer && trailerUrl && getEmbedUrl(trailerUrl) ? (
          <iframe src={getEmbedUrl(trailerUrl)!} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
        ) : (
          <>
            {thumbnail ? (
              <Image src={thumbnail} alt="Miniatura del curso" width={640} height={360} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-950">
                <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {trailerUrl && (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute inset-0 flex flex-col items-center justify-center bg-ink/40 hover:bg-ink/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform mb-2">
                  <svg className="w-6 h-6 text-brand-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-white text-sm font-semibold">Ver tráiler del curso</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Price */}
      <div className="text-3xl font-bold text-ink mb-4">
        {isFree ? 'Gratis' : formatUSD(price)}
      </div>

      {/* CTA */}
      {isEnrolled ? (
        <div className="space-y-3">
          <div className="w-full bg-line rounded-full h-2 mb-1">
            <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted text-center">{progress}% completado</p>
          <Link
            href={`/cursos/${slug}/aprender`}
            className="block w-full py-3 bg-brand-500 text-white text-center font-bold rounded-xl hover:bg-brand-600 transition-colors"
          >
            Continuar Curso
          </Link>
        </div>
      ) : isLoggedIn ? (
        <div className="space-y-3">
          {!isFree && userBalance !== null && (
            <p className="text-xs text-muted text-center">
              Tu saldo: <span className={`font-bold ${hasBalance ? 'text-success-strong' : 'text-deal'}`}>{formatUSD(userBalance)}</span>
              {!hasBalance && ' — insuficiente'}
            </p>
          )}
          {enrollError && <p className="text-xs text-deal text-center">{enrollError}</p>}
          {enrollSuccess && <p className="text-xs text-success-strong text-center font-semibold">¡Inscripción exitosa! Redirigiendo...</p>}
          <button
            onClick={onEnroll}
            disabled={enrolling || enrollSuccess || (!isFree && !hasBalance)}
            className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrolling ? 'Procesando...' : isFree ? 'Inscribirse Gratis' : 'Inscribirse Ahora'}
          </button>
          {!isFree && !hasBalance && (
            <Link href="/customer/balance" className="block w-full py-2.5 text-center text-sm font-semibold text-brand-500 border border-brand-500 rounded-xl hover:bg-brand-500/5 transition-colors">
              Recargar Saldo
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Link
            href={`/login?redirect=/cursos/${slug}`}
            className="block w-full py-3 bg-brand-500 text-white text-center font-bold rounded-xl hover:bg-brand-600 transition-colors"
          >
            Iniciar Sesión para Inscribirse
          </Link>
          <Link
            href="/registro"
            className="block w-full py-2.5 text-center text-sm font-semibold text-brand-500 border border-brand-500 rounded-xl hover:bg-brand-500/5 transition-colors"
          >
            Crear Cuenta
          </Link>
        </div>
      )}

      <p className="text-xs text-muted text-center mt-3">
        {isFree ? 'Acceso inmediato y gratuito' : 'Pago único · Acceso de por vida'}
      </p>
    </div>
  );
}
