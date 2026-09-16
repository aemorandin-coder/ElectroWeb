import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';

// Misma forma que el catálogo de cursos (C-78): encabezado, filtros y rejilla de tarjetas
export default function CursosLoading() {
  return (
    <div className="min-h-dvh bg-white" aria-busy="true" aria-label="Cargando cursos">
      <PublicHeader />
      <PageHeaderSkeleton />
      <Container className="py-8 lg:py-12">
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-line" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="h-40 animate-pulse bg-line" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-4/5 animate-pulse rounded bg-line" />
                <div className="h-3 w-full animate-pulse rounded bg-line" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
                <div className="h-6 w-20 animate-pulse rounded bg-line" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
