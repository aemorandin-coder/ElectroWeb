'use client';

import Form from 'next/form';
import { usePathname, useSearchParams } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';

interface HeaderSearchProps {
  id: string;
  /** Móvil: botón solo con ícono */
  compact?: boolean;
}

const INPUT =
  'h-10 min-w-0 flex-1 rounded-l-lg border border-r-0 border-line-strong bg-surface px-4 text-sm text-ink ' +
  'placeholder:text-muted focus:border-brand-500 focus:bg-white focus:outline-none';
const BUTTON =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-r-lg bg-brand-500 px-4 text-sm font-semibold text-white ' +
  'hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

/** Buscador del header: navega a /productos?search= (funciona también sin JavaScript). */
export default function HeaderSearch({ id, compact = false }: HeaderSearchProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = pathname === '/productos' ? searchParams.get('search') ?? '' : '';

  return <SearchForm id={id} compact={compact} defaultValue={current} />;
}

/** Misma forma sin leer la URL: fallback del <Suspense> durante el prerender. */
export function SearchForm({ id, compact = false, defaultValue = '' }: HeaderSearchProps & { defaultValue?: string }) {
  return (
    <Form action="/productos" role="search" className="flex w-full max-w-[720px]">
      <label htmlFor={id} className="sr-only">Buscar productos</label>
      <input
        key={defaultValue}
        id={id}
        name="search"
        type="search"
        defaultValue={defaultValue}
        placeholder={compact ? '¿Qué estás buscando?' : 'Buscar laptops, gift cards, consolas…'}
        enterKeyHint="search"
        autoComplete="off"
        className={INPUT}
      />
      <button type="submit" className={BUTTON} aria-label={compact ? 'Buscar' : undefined}>
        <FiSearch className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>Buscar</span>}
      </button>
    </Form>
  );
}
