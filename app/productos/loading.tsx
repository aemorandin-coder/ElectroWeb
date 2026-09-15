import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';

// Esqueleto con la misma estructura que el catálogo (C-30, encabezado de C-32): título, barra de filtros y grilla
export default function ProductosLoading() {
  return (
    <div className="min-h-dvh bg-surface" aria-busy="true" aria-label="Cargando productos">
      <PublicHeader />
      <div className="border-b border-brand-100 bg-brand-50">
        <Container className="py-6 lg:py-10">
          <div className="mb-3 h-3 w-32 rounded bg-brand-100" />
          <div className="flex items-start gap-3 lg:gap-4">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-brand-100 lg:h-14 lg:w-14" />
            <div className="flex-1">
              <div className="h-3 w-20 rounded bg-brand-100" />
              <div className="mt-2 h-8 w-48 rounded-lg bg-brand-100 lg:h-10" />
              <div className="mt-2 h-4 w-80 max-w-full rounded bg-brand-100" />
              <div className="mt-3 h-4 w-24 rounded bg-brand-100" />
            </div>
          </div>
        </Container>
      </div>
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
