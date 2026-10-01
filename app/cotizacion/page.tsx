import type { Metadata } from 'next';
import { FiFileText } from 'react-icons/fi';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import PedirCotizacion from '@/components/cotizaciones/PedirCotizacion';

// Cotizaciones para empresas e instituciones (C-148).
export const metadata: Metadata = {
  title: 'Cotizaciones para empresas e instituciones',
  description: 'Pide un presupuesto formal para tu empresa o institución: equipos de tecnología, cantidades y condiciones, con el RIF de tu empresa.',
};

export default function PedirCotizacionPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-dvh bg-surface">
        <PageHeader
          breadcrumbs={[{ label: 'Cotizaciones' }]}
          icon={<FiFileText />}
          eyebrow="Empresas e instituciones"
          title="Pide una cotización"
          description="Cuéntanos qué necesitas y te enviamos un presupuesto formal, a nombre de tu empresa, para verlo, imprimirlo y aprobarlo."
        />
        <Container className="py-6 lg:py-10">
          <div className="mx-auto max-w-3xl">
            <PedirCotizacion />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
