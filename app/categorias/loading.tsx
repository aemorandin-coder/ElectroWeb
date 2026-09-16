import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';

/** Esqueleto con la misma forma que el encabezado y la rejilla (C-32). */
export default function CategoriasLoading() {
  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />
      <PageHeaderSkeleton />
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
