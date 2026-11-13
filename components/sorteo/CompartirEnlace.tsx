'use client';

// C-212: el enlace de cada participante para invitar: compartirlo por WhatsApp (para su estado o un chat) o copiarlo.
import { useState } from 'react';
import { IconoCheck, IconoCopiar } from '@/components/iconos';
import { FaWhatsapp } from 'react-icons/fa6';

export default function CompartirEnlace({ enlace, mensaje }: { enlace: string; mensaje: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso del navegador: el enlace queda a la vista para copiarlo a mano
    }
  };
  return (
    <div className="space-y-3">
      <p className="break-all rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-soft" aria-label="Tu enlace">{enlace}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${mensaje} ${enlace}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <FaWhatsapp className="h-5 w-5" aria-hidden="true" /> Compartir por WhatsApp
        </a>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          {copiado ? <IconoCheck className="h-4 w-4" aria-hidden="true" /> : <IconoCopiar className="h-4 w-4" aria-hidden="true" />}
          {copiado ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>
    </div>
  );
}
