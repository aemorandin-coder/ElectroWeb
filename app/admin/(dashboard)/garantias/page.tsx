'use client';

// Garantías (C-122): las solicitudes de los clientes con su estado. Antes llegaban mezcladas en Mensajes y Solicitudes.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconoArchivar, IconoBuscar, IconoChevronDerecha, IconoLista, IconoReloj, IconoSalvavidas } from '@/components/iconos';
import Filtros, { type Filtro as PildoraFiltro } from '@/components/admin/Filtros';
import {
  adminBadge, adminCard, adminEmpty, adminInput, adminPageHeaderCompact, adminPageSubtitle, adminPageTitle, adminRowZebra, adminSpinner,
  adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { conditionBadge, WARRANTY_REASONS, type Condition, type WarrantyReason } from '@/lib/product-condition';
import { CLAIM_STATUS_LABEL, CLAIM_STATUS_TONE, RESOLUTION_LABEL, type ClaimStatus, type Resolution } from '@/lib/warranty';

interface ClaimRow {
  id: string;
  code: string;
  productName: string;
  productCondition: Condition | null;
  status: ClaimStatus;
  resolution: Resolution | null;
  reason: WarrantyReason;
  warrantyDays: number;
  deliveredAt: string;
  awaitingStaff: boolean;
  createdAt: string;
  updatedAt: string;
  orderNumber: string;
  user: { name: string | null; email: string | null };
}

type Filtro = 'atender' | 'abiertas' | 'cerradas' | 'todas';
// C-245: los filtros en píldoras con ícono, cuenta y lo que juntan (PLAN.md §1.7)
const FILTROS: Omit<PildoraFiltro<Filtro>, 'cuenta'>[] = [
  { valor: 'atender', etiqueta: 'Por atender', ayuda: 'Esperan tu respuesta', Icono: IconoReloj, tono: 'aviso' },
  { valor: 'abiertas', etiqueta: 'Abiertas', ayuda: 'Todavía sin cerrar', Icono: IconoSalvavidas },
  { valor: 'cerradas', etiqueta: 'Cerradas', ayuda: 'Resueltas o rechazadas', Icono: IconoArchivar },
  { valor: 'todas', etiqueta: 'Todas', ayuda: 'Desde la primera', Icono: IconoLista },
];

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });

