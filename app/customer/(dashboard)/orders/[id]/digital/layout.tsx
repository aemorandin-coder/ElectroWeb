import type { Metadata } from 'next';

// C-265: el título de la pestaña (antes, el de la portada). El noindex viene del layout de Mi panel.
export const metadata: Metadata = { title: 'Mis códigos' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
