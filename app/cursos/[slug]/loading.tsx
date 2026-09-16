import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';

// Detalle de un curso (C-78): sin este archivo se mostraba la rejilla del catálogo de cursos
export default function CursoLoading() {
  return (
    <div className="min-h-dvh bg-white" aria-busy="true" aria-label="Cargando curso">
      <PublicHeader />
      <Container className="py-6 lg:py-10">
        <div className="mb-4 h-3 w-48 animate-pulse rounded bg-line" />
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-8">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-line lg:h-10" />
            <div className="h-4 w-full animate-pulse rounded bg-line" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
            <div className="space-y-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl border border-line bg-surface" />
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line lg:col-span-4">
            <div className="aspect-video animate-pulse bg-line" />
            <div className="space-y-3 p-4">
              <div className="h-8 w-32 animate-pulse rounded bg-line" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-line" />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
