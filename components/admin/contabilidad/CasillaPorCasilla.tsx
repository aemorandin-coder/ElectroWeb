// C-229: la factura en el teléfono. La réplica no se lee a 360 px (la maqueta del 14/11): va casilla por casilla, con
// los mismos números que en la computadora, en el orden en que se escribe.

import type { ReactNode } from 'react';
import { formatAmount } from '@/lib/currency';
import type { DatosReplica } from './ReplicaTalonario';

export default function CasillaPorCasilla({ datos }: { datos: DatosReplica }) {
  const c = datos.comprador;
  const t = datos.totales;
  const casillas: Array<{ n: number; etiqueta: string; valor: ReactNode }> = [
    { n: 1, etiqueta: 'Fecha de emisión', valor: datos.fecha ? `${datos.fecha.dia} · ${datos.fecha.mes} · ${datos.fecha.anio}` : '' },
    { n: 2, etiqueta: 'Nombre o razón social', valor: c?.nombre },
    { n: 3, etiqueta: 'Domicilio fiscal', valor: c?.domicilio || 'En blanco' },
    { n: 4, etiqueta: 'RIF o C.I.', valor: c?.documento },
    { n: 5, etiqueta: 'Teléfono', valor: c?.telefono || 'En blanco' },
    { n: 6, etiqueta: 'Condiciones de pago', valor: datos.condicionPago === 'CREDITO' ? 'Crédito' : 'Contado' },
    {
      n: 7,
      etiqueta: 'Renglones (precio sin IVA)',
      valor: (
        <span className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          {datos.renglones.map((r, i) => (
            <span key={i} className="contents">
              <span className="font-semibold">{String(r.cantidad).padStart(2, '0')} · {r.descripcion}{r.exento ? ' (E)' : ''}</span>
              <span className="text-right font-semibold tabular-nums">{formatAmount(r.montoBs)}</span>
            </span>
          ))}
        </span>
      ),
    },
    { n: 8, etiqueta: 'Renglones vacíos', valor: 'Táchalos con una raya' },
    {
      n: 9,
      etiqueta: 'Abajo',
      valor: t ? (
        <span className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5">
          {t.descuentoBs > 0 && <><span>Descuento</span><span className="text-right font-semibold tabular-nums">{formatAmount(t.descuentoBs)}</span></>}
          <span>Total base imponible</span><span className="text-right font-semibold tabular-nums">{formatAmount(t.baseBs)}</span>
          <span>Total exento o exonerado</span><span className="text-right font-semibold tabular-nums">{t.exentoBs ? formatAmount(t.exentoBs) : ''}</span>
          <span>IVA {datos.alicuota} %</span><span className="text-right font-semibold tabular-nums">{formatAmount(t.ivaBs)}</span>
          <span className="font-semibold">Monto total</span><span className="text-right font-bold tabular-nums">{formatAmount(t.totalBs)}</span>
        </span>
      ) : '',
    },
  ];
  return (
    <ol className="divide-y divide-line text-sm">
      {casillas.map((casilla) => (
        <li key={casilla.n} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-2.5">
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{casilla.n}</span>
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="text-xs text-muted">{casilla.etiqueta}</p>
            <div className="font-semibold text-ink">{casilla.valor}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
