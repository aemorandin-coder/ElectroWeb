'use client';

// Garantías (C-122): las solicitudes de los clientes con su estado. Antes llegaban mezcladas en Mensajes y Solicitudes.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiLifeBuoy, FiSearch } from 'react-icons/fi';
import {
  adminBadge, adminCard, adminEmpty, adminInput, adminPageHeader, adminPageSubtitle, adminPageTitle, adminSpinner, adminTab,
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
const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'atender', label: 'Por atender' },
  { value: 'abiertas', label: 'Abiertas' },
  { value: 'cerradas', label: 'Cerradas' },
  { value: 'todas', label: 'Todas' },
];

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });

export default function GarantiasPage() {
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
    <div className="min-w-0 space-y-4">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Garantías</h1>
          <p className={adminPageSubtitle}>{counts.atender} por atender · {counts.abiertas} abiertas</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filtrar solicitudes">
          {FILTROS.map((f) => (
            <button key={f.value} type="button" role="tab" aria-selected={filtro === f.value} onClick={() => { setCargando(true); setFiltro(f.value); }} className={adminTab(filtro === f.value)}>
              {f.label}
              {f.value === 'atender' && counts.atender > 0 && <span className="rounded-full bg-deal-bg px-2 text-xs font-semibold text-deal tabular-nums">{counts.atender}</span>}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-80">
          <span className="sr-only">Buscar</span>
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input value={q} onChange={(e) => { setCargando(true); setQ(e.target.value); }} placeholder="G-0012, pedido, cliente o producto" className={`${adminInput()} pl-9`} />
        </label>
      </div>

      {error && <p className="text-sm font-semibold text-deal" role="alert">{error}</p>}

      {cargando ? (
        <div className="flex justify-center py-12" role="status" aria-label="Cargando"><div className={adminSpinner} /></div>
      ) : claims.length === 0 ? (
        <div className={adminEmpty}>
          <FiLifeBuoy className="h-8 w-8 text-subtle" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted">{filtro === 'atender' ? 'No hay solicitudes por atender.' : 'No hay solicitudes aquí.'}</p>
        </div>
      ) : (
        <ul className="space-y-2">
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
                  {c.awaitingStaff && c.status !== 'RESOLVED' && c.status !== 'REJECTED' && <span className={adminBadge('danger')}>Por atender</span>}
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
      )}
    </div>
  );
}
