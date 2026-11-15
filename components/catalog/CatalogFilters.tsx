import Form from 'next/form';
import Link from 'next/link';
import { IconoPaquete, IconoTienda, IconoUbicacion } from '@/components/iconos';
import { catalogHref, hasActiveFilters, ordenPorDefecto, type CatalogCategoryFacet, type CatalogParams, type CatalogUbicacion } from '@/lib/queries/catalog';

interface CatalogFiltersProps {
  params: CatalogParams;
  categories: CatalogCategoryFacet[];
  /** C-222: desde dónde sale, con su cuenta; y cuántos hay de todas partes */
  ubicaciones?: CatalogUbicacion[];
  totalSinDesde?: number;
  /** Se dibuja dos veces (columna de escritorio y panel móvil): prefijo para ids únicos */
  idPrefix: string;
}

/**
 * Filtros del catálogo. Las categorías son enlaces (cambio inmediato); precio, disponibilidad y tipo van
 * en un formulario GET que escribe la URL. Funciona sin JavaScript.
 */
export default function CatalogFilters({ params, categories, ubicaciones = [], totalSinDesde = 0, idPrefix }: CatalogFiltersProps) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const categoryLinkClass = (active: boolean) =>
    `flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-500 ${
      active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-soft hover:bg-surface hover:text-ink'
    }`;
  const allCount = categories.reduce((sum, c) => sum + c.count, 0);
  // C-222: los lugares son enlaces, como las categorías: filtran al tocarlos
  const lugarClass = (active: boolean) =>
    `flex min-h-11 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-500 ${
      active ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-line bg-white text-ink-soft hover:border-brand-200 hover:text-ink'
    }`;

  return (
    <div className="space-y-6">
      <section aria-labelledby={id('categorias')}>
        <h2 id={id('categorias')} className="mb-2 text-sm font-semibold text-ink">Categorías</h2>
        <ul className="space-y-0.5">
          <li>
            <Link href={catalogHref(params, { category: null })} className={categoryLinkClass(!params.category)} aria-current={!params.category ? 'true' : undefined}>
              <span>Todas</span>
              <span className="text-xs text-muted">{allCount}</span>
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={catalogHref(params, { category: category.slug })}
                className={categoryLinkClass(params.category === category.slug)}
                aria-current={params.category === category.slug ? 'true' : undefined}
              >
                <span className="min-w-0 truncate">{category.name}</span>
                <span className="text-xs text-muted">{category.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* C-222: desde dónde sale (el equipo, 14/11). Solo si hay más de un lugar */}
      {ubicaciones.length > 1 && (
        <section aria-labelledby={id('desde')}>
          <h2 id={id('desde')} className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <IconoUbicacion className="h-4 w-4 text-brand-500" aria-hidden="true" /> Desde dónde sale
          </h2>
          <ul className="space-y-1.5">
            <li>
              <Link href={catalogHref(params, { desde: null })} className={lugarClass(!params.desde)} aria-current={!params.desde ? 'true' : undefined}>
                <span className="flex-1">De todas partes</span>
                <span className="text-xs font-normal text-muted">{totalSinDesde}</span>
              </Link>
            </li>
            {ubicaciones.map((u) => {
              const Icono = u.propio ? IconoTienda : IconoPaquete;
              return (
                <li key={u.slug}>
                  <Link href={catalogHref(params, { desde: u.slug })} className={lugarClass(params.desde === u.slug)} aria-current={params.desde === u.slug ? 'true' : undefined}>
                    <span className="iconos-marca flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-950">
                      <Icono className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{u.estado}</span>
                      <span className="block text-xs font-normal text-muted">{u.ciudades.join(', ')}{u.propio ? '' : ' · solo envío'}</span>
                    </span>
                    <span className="text-xs font-normal text-muted">{u.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Form action="/productos" className="space-y-6">
        {params.search && <input type="hidden" name="search" value={params.search} />}
        {params.category && <input type="hidden" name="category" value={params.category} />}
        {params.desde && <input type="hidden" name="desde" value={params.desde} />}
        {params.sort !== ordenPorDefecto(params.search) && <input type="hidden" name="sort" value={params.sort} />}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Precio (USD)</legend>
          <div className="flex items-center gap-2">
            <label htmlFor={id('min')} className="sr-only">Precio mínimo</label>
            <input
              id={id('min')}
              name="min"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="Mín."
              defaultValue={params.min ?? ''}
              className="h-10 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <span className="text-muted" aria-hidden="true">–</span>
            <label htmlFor={id('max')} className="sr-only">Precio máximo</label>
            <input
              id={id('max')}
              name="max"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="Máx."
              defaultValue={params.max ?? ''}
              className="h-10 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Mostrar</legend>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="oferta" value="1" defaultChecked={params.offers} className="h-4 w-4 accent-brand-500" />
            Solo ofertas
          </label>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="disponible" value="1" defaultChecked={params.inStock} className="h-4 w-4 accent-brand-500" />
            Solo disponibles
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Tipo de producto</legend>
          {[
            { value: '', label: 'Todos' },
            { value: 'fisico', label: 'Físicos (envío o retiro)' },
            { value: 'digital', label: 'Digitales (gift cards y recargas)' },
          ].map((option) => (
            <label key={option.value || 'todos'} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-soft">
              <input type="radio" name="tipo" value={option.value} defaultChecked={(params.type ?? '') === option.value} className="h-4 w-4 accent-brand-500" />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Condición</legend>
          {[
            { value: '', label: 'Todos' },
            { value: 'nuevo', label: 'Nuevos' },
            { value: 'usado', label: 'Usados y reacondicionados' },
          ].map((option) => (
            <label key={option.value || 'todos'} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-soft">
              <input type="radio" name="condicion" value={option.value} defaultChecked={(params.condition ?? '') === option.value} className="h-4 w-4 accent-brand-500" />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-2">
          <button type="submit" className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            Aplicar filtros
          </button>
          {hasActiveFilters(params) && (
            <Link
              href={params.search ? catalogHref({ ...params, category: null, min: null, max: null, offers: false, inStock: false, type: null, condition: null, desde: null }) : '/productos'}
              className="flex h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              Quitar filtros
            </Link>
          )}
        </div>
      </Form>
    </div>
  );
}
