'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconoBandeja, IconoBuscar, IconoChevronDerecha, IconoConfirmado, IconoDocumento, IconoEditar, IconoEnviar, IconoLista, IconoMas, IconoRechazado } from '@/components/iconos';
import Filtros, { type Filtro } from '@/components/admin/Filtros';
import {
  adminBadge, adminCard, adminEmpty, adminInput, adminNotice, adminPageHeaderCompact, adminPageSubtitle, adminPageTitle, adminPrimaryButton,
  adminRowZebra, adminSpinner, adminTable, adminTableWrap, adminTd, adminTh,
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

// C-245: en píldoras con ícono y lo que juntan (PLAN.md §1.7)
const FILTROS: Omit<Filtro<'' | EstadoCotizacion>, 'cuenta'>[] = [
  { valor: '', etiqueta: 'Todas', ayuda: 'Desde la primera', Icono: IconoLista },
  { valor: 'REQUESTED', etiqueta: 'Pedidas', ayuda: 'Las pidió un cliente', Icono: IconoBandeja, tono: 'aviso' },
  { valor: 'DRAFT', etiqueta: 'Borradores', ayuda: 'Todavía sin enviar', Icono: IconoEditar },
  { valor: 'SENT', etiqueta: 'Enviadas', ayuda: 'Esperan la respuesta', Icono: IconoEnviar },
  { valor: 'APPROVED', etiqueta: 'Aprobadas', ayuda: 'El cliente dijo que sí', Icono: IconoConfirmado },
  { valor: 'REJECTED', etiqueta: 'No concretadas', ayuda: 'Rechazadas o vencidas', Icono: IconoRechazado },
];

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', year: 'numeric' });

export default function CotizacionesPage() {
  const router = useRouter();
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
    <div className="min-w-0 space-y-3">
      <div className={adminPageHeaderCompact}>
        <div>
          <h1 className={adminPageTitle}>Cotizaciones</h1>
          <p className={adminPageSubtitle}>Presupuestos para empresas e instituciones.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <form className="min-w-0 flex-1 lg:w-64 lg:flex-initial" onSubmit={(e) => { e.preventDefault(); void cargar(); }} role="search">
            <label className="relative block">
              <span className="sr-only">Buscar por número, cliente o RIF</span>
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Número, cliente o RIF" className={`${adminInput()} pl-9`} />
            </label>
          </form>
          <Link href="/admin/cotizaciones/nueva" className={adminPrimaryButton}>
            <IconoMas className="h-4 w-4" aria-hidden="true" />
            Nueva cotización
          </Link>
        </div>
      </div>

      <Filtros
        columnas={3}
        etiqueta="Filtrar cotizaciones"
        valor={estado}
        onCambiar={setEstado}
        filtros={FILTROS.map((f) => ({ ...f, cuenta: f.valor && Object.keys(porEstado).length > 0 ? porEstado[f.valor] ?? 0 : undefined }))}
      />

      {error ? (
        <p className={adminNotice('danger')} role="alert">No se pudieron cargar las cotizaciones. Recarga la página.</p>
      ) : !filas ? (
        <div className="flex justify-center py-16" role="status" aria-label="Cargando"><span className={adminSpinner} aria-hidden="true" /></div>
      ) : filas.length === 0 ? (
        <div className={adminEmpty}>
          <IconoDocumento className="h-10 w-10 text-subtle" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">{estado || buscar ? 'Nada con ese filtro' : 'Todavía no hay cotizaciones'}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Crea una con &quot;Nueva cotización&quot;. Las que pidan los clientes desde la tienda también llegan aquí.</p>
        </div>
      ) : (
        <>
          <div className={`${adminTableWrap} hidden lg:block`}>
            <table className={`${adminTable} min-w-[760px]`}>
              <thead>
                <tr>
                  <th className={adminTh}>Número</th>
                  <th className={adminTh}>Cliente</th>
                  <th className={adminTh}>Detalle</th>
                  <th className={adminTh}>Estado</th>
                  <th className={adminTh}>Fecha</th>
                  <th className={`${adminTh} text-right`}>Total</th>
                  <th className={adminTh}><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((q) => (
                  <tr
                    key={q.id}
                    onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) router.push(`/admin/cotizaciones/${q.id}`); }}
                    className={`cursor-pointer ${adminRowZebra}`}
                  >
                    <td className={adminTd}>
                      <Link href={`/admin/cotizaciones/${q.id}`} className="font-mono text-sm font-semibold text-ink hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500">
                        {q.number}
                      </Link>
                      <span className="block text-xs text-muted">{q.lineas} {q.lineas === 1 ? 'línea' : 'líneas'}</span>
                    </td>
                    <td className={`${adminTd} font-medium text-ink`}>{q.clientName}</td>
                    <td className={`${adminTd} max-w-xs truncate text-ink-soft`}>
                      {[q.subject, q.contactName].filter(Boolean).join(' · ') || <span className="text-muted">—</span>}
                    </td>
                    <td className={adminTd}>
                      <span className={adminBadge(ESTADO_TEXTO[q.status].tono)}>{ESTADO_TEXTO[q.status].texto}</span>
                    </td>
                    <td className={`${adminTd} whitespace-nowrap text-ink-soft`}>{fecha(q.createdAt)}</td>
                    <td className={`${adminTd} whitespace-nowrap text-right font-bold tabular-nums text-ink`}>
                      {q.totalUSD > 0 ? formatUSD(q.totalUSD) : <span className="font-normal text-muted">Sin precios</span>}
                    </td>
                    <td className={`${adminTd} text-right`}>
                      <Link href={`/admin/cotizaciones/${q.id}`} aria-label={`Abrir cotización ${q.number}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-600">
                        <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2.5 lg:hidden">
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
                  <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
