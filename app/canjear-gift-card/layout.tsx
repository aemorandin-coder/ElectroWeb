import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { compartirPagina } from '@/lib/og/datos';

// C-281 (F-08): la página es un componente cliente y no puede declarar su título ni su imagen para compartir: el enlace
// que se manda con el regalo salía con el título y la imagen de la portada. robots.txt la sigue dejando fuera de Google
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Canjear gift card',
    description: 'Escribe el código de tu gift card de Electro Shop: su valor pasa a tus Puntos ES y lo usas en cualquier compra de la tienda.',
    alternates: { canonical: '/canjear-gift-card' },
    ...(await compartirPagina('canjear-gift-card', '/canjear-gift-card')),
  };
}

export default function CanjearGiftCardLayout({ children }: { children: ReactNode }) {
  return children;
}
