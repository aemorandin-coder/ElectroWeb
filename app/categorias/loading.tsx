import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';

/** Esqueleto con la misma forma que el encabezado y la rejilla (C-32). */
export default function CategoriasLoading() {
  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      <div className="border-b border-brand-100 bg-brand-50">
        <Container className="py-6 lg:py-10">
          <div className="mb-3 h-3 w-32 rounded bg-brand-100" />
          <div className="flex items-start gap-3 lg:gap-4">
            <div className="h-11 w-11 rounded-2xl bg-brand-100 lg:h-14 lg:w-14" />
            <div className="flex-1">
              <div className="h-3 w-20 rounded bg-brand-100" />
              <div className="mt-2 h-8 w-56 rounded-lg bg-brand-100 lg:h-10" />
              <div className="mt-2 h-4 w-72 max-w-full rounded bg-brand-100" />
            </div>
          </div>
        </Container>
      </div>
      <Container className="py-6 lg:py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border border-line bg-white" />
          ))}
        </div>
      </Container>
    </div>
  );
}
