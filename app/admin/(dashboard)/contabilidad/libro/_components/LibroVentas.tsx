'use client';

// C-230: el libro de ventas del mes (la A que eligió el equipo el 16/11, viendo las maquetas). Arriba, la única pieza
// fuerte: el IVA del mes con su fecha. Debajo, una línea por factura con las columnas que pidió la contadora (en la
// computadora, la factura con su control y el cliente con su RIF en una celda; en el teléfono, una tarjeta por factura) y
// lo que va en la declaración. "Imprimir" saca la hoja como el Excel: una columna por dato, apaisada.

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconoCerrar, IconoDescargar, IconoDocumento, IconoImpresora, IconoPorcentaje, IconoReportes } from '@/components/iconos';
import {
  adminBadge, adminCard, adminDato, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton,
  adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { fechaCorta, type FilaLibro, type LibroVentas as Libro } from '@/lib/contabilidad/libro';
import { nombreMes } from '@/lib/contabilidad/montos';
import { formatVES } from '@/lib/currency';

/** "31.990,70": los montos del libro, sin "Bs." (la columna ya lo dice) */
const cifra = (n: number) => formatVES(n).replace(/^Bs\.\s*/, '');
const diaMes = (iso: string) => fechaCorta(iso).slice(0, 5);
const nadaQueHacer = () => () => {};

export default function LibroVentas({ libro, meses, vence, empresa, embebido = false }: {
  libro: Libro;
  /** Los meses para elegir, del más nuevo al más viejo */
  meses: string[];
  /** Hasta cuándo se declara el IVA del mes ("2026-12-15") */
  vence: string;
  empresa: { nombre: string; rif: string };
  /** True cuando se muestra dentro de Libros e IVA del Hub para no repetir h1 ni selector de mes */
  embebido?: boolean;
}) {
  const router = useRouter();
  // La hoja para imprimir va directo en el body (fuera del marco del panel), solo en el navegador
  const enNavegador = useSyncExternalStore(nadaQueHacer, () => true, () => false);
  const mes = nombreMes(libro.periodo);
  const Mes = mes.replace(/^./, (c) => c.toUpperCase());
  const { totales } = libro;
  const vacio = libro.filas.length === 0;
  const gravado = libro.porAlicuota[0] ?? null;
  /** Si todo lo gravado va a una sola alícuota (la general), va en el título de la columna del IVA */
  const unaAlicuota = libro.porAlicuota.length <= 1 ? (gravado?.alicuota ?? null) : null;

  const imprimir = () => {
    document.body.classList.add('imprimiendo-libro');
    window.addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-libro'), { once: true });
    window.print();
  };

  const cifras = [
    { titulo: 'Ventas del mes', valor: formatVES(totales.totalBs), detalle: `${libro.emitidas} ${libro.emitidas === 1 ? 'factura' : 'facturas'}${libro.anuladas ? ` · ${libro.anuladas} ${libro.anuladas === 1 ? 'anulada' : 'anuladas'}` : ''}`, ancho: true },
    { titulo: 'Base imponible', valor: formatVES(totales.baseBs), detalle: gravado ? `Lo gravado al ${gravado.alicuota} %, sin el IVA` : 'Sin ventas gravadas' },
    { titulo: 'Exento o no sujeto', valor: formatVES(totales.exentoBs), detalle: 'Los renglones con (E)' },
  ];

  const declaracion = [
    ...libro.porAlicuota.flatMap((a) => [
      { texto: `Ventas gravadas al ${a.alicuota} %: base imponible`, valor: a.baseBs },
      { texto: `IVA de esas ventas (débito fiscal)`, valor: a.ivaBs },
    ]),
    { texto: 'Ventas exentas o no sujetas', valor: totales.exentoBs },
    { texto: 'IVA que retuvieron los compradores', valor: totales.ivaRetenidoBs },
  ];

  const enlaceFactura = (f: FilaLibro) => (
    <Link href={`/admin/contabilidad/facturas/${f.id}`} className="font-semibold text-brand-600 underline-offset-2 hover:underline">{f.factura}</Link>
  );
  const anulada = <span className={adminBadge('danger')}><IconoCerrar className="h-3.5 w-3.5" aria-hidden="true" /> Anulada</span>;

  return (
    <div className="space-y-4">
      {embebido ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Libro de ventas · {Mes}</h2>
            <p className="text-xs text-muted">Una línea por documento fiscal en orden cronológico (incluye Notas de Crédito y Débito).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!vacio && (
              <button type="button" onClick={imprimir} className={`${adminSecondaryButton} max-lg:hidden!`}>
                <IconoImpresora className="h-4 w-4" aria-hidden="true" /> Imprimir
              </button>
            )}
            <a href={`/api/admin/contabilidad/libro?mes=${libro.periodo}`} download className={`${adminPrimaryButton} w-full sm:w-auto`}>
              <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Libro de ventas (.xlsx)
            </a>
          </div>
        </div>
      ) : (
        <header className={adminPageHeader}>
          <div>
            <h1 className={adminPageTitle}>Libro de ventas</h1>
            <p className={adminPageSubtitle}>Una línea por factura, en bolívares, con las columnas que pidió la contadora.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="libro-mes" className="sr-only">Mes</label>
            <select id="libro-mes" value={libro.periodo} onChange={(e) => router.push(`/admin/contabilidad/libro?mes=${e.target.value}`)} className="h-11 rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold text-ink">
              {meses.map((m) => <option key={m} value={m}>{nombreMes(m).replace(/^./, (c) => c.toUpperCase())}</option>)}
            </select>
            {!vacio && (
              <button type="button" onClick={imprimir} className={`${adminSecondaryButton} max-lg:hidden!`}>
                <IconoImpresora className="h-4 w-4" aria-hidden="true" /> Imprimir
              </button>
            )}
            <a href={`/api/admin/contabilidad/libro?mes=${libro.periodo}`} download className={`${adminPrimaryButton} w-full sm:w-auto`}>
              <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar en Excel
            </a>
          </div>
        </header>
      )}

      {/* La pieza fuerte: el IVA del mes con su fecha. Lo demás, neutro */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <section className="col-span-2 rounded-2xl bg-brand-700 p-5 text-white xl:col-span-1" aria-labelledby="libro-iva">
          <h2 id="libro-iva" className="flex items-center gap-1.5 text-xs font-semibold text-white/80"><IconoPorcentaje className="h-4 w-4" aria-hidden="true" /> IVA de {mes.split(' de ')[0]} (débito fiscal)</h2>
          <p className="mt-1 whitespace-nowrap text-3xl font-bold tabular-nums">{formatVES(totales.ivaBs)}</p>
          <p className="mt-1 text-sm text-white/85">Se declara hasta el <strong>{fechaCorta(vence)}</strong></p>
        </section>
        {cifras.map((c) => (
          <section key={c.titulo} className={`${adminCard} p-4! sm:p-5! ${c.ancho ? 'col-span-2 xl:col-span-1' : ''}`}>
            <h2 className="text-xs font-semibold text-muted">{c.titulo}</h2>
            <p className="mt-1 whitespace-nowrap text-lg font-bold tabular-nums text-ink sm:text-2xl">{c.valor}</p>
            <p className="mt-0.5 text-xs text-muted">{c.detalle}</p>
          </section>
        ))}
      </div>

      <section aria-labelledby="libro-facturas" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="libro-facturas" className="text-lg font-semibold text-ink">Las facturas de {mes.split(' de ')[0]}</h2>
          {!vacio && <span className={adminDato}>{libro.filas.length} en el libro{libro.anuladas ? ` · ${libro.anuladas} ${libro.anuladas === 1 ? 'anulada' : 'anuladas'}` : ''}</span>}
        </div>

        {vacio ? (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-white p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><IconoDocumento className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">Sin facturas registradas en {mes}</p>
              <p className="mt-0.5 text-sm text-muted">El libro se arma solo con cada factura del talonario que se registra en <Link href="/admin/contabilidad/facturas" className="font-semibold text-brand-600 hover:text-brand-700">Facturas</Link>.</p>
            </div>
          </div>
        ) : (
          <>
            {/* La computadora ancha (desde 1280 px): lo que va junto, en una celda. El mes ya está arriba: la fecha va con día y
                mes, y la alícuota en el título del IVA (una sola, la general). Más angosto, las tarjetas de abajo */}
            <div className={`${adminTableWrap} hidden xl:block`}>
              <table className={adminTable}>
                <thead>
                  <tr>
                    <th className={`${adminTh} px-3!`}>Fecha</th>
                    <th className={`${adminTh} px-3!`}>Factura</th>
                    <th className={`${adminTh} px-3!`}>Cliente</th>
                    <th className={`${adminTh} px-3! text-right`}>Total</th>
                    <th className={`${adminTh} px-3! text-right`}>Exento</th>
                    <th className={`${adminTh} px-3! whitespace-nowrap text-right`}>Base imponible</th>
                    <th className={`${adminTh} px-3! whitespace-nowrap text-right`}>IVA{unaAlicuota === null ? '' : ` ${unaAlicuota} %`}</th>
                    <th className={`${adminTh} px-3! whitespace-nowrap text-right`}>IVA retenido</th>
                  </tr>
                </thead>
                <tbody>
                  {libro.filas.map((f) => {
                    const monto = (n: number, fuerte = false) => (
                      <td className={`${adminTd} px-3! whitespace-nowrap text-right tabular-nums ${f.anulada || !n ? 'text-subtle' : fuerte ? 'font-semibold' : ''}`}>{cifra(n)}</td>
                    );
                    return (
                      <tr key={f.id} className="hover:bg-surface">
                        <td className={`${adminTd} px-3! whitespace-nowrap tabular-nums`}>{diaMes(f.fecha)}</td>
                        <td className={`${adminTd} px-3! whitespace-nowrap`}>{enlaceFactura(f)}<span className="block text-xs tabular-nums text-muted">{f.control}</span></td>
                        <td className={`${adminTd} px-3!`}>
                          {f.anulada ? anulada : <span className="block max-w-56 truncate">{f.nombre}</span>}
                          <span className="block text-xs tabular-nums text-muted">{f.documento || ' '}</span>
                        </td>
                        {monto(f.totalBs, true)}
                        {monto(f.exentoBs)}
                        {monto(f.baseBs)}
                        <td className={`${adminTd} px-3! whitespace-nowrap text-right tabular-nums ${f.anulada || !f.ivaBs ? 'text-subtle' : ''}`}>
                          {cifra(f.ivaBs)}
                          {unaAlicuota === null && f.alicuota !== null && <span className="block text-xs text-muted">al {f.alicuota} %</span>}
                        </td>
                        <td className={`${adminTd} px-3! whitespace-nowrap text-right tabular-nums ${f.ivaRetenidoBs ? '' : 'text-subtle'}`}>
                          {cifra(f.ivaRetenidoBs)}
                          {f.comprobante && <span className="block text-xs text-muted">{f.comprobante}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-50 font-bold">
                    <td colSpan={3} className="border-t-2 border-brand-200 px-3 py-3 text-brand-700">Totales de {mes.split(' de ')[0]}</td>
                    {[totales.totalBs, totales.exentoBs, totales.baseBs, totales.ivaBs, totales.ivaRetenidoBs].map((n, i) => (
                      <td key={i} className="whitespace-nowrap border-t-2 border-brand-200 px-3 py-3 text-right tabular-nums">{cifra(n)}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* El teléfono y la computadora angosta: una tarjeta por factura (en dos columnas desde 1024 px) */}
            <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:hidden">
              {libro.filas.map((f) => (
                <li key={f.id} className={`${adminCard} p-4!`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-sm">{enlaceFactura(f)} <span className="whitespace-nowrap text-xs tabular-nums text-muted">· {diaMes(f.fecha)}</span></p>
                    {f.anulada ? anulada : <p className="whitespace-nowrap font-bold tabular-nums text-ink">{formatVES(f.totalBs)}</p>}
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted">Control {f.control}</p>
                  {f.anulada ? (
                    <p className="mt-1 text-xs text-muted">Sale en el libro y no suma.</p>
                  ) : (
                    <>
                      <p className="mt-1 truncate text-sm text-ink">{f.nombre} <span className="text-xs tabular-nums text-muted">· {f.documento}</span></p>
                      <p className="mt-1 text-xs tabular-nums text-ink-soft">
                        {[f.baseBs ? `Base ${cifra(f.baseBs)} · IVA ${cifra(f.ivaBs)}` : '', f.exentoBs ? `Exento ${cifra(f.exentoBs)}` : ''].filter(Boolean).join(' · ')}
                      </p>
                      {f.ivaRetenidoBs !== 0 && (
                        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-ink-soft ring-1 ring-inset ring-line">
                          Le retuvieron <strong className="tabular-nums text-ink">{formatVES(f.ivaRetenidoBs)}</strong>{f.comprobante ? <> · comprobante <span className="tabular-nums">{f.comprobante}</span></> : ''}
                        </p>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={adminCard} aria-labelledby="libro-declaracion">
        <h2 id="libro-declaracion" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoReportes className="h-5 w-5" aria-hidden="true" /> Para la declaración de {mes.split(' de ')[0]}</h2>
        <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
          {declaracion.map((d) => (
            <div key={d.texto} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-sm text-ink-soft">{d.texto}</dt>
              <dd className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatVES(d.valor)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">La contadora declara en el portal del SENIAT con estos montos; el panel no declara.</p>
      </section>

      {enNavegador && !vacio && createPortal(<HojaImprimible libro={libro} Mes={Mes} empresa={empresa} />, document.body)}
    </div>
  );
}

/** Lo que sale al imprimir: una columna por dato, como el Excel (la regla de impresión está en app/globals.css) */
function HojaImprimible({ libro, Mes, empresa }: { libro: Libro; Mes: string; empresa: { nombre: string; rif: string } }) {
  const th = 'border-b border-ink px-1.5 py-1 text-left align-bottom font-semibold';
  const td = 'border-b border-line-strong px-1.5 py-1 align-top';
  const num = `${td} whitespace-nowrap text-right tabular-nums`;
  return (
    <div className="libro-imprimible text-[11px] text-ink" aria-hidden="true">
      <p className="text-base font-bold">Libro de ventas · {Mes}</p>
      <p>{empresa.nombre}{empresa.rif ? ` · RIF ${empresa.rif}` : ''} · Montos en bolívares</p>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            {['N.º', 'Fecha', 'N.º de factura', 'N.º de control', 'RIF o C.I.', 'Nombre o razón social'].map((t) => <th key={t} className={th}>{t}</th>)}
            {['Total de la venta', 'Exento', 'Base imponible', 'Alíc.', 'IVA', 'IVA retenido'].map((t) => <th key={t} className={`${th} text-right`}>{t}</th>)}
            <th className={th}>N.º de comprobante</th>
          </tr>
        </thead>
        <tbody>
          {libro.filas.map((f) => (
            <tr key={f.id}>
              <td className={td}>{f.operacion}</td>
              <td className={`${td} whitespace-nowrap`}>{fechaCorta(f.fecha)}</td>
              <td className={`${td} whitespace-nowrap`}>{f.factura}</td>
              <td className={`${td} whitespace-nowrap`}>{f.control}</td>
              <td className={`${td} whitespace-nowrap`}>{f.documento}</td>
              <td className={td}>{f.nombre}</td>
              <td className={num}>{cifra(f.totalBs)}</td>
              <td className={num}>{cifra(f.exentoBs)}</td>
              <td className={num}>{cifra(f.baseBs)}</td>
              <td className={num}>{f.alicuota === null ? '' : `${f.alicuota} %`}</td>
              <td className={num}>{cifra(f.ivaBs)}</td>
              <td className={num}>{cifra(f.ivaRetenidoBs)}</td>
              <td className={`${td} whitespace-nowrap`}>{f.comprobante}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td colSpan={6} className="border-t border-ink px-1.5 py-1">Totales del mes</td>
            {[libro.totales.totalBs, libro.totales.exentoBs, libro.totales.baseBs].map((n, i) => <td key={i} className="whitespace-nowrap border-t border-ink px-1.5 py-1 text-right tabular-nums">{cifra(n)}</td>)}
            <td className="border-t border-ink" />
            {[libro.totales.ivaBs, libro.totales.ivaRetenidoBs].map((n, i) => <td key={i} className="whitespace-nowrap border-t border-ink px-1.5 py-1 text-right tabular-nums">{cifra(n)}</td>)}
            <td className="border-t border-ink" />
          </tr>
        </tbody>
      </table>
      <p className="mt-3">
        Débito fiscal: {libro.porAlicuota.map((a) => `base al ${a.alicuota} % ${cifra(a.baseBs)}, IVA ${cifra(a.ivaBs)}`).join('; ') || 'sin ventas gravadas'} · Exento {cifra(libro.totales.exentoBs)} · IVA retenido {cifra(libro.totales.ivaRetenidoBs)}
      </p>
      <p className="mt-1">Facturas emitidas: {libro.emitidas} · Anuladas: {libro.anuladas}. Lo revisa y lo firma la contadora.</p>
    </div>
  );
}
