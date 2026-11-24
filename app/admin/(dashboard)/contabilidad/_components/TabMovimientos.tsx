'use client';

import Ayuda from '@/components/admin/Ayuda';
import {
  IconoAdvertencia, IconoBillete, IconoGiftCard, IconoInfo, IconoOrdenes, IconoPuntosEs, IconoReportes,
} from '@/components/iconos';
import { adminBadge, adminCard, adminDato, adminNotice, adminRowZebra, adminTable, adminTableWrap, adminTd, adminTh } from '@/lib/admin-ui';
import { nombreMes } from '@/lib/contabilidad/montos';
import { formatUSD, formatVES } from '@/lib/currency';
import type { MovimientosMesDTO } from '@/lib/dto/contabilidad';

export default function TabMovimientos({ movimientos, esDueno }: {
  movimientos: MovimientosMesDTO;
  esDueno: boolean;
}) {
  const mes = nombreMes(movimientos.periodo);
  const { puntosES, giftCards, costos, porMetodo } = movimientos;

  return (
    <div className="space-y-4">
      <section className={adminCard} aria-labelledby="mov-resumen">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="mov-resumen" className="flex items-center gap-2 text-lg font-semibold text-ink">
              <IconoBillete className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Cobros de {mes} por método
            </h2>
            <p className="mt-1 text-sm text-muted">Todo lo cobrado en la tienda durante el mes, agrupado para conciliar banco y caja.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={adminBadge('brand')}>{formatUSD(movimientos.totalCobradoUSD)}</span>
            <span className={adminDato}>{formatVES(movimientos.totalCobradoBs)}</span>
          </div>
        </div>

        {porMetodo.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface p-5 text-sm text-muted">
            Sin órdenes pagadas registradas en {mes}.
          </div>
        ) : (
          <>
            <div className={`${adminTableWrap} mt-4 hidden lg:block`}>
              <table className={adminTable}>
                <thead>
                  <tr>
                    <th className={adminTh}>Método de pago</th>
                    <th className={`${adminTh} text-right`}>Órdenes</th>
                    <th className={`${adminTh} text-right`}>Total USD</th>
                    <th className={`${adminTh} text-right`}>Total Bs.</th>
                  </tr>
                </thead>
                <tbody>
                  {porMetodo.map((m) => (
                    <tr key={m.metodo} className={adminRowZebra}>
                      <td className={`${adminTd} font-medium text-ink`}>{m.metodo}</td>
                      <td className={`${adminTd} text-right tabular-nums text-ink-soft`}>{m.ordenes}</td>
                      <td className={`${adminTd} text-right font-semibold tabular-nums text-ink`}>{formatUSD(m.totalUSD)}</td>
                      <td className={`${adminTd} text-right tabular-nums text-ink-soft`}>{formatVES(m.totalBs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 space-y-2 lg:hidden">
              {porMetodo.map((m) => (
                <li key={m.metodo} className="rounded-xl border border-line bg-surface p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">{m.metodo}</span>
                    <span className="font-bold tabular-nums text-ink">{formatUSD(m.totalUSD)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted tabular-nums">
                    <span>{m.ordenes} {m.ordenes === 1 ? 'orden' : 'órdenes'}</span>
                    <span>{formatVES(m.totalBs)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={adminCard} aria-labelledby="mov-puntos">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 id="mov-puntos" className="flex items-center gap-2 text-base font-semibold text-ink">
                <IconoPuntosEs className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Conciliación de Puntos ES
              </h3>
              <p className="mt-0.5 text-xs text-muted">Movimientos de créditos promocionales en el mes y acumulado pendiente por canjear.</p>
            </div>
            <Ayuda etiqueta="Cómo se leen los Puntos ES">
              Muestra recargas acreditadas, consumos al pagar en tienda, devoluciones y comisiones aprobadas a promotores. Consulta con la contadora el momento fiscal de reconocimiento.
            </Ayuda>
          </div>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="text-ink-soft">Recargas acreditadas</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatUSD(puntosES.recargasUSD)}</dd>
            </div>
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="text-ink-soft">Consumos en órdenes</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatUSD(puntosES.consumosUSD)}</dd>
            </div>
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="text-ink-soft">Devoluciones a Puntos ES</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatUSD(puntosES.devolucionesUSD)}</dd>
            </div>
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="text-ink-soft">Comisiones de promotores</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatUSD(puntosES.comisionesPromotoresUSD)}</dd>
            </div>
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="font-semibold text-ink">Acumulado activo al cierre</dt>
              <dd className="font-bold tabular-nums text-brand-700">{formatUSD(puntosES.pasivoCierreUSD)}</dd>
            </div>
          </dl>
        </section>

        <section className={adminCard} aria-labelledby="mov-giftcards">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 id="mov-giftcards" className="flex items-center gap-2 text-base font-semibold text-ink">
                <IconoGiftCard className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Gift Cards del mes
              </h3>
              <p className="mt-0.5 text-xs text-muted">Tarjetas emitidas y canjeadas dentro del período.</p>
            </div>
            <span className={adminDato}>
              <IconoOrdenes className="h-3.5 w-3.5" aria-hidden="true" /> {giftCards.emitidasCantidad} emitidas
            </span>
          </div>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="text-ink-soft">Gift Cards emitidas ({giftCards.emitidasCantidad})</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatUSD(giftCards.emitidasUSD)}</dd>
            </div>
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="text-ink-soft">Monto canjeado en tienda</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatUSD(giftCards.canjeadasUSD)}</dd>
            </div>
          </dl>
          <div className={`${adminNotice('neutral')} mt-4 flex items-start gap-2.5`}>
            <IconoInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <p className="text-xs leading-relaxed">
              Los datos bancarios detallados y exportes de caja siempre excluyen el costo de compra de mercancía para la contadora.
            </p>
          </div>
        </section>
      </div>

      {esDueno && costos !== null && (
        <section className={adminCard} aria-labelledby="mov-costos">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id="mov-costos" className="flex items-center gap-2 text-base font-semibold text-ink">
                <IconoReportes className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Costo de mercancía y margen bruto (solo Dirección)
              </h3>
              <p className="mt-0.5 text-xs text-muted">Calculado en servidor sobre ventas pagadas del mes. Invisible para Contadora y Admin.</p>
            </div>
            <span className={adminBadge('brand')}>Margen {costos.margenPorcentaje.toFixed(1)} %</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs font-semibold text-muted">Ventas netas (sin IVA)</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink">{formatUSD(costos.ventasNetasSinIvaUSD)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs font-semibold text-muted">Costo de mercancía</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink">{formatUSD(costos.costoMercanciaUSD)}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5">
              <p className="text-xs font-semibold text-brand-700">Margen bruto estimado</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-brand-700">{formatUSD(costos.margenBrutoUSD)}</p>
            </div>
          </div>
          {costos.ordenesSinCosto > 0 && (
            <p className={`${adminNotice('warning')} mt-3 flex items-start gap-2.5 text-xs`}>
              <IconoAdvertencia aria-hidden="true" />
              <span>
                Hay <strong>{costos.ordenesSinCosto}</strong> {costos.ordenesSinCosto === 1 ? 'orden' : 'órdenes'} con artículos sin costo registrado; el margen real puede variar.
              </span>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
