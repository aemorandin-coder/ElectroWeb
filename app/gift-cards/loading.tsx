import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';

// Misma forma que la página (C-78): encabezado, tarjeta y diseños a la izquierda, formulario a la derecha
export default function GiftCardsLoading() {
  return (
    <div className="min-h-dvh bg-white" aria-busy="true" aria-label="Cargando gift cards">
      <PublicHeader />
      <PageHeaderSkeleton />
      <Container className="py-4 lg:py-12">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            <div className="aspect-[1.586] w-full animate-pulse rounded-2xl bg-line" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-line" />
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-line p-3 lg:p-5">
            <div className="h-5 w-48 animate-pulse rounded bg-line" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-line" />
              ))}
            </div>
            <div className="h-5 w-32 animate-pulse rounded bg-line" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 animate-pulse rounded-lg bg-line" />
              <div className="h-10 animate-pulse rounded-lg bg-line" />
            </div>
            <div className="h-16 animate-pulse rounded-lg bg-line" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-line" />
          </div>
        </div>
      </Container>
    </div>
  );
}
