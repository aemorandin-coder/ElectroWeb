'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoCelular, IconoMonitor } from '@/components/iconos';
import { adminCardFlush, adminSpinner, adminTab, adminTabList } from '@/lib/admin-ui';

interface Plantilla { id: string; grupo?: string; name: string; description: string }

/**
 * Vista previa de los correos que envía la tienda. Desde C-75 se generan con las mismas funciones
 * de los envíos reales (antes era una copia aparte que podía no parecerse). C-219: todos, por grupo.
 */
export default function Plantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [elegida, setElegida] = useState('order_paid');
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
    // C-244 (el equipo, 15/11, en una pantalla de 1900 px: "el marco sale muy bajo, con su propio scroll, y debajo queda un
    // espacio blanco enorme"): la lista es larga (58 correos), así que la vista previa queda fija a la altura de la pantalla
    // mientras se recorre y el correo se lee con un solo scroll, el del marco. En el teléfono, el marco toma casi la pantalla.
    <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Plantillas de correo" className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
        <ul className="flex w-max gap-1 lg:w-auto lg:flex-col">
          {plantillas.map((p, i) => (
            <li key={p.id}>
              {p.grupo && p.grupo !== plantillas[i - 1]?.grupo && (
                <span className={`hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted lg:block ${i === 0 ? '' : 'pt-3'}`}>{p.grupo}</span>
              )}
              <button
                type="button"
                onClick={() => setElegida(p.id)}
                aria-current={elegida === p.id ? 'true' : undefined}
                className={`${adminTab(elegida === p.id)} h-auto w-full flex-col items-start gap-0 py-2 text-left`}
              >
                <span>{p.name}</span>
                <span className={`hidden whitespace-normal text-xs font-normal lg:block ${elegida === p.id ? 'text-white/80' : 'text-muted'}`}>{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className={`${adminCardFlush} flex flex-col lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="min-w-0 text-sm text-muted">
            Asunto: <span className="font-semibold text-ink">{vista?.subject || '—'}</span>
          </p>
          <div className={adminTabList}>
            <button type="button" onClick={() => setModo('escritorio')} className={`${adminTab(modo === 'escritorio')} min-h-9 py-1.5`} aria-pressed={modo === 'escritorio'}>
              <IconoMonitor className="h-4 w-4" aria-hidden="true" /> Escritorio
            </button>
            <button type="button" onClick={() => setModo('movil')} className={`${adminTab(modo === 'movil')} min-h-9 py-1.5`} aria-pressed={modo === 'movil'}>
              <IconoCelular className="h-4 w-4" aria-hidden="true" /> Móvil
            </button>
          </div>
        </div>
        <div className="flex h-[78dvh] min-h-[28rem] justify-center overflow-x-auto bg-surface p-3 sm:p-4 lg:h-auto lg:min-h-0 lg:flex-1">
          {cargando || !vista ? (
            <span className={`${adminSpinner} mt-20`} aria-label="Cargando" />
          ) : (
            <iframe
              title="Vista previa del correo"
              srcDoc={vista.html}
              sandbox=""
              className={`h-full rounded-xl border border-line bg-white ${modo === 'movil' ? 'w-[375px] shrink-0' : 'w-full max-w-[680px]'}`}
            />
          )}
        </div>
      </section>
    </div>
  );
}
