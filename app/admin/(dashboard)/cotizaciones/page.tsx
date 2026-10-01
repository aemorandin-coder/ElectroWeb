'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { FiChevronRight, FiFileText, FiPlus, FiSearch } from 'react-icons/fi';
import {
  adminBadge, adminCard, adminEmpty, adminInput, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { ESTADO_TEXTO, type EstadoCotizacion } from '@/lib/cotizaciones/core';

// Cotizaciones (C-148): presupuestos para empresas e instituciones. Las arma el equipo o las pide el cliente desde
// la tienda; cada una tiene un enlace para que el cliente la vea, la imprima y la apruebe.

interface Fila {
  id: string;
  number: string;
  status: EstadoCotizacion | 'EXPIRED';
  clientName: string;
  contactName: string | null;
  subject: string | null;
  totalUSD: number;
  lineas: number;
  createdAt: string;
}

const FILTROS: { id: '' | EstadoCotizacion; label: string }[] = [
  { id: '', label: 'Todas' },
  { id: 'REQUESTED', label: 'Pedidas' },
  { id: 'DRAFT', label: 'Borradores' },
  { id: 'SENT', label: 'Enviadas' },
  { id: 'APPROVED', label: 'Aprobadas' },
  { id: 'REJECTED', label: 'No concretadas' },
];

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', year: 'numeric' });

export default function CotizacionesPage() {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState<'' | EstadoCotizacion>('');
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const params = new URLSearchParams({ ...(estado ? { estado } : {}), ...(buscar.trim() ? { buscar: buscar.trim() } : {}) });
      const res = await fetch(`/api/admin/cotizaciones?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const datos = await res.json();
      setFilas(datos.cotizaciones);
      setPorEstado(datos.porEstado);
      setError(false);
    } catch {
      setError(true);
    }
  }, [estado, buscar]);
  useCargarAlMontar(cargar, [estado]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Cotizaciones</h1>
          <p className={adminPageSubtitle}>Presupuestos para empresas e instituciones, con enlace para verlos, imprimirlos y aprobarlos.</p>
        </div>
        <Link href="/admin/cotizaciones/nueva" className={adminPrimaryButton}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Nueva cotización
        </Link>
      </div>

      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void cargar(); }} role="search">
        <label className="relative block flex-1">
          <span className="sr-only">Buscar por número, cliente o RIF</span>
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Número, cliente o RIF" className={`${adminInput()} pl-9`} />
        </label>
      </form>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={estado === f.id}
            onClick={() => setEstado(f.id)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold ${estado === f.id ? 'bg-brand-500 text-white' : 'border border-line bg-white text-ink-soft hover:bg-surface'}`}
          >
            {f.label}
            {f.id && porEstado[f.id] ? <span className={estado === f.id ? ' text-white/80' : ' text-muted'}> {porEstado[f.id]}</span> : null}
          </button>
        ))}
      </div>

      {error ? (
        <p className={adminNotice('danger')} role="alert">No se pudieron cargar las cotizaciones. Recarga la página.</p>
      ) : !filas ? (
        <div className="flex justify-center py-16" role="status" aria-label="Cargando"><span className={adminSpinner} aria-hidden="true" /></div>
      ) : filas.length === 0 ? (
        <div className={adminEmpty}>
          <FiFileText className="h-10 w-10 text-subtle" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">{estado || buscar ? 'Nada con ese filtro' : 'Todavía no hay cotizaciones'}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Crea una con &quot;Nueva cotización&quot;. Las que pidan los clientes desde la tienda también llegan aquí.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filas.map((q) => (
            <li key={q.id}>
              <Link href={`/admin/cotizaciones/${q.id}`} className={`${adminCard} flex items-center gap-4 transition-colors hover:bg-surface`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-sm font-semibold text-ink">{q.number}</span>
                    <span className={adminBadge(ESTADO_TEXTO[q.status].tono)}>{ESTADO_TEXTO[q.status].texto}</span>
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{q.clientName}</p>
                  <p className="truncate text-xs text-muted">
                    {[q.subject, q.contactName, fecha(q.createdAt), `${q.lineas} ${q.lineas === 1 ? 'línea' : 'líneas'}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="shrink-0 text-base font-bold tabular-nums text-ink">{q.totalUSD > 0 ? formatUSD(q.totalUSD) : 'Sin precios'}</p>
                <FiChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
