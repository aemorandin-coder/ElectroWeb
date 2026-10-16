import type { Metadata } from 'next';
import { compartirPagina } from '@/lib/og/datos';
import PublicHeader from '@/components/public/PublicHeader';
import SolicitarProductoClient from './SolicitarProductoClient';
import Footer from '@/components/Footer';

export const revalidate = 0;

// C-149: título y descripción propios (salía con los de la portada)
// C-178: con su imagen para compartir; sin Open Graph propio heredaba el de la portada
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Solicitar un producto',
    description: '¿No encuentras lo que buscas en el catálogo? Cuéntale a Electro Shop qué producto necesitas.',
    alternates: { canonical: '/solicitar-producto' },
    ...(await compartirPagina('solicitar-producto', '/solicitar-producto')),
  };
}

export default async function SolicitarProductoPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />

      <SolicitarProductoClient />

      <Footer />
    </div>
  );
}
