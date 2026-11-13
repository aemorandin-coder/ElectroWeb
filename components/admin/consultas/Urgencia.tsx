'use client';

// C-215: la urgencia que pone Claude a los mensajes y a los "Solicitar producto" (Andrés, 13/11, la idea B): la píldora,
// el botón "Ordenar por urgencia" y el orden. Colores (PLAN §1.1 y §1.8): la urgencia es un nivel y los niveles van en azul
// (nunca en ámbar: Andrés, 13/11, "esas píldoras ámbar las detesto"); "Puede esperar" y de qué trata, en gris como un dato.

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoFlechaArriba, IconoNovedad, IconoTienda } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';
import { adminBadge, adminDato, adminSecondaryButton } from '@/lib/admin-ui';

export interface ConUrgencia {
  iaUrgencia?: string | null;
  iaTipo?: string | null;
  createdAt: string;
}

const TIPO: Record<string, string> = {
  orden: 'Su pedido', garantia: 'Garantía', compra: 'Quiere comprar', pregunta: 'Pregunta', reclamo: 'Reclamo', otro: 'Otro', spam: 'Spam',
};
const PESO: Record<string, number> = { alta: 0, media: 1, baja: 3 };

/** Lo más urgente primero; lo que Claude no revisó, en medio; a igual urgencia, lo más nuevo primero */
export function porUrgencia<T extends ConUrgencia>(lista: T[]): T[] {
  return [...lista].sort((a, b) =>
    (PESO[a.iaUrgencia ?? ''] ?? 2) - (PESO[b.iaUrgencia ?? ''] ?? 2) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function PildoraUrgencia({ urgencia, tipo }: { urgencia?: string | null; tipo?: string | null }) {
  if (!urgencia) return null;
  return (
    <>
      {urgencia === 'alta' && <span className={adminBadge('brand')}><IconoFlechaArriba className="h-3.5 w-3.5" aria-hidden="true" />Urgente</span>}
      {urgencia === 'baja' && <span className={adminDato}>Puede esperar</span>}
      {tipo && TIPO[tipo] && <span className={adminDato}>{TIPO[tipo]}</span>}
    </>
  );
}

/**
 * Lo pedido ya está en la tienda (verde fuerte con texto blanco, como lo hecho) o hay algo parecido (gris, un dato).
 * El texto se parte: un nombre largo no se sale de la tarjeta en el teléfono.
 */
export function EnLaTienda({ coincide, producto }: { coincide?: string | null; producto?: { nombre: string; slug: string; precioUSD: number } | null }) {
  if (!producto || (coincide !== 'igual' && coincide !== 'parecido')) return null;
  const igual = coincide === 'igual';
  return (
    <a
      href={`/productos/${producto.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex max-w-full items-start gap-1 rounded-2xl px-2.5 py-0.5 text-xs font-semibold [overflow-wrap:anywhere] hover:underline ${igual ? 'bg-success-strong text-white' : 'bg-surface text-ink-soft ring-1 ring-inset ring-line'}`}
    >
      <IconoTienda className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{igual ? 'Ya está en la tienda' : 'Parecido en la tienda'}: {producto.nombre} · {formatUSD(producto.precioUSD)}</span>
    </a>
  );
}

/** Claude revisa lo pendiente que falta y la lista pasa a ordenarse por urgencia */
export function BotonUrgencia({ alTerminar }: { alTerminar: () => void | Promise<void> }) {
  const [ordenando, setOrdenando] = useState(false);
  const ordenar = async () => {
    setOrdenando(true);
    try {
      const r = await fetch('/api/admin/consultas/urgencia', { method: 'POST' });
      const datos = (await r.json().catch(() => ({}))) as { mensajes?: number; solicitudes?: number; error?: string };
      if (!r.ok) {
        toast.error(datos.error || 'No se pudo ordenar por urgencia.');
      } else {
        const n = (datos.mensajes ?? 0) + (datos.solicitudes ?? 0);
        toast.success(n ? `Claude revisó ${n} ${n === 1 ? 'pendiente' : 'pendientes'}.` : 'Todo lo pendiente ya estaba revisado.');
      }
      await alTerminar();
    } finally {
      setOrdenando(false);
    }
  };
  return (
    <button type="button" onClick={ordenar} disabled={ordenando} className={`${adminSecondaryButton} min-h-11`}>
      {ordenando
        ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" />
        : <IconoNovedad className="h-4 w-4" aria-hidden="true" />}
      {ordenando ? 'Revisando…' : 'Ordenar por urgencia'}
    </button>
  );
}
