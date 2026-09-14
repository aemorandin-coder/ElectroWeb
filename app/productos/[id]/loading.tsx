import PublicHeader from '@/components/public/PublicHeader';
import Container from '@/components/ui/Container';

// Esqueleto del detalle (C-31): sin él se mostraba el de la lista de productos
export default function ProductLoading() {
  return (
    <div className="min-h-dvh bg-surface" aria-busy="true" aria-label="Cargando producto">
      <PublicHeader />
      <Container className="pb-10 pt-4 lg:pt-6">
        <div className="mb-3 h-3 w-48 rounded bg-line" />
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="aspect-square rounded-2xl border border-line bg-white lg:col-span-7" />
          <div className="space-y-4 rounded-2xl border border-line bg-white p-4 lg:col-span-5 lg:p-6">
            <div className="h-3 w-32 rounded bg-line" />
            <div className="h-8 w-full rounded bg-line" />
            <div className="h-8 w-2/3 rounded bg-line" />
            <div className="h-10 w-40 rounded bg-line" />
            <div className="h-11 w-full rounded-lg bg-line" />
            <div className="h-11 w-full rounded-lg bg-line" />
          </div>
        </div>
      </Container>
    </div>
  );
}
