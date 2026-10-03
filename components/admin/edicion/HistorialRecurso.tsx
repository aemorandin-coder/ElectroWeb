'use client';

import { useCallback, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { listaEnTexto } from '@/lib/edicion/producto';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

// C-169: "Última edición: Luis, hace 5 min" y las últimas 20 acciones sobre un recurso, de la bitácora del panel.

interface Entrada { id: string; accion: string; quien: string; en: string; campos?: string[] }

const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function haceCuanto(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** `recargar` cambia (por ejemplo, con un aviso en vivo) y la lista se vuelve a pedir */
export default function HistorialRecurso({ recurso, recargar }: { recurso: string; recargar?: string | number | null }) {
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const cargar = useCallback(async () => {
    const res = await fetch(`/api/admin/historial?recurso=${encodeURIComponent(recurso)}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const datos = (await res.json().catch(() => null)) as { entradas?: Entrada[] } | null;
    if (Array.isArray(datos?.entradas)) setEntradas(datos.entradas);
  }, [recurso]);
  useCargarAlMontar(cargar, [cargar, recargar]);

  if (!entradas || entradas.length === 0) return null;
  const ultima = entradas[0];
  return (
    <details className="mt-4 rounded-2xl border border-line bg-white p-4 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 font-semibold text-ink">
        <FiClock className="h-4 w-4 text-muted" aria-hidden="true" />
        Historial
        <span className="font-normal text-muted">· último cambio: {ultima.quien}, {haceCuanto(ultima.en)}</span>
      </summary>
      <ol className="mt-3 space-y-2 border-t border-line pt-3">
        {entradas.map((e) => (
          <li key={e.id}>
            <span className="font-semibold text-ink">{e.quien}</span> · {e.accion}
            {e.campos && e.campos.length > 0 && <span className="text-ink-soft">: {listaEnTexto(e.campos)}</span>}
            <span className="block text-xs text-muted">{fecha.format(new Date(e.en))}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
