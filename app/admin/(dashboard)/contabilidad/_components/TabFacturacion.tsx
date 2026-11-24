'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import Filtros, { type Filtro } from '@/components/admin/Filtros';
import { OpcionRadio } from '@/components/admin/Opcion';
import ModalDialog from '@/components/ui/ModalDialog';
import {
  IconoAdvertencia, IconoArchivo, IconoCerrar, IconoCheck, IconoConfirmado, IconoDocumento, IconoEliminar,
  IconoFlechaDerecha, IconoNube, IconoReloj, IconoVer,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDangerButton, adminDato, adminError, adminHint, adminInput, adminLabel, adminModalBody,
  adminModalFooter, adminModalHeader, adminModalTitle, adminNotice, adminPrimaryButton, adminRowZebra, adminSecondaryButton,
  adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { formatearHora12, horaActualVe, nombreMes } from '@/lib/contabilidad/montos';
import type { CompraSinFactura } from '@/lib/contabilidad/servidor';
import { formatUSD, formatVES } from '@/lib/currency';
import type { FacturaDTO, TalonarioDTO } from '@/lib/dto/contabilidad';
import { enlaceArchivoContable, subirArchivoContable } from './subirArchivo';
import { etiquetaCanal, fechaCortaVe } from './tipos';

type FiltroDoc = 'todas' | 'emitidas' | 'notas' | 'retenidas' | 'anuladas';

const etiquetaTipoDoc = (tipo: string) => {
  if (tipo === 'NOTA_CREDITO') return 'Nota de Crédito';
  if (tipo === 'NOTA_DEBITO') return 'Nota de Débito';
  return 'Factura';
};

const crearLlaveIdempotencia = (): string => crypto.randomUUID();

export default function TabFacturacion({
  mes, hoy, talonarioNormal, talonarioContingencia, facturas, compras, tasaHoy, canalPublico, imprentaAmbientePublico,
  esDueno, puedeFacturar, puedeDeclarar = false, cerrado, onIrAjustes,
}: {
  mes: string;
  hoy: string;
  talonarioNormal: TalonarioDTO | null;
  talonarioContingencia: TalonarioDTO | null;
  facturas: FacturaDTO[];
  compras: CompraSinFactura[];
  tasaHoy: number | null;
  canalPublico: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL';
  imprentaAmbientePublico: 'SANDBOX' | 'PRODUCCION';
  esDueno: boolean;
  puedeFacturar: boolean;
  puedeDeclarar?: boolean;
  cerrado: boolean;
  onIrAjustes?: () => void;
}) {
  const router = useRouter();
  const mesTxt = nombreMes(mes);
  const [filtro, setFiltro] = useState<FiltroDoc>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Emisión 1-clic en Imprenta Digital Sandbox/Prod
  const [emitiendoOrden, setEmitiendoOrden] = useState<string | null>(null);

  // Modal anular papel dañado en blanco
  const [modalBlanco, setModalBlanco] = useState(false);
  const [motivoBlanco, setMotivoBlanco] = useState('');
  const [enviandoBlanco, setEnviandoBlanco] = useState(false);
  const [errorBlanco, setErrorBlanco] = useState<string | null>(null);

  // Modal Nota de Crédito / Nota de Débito
  const [docNota, setDocNota] = useState<FacturaDTO | null>(null);
  const [tipoNota, setTipoNota] = useState<'NOTA_CREDITO' | 'NOTA_DEBITO'>('NOTA_CREDITO');
  const [motivoNota, setMotivoNota] = useState('');
  const [fechaNota, setFechaNota] = useState(hoy);
  const [montoNotaUSD, setMontoNotaUSD] = useState('');
  const [notaExenta, setNotaExenta] = useState(false);
  const [notaNumExt, setNotaNumExt] = useState('');
  const [notaCtrlExt, setNotaCtrlExt] = useState('');
  const [notaPdf, setNotaPdf] = useState('');
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [errorNota, setErrorNota] = useState<string | null>(null);

  // Modal Retención IVA
  const [docRet, setDocRet] = useState<FacturaDTO | null>(null);
  const [retMontoBs, setRetMontoBs] = useState('');
  const [retComprobante, setRetComprobante] = useState('');
  const [retFecha, setRetFecha] = useState(hoy);
  const [enviandoRet, setEnviandoRet] = useState(false);
  const [errorRet, setErrorRet] = useState<string | null>(null);

  // Modal Reportar Contingencia
  const [docCont, setDocCont] = useState<FacturaDTO | null>(null);
  const [contRef, setContRef] = useState('');
  const [contPdf, setContPdf] = useState('');
  const [enviandoCont, setEnviandoCont] = useState(false);
  const [errorCont, setErrorCont] = useState<string | null>(null);

  const [subiendo, setSubiendo] = useState(false);

  const contingencias = facturas.filter((f) => f.estado === 'EMITIDA' && f.estadoTransmision === 'PENDIENTE_REPORTE');
  const emitidas = facturas.filter((f) => f.estado === 'EMITIDA');
  const notas = facturas.filter((f) => f.tipo === 'NOTA_CREDITO' || f.tipo === 'NOTA_DEBITO');
  const retenidas = facturas.filter((f) => Boolean(f.ivaRetenidoBs && f.ivaRetenidoBs > 0));
  const anuladas = facturas.filter((f) => f.estado === 'ANULADA');

  const filtros: Array<Filtro<FiltroDoc>> = [
    { valor: 'todas', etiqueta: 'Todas', ayuda: 'Todos los documentos del mes', Icono: IconoDocumento, cuenta: facturas.length },
    { valor: 'emitidas', etiqueta: 'Emitidas', ayuda: 'Vigentes que suman al libro', Icono: IconoCheck, cuenta: emitidas.length },
    { valor: 'notas', etiqueta: 'Notas NC/ND', ayuda: 'Notas de crédito y débito', Icono: IconoArchivo, cuenta: notas.length },
    { valor: 'retenidas', etiqueta: 'Con retención', ayuda: 'Con comprobante de IVA retenido', Icono: IconoConfirmado, cuenta: retenidas.length },
    { valor: 'anuladas', etiqueta: 'Anuladas', ayuda: 'Anuladas o en blanco', Icono: IconoCerrar, cuenta: anuladas.length },
  ];

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return facturas.filter((f) => {
      if (filtro === 'emitidas' && f.estado !== 'EMITIDA') return false;
      if (filtro === 'notas' && f.tipo !== 'NOTA_CREDITO' && f.tipo !== 'NOTA_DEBITO') return false;
      if (filtro === 'retenidas' && !(f.ivaRetenidoBs && f.ivaRetenidoBs > 0)) return false;
      if (filtro === 'anuladas' && f.estado !== 'ANULADA') return false;
      if (!q) return true;
      return (
        f.etiqueta.toLowerCase().includes(q)
        || f.numeroControl.toLowerCase().includes(q)
        || (f.comprador?.nombre.toLowerCase().includes(q) ?? false)
        || (f.comprador?.documento.toLowerCase().includes(q) ?? false)
      );
    });
  }, [facturas, filtro, busqueda]);

  const abrirNota = (f: FacturaDTO) => {
    setDocNota(f);
    setTipoNota('NOTA_CREDITO');
    setMotivoNota('');
    setFechaNota(hoy);
    setMontoNotaUSD(f.totalUSD ? String(f.totalUSD) : '');
    setNotaExenta(f.baseBs === 0 && f.exentoBs > 0);
    setNotaNumExt('');
    setNotaCtrlExt('');
    setNotaPdf('');
    setErrorNota(null);
  };

  const abrirRetencion = (f: FacturaDTO) => {
    setDocRet(f);
    setRetMontoBs(f.ivaBs > 0 ? String(Math.round(f.ivaBs * 0.75 * 100) / 100) : '');
    setRetComprobante(f.comprobanteRetencion ?? '');
    setRetFecha(hoy);
    setErrorRet(null);
  };

  const abrirContingencia = (f: FacturaDTO) => {
    setDocCont(f);
    setContRef('');
    setContPdf('');
    setErrorCont(null);
  };

  const emitirDigitalDirecto = async (c: CompraSinFactura) => {
    if (!tasaHoy) {
      toast.error('Configura primero la tasa BCV del día en Ajustes.');
      return;
    }
    const clave = c.ordenIds.join(',');
    setEmitiendoOrden(clave);
    try {
      const r = await fetch('/api/admin/contabilidad/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: 'ORDEN',
          ordenIds: c.ordenIds,
          condicionPago: 'CONTADO',
          fecha: hoy,
          horaEmision: horaActualVe(),
          tasa: tasaHoy,
          medio: 'IMPRENTA_DIGITAL',
          llaveIdempotencia: crearLlaveIdempotencia(),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(d?.error ?? 'No se pudo emitir la factura digital.');
        return;
      }
      toast.success(`Factura digital ${d.factura.etiqueta} emitida`);
      router.refresh();
    } catch {
      toast.error('Sin conexión al emitir.');
    } finally {
      setEmitiendoOrden(null);
    }
  };

  const enviarBlanco = async () => {
    if (!talonarioNormal?.proximo) return;
    setEnviandoBlanco(true);
    setErrorBlanco(null);
    try {
      const r = await fetch('/api/admin/contabilidad/facturas/en-blanco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoBlanco.trim(), numeroEsperado: talonarioNormal.proximo }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorBlanco(d?.error ?? 'No se pudo anular.');
        if (r.status === 409) router.refresh();
        return;
      }
      toast.success(`${d.etiqueta} anulada.`);
      setModalBlanco(false);
      setMotivoBlanco('');
      router.refresh();
    } catch {
      setErrorBlanco('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviandoBlanco(false);
    }
  };

  const enviarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNota) return;
    setEnviandoNota(true);
    setErrorNota(null);
    const montoParsed = Number(montoNotaUSD.replace(',', '.'));
    try {
      const r = await fetch('/api/admin/contabilidad/notas-fiscales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoNota,
          documentoAfectadoId: docNota.id,
          motivo: motivoNota.trim(),
          fecha: fechaNota,
          horaEmision: horaActualVe(),
          ...(tasaHoy ? { tasa: tasaHoy } : {}),
          ...(Number.isFinite(montoParsed) && montoParsed > 0 ? { montoUSD: montoParsed } : {}),
          exento: notaExenta,
          ...(notaNumExt.trim() ? { numeroExterno: Math.trunc(Number(notaNumExt)) } : {}),
          ...(notaCtrlExt.trim() ? { numeroControlExterno: notaCtrlExt.trim() } : {}),
          ...(notaPdf ? { pdfPrivadoRuta: notaPdf } : {}),
          llaveIdempotencia: crearLlaveIdempotencia(),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorNota(d?.error ?? 'No se pudo emitir la nota fiscal.');
        return;
      }
      toast.success(`${etiquetaTipoDoc(tipoNota)} ${d.documento.etiqueta} emitida`);
      setDocNota(null);
      router.refresh();
    } catch {
      setErrorNota('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviandoNota(false);
    }
  };

  const enviarRetencion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docRet) return;
    setEnviandoRet(true);
    setErrorRet(null);
    const montoParsed = Number(retMontoBs.replace(',', '.'));
    if (!Number.isFinite(montoParsed) || montoParsed <= 0) {
      setErrorRet('Escribe el monto retenido en bolívares.');
      setEnviandoRet(false);
      return;
    }
    try {
      const r = await fetch(`/api/admin/contabilidad/facturas/${docRet.id}/retencion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ivaRetenidoBs: montoParsed,
          comprobanteRetencion: retComprobante.trim(),
          retencionFecha: retFecha,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorRet(d?.error ?? 'No se pudo registrar la retención.');
        return;
      }
      toast.success('Retención de IVA registrada en el libro');
      setDocRet(null);
      router.refresh();
    } catch {
      setErrorRet('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviandoRet(false);
    }
  };

  const enviarContingencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCont) return;
    setEnviandoCont(true);
    setErrorCont(null);
    try {
      const r = await fetch(`/api/admin/contabilidad/facturas/${docCont.id}/contingencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(contRef.trim() ? { numeroDigitalReferencia: contRef.trim() } : {}),
          ...(contPdf ? { pdfPrivadoRuta: contPdf } : {}),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorCont(d?.error ?? 'No se pudo marcar como reportada.');
        return;
      }
      toast.success(`Contingencia de ${docCont.etiqueta} reportada`);
      setDocCont(null);
      router.refresh();
    } catch {
      setErrorCont('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviandoCont(false);
    }
  };

  const subirPdf = async (file: File | undefined, destino: 'nota' | 'contingencia') => {
    if (!file) return;
    setSubiendo(true);
    const res = await subirArchivoContable(file, destino);
    setSubiendo(false);
    if (!res.ok) {
      if (destino === 'nota') setErrorNota(res.error);
      else setErrorCont(res.error);
      return;
    }
    if (destino === 'nota') setNotaPdf(res.archivo);
    else setContPdf(res.archivo);
    toast.success('PDF adjunto');
  };

  return (
    <div className="space-y-4">
      {cerrado && (
        <div className={`${adminNotice('warning')} flex items-center gap-3`}>
          <IconoAdvertencia aria-hidden="true" />
          <p className="text-sm">
            <strong>{mesTxt} está cerrado y firmado:</strong> para ajustar una factura de ese período debes emitir una Nota de Crédito o Débito en el mes actual.
          </p>
        </div>
      )}

      {/* Estado de canales de emisión */}
      <div className="grid gap-3 md:grid-cols-3">
        <section className={adminCard}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-muted">Canal activo</p>
              <p className="mt-1 text-lg font-bold text-ink">{etiquetaCanal(canalPublico)}</p>
            </div>
            <span className={adminBadge('brand')}>
              {canalPublico === 'IMPRENTA_DIGITAL' ? imprentaAmbientePublico : 'Activo'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {canalPublico === 'IMPRENTA_DIGITAL'
              ? 'Asigna número de control digital y fecha/hora automática.'
              : canalPublico === 'PORTAL_SENIAT'
                ? 'Te prepara los montos en bolívares y registras control y PDF.'
                : 'Control correlativo en talonario impreso autorizado.'}
          </p>
          {esDueno && onIrAjustes && (
            <button type="button" onClick={onIrAjustes} className="mt-3 text-xs font-semibold text-brand-600 hover:underline">
              Cambiar canal en Ajustes de contabilidad
            </button>
          )}
        </section>

        <section className={adminCard}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-muted">Talonario normal</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                {talonarioNormal?.proximoTexto ? `Próx. ${talonarioNormal.proximoTexto}` : 'Sin talonario'}
              </p>
            </div>
            {talonarioNormal && <span className={adminDato}>Quedan {talonarioNormal.quedan}</span>}
          </div>
          <p className="mt-2 text-xs text-muted tabular-nums">
            {talonarioNormal
              ? `Control ${talonarioNormal.proximoControl ?? '—'} · Serie ${talonarioNormal.serie}`
              : 'Carga un talonario físico o activa un canal digital.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
            {esDueno && (
              <Link href="/admin/contabilidad/talonarios/nuevo" className="text-brand-600 hover:underline">
                {talonarioNormal ? 'Cargar otro' : 'Cargar talonario'}
              </Link>
            )}
            {puedeFacturar && talonarioNormal?.proximo && !cerrado && (
              <button type="button" onClick={() => { setErrorBlanco(null); setModalBlanco(true); }} className="text-ink-soft hover:text-deal">
                Anular papel dañado
              </button>
            )}
          </div>
        </section>

        <section className={adminCard}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-muted">Contingencia 00093</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                {talonarioContingencia ? `Serie ${talonarioContingencia.serie} (${talonarioContingencia.quedan})` : 'Usa respaldo normal'}
              </p>
            </div>
            <Ayuda etiqueta="Planilla de contingencia">
              Si falla luz, internet o portal SENIAT, emites en el talonario de contingencia (con hora exacta) y lo reportas al portal al día hábil siguiente (art. 7).
            </Ayuda>
          </div>
          <p className="mt-2 text-xs text-muted">
            {contingencias.length > 0
              ? `${contingencias.length} documento(s) esperando reporte al día siguiente.`
              : 'Sin contingencias pendientes por transmitir.'}
          </p>
        </section>
      </div>

      {/* Aviso de contingencias pendientes por transmitir */}
      {contingencias.length > 0 && (
        <div className={`${adminNotice('warning')} space-y-2`}>
          <div className="flex items-center gap-2 font-semibold text-ink">
            <IconoReloj aria-hidden="true" />
            <span>Contingencias emitidas en papel esperando transmisión al SENIAT (art. 7)</span>
          </div>
          <ul className="space-y-2">
            {contingencias.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm">
                <span className="min-w-0">
                  <strong>{f.etiqueta}</strong> · {fechaCortaVe(f.emitidaEl)} {formatearHora12(f.emitidaHora)} · {f.contingenciaCausal ?? 'Contingencia'}
                </span>
                {puedeFacturar && (
                  <button type="button" onClick={() => abrirContingencia(f)} className={adminPrimaryButton}>
                    <IconoConfirmado className="h-4 w-4" aria-hidden="true" /> Marcar como reportada
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Órdenes pagadas sin factura */}
      {compras.length > 0 && (
        <section className={adminCard} aria-labelledby="fac-pendientes">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="fac-pendientes" className="text-base font-semibold text-ink">Cobros de {mesTxt} pendientes por facturar ({compras.length})</h2>
              <p className="mt-0.5 text-xs text-muted">Agrupados por compra para no duplicar facturas físicas y digitales.</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {compras.map((c) => {
              const key = c.ordenIds.join(',');
              const puedeDirecto = puedeFacturar && !cerrado && canalPublico === 'IMPRENTA_DIGITAL' && Boolean(c.documento);
              return (
                <li key={key} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {c.cliente} {c.documento ? <span className="text-xs font-normal text-muted tabular-nums">({c.documento})</span> : <span className={`${adminBadge('warning')} ml-1`}>Falta RIF/CI</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted tabular-nums">
                      {c.ordenes.join(' + ')} · {fechaCortaVe(c.pagadaEl)} · {c.metodo ?? 'Web'} · {formatUSD(c.totalUSD)} ({formatVES(c.totalBs)})
                    </p>
                  </div>
                  {puedeFacturar && !cerrado && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {puedeDirecto && (
                        <button
                          type="button"
                          onClick={() => void emitirDigitalDirecto(c)}
                          disabled={emitiendoOrden === key}
                          className={adminSecondaryButton}
                        >
                          <IconoNube className="h-4 w-4" aria-hidden="true" /> {emitiendoOrden === key ? 'Timbrando…' : 'Emitir directo'}
                        </button>
                      )}
                      <Link href={`/admin/contabilidad/facturas/nueva?ordenes=${encodeURIComponent(key)}`} className={adminPrimaryButton}>
                        Facturar <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Filtros + listado de facturas, notas y retenciones */}
      <section className={adminCard} aria-labelledby="fac-lista-titulo">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="fac-lista-titulo" className="text-lg font-semibold text-ink">Documentos fiscales de {mesTxt}</h2>
            <p className="mt-0.5 text-xs text-muted">Facturas, Notas de Crédito, Notas de Débito y retenciones de IVA.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="fac-buscar" className="sr-only">Buscar por factura, control, nombre o RIF</label>
            <input
              id="fac-buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar factura, control o cliente…"
              className={adminInput()}
            />
          </div>
        </div>

        <div className="mt-4">
          <Filtros filtros={filtros} valor={filtro} onCambiar={setFiltro} etiqueta="Filtrar documentos" />
        </div>

        {visibles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-muted">
            No hay documentos que coincidan en {mesTxt}.
          </div>
        ) : (
          <>
            <div className={`${adminTableWrap} mt-4 hidden lg:block`}>
              <table className={adminTable}>
                <thead>
                  <tr>
                    <th className={adminTh}>Fecha y hora</th>
                    <th className={adminTh}>Documento</th>
                    <th className={adminTh}>Cliente y RIF</th>
                    <th className={`${adminTh} text-right`}>Total</th>
                    <th className={adminTh}>Estado / Retención</th>
                    <th className={`${adminTh} text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((f) => {
                    const pdfUrl = enlaceArchivoContable(f.pdfPrivadoRuta);
                    const esFactura = f.tipo === 'FACTURA' && f.origen !== 'EN_BLANCO';
                    return (
                      <tr key={f.id} className={adminRowZebra}>
                        <td className={`${adminTd} whitespace-nowrap tabular-nums`}>
                          <span>{fechaCortaVe(f.emitidaEl)}</span>
                          {f.emitidaHora && <span className="block text-xs text-muted">{formatearHora12(f.emitidaHora)}</span>}
                        </td>
                        <td className={adminTd}>
                          <Link href={`/admin/contabilidad/facturas/${f.id}`} className="font-semibold text-brand-600 hover:underline">
                            {etiquetaTipoDoc(f.tipo)} {f.etiqueta}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted tabular-nums">
                            <span>Ctrl {f.numeroControl}</span>
                            <span className={adminDato}>{etiquetaCanal(f.medio)}</span>
                          </div>
                        </td>
                        <td className={adminTd}>
                          {f.origen === 'EN_BLANCO' ? (
                            <span className="text-xs italic text-muted">Papel anulado sin usar</span>
                          ) : (
                            <>
                              <span className="block max-w-56 truncate font-medium text-ink">{f.comprador?.nombre ?? '—'}</span>
                              <span className="block text-xs tabular-nums text-muted">{f.comprador?.documento ?? ''}</span>
                            </>
                          )}
                        </td>
                        <td className={`${adminTd} whitespace-nowrap text-right tabular-nums`}>
                          <span className={`font-semibold ${f.estado === 'ANULADA' ? 'text-muted line-through' : 'text-ink'}`}>
                            {formatVES(f.totalBs)}
                          </span>
                          {f.totalUSD !== null && <span className="block text-xs text-muted">{formatUSD(f.totalUSD)} ({f.monedaOperacion})</span>}
                        </td>
                        <td className={adminTd}>
                          <div className="flex flex-wrap gap-1">
                            {f.estado === 'ANULADA' ? (
                              <span className={adminBadge('danger')}><IconoCerrar className="h-3 w-3" aria-hidden="true" /> Anulada</span>
                            ) : (
                              <span className={adminBadge('success')}><IconoCheck className="h-3 w-3" aria-hidden="true" /> Emitida</span>
                            )}
                            {f.ivaRetenidoBs && f.ivaRetenidoBs > 0 ? (
                              <span className={adminBadge('brand')}>Ret. {formatVES(f.ivaRetenidoBs)}</span>
                            ) : null}
                            {f.estadoTransmision === 'PENDIENTE_REPORTE' && (
                              <span className={adminBadge('warning')}>Reportar</span>
                            )}
                          </div>
                        </td>
                        <td className={`${adminTd} whitespace-nowrap text-right`}>
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            <Link href={`/admin/contabilidad/facturas/${f.id}`} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface">
                              <IconoVer className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Ver
                            </Link>
                            {pdfUrl && (
                              <a href={pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-surface">
                                PDF
                              </a>
                            )}
                            {esFactura && f.estado === 'EMITIDA' && (
                              <>
                                {puedeFacturar && (
                                  <button
                                    type="button"
                                    onClick={() => abrirNota(f)}
                                    className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-700"
                                  >
                                    NC / ND
                                  </button>
                                )}
                                {(puedeFacturar || puedeDeclarar) && !cerrado && (
                                  <button
                                    type="button"
                                    onClick={() => abrirRetencion(f)}
                                    className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-700"
                                  >
                                    Retención
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en teléfono */}
            <ul className="mt-4 space-y-2.5 lg:hidden">
              {visibles.map((f) => {
                const esFactura = f.tipo === 'FACTURA' && f.origen !== 'EN_BLANCO';
                return (
                  <li key={f.id} className="rounded-xl border border-line bg-surface p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/admin/contabilidad/facturas/${f.id}`} className="font-semibold text-brand-600 hover:underline">
                          {etiquetaTipoDoc(f.tipo)} {f.etiqueta}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted tabular-nums">
                          {fechaCortaVe(f.emitidaEl)} {formatearHora12(f.emitidaHora)} · Ctrl {f.numeroControl}
                        </p>
                      </div>
                      <span className="font-bold tabular-nums text-ink">{formatVES(f.totalBs)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink">
                      {f.origen === 'EN_BLANCO' ? 'Papel anulado sin usar' : `${f.comprador?.nombre ?? '—'} · ${f.comprador?.documento ?? ''}`}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {f.estado === 'ANULADA'
                        ? <span className={adminBadge('danger')}>Anulada</span>
                        : <span className={adminBadge('success')}>Emitida</span>}
                      {f.ivaRetenidoBs && f.ivaRetenidoBs > 0 ? <span className={adminBadge('brand')}>Ret. {formatVES(f.ivaRetenidoBs)}</span> : null}
                      {esFactura && f.estado === 'EMITIDA' && (
                        <>
                          {puedeFacturar && <button type="button" onClick={() => abrirNota(f)} className="ml-auto text-xs font-semibold text-brand-600 hover:underline">NC / ND</button>}
                          {(puedeFacturar || puedeDeclarar) && !cerrado && <button type="button" onClick={() => abrirRetencion(f)} className={`${puedeFacturar ? '' : 'ml-auto '}text-xs font-semibold text-brand-600 hover:underline`}>Retención IVA</button>}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Modal Anular papel en blanco */}
      <ModalDialog open={modalBlanco} onClose={() => !enviandoBlanco && setModalBlanco(false)} ariaLabelledBy="blanco-titulo" size="sm">
        <div className={adminModalHeader}>
          <h2 id="blanco-titulo" className={adminModalTitle}>Anular papel dañado en blanco</h2>
        </div>
        <div className={`${adminModalBody} space-y-3`}>
          <p className="text-sm text-ink-soft">
            Se anulará sin montos el próximo número del talonario (<strong>{talonarioNormal?.proximoTexto}</strong> · control {talonarioNormal?.proximoControl}). Guarda el papel con sus copias.
          </p>
          <div>
            <label htmlFor="blanco-motivo" className={adminLabel}>Motivo</label>
            <input id="blanco-motivo" value={motivoBlanco} maxLength={200} onChange={(e) => setMotivoBlanco(e.target.value)} placeholder="Ej. Se manchó o atascó al imprimir" className={adminInput()} />
          </div>
          {errorBlanco && <p role="alert" className={adminError}>{errorBlanco}</p>}
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={() => setModalBlanco(false)} disabled={enviandoBlanco} className={adminSecondaryButton}>Cancelar</button>
          <button type="button" onClick={() => void enviarBlanco()} disabled={enviandoBlanco || motivoBlanco.trim().length < 5} className={adminDangerButton}>
            <IconoEliminar className="h-4 w-4" aria-hidden="true" /> {enviandoBlanco ? 'Anulando…' : 'Anular papel'}
          </button>
        </div>
      </ModalDialog>

      {/* Modal Emitir Nota de Crédito / Débito */}
      <ModalDialog open={Boolean(docNota)} onClose={() => !enviandoNota && setDocNota(null)} ariaLabelledBy="nc-titulo" size="md">
        {docNota && (
          <form onSubmit={enviarNota}>
            <div className={adminModalHeader}>
              <h2 id="nc-titulo" className={adminModalTitle}>Nota fiscal sobre {docNota.etiqueta}</h2>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de nota fiscal">
                <OpcionRadio name="tipo-nota" tamano="chica" elegida={tipoNota === 'NOTA_CREDITO'} onElegir={() => setTipoNota('NOTA_CREDITO')} titulo="Nota de Crédito" detalle="Devolución o descuento: resta IVA." />
                <OpcionRadio name="tipo-nota" tamano="chica" elegida={tipoNota === 'NOTA_DEBITO'} onElegir={() => setTipoNota('NOTA_DEBITO')} titulo="Nota de Débito" detalle="Recargo adicional: suma IVA." />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="nc-fecha" className={adminLabel}>Fecha de emisión</label>
                  <input id="nc-fecha" type="date" max={hoy} value={fechaNota} onChange={(e) => setFechaNota(e.target.value)} className={adminInput()} />
                </div>
                <div>
                  <label htmlFor="nc-monto" className={adminLabel}>Monto en USD</label>
                  <input id="nc-monto" inputMode="decimal" value={montoNotaUSD} onChange={(e) => setMontoNotaUSD(e.target.value)} placeholder="Ej. 25,00" className={`${adminInput()} tabular-nums`} />
                  {docNota.totalUSD !== null && <p className={adminHint}>Factura original: {formatUSD(docNota.totalUSD)}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="nc-motivo" className={adminLabel}>Motivo fiscal</label>
                <input id="nc-motivo" value={motivoNota} maxLength={200} onChange={(e) => setMotivoNota(e.target.value)} placeholder="Ej. Devolución parcial de mercancía o ajuste por error" className={adminInput()} />
              </div>

              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={notaExenta} onChange={(e) => setNotaExenta(e.target.checked)} className="h-4 w-4 rounded border-line-strong text-brand-600" />
                Operación exenta de IVA (E)
              </label>

              {canalPublico === 'PORTAL_SENIAT' && (
                <div className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nc-ext-num" className={adminLabel}>N.º asignado por Portal SENIAT</label>
                    <input id="nc-ext-num" type="number" min={1} value={notaNumExt} onChange={(e) => setNotaNumExt(e.target.value)} className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor="nc-ext-ctrl" className={adminLabel}>N.º de control SENIAT</label>
                    <input id="nc-ext-ctrl" value={notaCtrlExt} onChange={(e) => setNotaCtrlExt(e.target.value)} placeholder="00-000001" className={adminInput()} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="nc-pdf" className={adminLabel}>Subir PDF emitido</label>
                    <input id="nc-pdf" type="file" accept=".pdf" disabled={subiendo} onChange={(e) => void subirPdf(e.target.files?.[0], 'nota')} className="block w-full text-xs text-muted" />
                  </div>
                </div>
              )}

              {errorNota && <p role="alert" className={adminError}>{errorNota}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setDocNota(null)} disabled={enviandoNota} className={adminSecondaryButton}>Cancelar</button>
              <button type="submit" disabled={enviandoNota || subiendo || motivoNota.trim().length < 5} className={adminPrimaryButton}>
                <IconoDocumento className="h-4 w-4" aria-hidden="true" /> {enviandoNota ? 'Emitiendo…' : `Emitir ${etiquetaTipoDoc(tipoNota)}`}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal Registrar Retención IVA */}
      <ModalDialog open={Boolean(docRet)} onClose={() => !enviandoRet && setDocRet(null)} ariaLabelledBy="ret-titulo" size="sm">
        {docRet && (
          <form onSubmit={enviarRetencion}>
            <div className={adminModalHeader}>
              <h2 id="ret-titulo" className={adminModalTitle}>Retención IVA · {docRet.etiqueta}</h2>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <p className="text-xs text-muted">
                IVA facturado: <strong className="tabular-nums text-ink">{formatVES(docRet.ivaBs)}</strong>. Registra el comprobante del contribuyente especial.
              </p>
              <div>
                <label htmlFor="ret-comp" className={adminLabel}>N.º de comprobante (14 dígitos)</label>
                <input id="ret-comp" value={retComprobante} maxLength={14} inputMode="numeric" onChange={(e) => setRetComprobante(e.target.value.replace(/\D/g, ''))} placeholder="20261100000001" className={`${adminInput()} tabular-nums`} />
                <p className={adminHint}>Formato SENIAT: AAAAMMSSSSSSSS.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ret-monto" className={adminLabel}>IVA retenido (Bs.)</label>
                  <input id="ret-monto" inputMode="decimal" value={retMontoBs} onChange={(e) => setRetMontoBs(e.target.value)} className={`${adminInput()} tabular-nums`} />
                </div>
                <div>
                  <label htmlFor="ret-fecha" className={adminLabel}>Fecha del comprobante</label>
                  <input id="ret-fecha" type="date" max={hoy} value={retFecha} onChange={(e) => setRetFecha(e.target.value)} className={adminInput()} />
                </div>
              </div>
              {errorRet && <p role="alert" className={adminError}>{errorRet}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setDocRet(null)} disabled={enviandoRet} className={adminSecondaryButton}>Cancelar</button>
              <button type="submit" disabled={enviandoRet || retComprobante.length !== 14} className={adminPrimaryButton}>
                <IconoConfirmado className="h-4 w-4" aria-hidden="true" /> {enviandoRet ? 'Guardando…' : 'Guardar retención'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal Reportar Contingencia */}
      <ModalDialog open={Boolean(docCont)} onClose={() => !enviandoCont && setDocCont(null)} ariaLabelledBy="cont-titulo" size="sm">
        {docCont && (
          <form onSubmit={enviarContingencia}>
            <div className={adminModalHeader}>
              <h2 id="cont-titulo" className={adminModalTitle}>Reportar contingencia {docCont.etiqueta}</h2>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <p className="text-xs text-muted">Registra la referencia luego de cargar la factura de contingencia en tu medio digital.</p>
              <div>
                <label htmlFor="cont-ref" className={adminLabel}>Referencia o correlativo digital (opcional)</label>
                <input id="cont-ref" value={contRef} maxLength={40} onChange={(e) => setContRef(e.target.value)} placeholder="Ej. F-000012 o ACUSE-99" className={adminInput()} />
              </div>
              <div>
                <label htmlFor="cont-pdf" className={adminLabel}>PDF o acuse del reporte (opcional)</label>
                <input id="cont-pdf" type="file" accept=".pdf,image/png,image/jpeg,image/webp" disabled={subiendo} onChange={(e) => void subirPdf(e.target.files?.[0], 'contingencia')} className="block w-full text-xs text-muted" />
                {contPdf && <p className={adminHint}>Archivo adjunto listo.</p>}
              </div>
              {errorCont && <p role="alert" className={adminError}>{errorCont}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setDocCont(null)} disabled={enviandoCont} className={adminSecondaryButton}>Cancelar</button>
              <button type="submit" disabled={enviandoCont || subiendo} className={adminPrimaryButton}>
                <IconoArchivo className="h-4 w-4" aria-hidden="true" /> {enviandoCont ? 'Guardando…' : 'Marcar reportada'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}
