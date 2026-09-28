'use client';

import { useState } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { adminEmpty, adminHint } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { StudioResult } from '@/lib/studio/schema';
import { toggleButton } from './ui';

const PERIODS = [7, 30, 90] as const;

/**
 * Qué historia vende (C-113): visitas por su enlace o QR y compras de quienes llegaron por ella (en los 7 días
 * siguientes a la visita). "Pagadas" sigue la regla de las comisiones: pago confirmado y sin cancelar.
 */
export default function StudioResults({ onSelect }: { onSelect: (id: string) => void }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [data, setData] = useState<{ results: StudioResult[]; money: boolean } | null>(null);
  useCargarAlMontar(async () => {
    setData(null);
    const res = await fetch(`/api/admin/studio/results?days=${days}`);
    setData(res.ok ? await res.json() : { results: [], money: false });
  }, [days]);

  const totals = data?.results.reduce((t, r) => ({ visits: t.visits + r.visits, paid: t.paid + r.paidOrders, usd: t.usd + r.paidUSD }), { visits: 0, paid: 0, usd: 0 });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Período">
        {PERIODS.map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={toggleButton(days === d)}>
            {d} días
          </button>
        ))}
      </div>
      {!data ? (
        <p className={adminHint} aria-busy="true">
          Cargando resultados…
        </p>
      ) : data.results.length === 0 ? (
        <div className={adminEmpty}>
          <FiBarChart2 className="h-6 w-6 text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-ink">Aún no hay visitas desde las historias</p>
          <p className="mt-1 text-sm text-muted">Se cuentan cuando alguien entra por el QR o el enlace de una historia (el que lleva ?es=).</p>
        </div>
      ) : (
        <>
          {totals && (
            <p className="text-sm text-ink-soft">
              {totals.visits} visitas · {totals.paid} compras pagadas{data.money && ` · ${formatUSD(totals.usd)}`}
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            {data.results.map((r) => (
              <li key={r.flyerId}>
                <button
                  type="button"
                  onClick={() => onSelect(r.flyerId)}
                  className="flex w-full flex-col gap-1 rounded-lg border border-line p-2.5 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                  <span className="grid grid-cols-3 gap-1 text-xs text-muted">
                    <span>
                      <strong className="block text-base text-ink">{r.visits}</strong>
                      visitas
                    </span>
                    <span>
                      <strong className="block text-base text-ink">{r.paidOrders}</strong>
                      {r.orders > r.paidOrders ? `pagadas de ${r.orders}` : 'compras'}
                    </span>
                    {data.money && (
                      <span>
                        <strong className="block text-base text-ink">{formatUSD(r.paidUSD)}</strong>
                        vendido
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={adminHint}>Una compra cuenta para la última historia por la que entró la persona, si compra dentro de los 7 días.</p>
    </div>
  );
}
