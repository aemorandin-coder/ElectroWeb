'use client';

import { useRef, useState } from 'react';
import { IconoCargando, IconoSubir } from '@/components/iconos';

type Props = {
  value: string;
  onChange: (url: string) => void;
  uploadEndpoint?: string;
  label?: string;
  placeholder?: string;
  preview?: boolean;
  previewRound?: boolean;
};

export default function ImageUploadField({
  value,
  onChange,
  uploadEndpoint = '/api/creator/upload',
  label,
  placeholder = 'https://...',
  preview = true,
  previewRound = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(uploadEndpoint, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al subir imagen');
        return;
      }
      onChange(data.url);
    } catch {
      setError('Error de conexión al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const INPUT_CLASS = 'w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-500 text-sm transition-colors';

  return (
    <div>
      {label && <label className="block text-white/60 text-xs font-semibold mb-1.5">{label}</label>}

      {/* Preview */}
      {preview && value && (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className={`w-16 h-16 object-cover border border-white/20 ${previewRound ? 'rounded-full' : 'rounded-lg'}`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-white/40 text-xs">Vista previa</span>
        </div>
      )}

      {/* URL input + upload button */}
      <div
        className="flex gap-2"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS + ' flex-1'}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all text-xs font-semibold disabled:opacity-50"
          title="Subir imagen desde tu dispositivo"
        >
          {uploading ? (
            <IconoCargando className="w-4 h-4 animate-spin" />
          ) : (
            <IconoSubir className="w-4 h-4" />
          )}
          {uploading ? 'Subiendo...' : 'Subir'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {error && <p className="text-deal text-xs mt-1">{error}</p>}
      <p className="text-white/20 text-xs mt-1">Arrastra una imagen o pega una URL. JPG, PNG, WEBP · máx 5 MB</p>
    </div>
  );
}
