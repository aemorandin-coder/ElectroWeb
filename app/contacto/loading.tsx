import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';

// Misma forma que la página (C-78): encabezado, canales compactos + horario, y el formulario
export default function ContactoLoading() {
  return (
    <div className="min-h-dvh bg-white" aria-busy="true" aria-label="Cargando contacto">
      <PublicHeader />
      <PageHeaderSkeleton />
      <Container className="py-6 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-3 lg:col-span-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-line" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-line" />
                    <div className="h-3 w-36 animate-pulse rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
          </div>
          <div className="space-y-4 rounded-2xl border border-line p-5 md:p-6 lg:col-span-7">
            <div className="h-6 w-48 animate-pulse rounded bg-line" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded bg-line" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 w-full animate-pulse rounded-lg bg-line" />
            ))}
            <div className="h-24 w-full animate-pulse rounded-lg bg-line" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-line" />
          </div>
        </div>
      </Container>
    </div>
  );
}
