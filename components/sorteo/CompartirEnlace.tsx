'use client';

// C-212: el enlace de cada participante para invitar: compartirlo por WhatsApp (para su estado o un chat) o copiarlo.
// C-297 (el equipo, 18/11: "mucho scroll"): el enlace y "Copiar" en una sola fila, y WhatsApp con lo que venga al lado (el
// flyer) en otra. Antes eran cuatro filas en el teléfono.
import { useState, type ReactNode } from 'react';
import { IconoCheck, IconoCopiar } from '@/components/iconos';
import { FaWhatsapp } from 'react-icons/fa6';

export default function CompartirEnlace({ enlace, mensaje, extra }: { enlace: string; mensaje: string; extra?: ReactNode }) {
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
    <div className="space-y-2">
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-1">
        <p className="min-w-0 flex-1 truncate text-sm text-ink-soft" aria-label="Tu enlace">{enlace}</p>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-line transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {copiado ? <IconoCheck className="h-4 w-4" aria-hidden="true" /> : <IconoCopiar className="h-4 w-4" aria-hidden="true" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${mensaje} ${enlace}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <FaWhatsapp className="h-5 w-5" aria-hidden="true" /> WhatsApp
        </a>
        {extra}
      </div>
    </div>
  );
}
