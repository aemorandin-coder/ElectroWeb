'use client';

// C-249e: una foto del panel que se sube, nunca se pega su dirección (PLAN.md §1.9): se ve antes de guardar, se cambia o se
// quita. Es la pieza de la foto del sorteo (C-221) para los asistentes: sube a /api/upload/settings con el tipo que diga
// quien la usa ('curso', 'servicio'…), que tiene que estar en la lista de esa ruta.

import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { IconoEliminar, IconoImagen, IconoSubir } from '@/components/iconos';
import { adminHint, adminLabel, adminSpinner } from '@/lib/admin-ui';

export default function SubirFoto({ nombre, etiqueta, tipo, url, onCambiar, pista, sinFoto = 'Todavía sin foto', conFoto = 'Así se ve', extra }: {
  /** El `name` del campo de archivo (lo usan las pruebas) */
  nombre: string;
  etiqueta: string;
  tipo: string;
  url: string;
  onCambiar: (url: string) => void;
  pista?: ReactNode;
  sinFoto?: string;
  conFoto?: string;
  /** Otra acción al lado de "Subir foto" (por ejemplo, usar la del video) */
  extra?: ReactNode;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const subir = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('La foto pesa más de 5 MB'); return; }
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', tipo);
      const r = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || typeof d.url !== 'string') { toast.error(d.error || 'No se pudo subir la foto'); return; }
      onCambiar(d.url);
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  return (
    <div>
      <p className={adminLabel}>{etiqueta}</p>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-3 sm:max-w-lg">
        <div className="relative flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
          {subiendo ? <span className={adminSpinner} aria-label="Subiendo" />
            // eslint-disable-next-line @next/next/no-img-element
            : url ? <img src={url} alt="" className="h-full w-full object-cover" />
              : <IconoImagen className="h-7 w-7 text-subtle" aria-hidden="true" />}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm font-semibold text-ink">{url ? conFoto : sinFoto}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <input ref={archivo} name={nombre} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); }} />
            <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
              <IconoSubir className="h-4 w-4" aria-hidden="true" /> {url ? 'Subir otra' : 'Subir foto'}
            </button>
            {extra}
            {url && (
              <button type="button" onClick={() => onCambiar('')} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-deal hover:underline">
                <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      {pista && <p className={adminHint}>{pista}</p>}
    </div>
  );
}
