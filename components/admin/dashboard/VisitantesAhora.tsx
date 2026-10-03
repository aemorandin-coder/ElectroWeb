'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { ResumenVisitantes } from '@/lib/visitantes';
import CifraAnimada from './CifraAnimada';

// C-171: widget "Visitantes ahora". Lo mismo que Reportes → En vivo (C-173), en chico: se pide cada 10 s con la pestaña a la vista.

const REFRESCO_MS = 10_000;

export default function VisitantesAhora() {
  const [datos, setDatos] = useState<ResumenVisitantes | null>(null);
  const cargar = useCallback(async () => {
    const res = await fetch('/api/admin/visitantes', { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setDatos((await res.json().catch(() => null)) as ResumenVisitantes | null);
  }, []);
  useCargarAlMontar(cargar);
  useEffect(() => {
    const cada = setInterval(() => { if (document.visibilityState === 'visible') void cargar(); }, REFRESCO_MS);
    return () => clearInterval(cada);
  }, [cargar]);

  const total = datos?.total ?? 0;
  const pct = total > 0 ? Math.round(((datos?.conCuenta ?? 0) / total) * 100) : 0;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <CifraAnimada valor={total} className="text-3xl font-bold tabular-nums text-ink" />
        <span className="text-sm text-muted">{total === 1 ? 'persona en la tienda' : 'personas en la tienda'}</span>
      </p>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="bg-brand-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="text-muted">Con cuenta</dt><dd className="text-sm font-semibold tabular-nums text-ink">{datos?.conCuenta ?? 0}</dd></div>
        <div><dt className="text-muted">Sin cuenta</dt><dd className="text-sm font-semibold tabular-nums text-ink">{datos?.sinCuenta ?? 0}</dd></div>
        <div><dt className="text-muted">Con carrito</dt><dd className="text-sm font-semibold tabular-nums text-ink">{datos?.conCarrito ?? 0}</dd></div>
      </dl>
      <Link href="/admin/reports" className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-brand-600 hover:text-brand-700">Ver quiénes son</Link>
    </div>
  );
}
