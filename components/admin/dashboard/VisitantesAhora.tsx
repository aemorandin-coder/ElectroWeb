'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ResumenVisitantes } from '@/lib/visitantes';
import CifraAnimada from './CifraAnimada';
import s from './tablero.module.css';

// C-171: widget "Visitantes ahora". Lo mismo que Reportes → En vivo (C-173), en chico: se pide cada 10 s con la pestaña a la vista.
// C-279: la recepción también lo muestra. Las dos piezas comparten una sola consulta (`useVisitantes`), no una cada una.

const REFRESCO_MS = 10_000;

let ultimo: ResumenVisitantes | null = null;
const oyentes = new Set<(datos: ResumenVisitantes | null) => void>();
let reloj: ReturnType<typeof setInterval> | null = null;

async function pedir() {
  const res = await fetch('/api/admin/visitantes', { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return;
  ultimo = (await res.json().catch(() => null)) as ResumenVisitantes | null;
  oyentes.forEach((o) => o(ultimo));
}

/** Quién está en la tienda ahora, en vivo. Una sola consulta cada 10 s para toda la página, solo con la pestaña a la vista */
export function useVisitantes(activo = true): ResumenVisitantes | null {
  const [datos, setDatos] = useState<ResumenVisitantes | null>(ultimo);
  useEffect(() => {
    // Sin permiso de Reportes no se pide (la ruta respondería 403)
    if (!activo) return;
    oyentes.add(setDatos);
    if (oyentes.size === 1) {
      void pedir();
      reloj = setInterval(() => { if (document.visibilityState === 'visible') void pedir(); }, REFRESCO_MS);
    }
    return () => {
      oyentes.delete(setDatos);
      if (oyentes.size === 0 && reloj) { clearInterval(reloj); reloj = null; }
    };
  }, [activo]);
  return datos;
}

export default function VisitantesAhora() {
  const datos = useVisitantes();
  const total = datos?.total ?? 0;
  const pct = total > 0 ? Math.round(((datos?.conCuenta ?? 0) / total) * 100) : 0;
  return (
    <>
      <div className={s.lineaMini}>
        <b className={s.cifraChica}><span className={`${s.vivo} ${s.vivoLate}`} aria-hidden="true" /><CifraAnimada valor={total} retraso={400} /></b>
        <span className={s.rotulo}>{total === 1 ? 'persona ahora' : 'personas ahora'}</span>
      </div>
      <p className={`${s.rotulo} ${s.sinH1}`} style={{ marginTop: 6 }}>{datos?.conCuenta ?? 0} con cuenta · {datos?.conCarrito ?? 0} con carrito</p>
      <div className={s.sinH2} style={{ marginTop: 10 }}>
        <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="bg-brand-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className={s.rotulo} style={{ marginTop: 6 }}>{datos?.sinCuenta ?? 0} sin cuenta</p>
        <Link href="/admin/reports" className={s.enlace} style={{ marginLeft: -8, marginTop: 4 }}>Ver quiénes son</Link>
      </div>
    </>
  );
}
