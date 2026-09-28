'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { FiSearch, FiX } from 'react-icons/fi';
import { adminBadge, adminInput } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import type { StudioStoreProduct } from '@/lib/studio/schema';
import { smallButton } from './ui';

/** Buscar un producto publicado por nombre o código corto y elegirlo para la historia */
export default function ProductPicker({ onPick, onCancel }: { onPick: (p: StudioStoreProduct) => void; onCancel?: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<StudioStoreProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const inputId = useId();
  const seq = useRef(0);

  // Busca 250 ms después de la última tecla; la respuesta vieja no pisa a la nueva
  useEffect(() => {
    const n = ++seq.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/studio/products?q=${encodeURIComponent(q.trim())}`);
        const data = res.ok ? ((await res.json()) as { products: StudioStoreProduct[] }) : { products: [] };
        if (n === seq.current) setResults(data.products);
      } finally {
        if (n === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        Elegir de la tienda
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o código del producto"
            className={`${adminInput()} pl-9`}
            autoComplete="off"
          />
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className={smallButton} aria-label="Cerrar búsqueda">
            <FiX className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto" aria-live="polite" aria-busy={searching}>
        {results.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p)}
              className="flex w-full items-center gap-3 rounded-lg bg-white p-2 text-left transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-white">
                {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-contain" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  {p.hasVariants && 'Desde '}
                  {formatUSD(p.priceUSD)}
                  {p.compareAtPriceUSD && <span className="line-through">{formatUSD(p.compareAtPriceUSD)}</span>}
                  {p.offerLabel && <span className={adminBadge('danger')}>{p.offerLabel}</span>}
                  <span>· {p.categoryName}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
        {!searching && results.length === 0 && <li className="px-1 py-2 text-sm text-muted">No hay productos publicados con ese nombre.</li>}
      </ul>
    </div>
  );
}
