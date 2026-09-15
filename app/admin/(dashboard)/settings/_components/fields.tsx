'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FiImage, FiTrash2, FiUpload } from 'react-icons/fi';
import { adminCard, adminError, adminHint, adminInput, adminLabel, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';

/** Tarjeta de un grupo de ajustes, con título y para qué sirve. */
export function SettingsCard({ title, description, action, children }: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={adminCard}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action && <div className="sm:shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, htmlFor, hint, error, children, className = '' }: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className={adminLabel}>{label}</label>
      {children}
      {error ? <p className={adminError} role="alert">{error}</p> : hint ? <p className={adminHint}>{hint}</p> : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel';
  maxLength?: number;
  /** Muestra "12/60" bajo el campo */
  counter?: boolean;
  className?: string;
  autoComplete?: string;
};

export function TextField({ label, value, onChange, hint, error, placeholder, type = 'text', maxLength, counter, className, autoComplete = 'off' }: TextFieldProps) {
  const id = useId();
  const counterHint = counter && maxLength ? `${value.length}/${maxLength} caracteres` : null;
  return (
    <Field label={label} htmlFor={id} hint={counterHint ?? hint} error={error} className={className}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={adminInput(Boolean(error))}
      />
    </Field>
  );
}

export function TextAreaField({ label, value, onChange, hint, error, placeholder, maxLength, counter, rows = 3, className }: Omit<TextFieldProps, 'type'> & { rows?: number }) {
  const id = useId();
  const counterHint = counter && maxLength ? `${value.length}/${maxLength} caracteres` : null;
  return (
    <Field label={label} htmlFor={id} hint={counterHint ?? hint} error={error} className={className}>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`${adminInput(Boolean(error))} h-auto resize-y py-2.5`}
      />
    </Field>
  );
}

/** Número con prefijo ("$", "Bs") o sufijo ("%", "kg", "unidades"). */
export function NumberField({ label, value, onChange, hint, error, prefix, suffix, min = 0, max, step = 'any', placeholder, className }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className={`${adminInput(Boolean(error))} tabular-nums ${prefix ? (prefix.length > 1 ? 'pl-10' : 'pl-7') : ''} ${suffix ? 'pr-20' : ''}`}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

/** Interruptor con título y explicación. Toda la fila es clicable. */
export function SwitchRow({ label, description, checked, onChange, error }: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${checked ? 'bg-brand-500' : 'bg-subtle'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {error && <p className={adminError} role="alert">{error}</p>}
    </div>
  );
}

/** Imagen subida a /api/upload/settings. `type` es el tipo que acepta esa ruta (logo, favicon, SEO). */
export function ImageField({ label, hint, value, onChange, uploadType, aspect = 'square', error }: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  uploadType: 'logo' | 'favicon' | 'homeMetaImage' | 'productsMetaImage' | 'servicesMetaImage' | 'coursesMetaImage';
  aspect?: 'square' | 'wide';
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const maxMb = uploadType === 'logo' || uploadType === 'favicon' ? 2 : 5;

  const upload = async (file: File) => {
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`La imagen pesa más de ${maxMb} MB`);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('type', uploadType);
      const response = await fetch('/api/upload/settings', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== 'string') {
        toast.error(data.error || 'No se pudo subir la imagen');
        return;
      }
      onChange(data.url);
      toast.success('Imagen lista. Recuerda guardar.');
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="min-w-0">
      <p className={adminLabel}>{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface ${aspect === 'wide' ? 'aspect-[1200/630] w-40' : 'h-20 w-20'}`}>
          {uploading ? (
            <span className={adminSpinner} aria-label="Subiendo" />
          ) : value ? (
            <Image src={value} alt="" fill sizes={aspect === 'wide' ? '160px' : '80px'} className={aspect === 'wide' ? 'object-cover' : 'object-contain p-2'} unoptimized={!value.startsWith('/')} />
          ) : (
            <FiImage className="h-7 w-7 text-subtle" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={uploadType === 'favicon' ? 'image/png,image/x-icon,image/webp' : 'image/png,image/jpeg,image/webp'}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={`${adminSecondaryButton} h-9 whitespace-nowrap px-3`}>
            <FiUpload className="h-4 w-4" aria-hidden="true" />
            {value ? 'Cambiar' : 'Subir imagen'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-deal hover:underline">
              <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Quitar
            </button>
          )}
        </div>
      </div>
      {error ? <p className={adminError} role="alert">{error}</p> : hint ? <p className={adminHint}>{hint}</p> : null}
    </div>
  );
}
