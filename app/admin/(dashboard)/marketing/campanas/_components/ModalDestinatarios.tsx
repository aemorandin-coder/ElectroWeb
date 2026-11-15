'use client';

// Los clientes que reciben las campañas (C-109: de a 50, con la búsqueda en el servidor). C-249d: sale de Campanas.tsx
// para que lo abran la lista y el asistente de una campaña ("Ver destinatarios").

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoBuscar, IconoCerrar, IconoClientes, IconoCorreo } from '@/components/iconos';
import {
  adminBadge, adminIconButton, adminInput, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel,
  adminModalTitle, adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface DestinatarioInfo {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export default function ModalDestinatarios({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const [destinatarios, setDestinatarios] = useState<DestinatarioInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [coincidencias, setCoincidencias] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');

  useBodyScrollLock(abierto);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto, alCerrar]);

  // C-109: la búsqueda va al servidor, 300 ms después de dejar de escribir
  useEffect(() => {
    const t = setTimeout(() => setConsulta(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // De a 50 por página: antes llegaban todos los correos de una vez
  useEffect(() => {
    if (!abierto) return;
    const control = new AbortController();
    const params = new URLSearchParams({ pagina: String(pagina) });
    if (consulta) params.set('q', consulta);
    fetch(`/api/admin/campaigns/recipients?${params}`, { signal: control.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { destinatarios?: DestinatarioInfo[]; total?: number; coincidencias?: number; hayMas?: boolean }) => {
        const nuevos = d.destinatarios || [];
        setDestinatarios((prev) => (pagina === 1 ? nuevos : [...prev, ...nuevos]));
        setTotal(d.total ?? 0);
        setCoincidencias(d.coincidencias ?? 0);
        setHayMas(Boolean(d.hayMas));
      })
      .catch((e: unknown) => {
        if (control.signal.aborted) return;
        toast.error(e instanceof Error && e.message === '403'
          ? 'Necesitas el permiso de Clientes para ver los destinatarios'
          : 'No se pudo cargar la lista de destinatarios');
      })
      .finally(() => { if (!control.signal.aborted) setCargando(false); });
    return () => control.abort();
  }, [abierto, pagina, consulta]);

  function buscar(texto: string) {
    setBusqueda(texto);
    setPagina(1);
    setCargando(true);
  }

  function verMas() {
    setCargando(true);
    setPagina((p) => p + 1);
  }

  if (!abierto) return null;

  const filtrados = destinatarios;

  return (
    <div className={adminModalOverlay} onClick={alCerrar} role="dialog" aria-modal="true" aria-labelledby="modal-destinatarios-titulo">
      <div className={`${adminModalPanel} sm:max-w-xl`} onClick={(e) => e.stopPropagation()}>
        <div className={adminModalHeader}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <IconoClientes className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-destinatarios-titulo" className={adminModalTitle}>Destinatarios de promociones</h2>
              <p className="text-xs text-muted">{total} {total === 1 ? 'cliente acepta' : 'clientes aceptan'} promociones por correo</p>
            </div>
          </div>
          <button type="button" onClick={alCerrar} className={adminIconButton} aria-label="Cerrar modal">
            <IconoCerrar className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-line bg-surface/50 p-4">
          <div className="relative">
            <IconoBuscar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => buscar(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className={`${adminInput()} pl-9`}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Solo incluye clientes con correo verificado que tienen activa la opción de recibir promociones en sus preferencias de notificación.
          </p>
        </div>

        <div className={adminModalBody}>
          {cargando && filtrados.length === 0 ? (
            <div className="flex justify-center py-12"><span className={adminSpinner} aria-label="Cargando destinatarios" /></div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center">
              <IconoCorreo className="mx-auto mb-2 h-8 w-8 text-subtle" aria-hidden="true" />
              <p className="font-semibold text-ink">{consulta ? 'Sin resultados' : 'Sin destinatarios'}</p>
              <p className="mt-1 text-xs text-muted">
                {consulta
                  ? `No se encontraron coincidencias para "${consulta}".`
                  : 'Ningún cliente ha aceptado promociones aún.'}
              </p>
            </div>
          ) : (
            <>
            {consulta && <p className="mb-2 px-2 text-xs text-muted">{coincidencias} {coincidencias === 1 ? 'coincidencia' : 'coincidencias'}</p>}
            <ul className="divide-y divide-line">
              {filtrados.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-surface">
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-sm font-semibold text-ink">{item.name || 'Sin nombre'}</p>
                    <p className="truncate font-mono text-xs text-brand-600">{item.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={adminBadge('success')}>Verificado</span>
                    <p className="mt-0.5 text-[11px] text-muted">Desde {new Date(item.createdAt).toLocaleDateString('es-VE')}</p>
                  </div>
                </li>
              ))}
            </ul>
            {hayMas && (
              <div className="pt-3 text-center">
                <button type="button" onClick={verMas} disabled={cargando} className={`${adminSecondaryButton} h-9 px-4 text-xs`}>
                  {cargando ? 'Cargando…' : `Ver más (${filtrados.length} de ${coincidencias})`}
                </button>
              </div>
            )}
            </>
          )}
        </div>

        <div className={adminModalFooter}>
          <button type="button" onClick={alCerrar} className={`${adminSecondaryButton} h-9 px-4 text-xs`}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
