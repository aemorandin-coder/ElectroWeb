import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import SolicitarProductoClient from './SolicitarProductoClient';

export const revalidate = 0;

export default async function SolicitarProductoPage() {
  const settings = await prisma.companySettings.findFirst();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      <SolicitarProductoClient />

      {/* Footer */}
      <footer className="bg-white border-t border-[#e9ecef] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-[#6a6c6b]">
            &copy; {new Date().getFullYear()} Electro Shop Morandin C.A. - Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
