import { adminBadge, adminCard, adminPageHeader, adminPageSubtitle, adminPageTitle, adminSectionTitle } from '@/lib/admin-ui';
import { MODULOS, versionDe } from '@/lib/modulos';
import { VERSION_BUILD } from '@/lib/version-build';

// C-168: qué versión corre y qué cambió en cada módulo. Para todo el equipo (sirve para decir "estoy en Productos 1.2.0" al
// reportar un fallo). Los datos del build son los de este mismo servidor.
export const dynamic = 'force-dynamic';

const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const VISIBLES = 5;

export default function PaginaVersiones() {
  const construido = VERSION_BUILD.construidoEn ? fecha.format(new Date(VERSION_BUILD.construidoEn)) : 'sin dato';

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Versiones</h1>
          <p className={adminPageSubtitle}>Qué versión corre ahora y qué cambió en cada módulo del panel.</p>
        </div>
      </header>

      <section aria-labelledby="sistema-titulo" className={adminCard}>
        <h2 id="sistema-titulo" className={`${adminSectionTitle} mb-3`}>El sistema que está corriendo</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-muted">Versión</dt><dd className="font-semibold tabular-nums text-ink">{VERSION_BUILD.version}</dd></div>
          <div><dt className="text-xs text-muted">Etiqueta de git</dt><dd className="font-semibold tabular-nums text-ink [overflow-wrap:anywhere]">{VERSION_BUILD.describe || 'sin dato'}</dd></div>
          <div><dt className="text-xs text-muted">Commit</dt><dd className="font-semibold tabular-nums text-ink">{VERSION_BUILD.commit || 'sin dato'}</dd></div>
          <div><dt className="text-xs text-muted">Compilado</dt><dd className="font-semibold text-ink">{construido}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          El panel y la tienda son un solo programa: todo se sube junto. La versión de cada módulo dice en qué versión del sistema cambió por última vez.
        </p>
      </section>

      <section aria-labelledby="resumen-titulo" className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 id="resumen-titulo" className={`${adminSectionTitle} px-4 py-3`}>Módulos</h2>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-2.5">Módulo</th>
                <th scope="col" className="px-4 py-2.5">Versión</th>
                <th scope="col" className="px-4 py-2.5">Cambió en</th>
                <th scope="col" className="px-4 py-2.5">Última tarea</th>
              </tr>
            </thead>
            <tbody>
              {MODULOS.map((modulo) => (
                <tr key={modulo.id} className="border-t border-line">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-ink"><a href={`#${modulo.id}`} className="hover:text-brand-600">{modulo.nombre}</a></th>
                  <td className="px-4 py-2.5 tabular-nums text-ink">{versionDe(modulo)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-soft">{modulo.historial[0].sistema}</td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-soft">{modulo.historial[0].tarea}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {MODULOS.map((modulo) => {
          const visibles = modulo.historial.slice(0, VISIBLES);
          const resto = modulo.historial.slice(VISIBLES);
          const fila = (cambio: (typeof modulo.historial)[number]) => (
            <li key={`${cambio.version}-${cambio.tarea}`} className="text-sm">
              <span className="font-semibold tabular-nums text-ink">{cambio.version}</span>
              <span className="text-xs text-muted"> · sistema {cambio.sistema} · {cambio.tarea}</span>
              <span className="block text-ink-soft">{cambio.resumen}</span>
            </li>
          );
          return (
            <section key={modulo.id} id={modulo.id} aria-labelledby={`${modulo.id}-titulo`} className={`${adminCard} scroll-mt-20`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`${modulo.id}-titulo`} className={adminSectionTitle}>{modulo.nombre}</h2>
                <span className={adminBadge('brand')}>{versionDe(modulo)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{modulo.descripcion}</p>
              <ol className="mt-3 space-y-2 border-t border-line pt-3">{visibles.map(fila)}</ol>
              {resto.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-600 hover:text-brand-700">Ver {resto.length} anteriores</summary>
                  <ol className="mt-2 space-y-2">{resto.map(fila)}</ol>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
