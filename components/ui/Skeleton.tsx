import Container from './Container';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

// Pulso suave sobre el gris de borde. Antes usaba `animate-shimmer`, que desplaza el propio bloque de lado a lado
// (esa animación es para un brillo dentro de un contenedor), y un hex suelto.
const BASE = 'animate-pulse bg-line';

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${BASE} ${variantClasses[variant]}`}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${BASE} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

/**
 * Esqueleto de `PageHeader` con la misma banda, alturas y márgenes.
 * Los loading.tsx de la tienda lo usan para que al cargar no aparezca el hero azul viejo.
 */
export function PageHeaderSkeleton({ meta = false }: { meta?: boolean }) {
  return (
    <div className="border-b border-brand-100 bg-brand-50" aria-hidden="true">
      <Container className="py-6 lg:py-10">
        <div className="mb-3 h-3 w-32 rounded bg-brand-100" />
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-brand-100 lg:h-14 lg:w-14" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-24 rounded bg-brand-100" />
            <div className="mt-2 h-8 w-56 max-w-full rounded-lg bg-brand-100 lg:h-10" />
            <div className="mt-2 h-4 w-96 max-w-full rounded bg-brand-100" />
            {meta && <div className="mt-3 h-6 w-40 rounded-full bg-brand-100" />}
          </div>
        </div>
      </Container>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <Skeleton variant="rectangular" className="aspect-square w-full" />
      <div className="space-y-3 p-4">
        <Skeleton variant="text" className="h-5 w-3/4" />
        <Skeleton variant="text" className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant="text" className="h-6 w-24" />
          <Skeleton variant="rounded" className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white p-4">
      <Skeleton variant="circular" width={64} height={64} className="mx-auto mb-3" />
      <Skeleton variant="text" className="mx-auto h-5 w-3/4" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-line">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" className="h-4" />
        </td>
      ))}
    </tr>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="text" className="h-4 w-16" />
      </div>
      <Skeleton variant="text" className="mb-2 h-8 w-24" />
      <Skeleton variant="text" className="h-4 w-32" />
    </div>
  );
}
