import { FiClock, FiTag } from 'react-icons/fi';
import type { PublicOffer } from '@/lib/dto/product';
import { textoFinOferta } from '@/lib/promotions-core';

/**
 * Nombre de la oferta de la tienda y cuándo termina (C-102). Sin contador animado: el texto cambia por horas.
 * suppressHydrationWarning: la página cacheada (60 s) puede decir una hora distinta a la del navegador.
 */
export default function OfferNote({ oferta, size = 'card' }: { oferta: PublicOffer | null | undefined; size?: 'card' | 'lg' }) {
  if (!oferta) return null;
  const fin = textoFinOferta(oferta.endsAt);
  if (!oferta.label && !fin) return null;
  const text = size === 'lg' ? 'text-sm' : 'text-xs';
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${text} font-semibold text-deal`}>
      {oferta.label && (
        <span className="inline-flex items-center gap-1">
          <FiTag className="h-3.5 w-3.5" aria-hidden="true" />
          {oferta.label}
        </span>
      )}
      {fin && (
        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
          <FiClock className="h-3.5 w-3.5" aria-hidden="true" />
          {fin}
        </span>
      )}
    </p>
  );
}
