'use client';
import { formatUSD } from '@/lib/currency';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { adminPageTitle, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
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
    <div className="mx-auto max-w-2xl space-y-6 pb-20 lg:pb-0">
      {/* Back */}
      <Link
        href="/creator/dashboard/cursos"
        className="flex items-center gap-2 text-muted hover:text-ink text-sm transition-colors w-fit"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Mis Cursos
      </Link>

      <div>
        <h1 className={adminPageTitle}>Nuevo Curso</h1>
        <p className="text-muted text-sm mt-1">
          Completa la información básica. Podrás agregar el currículum después de crearlo.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-line bg-white p-4 sm:p-6">
        {error && (
          <div className="p-3 bg-deal-bg border border-deal/30 rounded-lg text-deal text-sm">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <p className="text-muted text-xs mt-1">Recibirás el 90% de cada venta ({formatUSD(form.priceUSD ? parseFloat(form.priceUSD) * 0.9 : 0)} por venta)</p>
        </Field>

        <Field label="URL de Trailer (YouTube/Vimeo)">
          <input
            value={form.trailerUrl}
            onChange={(e) => update('trailerUrl', e.target.value)}
            className={INPUT}
            placeholder="https://youtube.com/watch?v=..."
          />
        </Field>

        <div className="min-w-0 rounded-xl bg-brand-950 p-3">
        <ImageUploadField
          label="Miniatura del Curso (Thumbnail)"
          value={form.thumbnail}
          onChange={(url) => update('thumbnail', url)}
          placeholder="https://... o sube una imagen"
        />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex justify-end gap-3 border-t border-line bg-white p-3 shadow-lg lg:static lg:border-0 lg:p-0 lg:pt-2 lg:shadow-none">
          <Link
            href="/creator/dashboard/cursos"
            className={`${adminSecondaryButton} px-5 py-2.5 rounded-xl text-sm font-semibold`}
          >
            Cancelar
          </Link>
          <button
            onClick={handleCreate}
            disabled={saving}
            className={`${adminPrimaryButton} px-6 py-2.5 text-sm font-bold rounded-xl disabled:opacity-50`}
          >
            {saving ? 'Creando...' : <>Crear Curso <FiArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" /></>}
          </button>
        </div>
      </div>

      <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-950 leading-relaxed">
        <strong className="text-brand-700">Nota:</strong> Los nuevos cursos se crean en estado &quot;En revisión&quot; y necesitan aprobación del equipo de ElectroShop para ser visibles en el catálogo. Una vez aprobado podrás seguir editando el contenido.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-ink-soft text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full px-4 py-2.5 bg-white border border-line rounded-xl text-ink placeholder-muted focus:outline-none focus:border-brand-500 text-sm transition-colors';