export default function GarantiasPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('atender');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [counts, setCounts] = useState({ atender: 0, abiertas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // La búsqueda espera a que se deje de escribir
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let vigente = true;
    const params = new URLSearchParams({ filtro });
    if (busqueda) params.set('q', busqueda);
    fetch(`/api/admin/warranty?${params}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!vigente) return;
        if (!r.ok || !data) throw new Error(data?.error || 'No se pudieron cargar las garantías');
        setClaims(data.claims);
        setCounts(data.counts);
        setError('');
      })
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudieron cargar las garantías'))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [filtro, busqueda]);

  return (
    <div className="min-w-0 space-y-3">
      <div className={adminPageHeaderCompact}>
        <div>
          <h1 className={adminPageTitle}>Garantías</h1>
          <p className={adminPageSubtitle}>{counts.atender} por atender · {counts.abiertas} abiertas</p>
        </div>
        <label className="relative block w-full lg:w-72">
          <span className="sr-only">Buscar</span>
          <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input value={q} onChange={(e) => { setCargando(true); setQ(e.target.value); }} placeholder="G-0012, pedido, cliente o producto" className={`${adminInput()} pl-9`} />
        </label>
      </div>

      <Filtros
        columnas={4}
        etiqueta="Filtrar solicitudes"
        valor={filtro}
        onCambiar={(v) => { if (v !== filtro) { setCargando(true); setFiltro(v); } }}
        filtros={FILTROS.map((f) => ({ ...f, cuenta: f.valor === 'atender' ? counts.atender : f.valor === 'abiertas' ? counts.abiertas : undefined }))}
      />

      {error && <p className="text-sm font-semibold text-deal" role="alert">{error}</p>}

      {cargando ? (
        <div className="flex justify-center py-12" role="status" aria-label="Cargando"><div className={adminSpinner} /></div>
      ) : claims.length === 0 ? (
        <div className={adminEmpty}>
          <IconoSalvavidas className="h-8 w-8 text-subtle" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted">{filtro === 'atender' ? 'No hay solicitudes por atender.' : 'No hay solicitudes aquí.'}</p>
        </div>
      ) : (
        <>
          <div className={`${adminTableWrap} hidden lg:block`}>
            <table className={`${adminTable} min-w-[780px]`}>
              <thead>
                <tr>
                  <th className={adminTh}>Código</th>
                  <th className={adminTh}>Producto</th>
                  <th className={adminTh}>Cliente / Pedido</th>
                  <th className={adminTh}>Motivo</th>
                  <th className={adminTh}>Estado</th>
                  <th className={adminTh}>Actualizada</th>
                  <th className={adminTh}><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => {
                  const etiqueta = conditionBadge(c.productCondition, null);
                  return (
                    <tr
                      key={c.id}
                      onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) router.push(`/admin/garantias/${c.id}`); }}
                      className={`cursor-pointer ${adminRowZebra}`}
                    >
                      <td className={adminTd}>
                        <Link href={`/admin/garantias/${c.id}`} className="font-mono text-sm font-semibold text-ink hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500">
                          {c.code}
                        </Link>
                        <span className="block text-xs text-muted">Pedida {fecha(c.createdAt)}</span>
                      </td>
                      <td className={adminTd}>
                        <span className="font-medium text-ink">{c.productName}</span>
                        {etiqueta && <span className="ml-2 text-xs font-semibold text-ink-soft">{etiqueta}</span>}
                        <span className="block text-xs text-muted">Garantía de {c.warrantyDays} días</span>
                      </td>
                      <td className={adminTd}>
                        <span className="font-medium text-ink">{c.user.name || c.user.email || 'Cliente'}</span>
                        <span className="block font-mono text-xs text-muted">Pedido #{c.orderNumber}</span>
                      </td>
                      <td className={`${adminTd} text-ink-soft`}>{WARRANTY_REASONS[c.reason] ?? c.reason}</td>
                      <td className={`${adminTd} whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1.5">
                          <span className={adminBadge(CLAIM_STATUS_TONE[c.status])}>
                            {CLAIM_STATUS_LABEL[c.status]}{c.status === 'RESOLVED' && c.resolution ? ` · ${RESOLUTION_LABEL[c.resolution]}` : ''}
                          </span>
                          {c.awaitingStaff && c.status !== 'RESOLVED' && c.status !== 'REJECTED' && <span className={adminBadge('warning')}>Por atender</span>}
                        </div>
                      </td>
                      <td className={`${adminTd} whitespace-nowrap text-ink-soft`}>
                        <span>{fecha(c.updatedAt)}</span>
                        <span className="block text-xs text-muted">Entregado {fecha(c.deliveredAt)}</span>
                      </td>
                      <td className={`${adminTd} text-right`}>
                        <Link href={`/admin/garantias/${c.id}`} aria-label={`Abrir garantía ${c.code}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-600">
                          <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2.5 lg:hidden">
            {claims.map((c) => {
              const etiqueta = conditionBadge(c.productCondition, null);
              return (
                <li key={c.id} className={`${adminCard} relative p-4 hover:border-brand-500 focus-within:border-brand-500`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/garantias/${c.id}`} className="font-mono text-sm font-semibold text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                      {c.code}
                    </Link>
                    <span className={adminBadge(CLAIM_STATUS_TONE[c.status])}>
                      {CLAIM_STATUS_LABEL[c.status]}{c.status === 'RESOLVED' && c.resolution ? ` · ${RESOLUTION_LABEL[c.resolution]}` : ''}
                    </span>
                    {c.awaitingStaff && c.status !== 'RESOLVED' && c.status !== 'REJECTED' && <span className={adminBadge('warning')}>Por atender</span>}
                    <span className="ml-auto text-xs text-muted">Actualizada el {fecha(c.updatedAt)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-ink">
                    {c.productName}
                    {etiqueta && <span className="ml-2 text-xs font-semibold text-ink-soft">{etiqueta}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {WARRANTY_REASONS[c.reason] ?? c.reason} · {c.user.name || c.user.email || 'Cliente'} · Pedido #{c.orderNumber}
                  </p>
                  <p className="text-xs text-muted">Entregado el {fecha(c.deliveredAt)} · garantía de {c.warrantyDays} días · pedida el {fecha(c.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
