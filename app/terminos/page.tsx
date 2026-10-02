import type { Metadata } from 'next';
import Link from 'next/link';
import { FiFileText } from 'react-icons/fi';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import DocumentoLegal from '@/components/legal/DocumentoLegal';
import { paginaLegal, SLUG_TERMINOS } from '@/lib/legal-publico';

// C-149: título y descripción propios (salía con los de la portada)
export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de compra en Electro Shop: cuenta, Puntos ES, pagos y precios, envíos, garantía y devoluciones, productos usados y productos digitales.',
  alternates: { canonical: '/terminos' },
};

// C-160: el texto es un documento que se edita en el panel (Legal → Documentos); los datos de contacto y los plazos
// salen de Configuración. Siempre al día: una versión nueva se ve al instante.
export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const pagina = await paginaLegal(SLUG_TERMINOS);
  const actualizado = pagina?.publishedAt.toLocaleDateString('es-VE', { month: 'long', year: 'numeric', timeZone: 'America/Caracas' });
  return (
    <>
      <PublicHeader />
      <main className="min-h-dvh bg-surface">
        <PageHeader
          breadcrumbs={[{ label: 'Términos y condiciones' }]}
          icon={<FiFileText />}
          eyebrow="Legal"
          title="Términos y condiciones"
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
