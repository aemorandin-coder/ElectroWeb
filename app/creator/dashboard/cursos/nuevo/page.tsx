'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploadField from '@/components/ui/ImageUploadField';

const CATEGORIES = ['Redes', 'CCTV', 'Electrónica', 'Gaming', 'Programación', 'Hardware', 'Software', 'Otro'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const LEVEL_LABELS: Record<string, string> = { BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' };

export default function NuevoCursoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    shortDesc: '',
    description: '',
    trailerUrl: '',
    category: '',
    level: 'BEGINNER',
    priceUSD: '',
    thumbnail: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.title || !form.description || !form.priceUSD) {
      setError('Título, descripción y precio son requeridos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/creator/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear curso'); return; }
      router.push(`/creator/dashboard/cursos/${data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/creator/dashboard/cursos"
        className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors w-fit"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Mis Cursos
      </Link>

      <div>
        <h1 className="text-2xl font-black text-white">Nuevo Curso</h1>
        <p className="text-white/40 text-sm mt-1">
          Completa la información básica. Podrás agregar el currículum después de crearlo.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <Field label="Título del Curso *">
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className={INPUT}
            placeholder="Ej: Instalación y Configuración de Redes LAN"
          />
        </Field>

        <Field label="Descripción Corta">
          <input
            value={form.shortDesc}
            onChange={(e) => update('shortDesc', e.target.value)}
            className={INPUT}
            placeholder="Una frase para el catálogo (max 160 caracteres)"
            maxLength={160}
          />
        </Field>

        <Field label="Descripción Completa *">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
            className={INPUT + ' resize-none'}
            placeholder="¿Qué aprenderán tus estudiantes? ¿A quién está dirigido? ¿Qué necesitan saber previamente?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría">
            <select value={form.category} onChange={(e) => update('category', e.target.value)} className={INPUT}>
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Nivel">
            <select value={form.level} onChange={(e) => update('level', e.target.value)} className={INPUT}>
              {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Precio (USD) *">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.priceUSD}
            onChange={(e) => update('priceUSD', e.target.value)}
            className={INPUT}
            placeholder="Ej: 19.99"
          />
          <p className="text-white/30 text-xs mt-1">Recibirás el 90% de cada venta (${form.priceUSD ? (parseFloat(form.priceUSD) * 0.9).toFixed(2) : '0.00'} por venta)</p>
        </Field>

        <Field label="URL de Trailer (YouTube/Vimeo)">
          <input
            value={form.trailerUrl}
            onChange={(e) => update('trailerUrl', e.target.value)}
            className={INPUT}
            placeholder="https://youtube.com/watch?v=..."
          />
        </Field>

        <ImageUploadField
          label="Miniatura del Curso (Thumbnail)"
          value={form.thumbnail}
          onChange={(url) => update('thumbnail', url)}
          placeholder="https://... o sube una imagen"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/creator/dashboard/cursos"
            className="px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear Curso →'}
          </button>
        </div>
      </div>

      <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white/40 leading-relaxed">
        <strong className="text-white/60">Nota:</strong> Los nuevos cursos se crean en estado &quot;En revisión&quot; y necesitan aprobación del equipo de ElectroShop para ser visibles en el catálogo. Una vez aprobado podrás seguir editando el contenido.
      </div>
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

const INPUT = 'w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#2a63cd] text-sm transition-colors';
