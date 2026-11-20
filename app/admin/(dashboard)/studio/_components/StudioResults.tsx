'use client';

import { useState } from 'react';
import { IconoNovedad, IconoReportes } from '@/components/iconos';
import { adminBadge, adminEmpty, adminHint } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { StudioResult } from '@/lib/studio/schema';
import { smallButton, toggleButton } from './ui';

const PERIODS = [7, 30, 90] as const;

/**
 * Qué historia vende (C-113 + G-71): KPIs arriba, sello de Ganadora en la primera y botón "Repetir fórmula".
 */
export default function StudioResults({ onSelect, onRepeat }: { onSelect: (id: string) => void; onRepeat?: (id: string) => void }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [data, setData] = useState<{ results: StudioResult[]; money: boolean } | null>(null);
  useCargarAlMontar(async () => {
    setData(null);
    const res = await fetch(`/api/admin/studio/results?days=${days}`);
    setData(res.ok ? await res.json() : { results: [], money: false });
  }, [days]);

  const totals = data?.results.reduce((t, r) => ({ visits: t.visits + r.visits, paid: t.paid + r.paidOrders, usd: t.usd + r.paidUSD }), { visits: 0, paid: 0, usd: 0 });
  const top = data?.results[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="group" aria-label="Período">
          {PERIODS.map((d) => (
            <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={toggleButton(days === d)}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className={adminHint} aria-busy="true">
          Cargando resultados…
        </p>
      ) : data.results.length === 0 ? (
        <div className={adminEmpty}>
          <IconoReportes className="h-6 w-6 text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-ink">Aún no hay visitas desde las historias</p>
          <p className="mt-1 text-sm text-muted">Se cuentan cuando alguien entra por el QR o el enlace de una historia (el que lleva ?es=).</p>
        </div>
      ) : (
        <>
          {totals && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-white p-3.5">
                <strong className="block text-xl font-bold text-ink">{totals.visits}</strong>
                <span className="text-xs text-muted">Visitas desde QR y enlaces</span>
              </div>
              <div className="rounded-xl border border-line bg-white p-3.5">
                <strong className="block text-xl font-bold text-ink">{totals.paid}</strong>
                <span className="text-xs text-muted">Compras pagadas en {days} días</span>
              </div>
              {data.money && (
                <div className="rounded-xl border border-line bg-white p-3.5">
                  <strong className="block text-xl font-bold text-ink">{formatUSD(totals.usd)}</strong>
                  <span className="text-xs text-muted">Vendido atribuido</span>
                </div>
              )}
            </div>
          )}

          {top && onRepeat && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <div className="min-w-0 flex-1">
                <span className={adminBadge('success')}>Ganadora del período</span>
                <p className="mt-1.5 truncate text-sm font-bold text-ink">{top.name}</p>
                <p className="text-xs text-ink-soft">
                  {top.visits} visitas · {top.paidOrders} compras{data.money ? ` · ${formatUSD(top.paidUSD)}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => onRepeat(top.flyerId)} className={`${smallButton} border-brand-500! bg-brand-500! text-white! hover:bg-brand-600!`}>
                <IconoNovedad className="h-4 w-4" aria-hidden="true" />
                Repetir fórmula con otro producto
              </button>
            </div>
          )}

          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {data.results.map((r, idx) => (
              <li key={r.flyerId} className="flex flex-col justify-between gap-2 rounded-xl border border-line bg-white p-3">
                <button
                  type="button"
                  onClick={() => onSelect(r.flyerId)}
                  className="flex w-full flex-col gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                    {idx === 0 && <span className={adminBadge('success')}>Top</span>}
                  </span>
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
                {onRepeat && (
                  <div className="flex flex-wrap gap-2 border-t border-line pt-2">
                    <button type="button" onClick={() => onSelect(r.flyerId)} className={smallButton}>
                      Abrir
                    </button>
                    <button type="button" onClick={() => onRepeat(r.flyerId)} className={smallButton}>
                      Repetir fórmula
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={adminHint}>Una compra cuenta para la última historia por la que entró la persona, si compra dentro de los 7 días.</p>
    </div>
  );
}
