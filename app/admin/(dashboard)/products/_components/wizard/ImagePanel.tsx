'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FiImage, FiPlus, FiTrash2, FiStar, FiLink, FiX } from 'react-icons/fi';
import { uploadProductPhoto } from '@/lib/product-photo-upload';

const MAX_IMAGES = 8;

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
  /** C-119: un usado lleva fotos reales de la unidad, sin la cinta "ES" (decisión de Andrés) */
  badge?: boolean;
}

export default function ImagePanel({ images, onChange, error, badge = true }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Son ${MAX_IMAGES} fotos como máximo: quedan ${MAX_IMAGES - images.length}`);
      if (e.target) e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.all(
        // C-117: con fondo transparente, el servidor arma la foto final con fondo blanco y la cinta "ES"
        Array.from(files).map((file) => uploadProductPhoto(file, { badge }))
      );
      onChange([...images, ...results.map((r) => r.url)]);
      const badged = results.filter((r) => r.badged).length;
      if (badged) toast.success(badged === 1 ? 'Foto lista con fondo blanco y la cinta ES' : `${badged} fotos listas con fondo blanco y la cinta ES`);
    } catch (err) {
      // Antes el error se tragaba en silencio y la foto simplemente no aparecía
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddUrl = () => {
    setUrlError('');
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setUrlError('URL inválida');
      return;
    }
    if (images.length >= MAX_IMAGES) return;
    onChange([...images, trimmed]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemove = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  const handleSetMain = (i: number) => {
    const next = [...images];
    const [main] = next.splice(i, 1);
    onChange([main, ...next]);
  };

  return (
    <div className="bg-white rounded-2xl border border-line shadow-sm p-5 sticky top-[88px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Imágenes</h3>
          <p className="text-xs text-muted mt-0.5">{images.length} / {MAX_IMAGES}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setShowUrlInput(!showUrlInput); setUrlError(''); }}
            className="p-1.5 text-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Agregar por URL"
          >
            <FiLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES || uploading}
            className="p-1.5 text-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Subir imagen"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

      {/* URL input */}
      {showUrlInput && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="https://..."
              className="flex-1 px-3 py-1.5 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-500"
              autoFocus
            />
            <button onClick={handleAddUrl} className="px-3 py-1.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 flex-shrink-0">
              OK
            </button>
            <button onClick={() => { setShowUrlInput(false); setUrlError(''); }} className="p-1.5 text-muted hover:text-ink-soft">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          {urlError && <p className="text-xs text-deal mt-1">{urlError}</p>}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            error ? 'border-deal bg-deal-bg' : 'border-line hover:border-brand-500 hover:bg-brand-50',
          ].join(' ')}
        >
          {uploading ? (
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            <>
              <FiImage className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm font-medium text-muted">Subir imágenes</p>
              <p className="text-xs text-muted mt-1">JPG, PNG, WEBP</p>
              <p className="text-xs text-muted mt-1">
                {badge ? 'PNG con fondo transparente: la tienda pone el fondo blanco y la cinta ES' : 'Fotos reales de esta unidad: frente, atrás y detalles (mínimo 3)'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Main image */}
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-brand-500/30 group bg-surface">
            <Image src={images[0]} alt="Principal" fill className="object-cover" sizes="300px" />
            <div className="absolute top-2 left-2 bg-brand-500 text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">Principal</div>
            {/* Acciones siempre visibles en pantallas táctiles; en escritorio al pasar el mouse o con el teclado */}
            <div className="absolute right-2 top-2 flex gap-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => handleRemove(0)}
                className="bg-white p-2 rounded-full shadow-lg text-deal hover:text-deal"
                aria-label="Quitar la foto principal"
                title="Quitar"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid of secondary images */}
          <div className="grid grid-cols-3 gap-2">
            {images.slice(1).map((url, idx) => (
              <div key={idx + 1} className="relative aspect-square rounded-lg overflow-hidden border border-line group bg-surface">
                <Image src={url} alt="" fill className="object-cover" sizes="100px" />
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleSetMain(idx + 1)}
                    className="p-1.5 bg-white rounded-full shadow text-brand-600 hover:text-brand-700"
                    title="Hacer imagen principal"
                    aria-label={`Hacer principal la foto ${idx + 2}`}
                  >
                    <FiStar className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx + 1)}
                    className="p-1.5 bg-white rounded-full shadow text-deal hover:text-deal"
                    title="Quitar"
                    aria-label={`Quitar la foto ${idx + 2}`}
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add slot */}
            {images.length < MAX_IMAGES && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-line hover:border-brand-500 hover:bg-brand-50 flex items-center justify-center cursor-pointer transition-colors"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiPlus className="w-5 h-5 text-muted" />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-deal-bg border border-deal/30 rounded-lg">
          <p className="text-xs text-deal font-medium">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted mt-3 text-center">
        La primera imagen es la imagen principal. {badge ? 'Con fondo transparente, la tienda pone el fondo blanco y la cinta ES.' : 'Usado: fotos reales de esta unidad, mínimo 3.'}
      </p>
    </div>
  );
}
