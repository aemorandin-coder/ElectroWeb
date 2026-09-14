import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { catalogHref, type CatalogParams } from '@/lib/queries/catalog';

interface CatalogPaginationProps {
  params: CatalogParams;
  page: number;
  totalPages: number;
}

/** Números visibles: primera, última y las vecinas de la actual, con "…" en los saltos. */
function visiblePages(page: number, totalPages: number): Array<number | 'gap'> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap' as const, p] : [p]));
}

/** Paginación con enlaces reales (sirve para Google y sin JavaScript). */
export default function CatalogPagination({ params, page, totalPages }: CatalogPaginationProps) {
  if (totalPages <= 1) return null;
  const base = 'flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-500';

  return (
    <nav aria-label="Páginas de resultados" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={catalogHref(params, { page: page - 1 })} rel="prev" className={`${base} border border-line bg-white text-ink hover:bg-surface`}>
          <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Anterior</span>
        </Link>
      ) : null}
      {visiblePages(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">…</span>
        ) : (
          <Link
            key={p}
            href={catalogHref(params, { page: p })}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Página ${p}`}
            className={`${base} ${p === page ? 'bg-brand-500 text-white' : 'border border-line bg-white text-ink hover:bg-surface'}`}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages ? (
        <Link href={catalogHref(params, { page: page + 1 })} rel="next" className={`${base} border border-line bg-white text-ink hover:bg-surface`}>
          <span className="sr-only sm:not-sr-only sm:mr-1">Siguiente</span>
          <FiChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
