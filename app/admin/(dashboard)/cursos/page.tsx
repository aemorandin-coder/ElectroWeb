'use client';

import { useState, useEffect } from 'react';

const CATEGORIES = [
  { value: 'DESARROLLO', label: 'Desarrollo' },
  { value: 'REDES', label: 'Redes' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'SEGURIDAD', label: 'Seguridad' },
  { value: 'NEGOCIOS', label: 'Negocios' },
];

const LEVELS = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
];

const CATEGORY_COLORS: Record<string, string> = {
  DESARROLLO: 'bg-blue-100 text-blue-700',
  REDES: 'bg-green-100 text-green-700',
  ELECTRONICA: 'bg-yellow-100 text-yellow-700',
  GAMING: 'bg-purple-100 text-purple-700',
  SEGURIDAD: 'bg-red-100 text-red-700',
  NEGOCIOS: 'bg-orange-100 text-orange-700',
};

type Lesson = {
  id?: string;
  title: string;
  videoUrl: string;
  duration: string;
  isFree: boolean;
  order: number;
};

type Module = {
  id?: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  slug: string;
  shortDesc?: string;
  description: string;
  trailerUrl?: string;
  category?: string;
  level?: string;
  instructor?: string;
  priceUSD: number;
  thumbnail?: string;
  isFeatured: boolean;
  isActive: boolean;
  enrollmentCount: number;
  rating?: number;
  metaTitle?: string;
  metaDescription?: string;
  _count?: { enrollments: number; reviews: number; modules: number };
};

const EMPTY_FORM = {
  title: '',
  shortDesc: '',
  description: '',
  trailerUrl: '',
  category: '',
  level: '',
  instructor: '',
  priceUSD: '',
  thumbnail: '',
  isFeatured: false,
  isActive: true,
  metaTitle: '',
  metaDescription: '',
};

