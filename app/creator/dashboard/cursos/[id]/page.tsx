'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ImageUploadField from '@/components/ui/ImageUploadField';

const CATEGORIES = ['Redes', 'CCTV', 'Electrónica', 'Gaming', 'Programación', 'Hardware', 'Software', 'Otro'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const LEVEL_LABELS: Record<string, string> = { BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' };
const INPUT = 'w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#2a63cd] text-sm transition-colors';

type Lesson = { id?: string; title: string; description: string; videoUrl: string; duration: string; isFree: boolean; order: number };
type Module = { id?: string; title: string; order: number; lessons: Lesson[] };
type Course = {
  id: string; title: string; shortDesc: string | null; description: string; trailerUrl: string | null;
  category: string | null; level: string | null; priceUSD: number; thumbnail: string | null;
  isActive: boolean; slug: string;
  modules: (Module & { id: string; lessons: (Lesson & { id: string })[] })[];
};

export default function EditCreatorCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'curriculum'>('info');
  const [form, setForm] = useState({ title: '', shortDesc: '', description: '', trailerUrl: '', category: '', level: 'BEGINNER', priceUSD: '', thumbnail: '' });
  const [modules, setModules] = useState<Module[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingCurr, setSavingCurr] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/creator/courses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setCourse(data);
          setForm({
            title: data.title,
            shortDesc: data.shortDesc ?? '',
            description: data.description,
            trailerUrl: data.trailerUrl ?? '',
            category: data.category ?? '',
            level: data.level ?? 'BEGINNER',
            priceUSD: data.priceUSD.toString(),
            thumbnail: data.thumbnail ?? '',
          });
          setModules(data.modules.map((m: any) => ({
            id: m.id, title: m.title, order: m.order,
            lessons: m.lessons.map((l: any) => ({
              id: l.id, title: l.title, description: l.description ?? '', videoUrl: l.videoUrl ?? '',
              duration: l.duration?.toString() ?? '', isFree: l.isFree, order: l.order,
            })),
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function upd(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  async function saveInfo() {
    setSaving(true);
    try {
      const res = await fetch(`/api/creator/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, priceUSD: parseFloat(form.priceUSD) || 0 }),
      });
      if (res.ok) flash('✓ Información guardada');
    } finally { setSaving(false); }
  }

  async function saveCurriculum() {
    setSavingCurr(true);
    try {
      const res = await fetch(`/api/creator/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculum: modules }),
      });
      if (res.ok) flash('✓ Currículum guardado');
    } finally { setSavingCurr(false); }
  }

  // Module helpers
  function addModule() {
    setModules((p) => [...p, { title: 'Nuevo Módulo', order: p.length, lessons: [] }]);
  }
  function updModule(idx: number, title: string) {
    setModules((p) => p.map((m, i) => i === idx ? { ...m, title } : m));
  }
  function removeModule(idx: number) {
    setModules((p) => p.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order: i })));
  }
  function addLesson(mIdx: number) {
    setModules((p) => p.map((m, i) => i !== mIdx ? m : {
      ...m, lessons: [...m.lessons, { title: 'Nueva Lección', description: '', videoUrl: '', duration: '', isFree: false, order: m.lessons.length }],
    }));
  }
  function updLesson(mIdx: number, lIdx: number, field: string, value: any) {
    setModules((p) => p.map((m, i) => i !== mIdx ? m : {
      ...m, lessons: m.lessons.map((l, j) => j !== lIdx ? l : { ...l, [field]: value }),
    }));
  }
  function removeLesson(mIdx: number, lIdx: number) {
    setModules((p) => p.map((m, i) => i !== mIdx ? m : {
      ...m, lessons: m.lessons.filter((_, j) => j !== lIdx).map((l, j) => ({ ...l, order: j })),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <p className="text-white/50">Curso no encontrado.</p>
        <Link href="/creator/dashboard/cursos" className="text-[#60a5fa] text-sm hover:underline mt-3 block">
          ← Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/creator/dashboard/cursos" className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1 mb-2">
            ← Mis Cursos
          </Link>
          <h1 className="text-xl font-black text-white line-clamp-1">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              course.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {course.isActive ? 'Activo' : 'En revisión por admin'}
            </span>
          </div>
        </div>
        {msg && (
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold">
            {msg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {(['info', 'curriculum'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t ? 'bg-[#2a63cd] text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'info' ? 'Información' : 'Currículum'}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <Field label="Título *">
            <input value={form.title} onChange={(e) => upd('title', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Descripción Corta">
            <input value={form.shortDesc} onChange={(e) => upd('shortDesc', e.target.value)} className={INPUT} maxLength={160} />
          </Field>
          <Field label="Descripción Completa *">
            <textarea value={form.description} onChange={(e) => upd('description', e.target.value)} rows={4} className={INPUT + ' resize-none'} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoría">
              <select value={form.category} onChange={(e) => upd('category', e.target.value)} className={INPUT}>
                <option value="">Sin categoría</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Nivel">
              <select value={form.level} onChange={(e) => upd('level', e.target.value)} className={INPUT}>
                {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Precio (USD) *">
            <input type="number" min="0" step="0.01" value={form.priceUSD} onChange={(e) => upd('priceUSD', e.target.value)} className={INPUT} />
          </Field>
          <Field label="URL Trailer">
            <input value={form.trailerUrl} onChange={(e) => upd('trailerUrl', e.target.value)} className={INPUT} placeholder="https://youtube.com/watch?v=..." />
          </Field>
          <ImageUploadField
            label="Miniatura del Curso (Thumbnail)"
            value={form.thumbnail}
            onChange={(url) => upd('thumbnail', url)}
            placeholder="https://... o sube una imagen"
          />
          <div className="flex justify-end">
            <button
              onClick={saveInfo}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar Información'}
            </button>
          </div>
        </div>
      )}

      {/* Curriculum Tab */}
      {tab === 'curriculum' && (
        <div className="space-y-4">
          <p className="text-white/40 text-xs">
            Sube tus videos a YouTube (sin listar) o Vimeo, luego pega la URL de la lección aquí.
          </p>

          {modules.map((mod, mIdx) => (
            <div key={mIdx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Module header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5">
                <span className="text-white/30 text-xs font-bold w-6">{mIdx + 1}</span>
                <input
                  value={mod.title}
                  onChange={(e) => updModule(mIdx, e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm font-bold focus:outline-none placeholder-white/30"
                  placeholder="Título del módulo"
                />
                <button
                  onClick={() => removeModule(mIdx)}
                  className="text-red-400/50 hover:text-red-400 text-xs transition-colors"
                >
                  Eliminar
                </button>
              </div>

              {/* Lessons */}
              <div className="divide-y divide-white/5">
                {mod.lessons.map((lesson, lIdx) => (
                  <div key={lIdx} className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white/20 text-xs w-5">{lIdx + 1}.</span>
                      <input
                        value={lesson.title}
                        onChange={(e) => updLesson(mIdx, lIdx, 'title', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-[#2a63cd]"
                        placeholder="Título de la lección"
                      />
                      <button
                        onClick={() => removeLesson(mIdx, lIdx)}
                        className="text-red-400/40 hover:text-red-400 text-xs transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <input
                        value={lesson.videoUrl}
                        onChange={(e) => updLesson(mIdx, lIdx, 'videoUrl', e.target.value)}
                        className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[#2a63cd]"
                        placeholder="URL del video (YouTube/Vimeo)"
                      />
                      <input
                        value={lesson.description}
                        onChange={(e) => updLesson(mIdx, lIdx, 'description', e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[#2a63cd]"
                        placeholder="Descripción breve"
                      />
                      <input
                        type="number"
                        value={lesson.duration}
                        onChange={(e) => updLesson(mIdx, lIdx, 'duration', e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[#2a63cd]"
                        placeholder="Duración (minutos)"
                      />
                      <label className="flex items-center gap-2 col-span-2 cursor-pointer group pl-1">
                        <input
                          type="checkbox"
                          checked={lesson.isFree}
                          onChange={(e) => updLesson(mIdx, lIdx, 'isFree', e.target.checked)}
                          className="w-4 h-4 accent-[#2a63cd]"
                        />
                        <span className="text-white/50 text-xs group-hover:text-white/70 transition-colors">
                          Lección gratuita (visible sin inscripción)
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-white/5">
                <button
                  onClick={() => addLesson(mIdx)}
                  className="text-[#60a5fa] text-xs font-semibold hover:text-cyan-400 transition-colors"
                >
                  + Agregar Lección
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addModule}
            className="w-full py-3 border-2 border-dashed border-white/20 text-white/40 rounded-2xl text-sm hover:border-white/40 hover:text-white/60 transition-all"
          >
            + Agregar Módulo
          </button>

          <div className="flex justify-end">
            <button
              onClick={saveCurriculum}
              disabled={savingCurr}
              className="px-6 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {savingCurr ? 'Guardando...' : 'Guardar Currículum'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/60 text-xs font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  );
}
