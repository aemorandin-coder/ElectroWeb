'use client';

import { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiLock } from 'react-icons/fi';
import { adminBadge, adminCard, adminNotice } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

// C-166: lo que la Content-Security-Policy de la tienda ha detectado. Va dentro de Reportes → Seguridad.

interface Fila {
  id: string;
  directive: string;
  blocked: string;
  pagePath: string;
  disposition: 'report' | 'enforce';
  count: number;
  lastSeen: string;
  sample: string | null;
}

interface Datos { bloquea: boolean; distintos: number; avisos: number; desde: string | null; filas: Fila[] }

const fecha = (iso: string) => new Date(iso).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Caracas' });

export default function CspPanel() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');

  useCargarAlMontar(async () => {
    try {
      const respuesta = await fetch('/api/admin/csp');
      const json = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !json) return setError(json?.error ?? 'No se pudieron leer los avisos.');
      setDatos(json as Datos);
    } catch {
      setError('No se pudieron leer los avisos.');
    }
  });

  return (
    <section className={adminCard} aria-labelledby="csp-titulo">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="csp-titulo" className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><FiLock className="h-4 w-4 text-brand-500" aria-hidden="true" />Política de contenido (CSP)</h3>
          <p className="mt-1 text-xs text-muted">Lo que las páginas de la tienda intentaron cargar y la política no permite: scripts, conexiones o videos de dominios que no están en la lista.</p>
        </div>
        {datos && <span className={adminBadge(datos.bloquea ? 'success' : 'brand')}>{datos.bloquea ? 'Bloquea' : 'Solo avisa'}</span>}
      </div>

      {error ? (
        <div className={adminNotice('danger')} role="alert">{error}</div>
      ) : !datos ? (
        <p className="py-6 text-center text-sm text-muted">Cargando…</p>
      ) : datos.filas.length === 0 ? (
        <div className={`${adminNotice('success')} flex items-start gap-2`}>
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Sin avisos. {datos.bloquea ? 'La política está bloqueando y nada se quejó.' : 'La política solo avisa: cuando pasen unos días de visitas y esto siga vacío, se puede pasar a bloquear.'}</span>
        </div>
      ) : (
        <>
          <div className={`${adminNotice(datos.bloquea ? 'warning' : 'brand')} mb-3 flex items-start gap-2`}>
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>{datos.avisos} {datos.avisos === 1 ? 'aviso' : 'avisos'}</strong> de {datos.distintos} {datos.distintos === 1 ? 'caso distinto' : 'casos distintos'}{datos.desde ? ` (desde el ${fecha(datos.desde)})` : ''}.
              {datos.bloquea ? ' Cada uno es algo que se bloqueó de verdad.' : ' Nada se bloqueó todavía: antes de pasar a bloquear, cada caso legítimo se agrega a la lista y el resto se deja bloqueado. Pásale esta lista a Claude.'}
            </span>
          </div>
          <ul className="divide-y divide-line">
            {datos.filas.map((f) => (
              <li key={f.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="break-all text-sm text-ink"><span className="font-mono text-xs font-semibold">{f.directive}</span> bloquea <strong>{f.blocked}</strong></p>
                  <p className="break-all text-xs text-muted">en <span className="font-mono">{f.pagePath}</span>{f.sample ? ` · ${f.sample}` : ''}</p>
                </div>
                <p className="shrink-0 text-xs text-muted sm:text-right"><span className="font-semibold tabular-nums text-ink">{f.count}</span> {f.count === 1 ? 'vez' : 'veces'}<span className="block">último: {fecha(f.lastSeen)}</span></p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
