import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';

// Misma forma que la página (C-78): encabezado, trabajos realizados y tarjetas de servicio
export default function ServiciosLoading() {
  return (
    <div className="min-h-dvh bg-white" aria-busy="true" aria-label="Cargando servicios">
      <PublicHeader />
      <PageHeaderSkeleton />
      <Container className="py-6 lg:py-12">
        <div className="mx-auto mb-6 h-7 w-56 animate-pulse rounded-lg bg-line" />
        <div className="mb-10 flex justify-center gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-line" />
          ))}
        </div>
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line">
              <div className="aspect-video animate-pulse bg-line" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-line" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-line bg-surface lg:h-44" />
          ))}
        </div>
      </Container>
    </div>
  );
}
