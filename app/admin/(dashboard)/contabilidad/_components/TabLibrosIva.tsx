'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { OpcionRadio } from '@/components/admin/Opcion';
import ModalDialog from '@/components/ui/ModalDialog';
import {
  IconoBolsa, IconoCheck, IconoConfirmado, IconoDescargar, IconoEditar, IconoMas, IconoPorcentaje, IconoReportes,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDato, adminError, adminHint, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalTitle, adminNotice, adminPrimaryButton, adminRowZebra, adminSecondaryButton, adminTab,
  adminTabList, adminTabScroll, adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { CATEGORIAS_COMPRA } from '@/lib/contabilidad/esquemas';
import type { LibroVentas as Libro } from '@/lib/contabilidad/libro';
import { nombreMes } from '@/lib/contabilidad/montos';
import { formatVES } from '@/lib/currency';
import type { CompraGastoDTO, PeriodoContableDTO } from '@/lib/dto/contabilidad';
import LibroVentas from '../libro/_components/LibroVentas';
import { enlaceArchivoContable, subirArchivoContable } from './subirArchivo';
import { fechaCortaVe, type SubTabLibro } from './tipos';

const badgeCompra = (estado: CompraGastoDTO['estadoRevision']) => {
  if (estado === 'REVISADA') return { tone: 'success' as const, texto: 'Revisada' };
  if (estado === 'FALTA_ALGO') return { tone: 'warning' as const, texto: 'Falta algo' };
  return { tone: 'brand' as const, texto: 'Por revisar' };
};

export default function TabLibrosIva({
  mes, meses, hoy, venceIvaMes, empresa, libro, comprasGastos, periodo, cerrado, puedeDeclarar, subTabInicial = 'ventas',
}: {
  mes: string;
  meses: string[];
  hoy: string;
  venceIvaMes: string;
  empresa: { nombre: string; rif: string };
  libro: Libro;
  comprasGastos: { items: CompraGastoDTO[]; creditoFiscalBs: number; totalComprasBs: number; pendientesRevision: number };
  periodo: PeriodoContableDTO;
  cerrado: boolean;
  puedeDeclarar: boolean;
  subTabInicial?: SubTabLibro;
}) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTabLibro>(subTabInicial);
  const mesTxt = nombreMes(mes);

  // Modal nueva compra / gasto
  const [modalNueva, setModalNueva] = useState(false);
  const [cFecha, setCFecha] = useState(hoy);
  const [cNombre, setCNombre] = useState('');
  const [cRif, setCRif] = useState('');
  const [cFactura, setCFactura] = useState('');
  const [cControl, setCControl] = useState('');
  const [cCategoria, setCCategoria] = useState<string>(CATEGORIAS_COMPRA[0]);
  const [cDesc, setCDesc] = useState('');
  const [cBase, setCBase] = useState('');
  const [cAlicuota, setCAlicuota] = useState('16');
  const [cIva, setCIva] = useState('');
  const [cExento, setCExento] = useState('0');
  const [cIslr, setCIslr] = useState('0');
  const [cCompIslr, setCCompIslr] = useState('');
  const [cArchivo, setCArchivo] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [errorCompra, setErrorCompra] = useState<string | null>(null);

  // Modal revisar compra
  const [compraRev, setCompraRev] = useState<CompraGastoDTO | null>(null);
  const [revEstado, setRevEstado] = useState<'PENDIENTE' | 'REVISADA' | 'FALTA_ALGO'>('REVISADA');
  const [revNota, setRevNota] = useState('');
  const [guardandoRev, setGuardandoRev] = useState(false);
  const [errorRev, setErrorRev] = useState<string | null>(null);

  // Excedente y acciones Forma 99030
  const [excedenteInput, setExcedenteInput] = useState(String(periodo.excedenteAnteriorBs));
  const [guardandoIva, setGuardandoIva] = useState(false);
  const [modalIva, setModalIva] = useState<'DECLARAR' | 'PAGAR' | null>(null);
  const [numPlanillaIva, setNumPlanillaIva] = useState(periodo.numeroPlanillaIva ?? '');
  const [planillaIvaFile, setPlanillaIvaFile] = useState(periodo.planillaIvaPrivada ?? '');
  const [pagoIvaFile, setPagoIvaFile] = useState(periodo.comprobantePagoIvaPrivado ?? '');
  const [errorIva, setErrorIva] = useState<string | null>(null);

  const recalcIva = (baseStr: string, alicStr: string) => {
    const b = Number(baseStr.replace(',', '.'));
    const a = Number(alicStr.replace(',', '.'));
    if (Number.isFinite(b) && Number.isFinite(a) && b >= 0 && a >= 0) {
      setCIva((Math.round(b * (a / 100) * 100) / 100).toFixed(2));
    }
  };

  const subirArchivo = async (file: File | undefined, destino: 'compra' | 'iva-planilla' | 'iva-pago') => {
    if (!file) return;
    setSubiendo(true);
    const res = await subirArchivoContable(file, destino);
    setSubiendo(false);
    if (!res.ok) {
      if (destino === 'compra') setErrorCompra(res.error);
      else setErrorIva(res.error);
      return;
    }
    if (destino === 'compra') setCArchivo(res.archivo);
    else if (destino === 'iva-planilla') setPlanillaIvaFile(res.archivo);
    else setPagoIvaFile(res.archivo);
    toast.success('Documento subido');
  };

  const guardarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoCompra(true);
    setErrorCompra(null);
    const num = (v: string, d = 0) => {
      const n = Number(v.replace(',', '.'));
      return Number.isFinite(n) && n >= 0 ? n : d;
    };
    try {
      const r = await fetch('/api/admin/contabilidad/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaEmision: cFecha,
          proveedorNombre: cNombre.trim(),
          proveedorRif: cRif.trim(),
          numeroFactura: cFactura.trim(),
          numeroControl: cControl.trim(),
          categoria: cCategoria,
          descripcion: cDesc.trim(),
          baseBs: num(cBase),
          alicuota: num(cAlicuota, 16),
          ivaBs: num(cIva),
          exentoBs: num(cExento),
          retencionIslrBs: num(cIslr),
          comprobanteIslr: cCompIslr.trim(),
          ...(cArchivo ? { archivoPrivado: cArchivo } : {}),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorCompra(d?.error ?? 'No se pudo guardar la compra.');
        return;
      }
      toast.success('Compra agregada al Libro de Compras');
      setModalNueva(false);
      setCNombre('');
      setCRif('');
      setCFactura('');
      setCControl('');
      setCDesc('');
      setCBase('');
      setCIva('');
      setCExento('0');
      setCIslr('0');
      setCCompIslr('');
      setCArchivo('');
      router.refresh();
    } catch {
      setErrorCompra('Sin conexión al guardar la compra.');
    } finally {
      setGuardandoCompra(false);
    }
  };

  const guardarRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraRev) return;
    setGuardandoRev(true);
    setErrorRev(null);
    try {
      const r = await fetch(`/api/admin/contabilidad/compras/${compraRev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoRevision: revEstado, notaRevision: revNota.trim() }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorRev(d?.error ?? 'No se pudo actualizar.');
        return;
      }
      toast.success('Revisión guardada');
      setCompraRev(null);
      router.refresh();
    } catch {
      setErrorRev('Sin conexión.');
    } finally {
      setGuardandoRev(false);
    }
  };

  const actualizarExcedente = async () => {
    const val = Number(excedenteInput.replace(',', '.'));
    if (!Number.isFinite(val) || val < 0) {
      toast.error('Escribe un monto válido (0 o mayor).');
      return;
    }
    setGuardandoIva(true);
    try {
      const r = await fetch('/api/admin/contabilidad/periodo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: mes, accion: 'ACTUALIZAR_EXCEDENTE', excedenteAnteriorBs: val }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(d?.error ?? 'No se pudo actualizar el excedente.');
        return;
      }
      toast.success('Excedente actualizado en la Hoja 99030');
      router.refresh();
    } catch {
      toast.error('Sin conexión.');
    } finally {
      setGuardandoIva(false);
    }
  };

  const confirmarAccionIva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalIva) return;
    setGuardandoIva(true);
    setErrorIva(null);
    try {
      const r = await fetch('/api/admin/contabilidad/periodo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: mes,
          accion: modalIva,
          ...(modalIva === 'DECLARAR'
            ? {
                ...(numPlanillaIva.trim() ? { numeroPlanillaIva: numPlanillaIva.trim() } : {}),
                ...(planillaIvaFile ? { planillaIvaPrivada: planillaIvaFile } : {}),
              }
            : {
                ...(pagoIvaFile ? { comprobantePagoIvaPrivado: pagoIvaFile } : {}),
              }),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorIva(d?.error ?? 'No se pudo guardar.');
        return;
      }
      toast.success(modalIva === 'DECLARAR' ? 'IVA marcado como declarado' : 'Pago de IVA registrado');
      setModalIva(null);
      router.refresh();
    } catch {
      setErrorIva('Sin conexión.');
    } finally {
      setGuardandoIva(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={adminTabScroll}>
          <div className={adminTabList} role="tablist" aria-label="Libros y hoja de IVA">
            <button type="button" role="tab" aria-selected={subTab === 'ventas'} onClick={() => setSubTab('ventas')} className={adminTab(subTab === 'ventas')}>
              <IconoReportes className="h-4 w-4" aria-hidden="true" /> Libro de Ventas
            </button>
            <button type="button" role="tab" aria-selected={subTab === 'compras'} onClick={() => setSubTab('compras')} className={adminTab(subTab === 'compras')}>
              <IconoBolsa className="h-4 w-4" aria-hidden="true" /> Compras y Gastos ({comprasGastos.items.length})
            </button>
            <button type="button" role="tab" aria-selected={subTab === 'iva'} onClick={() => setSubTab('iva')} className={adminTab(subTab === 'iva')}>
              <IconoPorcentaje className="h-4 w-4" aria-hidden="true" /> Hoja IVA 99030
            </button>
          </div>
        </div>
        <a href={`/api/admin/contabilidad/paquete?mes=${mes}`} download className={adminSecondaryButton}>
          <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Paquete Excel (5 hojas)
        </a>
      </div>

      {subTab === 'ventas' && (
        <LibroVentas libro={libro} meses={meses} vence={venceIvaMes} empresa={empresa} embebido />
      )}

      {subTab === 'compras' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <section className={adminCard}>
              <p className="text-xs font-semibold text-muted">Total compras y gastos</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatVES(comprasGastos.totalComprasBs)}</p>
              <p className="mt-0.5 text-xs text-muted">{comprasGastos.items.length} documentos en {mesTxt}</p>
            </section>
            <section className={adminCard}>
              <p className="text-xs font-semibold text-muted">Crédito fiscal del mes</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-brand-700">{formatVES(comprasGastos.creditoFiscalBs)}</p>
              <p className="mt-0.5 text-xs text-muted">Se resta al débito fiscal en la 99030</p>
            </section>
            <section className={adminCard}>
              <p className="text-xs font-semibold text-muted">Pendientes por revisar</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{comprasGastos.pendientesRevision}</p>
              <p className="mt-0.5 text-xs text-muted">La contadora aprueba cada factura adjunta</p>
            </section>
          </div>

          <section className={adminCard} aria-labelledby="compras-titulo">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="compras-titulo" className="text-lg font-semibold text-ink">Libro de Compras y Gastos</h2>
                <p className="mt-0.5 text-xs text-muted">Facturas de proveedores, fletes, alquiler y servicios que generan crédito fiscal.</p>
              </div>
              {!cerrado && (
                <button type="button" onClick={() => { setErrorCompra(null); setModalNueva(true); }} className={adminPrimaryButton}>
                  <IconoMas className="h-4 w-4" aria-hidden="true" /> Cargar compra o gasto
                </button>
              )}
            </div>

            {comprasGastos.items.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-muted">
                Aún no hay facturas de compras o gastos cargadas en {mesTxt}.
              </div>
            ) : (
              <>
                <div className={`${adminTableWrap} mt-4 hidden lg:block`}>
                  <table className={adminTable}>
                    <thead>
                      <tr>
                        <th className={adminTh}>Fecha</th>
                        <th className={adminTh}>Proveedor y RIF</th>
                        <th className={adminTh}>Factura / Control</th>
                        <th className={adminTh}>Categoría</th>
                        <th className={`${adminTh} text-right`}>Total</th>
                        <th className={`${adminTh} text-right`}>IVA crédito</th>
                        <th className={adminTh}>Revisión</th>
                        <th className={`${adminTh} text-right`}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprasGastos.items.map((c) => {
                        const badge = badgeCompra(c.estadoRevision);
                        const adj = enlaceArchivoContable(c.archivoPrivado);
                        return (
                          <tr key={c.id} className={adminRowZebra}>
                            <td className={`${adminTd} whitespace-nowrap tabular-nums`}>{fechaCortaVe(c.fechaEmision)}</td>
                            <td className={adminTd}>
                              <span className="block max-w-52 truncate font-medium text-ink">{c.proveedorNombre}</span>
                              <span className="block text-xs tabular-nums text-muted">{c.proveedorRif}</span>
                            </td>
                            <td className={`${adminTd} whitespace-nowrap tabular-nums`}>
                              <span className="font-semibold text-ink">{c.numeroFactura}</span>
                              <span className="block text-xs text-muted">{c.numeroControl}</span>
                            </td>
                            <td className={adminTd}>
                              <span className="text-sm text-ink-soft">{c.categoria}</span>
                            </td>
                            <td className={`${adminTd} whitespace-nowrap text-right font-semibold tabular-nums text-ink`}>{formatVES(c.totalBs)}</td>
                            <td className={`${adminTd} whitespace-nowrap text-right tabular-nums text-ink-soft`}>{formatVES(c.ivaBs)}</td>
                            <td className={adminTd}>
                              <span className={adminBadge(badge.tone)}>{badge.texto}</span>
                            </td>
                            <td className={`${adminTd} whitespace-nowrap text-right`}>
                              <div className="inline-flex items-center gap-1.5">
                                {adj && (
                                  <a href={adj} target="_blank" rel="noreferrer" className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-surface">
                                    Archivo
                                  </a>
                                )}
                                {!cerrado && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompraRev(c);
                                      setRevEstado(c.estadoRevision);
                                      setRevNota(c.notaRevision ?? '');
                                      setErrorRev(null);
                                    }}
                                    className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-300"
                                  >
                                    Revisar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="mt-4 space-y-2.5 lg:hidden">
                  {comprasGastos.items.map((c) => {
                    const badge = badgeCompra(c.estadoRevision);
                    return (
                      <li key={c.id} className="rounded-xl border border-line bg-surface p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{c.proveedorNombre}</p>
                            <p className="text-xs text-muted tabular-nums">{fechaCortaVe(c.fechaEmision)} · {c.proveedorRif} · Fact. {c.numeroFactura}</p>
                          </div>
                          <span className="font-bold tabular-nums text-ink">{formatVES(c.totalBs)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={adminBadge(badge.tone)}>{badge.texto}</span>
                          <span className={adminDato}>IVA {formatVES(c.ivaBs)}</span>
                          {!cerrado && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompraRev(c);
                                setRevEstado(c.estadoRevision);
                                setRevNota(c.notaRevision ?? '');
                                setErrorRev(null);
                              }}
                              className="ml-auto text-xs font-semibold text-brand-600 hover:underline"
                            >
                              Revisar
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      {subTab === 'iva' && (() => {
        const comprasValidas = comprasGastos.items.filter((i) => i.estadoRevision !== 'FALTA_ALGO');
        const comprasExentasBs = comprasValidas.reduce((s, i) => s + i.exentoBs, 0);
        const comprasBaseBs = comprasValidas.reduce((s, i) => s + i.baseBs, 0);
        const totalCreditosBs = periodo.creditoFiscalBs + periodo.excedenteAnteriorBs;
        return (
        <section className={adminCard} aria-labelledby="iva-hoja-titulo">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="iva-hoja-titulo" className="text-lg font-semibold text-ink">Hoja de trabajo IVA · Forma 99030 ({mesTxt})</h2>
              <p className="mt-0.5 text-xs text-muted">Valores mapeados a las casillas exactas del portal SENIAT en Línea (carga manual web).</p>
            </div>
            <span className={adminBadge(periodo.estado === 'CERRADO' ? 'success' : periodo.estado === 'DECLARADO' ? 'brand' : 'warning')}>
              {periodo.estado === 'CERRADO' ? 'Cerrado' : periodo.estado === 'DECLARADO' ? 'Declarado' : 'Abierto'}
            </span>
          </div>

          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span className={adminDato}>Casilla 40</span> Ventas internas no gravadas / exentas
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatVES(libro.totales.exentoBs)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span className={adminDato}>Casilla 42</span> Base imponible ventas gravadas (alícuota general)
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatVES(libro.totales.baseBs)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 font-medium text-ink">
                <span className={adminDato}>Casillas 43 / 49</span> Total Débito Fiscal (ventas − NC + ND)
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatVES(periodo.debitoFiscalBs)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span className={adminDato}>Casilla 30</span> Compras no gravadas / sin derecho a crédito
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatVES(comprasExentasBs)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span className={adminDato}>Casilla 33</span> Base imponible compras internas gravadas
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatVES(comprasBaseBs)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span className={adminDato}>Casillas 34 / 36</span> Crédito fiscal del período (Libro de Compras)
              </dt>
              <dd className="font-semibold tabular-nums text-ink">− {formatVES(periodo.creditoFiscalBs)}</dd>
            </div>
            <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span className={adminDato}>Casilla 20</span> Excedente créditos fiscales del mes anterior
              </dt>
              <dd className="flex items-center gap-2">
                {!cerrado ? (
                  <>
                    <input
                      aria-label="Excedente anterior en bolívares"
                      inputMode="decimal"
                      value={excedenteInput}
                      onChange={(e) => setExcedenteInput(e.target.value)}
                      className={`${adminInput()} w-36 text-right tabular-nums`}
                    />
                    <button type="button" onClick={() => void actualizarExcedente()} disabled={guardandoIva} className={adminSecondaryButton}>
                      Aplicar
                    </button>
                  </>
                ) : (
                  <span className="font-semibold tabular-nums text-ink">− {formatVES(periodo.excedenteAnteriorBs)}</span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 font-medium text-ink">
                <span className={adminDato}>Casilla 39</span> Total Créditos Fiscales (período + excedente ant.)
              </dt>
              <dd className="font-semibold tabular-nums text-ink">− {formatVES(totalCreditosBs)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="space-y-0.5 text-ink-soft">
                <span className="flex items-center gap-2">
                  <span className={adminDato}>Casillas 66 / 55</span> Retenciones de IVA del período descontadas
                </span>
                <span className="block text-xs text-muted">Confirmar en SENIAT → Consultas → Retenciones Efectivamente Pagadas</span>
              </dt>
              <dd className="font-semibold tabular-nums text-ink">− {formatVES(periodo.retencionesIvaBs)}</dd>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-brand-50 px-3 py-3.5">
              <dt className="flex items-center gap-2 font-bold text-brand-700">
                <span className={adminBadge('brand')}>{periodo.ivaAPagarBs > 0 ? 'Casilla 90' : 'Casilla 60'}</span>
                {periodo.ivaAPagarBs > 0 ? 'Total a Pagar en planilla' : 'Excedente de Crédito Fiscal para el mes siguiente'}
              </dt>
              <dd className="text-xl font-bold tabular-nums text-brand-700">
                {formatVES(periodo.ivaAPagarBs > 0 ? periodo.ivaAPagarBs : periodo.nuevoExcedenteBs)}
              </dd>
            </div>
          </dl>

          {(periodo.declaradoEl || periodo.pagadoEl) && (
            <div className={`${adminNotice('success')} mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs`}>
              {periodo.declaradoEl && (
                <span>
                  <IconoCheck className="mr-1 inline h-4 w-4" aria-hidden="true" />
                  Declarado el {fechaCortaVe(periodo.declaradoEl)}
                  {periodo.numeroPlanillaIva ? ` · Planilla ${periodo.numeroPlanillaIva}` : ''}
                </span>
              )}
              {periodo.pagadoEl && <span>Pagado el {fechaCortaVe(periodo.pagadoEl)}</span>}
              {periodo.planillaIvaPrivada && (
                <a href={enlaceArchivoContable(periodo.planillaIvaPrivada) ?? '#'} target="_blank" rel="noreferrer" className="font-semibold underline">
                  Ver planilla 99030
                </a>
              )}
              {periodo.comprobantePagoIvaPrivado && (
                <a href={enlaceArchivoContable(periodo.comprobantePagoIvaPrivado) ?? '#'} target="_blank" rel="noreferrer" className="font-semibold underline">
                  Ver comprobante de pago
                </a>
              )}
            </div>
          )}

          {!cerrado && (
            <div className="mt-4 flex flex-wrap gap-2">
              {puedeDeclarar && (
                <button type="button" onClick={() => { setErrorIva(null); setModalIva('DECLARAR'); }} className={adminPrimaryButton}>
                  <IconoEditar className="h-4 w-4" aria-hidden="true" /> Marcar IVA declarado (subir 99030)
                </button>
              )}
              <button type="button" onClick={() => { setErrorIva(null); setModalIva('PAGAR'); }} className={adminSecondaryButton}>
                <IconoConfirmado className="h-4 w-4" aria-hidden="true" /> Registrar pago del IVA
              </button>
            </div>
          )}
        </section>
        );
      })()}

      {/* Modal Cargar Compra / Gasto */}
      <ModalDialog open={modalNueva} onClose={() => !guardandoCompra && setModalNueva(false)} ariaLabelledBy="compra-modal-titulo" size="lg">
        <form onSubmit={guardarCompra}>
          <div className={adminModalHeader}>
            <h2 id="compra-modal-titulo" className={adminModalTitle}>Registrar factura de compra o gasto</h2>
          </div>
          <div className={`${adminModalBody} grid gap-4 sm:grid-cols-2`}>
            <div>
              <label htmlFor="cg-fecha" className={adminLabel}>Fecha de factura</label>
              <input id="cg-fecha" type="date" max={hoy} value={cFecha} onChange={(e) => setCFecha(e.target.value)} className={adminInput()} required />
            </div>
            <div>
              <label htmlFor="cg-cat" className={adminLabel}>Categoría</label>
              <select id="cg-cat" value={cCategoria} onChange={(e) => setCCategoria(e.target.value)} className={adminInput()}>
                {CATEGORIAS_COMPRA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cg-prov" className={adminLabel}>Nombre del proveedor</label>
              <input id="cg-prov" value={cNombre} onChange={(e) => setCNombre(e.target.value)} className={adminInput()} required />
            </div>
            <div>
              <label htmlFor="cg-rif" className={adminLabel}>RIF del proveedor</label>
              <input id="cg-rif" value={cRif} placeholder="J-30112233-4" onChange={(e) => setCRif(e.target.value)} className={adminInput()} required />
            </div>
            <div>
              <label htmlFor="cg-fac" className={adminLabel}>N.º de factura</label>
              <input id="cg-fac" value={cFactura} onChange={(e) => setCFactura(e.target.value)} className={adminInput()} required />
            </div>
            <div>
              <label htmlFor="cg-ctrl" className={adminLabel}>N.º de control</label>
              <input id="cg-ctrl" value={cControl} onChange={(e) => setCControl(e.target.value)} placeholder="00-000123" className={adminInput()} required />
            </div>
            <div>
              <label htmlFor="cg-base" className={adminLabel}>Base imponible (Bs.)</label>
              <input
                id="cg-base"
                inputMode="decimal"
                value={cBase}
                onChange={(e) => {
                  setCBase(e.target.value);
                  recalcIva(e.target.value, cAlicuota);
                }}
                className={`${adminInput()} tabular-nums`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="cg-alic" className={adminLabel}>Alíc. %</label>
                <input
                  id="cg-alic"
                  inputMode="decimal"
                  value={cAlicuota}
                  onChange={(e) => {
                    setCAlicuota(e.target.value);
                    recalcIva(cBase, e.target.value);
                  }}
                  className={`${adminInput()} tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="cg-iva" className={adminLabel}>IVA (Bs.)</label>
                <input id="cg-iva" inputMode="decimal" value={cIva} onChange={(e) => setCIva(e.target.value)} className={`${adminInput()} tabular-nums`} />
              </div>
            </div>
            <div>
              <label htmlFor="cg-exento" className={adminLabel}>Exento (Bs.)</label>
              <input id="cg-exento" inputMode="decimal" value={cExento} onChange={(e) => setCExento(e.target.value)} className={`${adminInput()} tabular-nums`} />
            </div>
            <div>
              <label htmlFor="cg-islr" className={adminLabel}>Retención ISLR (Bs.) · opcional</label>
              <input id="cg-islr" inputMode="decimal" value={cIslr} onChange={(e) => setCIslr(e.target.value)} className={`${adminInput()} tabular-nums`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cg-desc" className={adminLabel}>Detalle breve (opcional)</label>
              <input id="cg-desc" value={cDesc} maxLength={200} onChange={(e) => setCDesc(e.target.value)} placeholder="Ej. Reposición de mercancía o guía ZOOM" className={adminInput()} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cg-file" className={adminLabel}>Foto o PDF de la factura (privado)</label>
              <input id="cg-file" type="file" accept=".pdf,image/png,image/jpeg,image/webp" disabled={subiendo} onChange={(e) => void subirArchivo(e.target.files?.[0], 'compra')} className="block w-full text-xs text-muted" />
              {cArchivo && <p className={adminHint}>Archivo adjunto listo.</p>}
            </div>
            {errorCompra && <p role="alert" className={`${adminError} sm:col-span-2`}>{errorCompra}</p>}
          </div>
          <div className={adminModalFooter}>
            <button type="button" onClick={() => setModalNueva(false)} disabled={guardandoCompra} className={adminSecondaryButton}>Cancelar</button>
            <button type="submit" disabled={guardandoCompra || subiendo} className={adminPrimaryButton}>
              <IconoCheck className="h-4 w-4" aria-hidden="true" /> {guardandoCompra ? 'Guardando…' : 'Guardar compra'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Revisar Compra */}
      <ModalDialog open={Boolean(compraRev)} onClose={() => !guardandoRev && setCompraRev(null)} ariaLabelledBy="rev-modal-titulo" size="sm">
        {compraRev && (
          <form onSubmit={guardarRevision}>
            <div className={adminModalHeader}>
              <h2 id="rev-modal-titulo" className={adminModalTitle}>Revisar factura {compraRev.numeroFactura}</h2>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <p className="text-xs text-muted">{compraRev.proveedorNombre} ({compraRev.proveedorRif}) · IVA {formatVES(compraRev.ivaBs)}</p>
              <div className="space-y-2" role="radiogroup" aria-label="Estado de revisión">
                <OpcionRadio name="rev-estado" tamano="chica" elegida={revEstado === 'REVISADA'} onElegir={() => setRevEstado('REVISADA')} titulo="Revisada y válida" detalle="Cumple requisitos del crédito fiscal." />
                <OpcionRadio name="rev-estado" tamano="chica" elegida={revEstado === 'PENDIENTE'} onElegir={() => setRevEstado('PENDIENTE')} titulo="Pendiente" detalle="Por verificar contra el soporte." />
                <OpcionRadio name="rev-estado" tamano="chica" elegida={revEstado === 'FALTA_ALGO'} onElegir={() => setRevEstado('FALTA_ALGO')} titulo="Falta algo (no suma IVA)" detalle="No suma crédito hasta completar soporte." />
              </div>
              <div>
                <label htmlFor="rev-nota" className={adminLabel}>Nota para el equipo (opcional)</label>
                <input id="rev-nota" value={revNota} maxLength={240} onChange={(e) => setRevNota(e.target.value)} placeholder="Ej. Falta firma o RIF ilegible" className={adminInput()} />
              </div>
              {errorRev && <p role="alert" className={adminError}>{errorRev}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setCompraRev(null)} disabled={guardandoRev} className={adminSecondaryButton}>Cancelar</button>
              <button type="submit" disabled={guardandoRev} className={adminPrimaryButton}>Guardar revisión</button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal Declarar o Pagar IVA 99030 */}
      <ModalDialog open={Boolean(modalIva)} onClose={() => !guardandoIva && setModalIva(null)} ariaLabelledBy="iva-modal-titulo" size="sm">
        <form onSubmit={confirmarAccionIva}>
          <div className={adminModalHeader}>
            <h2 id="iva-modal-titulo" className={adminModalTitle}>
              {modalIva === 'DECLARAR' ? 'Declaración de IVA · Forma 99030' : 'Registrar pago del IVA'}
            </h2>
          </div>
          <div className={`${adminModalBody} space-y-4`}>
            {modalIva === 'DECLARAR' ? (
              <>
                <div>
                  <label htmlFor="iva-planilla-num" className={adminLabel}>N.º de planilla SENIAT</label>
                  <input id="iva-planilla-num" value={numPlanillaIva} maxLength={50} onChange={(e) => setNumPlanillaIva(e.target.value)} placeholder="Ej. 2026990301234" className={adminInput()} />
                </div>
                <div>
                  <label htmlFor="iva-planilla-file" className={adminLabel}>Subir planilla 99030 (PDF o foto)</label>
                  <input id="iva-planilla-file" type="file" accept=".pdf,image/png,image/jpeg,image/webp" disabled={subiendo} onChange={(e) => void subirArchivo(e.target.files?.[0], 'iva-planilla')} className="block w-full text-xs text-muted" />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="iva-pago-file" className={adminLabel}>Comprobante de pago bancario (PDF o foto)</label>
                <input id="iva-pago-file" type="file" accept=".pdf,image/png,image/jpeg,image/webp" disabled={subiendo} onChange={(e) => void subirArchivo(e.target.files?.[0], 'iva-pago')} className="block w-full text-xs text-muted" />
              </div>
            )}
            {errorIva && <p role="alert" className={adminError}>{errorIva}</p>}
          </div>
          <div className={adminModalFooter}>
            <button type="button" onClick={() => setModalIva(null)} disabled={guardandoIva} className={adminSecondaryButton}>Cancelar</button>
            <button type="submit" disabled={guardandoIva || subiendo} className={adminPrimaryButton}>
              {guardandoIva ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
