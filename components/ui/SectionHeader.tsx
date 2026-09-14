import type { ReactNode } from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}

/** Título de sección ("Ofertas", "Lo más vendido") con enlace opcional "Ver todo". */
export default function SectionHeader({ title, subtitle, href, linkLabel = 'Ver todo', id }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-bold text-ink lg:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 whitespace-nowrap text-sm font-semibold text-brand-500 hover:text-brand-600">
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
