import PublicHeader from '@/components/public/PublicHeader';
import SolicitarProductoClient from './SolicitarProductoClient';
import Footer from '@/components/Footer';

export const revalidate = 0;

export default async function SolicitarProductoPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />

      <SolicitarProductoClient />

      <Footer />
    </div>
  );
}
