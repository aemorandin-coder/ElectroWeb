import { serializeJsonLd } from '@/lib/seo';

/** Datos estructurados (schema.org) de la página. Se arman con lib/seo.ts. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
