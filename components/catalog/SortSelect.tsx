'use client';

import { useRouter } from 'next/navigation';

interface SortSelectProps {
  id: string;
  value: string;
  /** Opciones con la URL ya calculada en el servidor */
  options: Array<{ value: string; label: string; href: string }>;
}

/** Orden del catálogo: cambia la URL (la página se vuelve a pedir al servidor). */
export default function SortSelect({ id, value, options }: SortSelectProps) {
  const router = useRouter();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
      <label htmlFor={id} className="sr-only lg:not-sr-only lg:whitespace-nowrap lg:text-sm lg:text-muted">
        Ordenar por
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const option = options.find((o) => o.value === event.target.value);
          if (option) router.push(option.href);
        }}
        className="h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 lg:h-10 lg:w-auto"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
