import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';

// Esqueleto con la misma estructura que el catálogo (C-30, encabezado de C-32): título, barra de filtros y grilla
export default function ProductosLoading() {
  return (
    <div className="min-h-dvh bg-surface" aria-busy="true" aria-label="Cargando productos">
      <PublicHeader />
      <PageHeaderSkeleton meta />
      <Container className="pb-10 pt-3 lg:pt-6">
        <div className="flex gap-2 lg:hidden">
          <div className="h-11 flex-1 rounded-lg bg-line" />
          <div className="h-11 flex-1 rounded-lg bg-line" />
        </div>
        <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <div className="hidden h-96 rounded-xl border border-line bg-white lg:block" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="aspect-square bg-line/60" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-2/3 rounded bg-line" />
                  <div className="h-4 w-full rounded bg-line" />
                  <div className="h-6 w-1/2 rounded bg-line" />
                  <div className="h-10 w-full rounded-lg bg-line" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  );
}