function emptyLesson(order: number): Lesson {
  return { title: '', videoUrl: '', duration: '', isFree: false, order };
}

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'curriculum'>('info');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [curriculum, setCurriculum] = useState<Module[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('');

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses');
      if (res.ok) setCourses(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCourses(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCurriculum([]);
    setActiveTab('info');
    setShowModal(true);
  }

  async function openEdit(course: Course) {
    setEditingId(course.id);
    setForm({
      title: course.title,
      shortDesc: course.shortDesc || '',
      description: course.description,
      trailerUrl: course.trailerUrl || '',
      category: course.category || '',
      level: course.level || '',
      instructor: course.instructor || '',
      priceUSD: String(course.priceUSD),
      thumbnail: course.thumbnail || '',
      isFeatured: course.isFeatured,
      isActive: course.isActive,
      metaTitle: course.metaTitle || '',
      metaDescription: course.metaDescription || '',
    });
    try {
      const res = await fetch('/api/admin/courses/' + course.id);
      if (res.ok) {
        const data = await res.json();
        setCurriculum(
          (data.modules || []).map((mod: any) => ({
            id: mod.id,
            title: mod.title,
            order: mod.order,
            lessons: (mod.lessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              videoUrl: l.videoUrl || '',
              duration: l.duration ? String(l.duration) : '',
              isFree: l.isFree,
              order: l.order,
            })),
          }))
        );
      }
    } catch {}
    setActiveTab('info');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editingId ? '/api/admin/courses/' + editingId : '/api/admin/courses';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, priceUSD: parseFloat(form.priceUSD) || 0 }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const courseId = editingId || saved.id;
      if (curriculum.length > 0) {
        await fetch('/api/admin/courses/' + courseId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curriculum }),
        });
      }
      setShowModal(false);
      loadCourses();
    } catch {
      alert('Error al guardar el curso');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(course: Course) {
    await fetch('/api/admin/courses/' + course.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !course.isActive }),
    });
    loadCourses();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este curso? Se perderán todos los módulos e inscripciones.')) return;
    setDeletingId(id);
    try {
      await fetch('/api/admin/courses/' + id, { method: 'DELETE' });
      loadCourses();
    } finally {
      setDeletingId(null);
    }
  }

  function addModule() {
    setCurriculum((prev) => [
      ...prev,
      { title: 'Módulo ' + (prev.length + 1), order: prev.length, lessons: [] },
    ]);
  }

  function updateModule(idx: number, field: string, value: any) {
    setCurriculum((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  function removeModule(idx: number) {
    setCurriculum((prev) => prev.filter((_, i) => i !== idx));
  }

  function addLesson(modIdx: number) {
    setCurriculum((prev) =>
      prev.map((m, i) =>
        i === modIdx ? { ...m, lessons: [...m.lessons, emptyLesson(m.lessons.length)] } : m
      )
    );
  }

  function updateLesson(modIdx: number, lIdx: number, field: string, value: any) {
    setCurriculum((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? { ...m, lessons: m.lessons.map((l, j) => (j === lIdx ? { ...l, [field]: value } : l)) }
          : m
      )
    );
  }

  function removeLesson(modIdx: number, lIdx: number) {
    setCurriculum((prev) =>
      prev.map((m, i) =>
        i === modIdx ? { ...m, lessons: m.lessons.filter((_, j) => j !== lIdx) } : m
      )
    );
  }

  const filtered = filterCat ? courses.filter((c) => c.category === filterCat) : courses;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#212529]">Cursos / Plataforma</h1>
          <p className="text-sm text-[#6a6c6b] mt-1">{courses.length} cursos en total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterCat('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!filterCat ? 'bg-[#2a63cd] text-white' : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'}`}
        >
          Todos ({courses.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = courses.filter((c) => c.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCat(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterCat === cat.value ? 'bg-[#2a63cd] text-white' : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'}`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Courses grid */}
      {loading ? (
        <div className="text-center py-16 text-[#6a6c6b]">Cargando cursos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-[#6a6c6b]">No hay cursos aún. ¡Crea el primero!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div key={course.id} className="bg-white border border-[#e9ecef] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40 bg-gradient-to-br from-[#2a63cd]/10 to-[#2a63cd]/5">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <svg className="w-12 h-12 text-[#2a63cd]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {course.category && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORIES.find((c) => c.value === course.category)?.label}
                    </span>
                  )}
                  {course.isFeatured && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">⭐ Destacado</span>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${course.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {course.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#212529] text-sm line-clamp-2 mb-1">{course.title}</h3>
                {course.shortDesc && <p className="text-xs text-[#6a6c6b] line-clamp-2 mb-2">{course.shortDesc}</p>}
                <div className="flex items-center gap-3 text-xs text-[#6a6c6b] mb-3">
                  <span>${Number(course.priceUSD).toFixed(2)}</span>
                  <span>{course._count?.enrollments ?? course.enrollmentCount} inscritos</span>
                  <span>{course._count?.modules ?? 0} módulos</span>
                  {course.rating && <span>★ {Number(course.rating).toFixed(1)}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(course)} className="flex-1 py-1.5 text-xs font-semibold text-[#2a63cd] border border-[#2a63cd] rounded-lg hover:bg-[#2a63cd] hover:text-white transition-colors">Editar</button>
                  <button
                    onClick={() => handleToggle(course)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${course.isActive ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                  >
                    {course.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => handleDelete(course.id)} disabled={deletingId === course.id} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9ecef]">
              <h2 className="text-lg font-bold text-[#212529]">{editingId ? 'Editar Curso' : 'Nuevo Curso'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6a6c6b] hover:text-[#212529]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#e9ecef] px-6">
              {(['info', 'curriculum'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-[#2a63cd] text-[#2a63cd]' : 'border-transparent text-[#6a6c6b] hover:text-[#212529]'}`}
                >
                  {tab === 'info' ? 'Información' : 'Currículum'}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'info' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Título *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="Título del curso" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Descripción corta</label>
                    <input value={form.shortDesc} onChange={(e) => setForm({ ...form, shortDesc: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="Resumen para la tarjeta (1-2 líneas)" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Descripción completa *</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd] resize-none" placeholder="Describe el curso en detalle..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Categoría</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]">
                      <option value="">Seleccionar...</option>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Nivel</label>
                    <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]">
                      <option value="">Seleccionar...</option>
                      {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Instructor</label>
                    <input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="Nombre del instructor" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">Precio (USD) *</label>
                    <input type="number" min="0" step="0.01" value={form.priceUSD} onChange={(e) => setForm({ ...form, priceUSD: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">URL Miniatura</label>
                    <input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="https://..." />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#6a6c6b] mb-1">URL Tráiler (YouTube/Vimeo unlisted)</label>
                    <input value={form.trailerUrl} onChange={(e) => setForm({ ...form, trailerUrl: e.target.value })} className="w-full px-3 py-2 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div className="col-span-2 flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="w-4 h-4 accent-[#2a63cd]" />
                      <span className="text-sm font-medium text-[#212529]">Destacado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#2a63cd]" />
                      <span className="text-sm font-medium text-[#212529]">Activo (visible en catálogo)</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* Curriculum tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#6a6c6b]">
                      {curriculum.length} módulo(s) · {curriculum.reduce((s, m) => s + m.lessons.length, 0)} lección(es)
                    </p>
                    <button onClick={addModule} className="px-3 py-1.5 bg-[#2a63cd] text-white text-xs font-semibold rounded-lg hover:bg-[#1e4ba3] transition-colors">
                      + Añadir Módulo
                    </button>
                  </div>

                  {curriculum.length === 0 && (
                    <div className="text-center py-10 text-[#6a6c6b] text-sm border-2 border-dashed border-[#dee2e6] rounded-xl">
                      Aún no hay módulos. Añade el primero arriba.
                    </div>
                  )}

                  {curriculum.map((mod, mIdx) => (
                    <div key={mIdx} className="border border-[#dee2e6] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#f8f9fa]">
                        <span className="text-xs font-bold text-[#6a6c6b]">{mIdx + 1}.</span>
                        <input value={mod.title} onChange={(e) => updateModule(mIdx, 'title', e.target.value)} className="flex-1 px-2 py-1 border border-[#dee2e6] rounded text-sm focus:outline-none focus:border-[#2a63cd] bg-white" placeholder="Nombre del módulo" />
                        <button onClick={() => addLesson(mIdx)} className="text-xs text-[#2a63cd] font-semibold hover:underline whitespace-nowrap">+ Lección</button>
                        <button onClick={() => removeModule(mIdx)} className="text-red-400 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {mod.lessons.map((lesson, lIdx) => (
                        <div key={lIdx} className="border-t border-[#e9ecef] px-4 py-3 bg-white">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-[#6a6c6b] pt-2 w-5 shrink-0">{lIdx + 1}.</span>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input value={lesson.title} onChange={(e) => updateLesson(mIdx, lIdx, 'title', e.target.value)} className="col-span-2 px-2 py-1.5 border border-[#dee2e6] rounded text-sm focus:outline-none focus:border-[#2a63cd]" placeholder="Título de la lección" />
                              <input value={lesson.videoUrl} onChange={(e) => updateLesson(mIdx, lIdx, 'videoUrl', e.target.value)} className="col-span-2 px-2 py-1.5 border border-[#dee2e6] rounded text-xs focus:outline-none focus:border-[#2a63cd]" placeholder="URL YouTube/Vimeo (sin listar)" />
                              <input type="number" value={lesson.duration} onChange={(e) => updateLesson(mIdx, lIdx, 'duration', e.target.value)} className="px-2 py-1.5 border border-[#dee2e6] rounded text-xs focus:outline-none focus:border-[#2a63cd]" placeholder="Duración (segundos)" />
                              <label className="flex items-center gap-2 text-xs text-[#6a6c6b] cursor-pointer">
                                <input type="checkbox" checked={lesson.isFree} onChange={(e) => updateLesson(mIdx, lIdx, 'isFree', e.target.checked)} className="accent-[#2a63cd]" />
                                Lección gratuita (preview)
                              </label>
                            </div>
                            <button onClick={() => removeLesson(mIdx, lIdx)} className="text-red-400 hover:text-red-600 pt-1 shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-[#e9ecef]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-[#6a6c6b] hover:text-[#212529] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.title || !form.description} className="px-6 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Curso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
