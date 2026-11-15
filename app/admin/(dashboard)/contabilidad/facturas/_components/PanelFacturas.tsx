'use client';

// C-229: Contabilidad → Facturas. El talonario en uso (la próxima y cuántas quedan), lo cobrado este mes que todavía no
// tiene factura, y las facturas del mes, emitidas y anuladas. Desde aquí se anula un papel que se dañó sin escribirlo.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  IconoAdvertencia, IconoCalendario, IconoCerrar, IconoDocumento, IconoEliminar, IconoInfo, IconoMas, IconoOrdenes, IconoReloj, IconoVer,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDangerButton, adminDato, adminEmpty, adminError, adminHint, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminPageHeader, adminPageSubtitle, adminPageTitle,
  adminPrimaryButton, adminSecondaryButton, adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import type { CompraSinFactura } from '@/lib/contabilidad/servidor';
import { nombreMes } from '@/lib/contabilidad/montos';
import type { FacturaDTO, TalonarioDTO } from '@/lib/dto/contabilidad';
import { formatUSD, formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const fecha = (iso: string) => new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

export default function PanelFacturas({ mes, meses, talonario, facturas, compras, esDueno, puedeFacturar }: {
  mes: string;
  /** Los meses para elegir, del más nuevo al más viejo */
  meses: string[];
  talonario: TalonarioDTO | null;
  facturas: FacturaDTO[];
  compras: CompraSinFactura[];
  esDueno: boolean;
  /** C-235: la contadora ve todo, pero no factura ni anula */
  puedeFacturar: boolean;
}) {
  const router = useRouter();
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBodyScrollLock(anulando);

  const emitidas = facturas.filter((f) => f.estado === 'EMITIDA');
  const totalBs = emitidas.reduce((s, f) => s + f.totalBs, 0);
  const porcentaje = talonario ? Math.round((talonario.usadas / (talonario.numeroHasta - talonario.numeroDesde + 1)) * 100) : 0;

  const anularEnBlanco = async () => {
    if (!talonario?.proximo) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/facturas/en-blanco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim(), numeroEsperado: talonario.proximo }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudo anular.');
        if (r.status === 409) router.refresh();
        return;
      }
      toast.success(`${d.etiqueta} anulada. La próxima es la siguiente.`);
      setAnulando(false);
      setMotivo('');
      router.refresh();
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Facturas</h1>
          <p className={adminPageSubtitle}>Las facturas del talonario, registradas como se escribieron.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="facturas-mes" className="sr-only">Mes</label>
          <select id="facturas-mes" value={mes} onChange={(e) => router.push(`/admin/contabilidad/facturas?mes=${e.target.value}`)} className="h-11 rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold text-ink">
            {meses.map((m) => <option key={m} value={m}>{nombreMes(m).replace(/^./, (c) => c.toUpperCase())}</option>)}
          </select>
          {talonario && puedeFacturar && (
            <Link href="/admin/contabilidad/facturas/nueva" className={adminPrimaryButton}>
              <IconoMas className="h-4 w-4" aria-hidden="true" /> Nueva factura
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        {/* Lo cobrado sin factura */}
        <section className={adminCard} aria-labelledby="sin-factura">
          <h2 id="sin-factura" className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
            <IconoOrdenes className="h-5 w-5" aria-hidden="true" /> Cobradas sin factura
            {compras.length > 0 && puedeFacturar && <span className={adminBadge('warning')}><IconoReloj className="h-3.5 w-3.5" aria-hidden="true" /> Te toca</span>}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {compras.length === 0 ? `Todo lo cobrado en ${nombreMes(mes)} tiene su factura.` : `${compras.length} ${compras.length === 1 ? 'compra pagada' : 'compras pagadas'} en ${nombreMes(mes)} todavía sin factura.`}
          </p>
          {compras.length > 0 && (
            <ul className="mt-3 divide-y divide-line">
              {compras.slice(0, 8).map((c) => (
                <li key={c.ordenIds.join()} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-semibold text-ink">{c.ordenes.join(' y ')} · {c.cliente}</p>
                    <p className="text-xs text-muted">
                      {c.pagadaEl ? `Pagada el ${fecha(c.pagadaEl)}` : ''}{c.metodo ? ` · ${c.metodo}` : ''}{c.digital ? ' · sin IVA' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-ink">{formatUSD(c.totalUSD)}</span>
                  {puedeFacturar && (
                    <Link href={`/admin/contabilidad/facturas/nueva?ordenes=${c.ordenIds.join(',')}`} className={`${adminSecondaryButton} h-9`}>
                      <IconoDocumento className="h-4 w-4" aria-hidden="true" /> Facturar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {compras.length > 8 && <p className={`${adminHint} mt-2`}>Y {compras.length - 8} más: aparecen al facturar las de arriba.</p>}
          <p className="mt-3 flex gap-2 text-xs text-muted">
            <IconoInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            La ley pide factura en cada venta, aunque el cliente no la pida. Se decide con la contadora (A16).
          </p>
        </section>

        {/* El talonario */}
        <section className={adminCard} aria-labelledby="talonario">
          <h2 id="talonario" className="flex items-center gap-2 text-base font-semibold text-ink">
            <IconoDocumento className="h-5 w-5" aria-hidden="true" /> {talonario ? `Talonario Serie ${talonario.serie}` : 'El talonario'}
          </h2>
          {talonario ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Facturas {String(talonario.numeroDesde).padStart(3, '0')} a {String(talonario.numeroHasta).padStart(3, '0')} · la próxima es la{' '}
                <strong className="tabular-nums text-ink">{talonario.proximoTexto}</strong> (control <span className="whitespace-nowrap tabular-nums">{talonario.proximoControl}</span>).
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden="true"><div className="h-full rounded-full bg-brand-500" style={{ width: `${porcentaje}%` }} /></div>
              <p className="mt-1.5 flex justify-between text-xs text-ink-soft"><span>{talonario.usadas} usadas</span><strong className="tabular-nums">{talonario.quedan} por usar</strong></p>
              {puedeFacturar && (
                <button type="button" onClick={() => { setAnulando(true); setError(null); }} className={`${adminSecondaryButton} mt-4 w-full`}>
                  <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Se dañó un papel: anular la {talonario.proximoTexto}
                </button>
              )}
              <p className="mt-3 flex gap-2 text-xs text-muted">
                <IconoCalendario className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Desde el 19/04/2027 el talonario es solo para contingencias, y las que sobren ese día se anulan (Providencia 00093).
              </p>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted">Todavía no hay un talonario cargado. Se carga una vez, con los datos que trae impresos.</p>
              {esDueno ? (
                <Link href="/admin/contabilidad/talonarios/nuevo" className={`${adminPrimaryButton} mt-3`}>
                  <IconoMas className="h-4 w-4" aria-hidden="true" /> Cargar el talonario
                </Link>
              ) : (
                <p className={`${adminHint} mt-2`}>Lo carga el dueño, desde esta misma pantalla.</p>
              )}
            </div>
          )}
          {talonario && esDueno && (
            <Link href="/admin/contabilidad/talonarios/nuevo" className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700">Cargar otro talonario</Link>
          )}
        </section>
      </div>

      {/* Las facturas del mes */}
      <section aria-labelledby="del-mes" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="del-mes" className="text-lg font-semibold text-ink">Facturas de {nombreMes(mes)}</h2>
          {emitidas.length > 0 && <span className={adminDato}>{emitidas.length} emitidas · {formatVES(totalBs)}</span>}
        </div>
        {facturas.length === 0 ? (
          <div className={adminEmpty}>
            <IconoDocumento className="h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="mt-2 font-semibold text-ink">Sin facturas registradas en {nombreMes(mes)}</p>
            <p className="mt-1 text-sm text-muted">Cada factura del talonario se registra aquí al escribirla.</p>
          </div>
        ) : (
          <div className={adminTableWrap}>
            <table className={adminTable}>
              <thead>
                <tr>
                  <th className={adminTh}>Factura</th>
                  <th className={adminTh}>Fecha</th>
                  <th className={adminTh}>Cliente</th>
                  <th className={adminTh}>RIF o C.I.</th>
                  <th className={`${adminTh} text-right`}>Total</th>
                  <th className={adminTh}>Estado</th>
                  <th className={adminTh}><span className="sr-only">Ver</span></th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-surface">
                    <td className={`${adminTd} whitespace-nowrap font-semibold tabular-nums`}>{f.etiqueta}<span className="block text-xs font-normal text-muted">{f.numeroControl}</span></td>
                    <td className={`${adminTd} whitespace-nowrap tabular-nums`}>{fecha(f.emitidaEl)}</td>
                    <td className={`${adminTd} max-w-56 truncate`}>{f.origen === 'EN_BLANCO' ? <span className="text-muted">Papel anulado sin usar</span> : f.comprador?.nombre}</td>
                    <td className={`${adminTd} whitespace-nowrap tabular-nums`}>{f.comprador?.documento}</td>
                    <td className={`${adminTd} whitespace-nowrap text-right tabular-nums`}>{f.estado === 'EMITIDA' ? formatVES(f.totalBs) : ''}</td>
                    <td className={adminTd}>
                      {f.estado === 'ANULADA'
                        ? <span className={adminBadge('danger')}><IconoCerrar className="h-3.5 w-3.5" aria-hidden="true" /> Anulada</span>
                        : <span className={adminBadge('success')}><IconoDocumento className="h-3.5 w-3.5" aria-hidden="true" /> Emitida</span>}
                    </td>
                    <td className={`${adminTd} text-right`}>
                      <Link href={`/admin/contabilidad/facturas/${f.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                        <IconoVer className="h-4 w-4" aria-hidden="true" /> Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {anulando && talonario && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="anular-titulo" onClick={(e) => { if (e.target === e.currentTarget && !enviando) setAnulando(false); }}>
          <div className={`${adminModalPanel} sm:max-w-md`}>
            <div className={adminModalHeader}>
              <h2 id="anular-titulo" className={adminModalTitle}>Anular la {talonario.proximoTexto} sin usar</h2>
              <button type="button" onClick={() => setAnulando(false)} disabled={enviando} aria-label="Cerrar" className="rounded-lg p-2 text-muted hover:bg-surface"><IconoCerrar className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={adminModalBody}>
              <p className="text-sm text-ink-soft">
                El papel <strong className="tabular-nums">{talonario.proximoTexto}</strong> (control {talonario.proximoControl}) queda anulado y la próxima pasa a la siguiente. <strong>Guarda el papel:</strong> el original y la copia.
              </p>
              <label htmlFor="anular-motivo" className={`${adminLabel} mt-4`}>Motivo</label>
              <textarea id="anular-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} rows={3} placeholder="Se manchó antes de escribirla" className="w-full rounded-lg border border-line-strong p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              {error && <p role="alert" className={`${adminError} mt-2`}><IconoAdvertencia className="mr-1 inline h-4 w-4" aria-hidden="true" />{error}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setAnulando(false)} disabled={enviando} className={adminSecondaryButton}>Cancelar</button>
              <button type="button" onClick={() => void anularEnBlanco()} disabled={enviando || motivo.trim().length < 5} className={adminDangerButton}>
                {enviando ? 'Anulando…' : `Anular la ${talonario.proximoTexto}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
