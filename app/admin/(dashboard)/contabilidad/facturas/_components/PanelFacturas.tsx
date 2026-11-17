'use client';

// C-229: Contabilidad → Facturas. El talonario en uso (la próxima y cuántas quedan), lo cobrado este mes que todavía no
// tiene factura, y las facturas del mes, emitidas y anuladas. Desde aquí se anula un papel que se dañó sin escribirlo.
// C-242 (la A que eligió el equipo el 14/11: "los grids se ven perdidos, íconos amontonados"): tres datos del mismo alto
// (la próxima, el talonario y lo cobrado sin factura), como el inicio del panel; lo raro (anular, cargar otro) va en gris
// bajo el talonario, y las dos notas de la ley detrás de su (i). Lo que falta facturar, en su lista, solo si hay.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import {
  IconoAdvertencia, IconoArchivo, IconoCerrar, IconoConfirmado, IconoDocumento, IconoEliminar, IconoFlechaDerecha, IconoMas, IconoReloj, IconoVer,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDangerButton, adminDato, adminError, adminHint, adminIconChip, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle,
  adminPrimaryButton, adminSecondaryButton, adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import type { CompraSinFactura } from '@/lib/contabilidad/servidor';
import { nombreMes } from '@/lib/contabilidad/montos';
import type { FacturaDTO, TalonarioDTO } from '@/lib/dto/contabilidad';
import { formatUSD, formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

// C-242: las tres tarjetas de arriba
const tarjeta = `${adminCard} flex flex-col gap-4`;
const etiqueta = 'flex items-center gap-1 text-xs font-semibold text-muted';
const cifra = 'mt-0.5 text-3xl font-bold leading-tight tabular-nums';
const pie = 'mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3';
const enlace = 'inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700';
const enlaceGris = 'inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand-600';
const tres = (n: number) => String(n).padStart(3, '0');

const fecha = (iso: string) => new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

// C-230: desde el 19/04/2027 se factura con el portal del SENIAT y lo que sobre del talonario se anula (Providencia 00093)
const PORTAL = '2027-04-19';
const DIA = 86_400_000;
const enDias = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DIA;
/** "7 de diciembre" (o "7 de enero de 2027" si es de otro año) */
const fechaLarga = (dias: number, hoy: string) => {
  const d = new Date(dias * DIA);
  const otroAnio = d.getUTCFullYear() !== Number(hoy.slice(0, 4));
  return new Intl.DateTimeFormat('es-VE', { timeZone: 'UTC', day: 'numeric', month: 'long', ...(otroAnio ? { year: 'numeric' } : {}) }).format(d);
};

/**
 * Hasta cuándo alcanza el talonario al ritmo de las ventas de los últimos 30 días (cada venta, su factura), y cuántas
 * facturas faltan para llegar al 19/04/2027, redondeadas a 50 (la imprenta las hace por talonarios).
 */
function pronosticar(quedan: number, ventas30: number, hoy: string): { hasta: number; llegaAlPortal: boolean; faltan: number } | null {
  if (ventas30 <= 0) return null;
  const porDia = ventas30 / 30;
  const hoyDias = enDias(hoy);
  const hasta = hoyDias + Math.floor(quedan / porDia);
  const portal = enDias(PORTAL);
  const faltan = Math.max(0, Math.ceil(porDia * (portal - hoyDias)) - quedan);
  return { hasta, llegaAlPortal: hasta >= portal, faltan: faltan > 0 ? Math.ceil(faltan / 50) * 50 : 0 };
}

export default function PanelFacturas({ mes, meses, talonario, facturas, compras, ventas30, hoy, esDueno, puedeFacturar }: {
  mes: string;
  /** Los meses para elegir, del más nuevo al más viejo */
  meses: string[];
  talonario: TalonarioDTO | null;
  facturas: FacturaDTO[];
  compras: CompraSinFactura[];
  /** C-230: las ventas de los últimos 30 días (con factura o por facturar), para el pronóstico del talonario */
  ventas30: number;
  /** "2026-11-16" en Venezuela */
  hoy: string;
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
  const pronostico = talonario && talonario.quedan > 0 && hoy < PORTAL ? pronosticar(talonario.quedan, ventas30, hoy) : null;

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

      <div className="grid gap-4 lg:grid-cols-3">
        {talonario ? (
          <>
            {/* La próxima */}
            <section className={tarjeta} aria-labelledby="la-proxima">
              <div className="flex items-start gap-4">
                <span className={adminIconChip('brand')}><IconoDocumento className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h2 id="la-proxima" className={etiqueta}>La próxima factura</h2>
                  {talonario.proximoTexto ? (
                    <>
                      <p className={`${cifra} text-ink`}>{talonario.proximoTexto}</p>
                      <p className="mt-0.5 text-xs text-muted">Control <span className="tabular-nums">{talonario.proximoControl}</span></p>
                    </>
                  ) : (
                    <>
                      <p className={`${cifra} text-ink`}>Se terminó</p>
                      <p className="mt-0.5 text-xs text-muted">Para seguir facturando, carga el talonario que sigue.</p>
                    </>
                  )}
                </div>
              </div>
              {puedeFacturar && talonario.proximoTexto && (
                <div className={pie}>
                  <Link href="/admin/contabilidad/facturas/nueva" className={enlace}>
                    <IconoMas className="h-4 w-4" aria-hidden="true" /> Escribir la {talonario.proximoTexto}
                  </Link>
                </div>
              )}
            </section>

            {/* El talonario */}
            <section className={tarjeta} aria-labelledby="talonario">
              <div className="flex items-start gap-4">
                <span className={adminIconChip('brand')}><IconoArchivo className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <h2 id="talonario" className={etiqueta}>
                    Talonario Serie {talonario.serie}
                    <Ayuda etiqueta="Hasta cuándo sirve el talonario">Desde el 19/04/2027 el talonario es solo para contingencias, y las que sobren ese día se anulan (Providencia 00093).</Ayuda>
                  </h2>
                  <p className={`${cifra} text-ink`}>{talonario.quedan} <span className="text-base font-semibold text-ink-soft">por usar</span></p>
                  <p className="mt-0.5 text-xs text-muted">Facturas {tres(talonario.numeroDesde)} a {tres(talonario.numeroHasta)} · {talonario.usadas} usadas</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden="true"><div className="h-full rounded-full bg-brand-500" style={{ width: `${porcentaje}%` }} /></div>
              {pronostico && (
                <p className="text-sm text-ink-soft">
                  {pronostico.llegaAlPortal
                    ? <>Al ritmo de los últimos 30 días ({ventas30} {ventas30 === 1 ? 'venta' : 'ventas'}), alcanzan hasta el <strong className="text-ink">19 de abril de 2027</strong>, cuando se empieza a facturar con el SENIAT.</>
                    : <>Al ritmo de los últimos 30 días ({ventas30} {ventas30 === 1 ? 'venta' : 'ventas'}), alcanzan hasta el <strong className="text-ink">{fechaLarga(pronostico.hasta, hoy)}</strong>.</>}
                </p>
              )}
              {((puedeFacturar && talonario.proximoTexto) || esDueno) && (
                <div className={pie}>
                  {puedeFacturar && talonario.proximoTexto && (
                    <button type="button" onClick={() => { setAnulando(true); setError(null); }} className={enlaceGris}>
                      <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Anular un papel dañado
                    </button>
                  )}
                  {esDueno && (
                    <Link href="/admin/contabilidad/talonarios/nuevo" className={enlaceGris}>
                      <IconoMas className="h-4 w-4" aria-hidden="true" /> Cargar otro talonario
                    </Link>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className={`${tarjeta} lg:col-span-2`} aria-labelledby="talonario">
            <div className="flex items-start gap-4">
              <span className={adminIconChip('brand')}><IconoArchivo className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 id="talonario" className="text-base font-semibold text-ink">El talonario</h2>
                <div className="mt-1">
                  <p className="text-sm text-muted">Todavía no hay un talonario cargado. Se carga una vez, con los datos que trae impresos.</p>
                  {esDueno ? (
                    <Link href="/admin/contabilidad/talonarios/nuevo" className={`${adminPrimaryButton} mt-3`}>
                      <IconoMas className="h-4 w-4" aria-hidden="true" /> Cargar el talonario
                    </Link>
                  ) : (
                    <p className={`${adminHint} mt-2`}>Lo carga el dueño, desde esta misma pantalla.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Lo cobrado sin factura */}
        <section className={tarjeta} aria-labelledby="sin-factura">
          <div className="flex items-start gap-4">
            <span className={adminIconChip(compras.length > 0 ? 'warning' : 'success')}>
              {compras.length > 0 ? <IconoReloj className="h-5 w-5" aria-hidden="true" /> : <IconoConfirmado className="h-5 w-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <h2 id="sin-factura" className={etiqueta}>
                Cobradas sin factura
                <Ayuda etiqueta="Por qué cada venta lleva factura">La ley pide factura en cada venta, aunque el cliente no la pida. La contadora lo confirmó el 16/11: se factura todo.</Ayuda>
              </h2>
              {compras.length === 0 ? (
                <>
                  <p className={`${cifra} text-success-strong`}>Al día</p>
                  <p className="mt-0.5 text-xs text-muted">Todo lo cobrado en {nombreMes(mes)} tiene su factura.</p>
                </>
              ) : (
                <>
                  <p className={`${cifra} flex flex-wrap items-center gap-2 text-ink`}>
                    {compras.length}
                    {puedeFacturar && <span className={adminBadge('warning')}><IconoReloj className="h-3.5 w-3.5" aria-hidden="true" /> Te toca</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{compras.length === 1 ? 'Compra pagada' : 'Compras pagadas'} en {nombreMes(mes)} todavía sin factura.</p>
                </>
              )}
            </div>
          </div>
          {compras.length > 0 && (
            <div className={pie}>
              <a href="#por-facturar" className={enlace}>
                <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" /> {puedeFacturar ? 'Ver y facturar' : 'Ver cuáles'}
              </a>
            </div>
          )}
        </section>
      </div>

      {/* C-230: si el talonario no llega al 19/04/2027, el dueño pide otro (solo lo justo: lo que sobre ese día se anula) */}
      {esDueno && pronostico && !pronostico.llegaAlPortal && pronostico.faltan > 0 && (
        <div className={`${adminNotice('warning')} flex items-start gap-3`} role="status">
          <IconoArchivo aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold">Pide otro talonario a la imprenta: unas {pronostico.faltan} facturas</p>
            <p className="mt-0.5">Es lo justo hasta el 19/04/2027, cuando se empieza a facturar con el SENIAT y lo que sobre se anula. Cuando llegue, cárgalo aquí.</p>
          </div>
        </div>
      )}

      {/* Lo que falta facturar, solo si hay */}
      {compras.length > 0 && (
        <section id="por-facturar" className={`${adminCard} scroll-mt-24`} aria-labelledby="por-facturar-titulo">
          <h2 id="por-facturar-titulo" className="text-base font-semibold text-ink">Por facturar</h2>
          <ul className="mt-1 divide-y divide-line">
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
          {compras.length > 8 && <p className={`${adminHint} mt-2`}>Y {compras.length - 8} más: aparecen al facturar las de arriba.</p>}
        </section>
      )}

      {/* Las facturas del mes */}
      <section aria-labelledby="del-mes" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="del-mes" className="text-lg font-semibold text-ink">Facturas de {nombreMes(mes)}</h2>
          {emitidas.length > 0 && <span className={adminDato}>{emitidas.length} emitidas · {formatVES(totalBs)}</span>}
        </div>
        {facturas.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-white p-5">
            <span className={adminIconChip('brand')}><IconoDocumento className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">Sin facturas registradas en {nombreMes(mes)}</p>
              <p className="mt-0.5 text-sm text-muted">Cada factura del talonario se registra aquí al escribirla.</p>
            </div>
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
