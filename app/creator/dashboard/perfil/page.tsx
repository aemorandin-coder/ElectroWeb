'use client';

import { useState, useEffect } from 'react';
import ImageUploadField from '@/components/ui/ImageUploadField';

const INPUT = 'w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#2a63cd] text-sm transition-colors';

export default function CreatorProfilePage() {
  const [form, setForm] = useState({ displayName: '', bio: '', expertise: '', avatar: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/creator')
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setForm({
            displayName: data.displayName ?? '',
            bio: data.bio ?? '',
            expertise: data.expertise ?? '',
            avatar: data.avatar ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/creator', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg('✓ Perfil actualizado');
        setTimeout(() => setMsg(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mi Perfil de Creador</h1>
          <p className="text-white/40 text-sm mt-1">Esta información es visible para tus estudiantes.</p>
        </div>
        {msg && (
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold">
            {msg}
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2a63cd] to-cyan-500 flex items-center justify-center text-white text-xl font-black overflow-hidden flex-shrink-0">
            {form.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              form.displayName?.[0]?.toUpperCase() || 'C'
            )}
          </div>
          <div className="flex-1">
            <ImageUploadField
              label="Foto de Perfil"
              value={form.avatar}
              onChange={(url) => setForm((p) => ({ ...p, avatar: url }))}
              placeholder="https://... o sube una imagen"
              preview={false}
              previewRound
            />
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-xs font-semibold mb-1.5">Nombre de Creador *</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            className={INPUT}
            placeholder="El nombre que verán tus estudiantes"
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs font-semibold mb-1.5">Área de Expertise</label>
          <input
            value={form.expertise}
            onChange={(e) => setForm((p) => ({ ...p, expertise: e.target.value }))}
            className={INPUT}
            placeholder="Ej: Redes, CCTV, Electrónica, Gaming..."
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs font-semibold mb-1.5">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            rows={4}
            className={INPUT + ' resize-none'}
            placeholder="Cuéntale a tus estudiantes sobre tu experiencia y lo que enseñas..."
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !form.displayName}
            className="px-6 py-2.5 bg-gradient-to-r from-[#2a63cd] to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}
