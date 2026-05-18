'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { FiImage, FiPlus, FiTrash2, FiStar, FiLink, FiX } from 'react-icons/fi';

const MAX_IMAGES = 8;

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
}

export default function ImagePanel({ images, onChange, error }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (images.length + files.length > MAX_IMAGES) return;

    setUploading(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map(async (file) => {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Upload failed');
          return (await res.json()).url as string;
        })
      );
      onChange([...images, ...urls]);
    } catch {
      // silent — upload errors show via the error prop from parent
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-[88px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Imágenes</h3>
          <p className="text-xs text-gray-400 mt-0.5">{images.length} / {MAX_IMAGES}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setShowUrlInput(!showUrlInput); setUrlError(''); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Agregar por URL"
          >
            <FiLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES || uploading}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button onClick={handleAddUrl} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex-shrink-0">
              OK
            </button>
            <button onClick={() => { setShowUrlInput(false); setUrlError(''); }} className="p-1.5 text-gray-400 hover:text-gray-600">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            error ? 'border-red-300 bg-red-50/50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50',
          ].join(' ')}
        >
          {uploading ? (
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            <>
              <FiImage className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Subir imágenes</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Main image */}
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-200 group bg-gray-50">
            <Image src={images[0]} alt="Principal" fill className="object-cover" sizes="300px" />
            <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">Principal</div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleRemove(0)}
                className="bg-white p-2 rounded-full shadow-lg text-red-500 hover:text-red-600"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid of secondary images */}
          <div className="grid grid-cols-3 gap-2">
            {images.slice(1).map((url, idx) => (
              <div key={idx + 1} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
                <Image src={url} alt="" fill className="object-cover" sizes="100px" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleSetMain(idx + 1)}
                    className="p-1 bg-white rounded-full shadow text-blue-500 hover:text-blue-600"
                    title="Hacer imagen principal"
                  >
                    <FiStar className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx + 1)}
                    className="p-1 bg-white rounded-full shadow text-red-500 hover:text-red-600"
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
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-center cursor-pointer transition-colors"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiPlus className="w-5 h-5 text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">
        La primera imagen es la imagen principal
      </p>
    </div>
  );
}
