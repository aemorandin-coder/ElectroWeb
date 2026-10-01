import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// C-149: la página es un componente cliente y no puede declarar su título (salía con el de la portada)
export const metadata: Metadata = {
  title: 'Gift Cards',
  description: 'Gift cards de Electro Shop: elige el diseño y el monto. Llega al correo de quien la recibe y se canjea como Puntos ES en la tienda.',
  alternates: { canonical: '/gift-cards' },
};

export default function GiftCardsLayout({ children }: { children: ReactNode }) {
  return children;
}
