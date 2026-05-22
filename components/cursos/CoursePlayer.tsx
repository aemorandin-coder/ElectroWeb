'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

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

type Course = {
  id: string;
  title: string;
  slug: string;
  creator?: { displayName: string; avatar?: string | null } | null;
  instructor?: string | null;
  modules: Module[];
};

type Enrollment = {
  progress: number;
  completedLessons: string[];
  completedAt: string | null;
  certificateId?: string | null;
};

type Props = {
  course: Course;
  enrollment: Enrollment | null;
  isCreatorPreview?: boolean;
};

function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatProgress(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CoursePlayer({ course, enrollment, isCreatorPreview = false }: Props) {
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const firstLesson = allLessons[0] ?? null;

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(firstLesson);
  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(course.modules.map((m) => m.id))
  );
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(enrollment?.completedLessons ?? [])
  );
  const [progress, setProgress] = useState(enrollment?.progress ?? 0);
  const [certificateId, setCertificateId] = useState<string | null>(enrollment?.certificateId ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCert, setShowCert] = useState(enrollment?.completedAt !== null && enrollment?.completedAt !== undefined);

  const totalLessons = allLessons.length;
  const instructorName = course.creator?.displayName || course.instructor || 'ElectroShop';

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function nextLesson() {
    if (!activeLesson) return;
    const idx = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (idx < allLessons.length - 1) setActiveLesson(allLessons[idx + 1]);
  }

  function prevLesson() {
    if (!activeLesson) return;
    const idx = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (idx > 0) setActiveLesson(allLessons[idx - 1]);
  }

  const markComplete = useCallback(
    async (lessonId: string, completed: boolean) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/courses/${course.slug}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, completed }),
        });
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress);
          setCompletedLessons(new Set(data.completedLessons));
          if (data.certificateId) setCertificateId(data.certificateId);
          if (data.progress === 100 && !showCert) setShowCert(true);
        }
      } finally {
        setSaving(false);
      }
    },
    [course.slug, showCert]
  );

  function toggleComplete(lessonId: string) {
    const isDone = completedLessons.has(lessonId);
    markComplete(lessonId, !isDone);
  }

  const activeIdx = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const isFirst = activeIdx === 0;
  const isLast = activeIdx === allLessons.length - 1;
  const isCompleted = activeLesson ? completedLessons.has(activeLesson.id) : false;
  const embedUrl = activeLesson?.videoUrl ? getEmbedUrl(activeLesson.videoUrl) : null;

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] overflow-hidden">

      {/* Creator preview banner */}
      {isCreatorPreview && (
        <div className="shrink-0 bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-amber-400 text-xs font-bold">👁 Vista previa de creador — el progreso no se guarda</span>
        </div>
      )}

      {/* ── Top Bar ── */}
      <header className="shrink-0 flex items-center gap-4 px-4 py-2.5 bg-[#16213e] border-b border-white/10 z-20">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="text-white/60 hover:text-white transition-colors"
          title="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href={`/cursos/${course.slug}`} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{course.title}</p>
          <p className="text-white/50 text-xs">{instructorName}</p>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-32 bg-white/10 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-[#2a63cd] to-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/70 text-xs font-semibold whitespace-nowrap">{progress}% completado</span>
        </div>

        {progress === 100 && (
          <button
            onClick={() => setShowCert(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            🏆 Certificado
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar (curriculum) ── */}
        <aside
          className={`shrink-0 flex flex-col bg-[#16213e] border-r border-white/10 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'w-72 lg:w-80' : 'w-0'} overflow-hidden`}
        >
          <div className="p-4 border-b border-white/10">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Contenido del Curso</p>
            <p className="text-white/40 text-xs">{completedLessons.size}/{totalLessons} lecciones completadas</p>
          </div>

          {course.modules.map((mod) => (
            <div key={mod.id} className="border-b border-white/5">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    className={`w-3.5 h-3.5 text-white/40 shrink-0 transition-transform ${openModules.has(mod.id) ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-white/80 text-xs font-semibold truncate">{mod.title}</span>
                </div>
                <span className="text-white/30 text-xs shrink-0 ml-2">
                  {mod.lessons.filter((l) => completedLessons.has(l.id)).length}/{mod.lessons.length}
                </span>
              </button>

              {openModules.has(mod.id) && (
                <div className="pb-1">
                  {mod.lessons.map((lesson) => {
                    const done = completedLessons.has(lesson.id);
                    const active = activeLesson?.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-[#2a63cd]/30 border-l-2 border-[#2a63cd]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                      >
                        {/* Completion circle */}
                        <div className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>
                          {done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug truncate ${active ? 'text-white font-semibold' : done ? 'text-white/50' : 'text-white/70'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {lesson.isFree && (
                              <span className="text-[10px] text-green-400">Preview</span>
                            )}
                            {lesson.duration && (
                              <span className="text-[10px] text-white/30">{formatDuration(lesson.duration)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* ── Main player ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Video area */}
          <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
            {activeLesson ? (
              embedUrl ? (
                <iframe
                  key={activeLesson.id}
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-white/30 gap-4 p-8 text-center">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Video no disponible para esta lección</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-white/20 gap-3">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p>Selecciona una lección para comenzar</p>
              </div>
            )}
          </div>

          {/* Controls bar */}
          {activeLesson && (
            <div className="shrink-0 bg-[#16213e] border-t border-white/10 px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Lesson title */}
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{activeLesson.title}</p>
                  {activeLesson.description && (
                    <p className="text-white/40 text-xs truncate">{activeLesson.description}</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={prevLesson}
                    disabled={isFirst}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </button>

                  {!isCreatorPreview && (
                    <button
                      onClick={() => toggleComplete(activeLesson.id)}
                      disabled={saving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${isCompleted
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-[#2a63cd] text-white hover:bg-[#1e4ba3]'
                      }`}
                    >
                      {saving ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : isCompleted ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Completada
                        </>
                      ) : (
                        'Marcar Completada'
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (!isCompleted) markComplete(activeLesson.id, true);
                      nextLesson();
                    }}
                    disabled={isLast}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile progress bar */}
              <div className="sm:hidden mt-2 flex items-center gap-2">
                <div className="flex-1 bg-white/10 rounded-full h-1">
                  <div
                    className="h-1 rounded-full bg-gradient-to-r from-[#2a63cd] to-cyan-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-white/50 text-xs">{progress}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Certificate modal ── */}
      {showCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-[#212529] mb-2">¡Felicitaciones!</h2>
            <p className="text-[#6a6c6b] mb-2">Completaste el curso</p>
            <p className="text-xl font-bold text-[#2a63cd] mb-6">{course.title}</p>
            <div className="border-2 border-dashed border-[#2a63cd]/30 rounded-xl p-5 mb-5 bg-[#f8f9fa]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                </svg>
                <span className="text-sm font-bold text-[#2a63cd]">Certificado de Finalización</span>
              </div>
              <p className="text-xs text-[#6a6c6b] mb-3">ElectroShop certifica que completaste este curso satisfactoriamente.</p>
              {certificateId && (
                <p className="text-[10px] text-[#6a6c6b] font-mono bg-white border border-[#e9ecef] rounded px-2 py-1 truncate">
                  ID: {certificateId}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCert(false)}
                className="flex-1 py-2.5 border border-[#dee2e6] text-[#6a6c6b] text-sm font-semibold rounded-xl hover:bg-[#f8f9fa] transition-colors"
              >
                Cerrar
              </button>
              {certificateId && (
                <Link
                  href={`/certificado/${certificateId}`}
                  target="_blank"
                  className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity text-center"
                >
                  Ver Certificado →
                </Link>
              )}
              <Link
                href="/customer/mis-cursos"
                className="flex-1 py-2.5 bg-[#2a63cd] text-white text-sm font-semibold rounded-xl hover:bg-[#1e4ba3] transition-colors text-center"
              >
                Mis Cursos
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
