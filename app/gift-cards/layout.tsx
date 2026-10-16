import type { Metadata } from 'next';
import { compartirPagina } from '@/lib/og/datos';
import type { ReactNode } from 'react';

// C-149: la página es un componente cliente y no puede declarar su título (salía con el de la portada)
// C-178: con su imagen para compartir; sin Open Graph propio heredaba el de la portada
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Gift Cards',
    description: 'Gift cards de Electro Shop: elige el diseño y el monto. Llega al correo de quien la recibe y se canjea como Puntos ES en la tienda.',
    alternates: { canonical: '/gift-cards' },
    ...(await compartirPagina('gift-cards', '/gift-cards')),
  };
}

export default function GiftCardsLayout({ children }: { children: ReactNode }) {
  return children;
}
