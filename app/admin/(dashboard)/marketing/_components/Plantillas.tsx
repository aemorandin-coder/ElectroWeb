'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiMonitor, FiSmartphone } from 'react-icons/fi';
import { adminCardFlush, adminSpinner, adminTab } from '@/lib/admin-ui';

interface Plantilla { id: string; name: string; description: string }

/**
 * Vista previa de los correos que envía la tienda. Desde C-75 se generan con las mismas funciones
 * de los envíos reales (antes era una copia aparte que podía no parecerse).
 */
export default function Plantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [elegida, setElegida] = useState('welcome');
  const [vista, setVista] = useState<{ id: string; subject: string; html: string } | null>(null);
  const [modo, setModo] = useState<'escritorio' | 'movil'>('escritorio');

  useEffect(() => {
    fetch('/api/admin/email/preview')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPlantillas(d.templates || []))
      .catch(() => toast.error('No se pudo cargar la lista de plantillas'));
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/email/preview?template=${encodeURIComponent(elegida)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelado) setVista({ id: elegida, subject: d.subject || '', html: d.html || '' }); })
      .catch(() => { if (!cancelado) toast.error('No se pudo generar la vista previa'); });
    return () => { cancelado = true; };
  }, [elegida]);

  const cargando = vista?.id !== elegida;

  return (
    <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Plantillas de correo" className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
        <ul className="flex w-max gap-1 lg:w-auto lg:flex-col">
          {plantillas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setElegida(p.id)}
                aria-current={elegida === p.id ? 'true' : undefined}
                className={`${adminTab(elegida === p.id)} h-auto w-full flex-col items-start gap-0 py-2 text-left`}
              >
                <span>{p.name}</span>
                <span className={`hidden text-xs font-normal lg:block ${elegida === p.id ? 'text-white/80' : 'text-muted'}`}>{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className={adminCardFlush}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="min-w-0 text-sm text-muted">
            Asunto: <span className="font-semibold text-ink">{vista?.subject || '—'}</span>
          </p>
          <div className="flex gap-1">
            <button type="button" onClick={() => setModo('escritorio')} className={`${adminTab(modo === 'escritorio')} h-9`} aria-pressed={modo === 'escritorio'}>
              <FiMonitor className="h-4 w-4" aria-hidden="true" /> Escritorio
            </button>
            <button type="button" onClick={() => setModo('movil')} className={`${adminTab(modo === 'movil')} h-9`} aria-pressed={modo === 'movil'}>
              <FiSmartphone className="h-4 w-4" aria-hidden="true" /> Móvil
            </button>
          </div>
        </div>
        <div className="flex min-h-[40rem] justify-center overflow-x-auto bg-surface p-4">
          {cargando || !vista ? (
            <span className={`${adminSpinner} mt-20`} aria-label="Cargando" />
          ) : (
            <iframe
              title="Vista previa del correo"
              srcDoc={vista.html}
              sandbox=""
              className={`h-[44rem] rounded-xl border border-line bg-white ${modo === 'movil' ? 'w-[375px]' : 'w-full max-w-[680px]'}`}
            />
          )}
        </div>
      </section>
    </div>
  );
}
