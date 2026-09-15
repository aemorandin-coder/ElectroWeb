import Link from 'next/link';
import type { ReactNode } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import Container from './Container';

export interface PageHeaderCrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Rótulo corto sobre el título ("Gift Cards", "Servicios"). */
  eyebrow?: string;
  /** Ícono de react-icons; se muestra en un cuadro azul de la marca. */
  icon?: ReactNode;
  /** Ruta de navegación. "Inicio" se agrega solo; el último elemento es la página actual. */
  breadcrumbs?: PageHeaderCrumb[];
  /** Fila bajo el título: conteos, chips, estado. */
  meta?: ReactNode;
  /** Botones o controles a la derecha (debajo en móvil). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Encabezado único de las páginas de la tienda (C-32). Reemplaza los heroes de degradado, manchas y ondas.
 * Banda azul suave de la marca, sin animaciones; el título es el único h1 de la página.
 * Una sola variante en toda la tienda (C-54): la de /gift-cards, con ícono, rótulo y descripción.
 */
export default function PageHeader({ title, description, eyebrow, icon, breadcrumbs, meta, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`border-b border-brand-100 bg-brand-50 ${className}`}>
      <Container className="py-6 lg:py-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Ruta de navegación" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
              <li><Link href="/" className="hover:text-brand-600 hover:underline">Inicio</Link></li>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    <FiChevronRight className="h-3 w-3" aria-hidden="true" />
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="hover:text-brand-600 hover:underline">{crumb.label}</Link>
                    ) : (
                      <span aria-current={isLast ? 'page' : undefined} className="text-ink-soft">{crumb.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 lg:gap-4">
            {icon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm lg:h-14 lg:w-14 [&_svg]:h-5 [&_svg]:w-5 lg:[&_svg]:h-7 lg:[&_svg]:w-7" aria-hidden="true">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
              <h1 className={`text-balance text-2xl font-bold tracking-tight text-ink lg:text-4xl ${eyebrow ? 'mt-1' : ''}`}>
                {title}
              </h1>
              {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft lg:text-base">{description}</p>}
              {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </Container>
    </header>
  );
}

/** Chip de dato para la fila `meta` ("6 productos", "Envío a toda Venezuela"). */
export function PageHeaderChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}
