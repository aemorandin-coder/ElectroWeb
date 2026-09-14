'use client';

import toast from 'react-hot-toast';
import { FiShare2 } from 'react-icons/fi';

interface ShareButtonProps {
  /** Ruta relativa a compartir, p. ej. /productos/laptop o /p/LAP1 */
  path: string;
  title: string;
  className?: string;
}

/** Comparte con el menú nativo del teléfono; si no existe, copia el enlace. */
export default function ShareButton({ path, title, className = '' }: ShareButtonProps) {
  const handleShare = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch (error) {
      // Cancelar el menú de compartir no es un error
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('No se pudo compartir el enlace');
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Compartir ${title}`}
      className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 ${className}`}
    >
      <FiShare2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
