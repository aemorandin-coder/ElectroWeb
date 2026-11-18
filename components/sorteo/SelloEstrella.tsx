'use client';

// C-297: el sello "+10 boletos" del producto estrella de la semana, en su tarjeta del catálogo y del inicio. Lee el sorteo
// abierto del contexto (app/layout.tsx lo trae una vez por página): sin sorteo, o si no es la estrella, no sale nada.
import { IconoCupon } from '@/components/iconos';
import { useSorteoCompra } from '@/contexts/SorteoCompraContext';

export default function SelloEstrella({ productId }: { productId: string }) {
  const sorteo = useSorteoCompra();
  const estrella = sorteo?.estrella;
  if (!estrella || estrella.productId !== productId) return null;
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
      <IconoCupon className="h-3 w-3" aria-hidden="true" /> +{estrella.boletos} boletos
    </span>
  );
}
