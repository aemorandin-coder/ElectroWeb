'use client';

import { useState } from 'react';
import { FiUpload, FiFile, FiX, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';

interface DocumentUploadProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File | null) => void;
  currentFileUrl?: string;
  disabled?: boolean;
}

export default function DocumentUpload({
  label,
  accept = '.pdf,.jpg,.jpeg,.png',
  onFileSelect,
  currentFileUrl,
  disabled = false,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentFileUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo no puede exceder 5MB');
      return;
    }

    // Validate file type
    const validTypes = accept.split(',').map((t) => t.trim());
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      setError(`Tipo de archivo no permitido. Usa: ${accept}`);
      return;
    }

    setError(null);
    setFile(selectedFile);
    onFileSelect(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onFileSelect(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-ink uppercase tracking-wider">{label}</label>

      {!file && !preview ? (
        <div className="relative">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
            id={`upload-${label.replace(/\s/g, '-')}`}
          />
          <label
            htmlFor={`upload-${label.replace(/\s/g, '-')}`}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              disabled
                ? 'border-line-strong bg-surface cursor-not-allowed'
                : 'border-line-strong bg-surface/50 hover:bg-surface hover:border-brand-500'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FiUpload className={`w-8 h-8 mb-2 ${disabled ? 'text-subtle' : 'text-brand-500'}`} />
              <p className={`text-sm ${disabled ? 'text-subtle' : 'text-muted'}`}>
                <span className="font-semibold text-ink">Click para subir</span> o arrastra aquí
              </p>
              <p className="text-xs text-muted mt-1">{accept.replace(/\./g, '').toUpperCase()} (max 5MB)</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="relative p-4 border border-line rounded-xl bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preview && (file?.type.startsWith('image/') || currentFileUrl?.match(/\.(jpg|jpeg|png)$/i)) ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-lg border border-line"
                  unoptimized
                />
              ) : (
                <div className="w-16 h-16 bg-deal-bg rounded-lg flex items-center justify-center">
                  <FiFile className="w-8 h-8 text-deal" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-ink">
                  {file?.name || 'Documento subido'}
                </p>
                <p className="text-xs text-muted">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Ver documento'}
                </p>
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 text-deal hover:bg-deal-bg rounded-lg transition-colors"
                aria-label="Eliminar documento"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
          {currentFileUrl && !file && (
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-brand-500 hover:underline flex items-center gap-1"
            >
              <FiFile className="w-3 h-3" />
              Ver documento actual
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-deal bg-deal-bg p-2.5 rounded-lg border border-deal/20">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
