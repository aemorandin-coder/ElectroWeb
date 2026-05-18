import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import SolicitarProductoClient from './SolicitarProductoClient';
import Footer from '@/components/Footer';

export const revalidate = 0;

export default async function SolicitarProductoPage() {
  const settings = await prisma.companySettings.findFirst();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      <SolicitarProductoClient />

      <Footer />
    </div>
  );
}
