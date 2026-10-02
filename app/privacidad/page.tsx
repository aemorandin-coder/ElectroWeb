import type { Metadata } from 'next';
import Link from 'next/link';
import { FiShield } from 'react-icons/fi';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import DocumentoLegal from '@/components/legal/DocumentoLegal';
import { paginaLegal, SLUG_PRIVACIDAD } from '@/lib/legal-publico';

// C-149: título y descripción propios (salía con los de la portada)
export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos personales guarda Electro Shop, para qué los usa y cómo se protegen.',
  alternates: { canonical: '/privacidad' },
};

// C-160: el texto es un documento que se edita en el panel (Legal → Documentos); los datos de contacto salen de
// Configuración. Siempre al día: una versión nueva se ve al instante.
export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const pagina = await paginaLegal(SLUG_PRIVACIDAD);
  const actualizado = pagina?.publishedAt.toLocaleDateString('es-VE', { month: 'long', year: 'numeric', timeZone: 'America/Caracas' });
  return (
    <>
      <PublicHeader />
      <main className="min-h-dvh bg-surface">
        <PageHeader
          breadcrumbs={[{ label: 'Política de privacidad' }]}
          icon={<FiShield />}
          eyebrow="Legal"
          title="Política de privacidad"
          description={pagina ? `Última actualización: ${actualizado} · Versión ${pagina.version}` : undefined}
        />
        <Container className="py-6 lg:py-10">
          {pagina && <DocumentoLegal contenido={pagina.contenido} />}
          <div className="mx-auto mt-6 flex max-w-3xl justify-end">
            <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink hover:bg-surface">
              Volver al inicio
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
